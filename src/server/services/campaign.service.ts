import { adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient, getD1Database } from '@/lib/prisma';
import { mediaEnvironment } from '@/server/media-http';
import {
  type CampaignDocument,
  type CampaignItem,
  campaignDocumentSchema,
} from '@/contracts/cms/campaign';

export class CampaignConflictError extends Error {
  code = 'CAMPAIGN_OVERLAP_CONFLICT';
  conflictingCampaignId: string;
  conflictingCampaignName: string;
  productId: string;
  variantId: string | null;

  constructor(
    message: string,
    conflictingCampaignId: string,
    conflictingCampaignName: string,
    productId = '',
    variantId: string | null = null
  ) {
    super(message);
    this.name = 'CampaignConflictError';
    this.conflictingCampaignId = conflictingCampaignId;
    this.conflictingCampaignName = conflictingCampaignName;
    this.productId = productId;
    this.variantId = variantId;
  }
  statusCode = 409;
  status = 409;
}

export class CampaignRevisionConflictError extends Error {
  code = 'CAMPAIGN_REVISION_CONFLICT';
  statusCode = 409;
  status = 409;
  currentRevision: number;
  expectedRevision: number;

  constructor(message: string, currentRevision: number, expectedRevision: number) {
    super(message);
    this.name = 'CampaignRevisionConflictError';
    this.currentRevision = currentRevision;
    this.expectedRevision = expectedRevision;
  }
}

export class CampaignValidationError extends Error {
  code: string;
  field: string;

  constructor(
    messageOrField: string,
    fieldOrMessage = 'campaign',
    code = 'CAMPAIGN_VALIDATION_ERROR'
  ) {
    const isFirstArgMessage = messageOrField.includes(' ') || messageOrField.length > 30;
    const message = isFirstArgMessage ? messageOrField : fieldOrMessage;
    const field = isFirstArgMessage ? fieldOrMessage : messageOrField;
    super(message);
    this.name = 'CampaignValidationError';
    this.field = field;
    this.code = code;
  }
}

export interface ActiveCampaignItemData {
  salePrice: number;
  regularPrice: number | null;
  campaignId: string;
  campaignName: string;
  startAt: string;
  endAt: string;
}

export interface ActiveCampaignResolution {
  campaignId: string;
  campaignName: string;
  startAt: string;
  endAt: string;
  items: Map<string, ActiveCampaignItemData>;
}

export interface PublicActiveCampaignDto {
  campaignId: string;
  campaignName: string;
  startAt: string;
  endAt: string;
  items: Record<string, ActiveCampaignItemData>;
}

export function toPublicCampaignDto(res: ActiveCampaignResolution | null): PublicActiveCampaignDto | null {
  if (!res) return null;
  const itemsRecord: Record<string, ActiveCampaignItemData> = {};
  for (const [key, value] of res.items.entries()) {
    itemsRecord[key] = { ...value };
  }
  return {
    campaignId: res.campaignId,
    campaignName: res.campaignName,
    startAt: res.startAt,
    endAt: res.endAt,
    items: itemsRecord,
  };
}

function isD1Database(val: unknown): val is D1Database {
  return Boolean(val && typeof val === 'object' && typeof (val as D1Database).prepare === 'function');
}

async function getDb(d1?: unknown): Promise<D1Database> {
  if (isD1Database(d1)) return d1;
  const fromPrisma = getD1Database();
  if (fromPrisma) return fromPrisma;
  return (await mediaEnvironment()).DB;
}

/**
 * Validates that all target products and variants exist, are ACTIVE,
 * and that each variant strictly belongs to its designated product.
 */
export async function assertValidCampaignTargets(items: CampaignItem[], db: D1Database): Promise<void> {
  if (!items || items.length === 0) return;

  const seenTargets = new Set<string>();

  for (const item of items) {
    const key = `${item.productId}:${item.variantId || ''}`;
    if (seenTargets.has(key)) {
      throw new CampaignValidationError(
        'items',
        `Mục khuyến mại trùng lặp: Sản phẩm ${item.productId}${item.variantId ? ` (Biến thể: ${item.variantId})` : ''} đã có trong danh sách.`
      );
    }
    seenTargets.add(key);

    // Validate product existence and active status
    const product = await db
      .prepare('SELECT id, status, deletedAt FROM Product WHERE id = ?')
      .bind(item.productId)
      .first<{ id: string; status: string; deletedAt: string | null }>();

    if (!product || product.deletedAt !== null) {
      throw new CampaignValidationError(
        'productId',
        `Sản phẩm mục tiêu không tồn tại hoặc đã bị xóa: "${item.productId}"`
      );
    }

    if (product.status !== 'ACTIVE' && product.status !== 'active') {
      throw new CampaignValidationError(
        'productId',
        `Sản phẩm mục tiêu không ở trạng thái kinh doanh hoạt động: "${item.productId}"`
      );
    }

    // Validate variant if provided
    if (item.variantId) {
      const variant = await db
        .prepare('SELECT id, productId, status FROM ProductVariant WHERE id = ?')
        .bind(item.variantId)
        .first<{ id: string; productId: string; status: string }>();

      if (!variant) {
        throw new CampaignValidationError(
          'variantId',
          `Biến thể mục tiêu không tồn tại: "${item.variantId}"`
        );
      }

      if (variant.productId !== item.productId) {
        throw new CampaignValidationError(
          'variantId',
          `Biến thể "${item.variantId}" không thuộc sản phẩm "${item.productId}".`
        );
      }

      if (variant.status !== 'ACTIVE' && variant.status !== 'active') {
        throw new CampaignValidationError(
          'variantId',
          `Biến thể mục tiêu không ở trạng thái kinh doanh hoạt động: "${item.variantId}"`
        );
      }
    }
  }
}

/**
 * Strict overlap invariant: Checks whether any other PUBLISHED campaign
 * overlaps on the half-open interval [startAt, endAt) for any targeted product/variant.
 */
export async function assertNoPublishedOverlap(
  campaignId: string | null,
  startAt: Date,
  endAt: Date,
  items: CampaignItem[],
  db: D1Database
): Promise<void> {
  const campStartMs = startAt.getTime();
  const campEndMs = endAt.getTime();

  let query = `
    SELECT c.id, c.name, c.startAt, c.endAt, i.productId, i.variantId
    FROM PromotionCampaign c
    JOIN PromotionCampaignItem i ON c.id = i.campaignId
    WHERE c.status = 'PUBLISHED'
  `;
  const params: unknown[] = [];
  if (campaignId) {
    query += ` AND c.id != ?`;
    params.push(campaignId);
  }

  const { results } = await db.prepare(query).bind(...params).all<{
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    productId: string;
    variantId: string | null;
  }>();

  if (!results || results.length === 0) return;

  for (const other of results) {
    const otherStartMs = new Date(other.startAt).getTime();
    const otherEndMs = new Date(other.endAt).getTime();

    // Temporal overlap condition: startA < endB && endA > startB
    const hasOverlap = campStartMs < otherEndMs && campEndMs > otherStartMs;
    if (!hasOverlap) continue;

    for (const item of items) {
      const match =
        other.productId === item.productId &&
        (other.variantId || null) === (item.variantId || null);

      if (match) {
        throw new CampaignConflictError(
          `Không thể lưu/xuất bản chiến dịch: Sản phẩm/variant "${item.productId}${
            item.variantId ? ` (Variant: ${item.variantId})` : ''
          }" đã được áp dụng trong chiến dịch đang xuất bản "${other.name}" (ID: ${other.id}) có cùng khung giờ.`,
          other.id,
          other.name,
          item.productId,
          item.variantId || null
        );
      }
    }
  }
}

export async function listCampaigns(d1?: D1Database) {
  const db = await getDb(d1);
  const prisma = getPrismaClient(db);
  const rows = await prisma.promotionCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: { id: true, productId: true, variantId: true, salePrice: true, regularPrice: true },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    revision: (c as { revision?: number }).revision ?? 0,
    startAt: c.startAt.toISOString(),
    endAt: c.endAt.toISOString(),
    itemCount: c.items.length,
    items: c.items,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function getCampaignById(id: string, d1?: D1Database) {
  const db = await getDb(d1);
  const prisma = getPrismaClient(db);
  const c = await prisma.promotionCampaign.findUnique({
    where: { id },
    include: {
      items: {
        select: { id: true, productId: true, variantId: true, salePrice: true, regularPrice: true, product: { select: { name: true } }, variant: { select: { name: true } } },
      },
    },
  });
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    revision: (c as { revision?: number }).revision ?? 0,
    startAt: c.startAt.toISOString(),
    endAt: c.endAt.toISOString(),
    items: c.items,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Saves a campaign with full validation, CAS revision guard, and atomic D1 batch mutations.
 * If status is 'PUBLISHED', it CANNOT bypass the overlap guard.
 */
export async function saveCampaign(
  input: CampaignDocument & { expectedRevision?: number },
  idOrExpectedRevOrDb?: string | number | D1Database,
  expectedRevOrDb?: number | D1Database,
  explicitDb?: D1Database
) {
  let dbArg: D1Database | undefined;
  let expectedRevision: number | undefined = input.expectedRevision;
  let id: string | undefined = input.id;

  if (isD1Database(idOrExpectedRevOrDb)) {
    dbArg = idOrExpectedRevOrDb;
  } else if (typeof idOrExpectedRevOrDb === 'string') {
    id = idOrExpectedRevOrDb;
  } else if (typeof idOrExpectedRevOrDb === 'number') {
    expectedRevision = idOrExpectedRevOrDb;
  }

  if (isD1Database(expectedRevOrDb)) {
    dbArg = expectedRevOrDb;
  } else if (typeof expectedRevOrDb === 'number') {
    expectedRevision = expectedRevOrDb;
  }

  if (isD1Database(explicitDb)) {
    dbArg = explicitDb;
  }

  const valid = campaignDocumentSchema.parse({
    ...input,
    ...(id ? { id } : {}),
  });
  const db = await getDb(dbArg);

  const startAt = new Date(valid.startAt);
  const endAt = new Date(valid.endAt);
  const now = new Date().toISOString();

  // 1. Strict Target Validation (Product active, Variant belongs to Product)
  await assertValidCampaignTargets(valid.items, db);

  // 2. Strict Overlap Guard: CANNOT bypass overlap check even if saving directly as PUBLISHED
  if (valid.status === 'PUBLISHED') {
    await assertNoPublishedOverlap(valid.id || null, startAt, endAt, valid.items, db);
  }

  if (valid.id) {
    // Check existing record & CAS revision
    const existing = await db
      .prepare('SELECT id, revision, status FROM PromotionCampaign WHERE id = ?')
      .bind(valid.id)
      .first<{ id: string; revision: number; status: string }>();

    if (!existing) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    // P2 Invariant: expectedRevision is MANDATORY for updates. Reject missing, fractional, or negative values.
    const rawRev = expectedRevision ?? input.expectedRevision;
    if (rawRev === undefined || rawRev === null) {
      throw new CampaignValidationError(
        'expectedRevision là bắt buộc khi cập nhật chiến dịch.',
        'expectedRevision',
        'MISSING_EXPECTED_REVISION'
      );
    }
    if (typeof rawRev !== 'number' || !Number.isSafeInteger(rawRev) || rawRev < 0) {
      throw new CampaignValidationError(
        'expectedRevision phải là số nguyên không âm.',
        'expectedRevision',
        'INVALID_EXPECTED_REVISION'
      );
    }

    const checkRev = rawRev;
    if (existing.revision !== checkRev) {
      throw new CampaignRevisionConflictError(
        `Xung đột phiên bản (CAS conflict): Chiến dịch đã được sửa đổi bởi người khác (Hiện tại: rev ${existing.revision}, Yêu cầu: rev ${checkRev}). Vui lòng tải lại và thử lại.`,
        existing.revision,
        checkRev
      );
    }

    const nextRevision = existing.revision + 1;

    // Use D1 atomic batch with strict CAS & monotonic revision:
    // Update matches WHERE id = ? so the DB trigger campaign_revision_guard fires if revision doesn't match OLD.revision + 1.
    // If the trigger aborts, SQLite rolls back the ENTIRE batch, ensuring ZERO side effects!
    const updateCampStmt = db
      .prepare(
        `UPDATE PromotionCampaign 
         SET name = ?, description = ?, status = ?, revision = ?, startAt = ?, endAt = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(
        valid.name,
        valid.description || null,
        valid.status || 'DRAFT',
        nextRevision,
        startAt.toISOString(),
        endAt.toISOString(),
        now,
        valid.id
      );

    // Remove old targets before checking new time/status, in the SAME transaction.
    // A losing CAS aborts and restores these items; inserts validate final targets.
    const deleteOldItemsStmt = db
      .prepare(
        `DELETE FROM PromotionCampaignItem 
         WHERE campaignId = ? 
           AND EXISTS (SELECT 1 FROM PromotionCampaign WHERE id = ? AND revision = ?)`
      )
      .bind(valid.id, valid.id, checkRev);

    const insertItemStmts = valid.items.map((it) => {
      const itemId = it.id || 'citem_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      return db
        .prepare(
          `INSERT INTO PromotionCampaignItem 
           (id, campaignId, productId, variantId, salePrice, regularPrice, createdAt, updatedAt)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM PromotionCampaign WHERE id = ? AND revision = ?)`
        )
        .bind(
          itemId,
          valid.id,
          it.productId,
          it.variantId || null,
          it.salePrice,
          it.regularPrice || null,
          now,
          now,
          valid.id,
          nextRevision
        );
    });

    try {
      const batchResults = await db.batch([deleteOldItemsStmt, updateCampStmt, ...insertItemStmts, ...adminAuditStatements(db, 'campaign.save', valid.id, 'Campaign mutation')]);
      const updateMeta = batchResults[1]?.meta as { changes?: number } | undefined;
      if (updateMeta?.changes === 0) {
        throw new CampaignRevisionConflictError(
          'Cập nhật thất bại do xung đột revision đồng thời.',
          existing.revision,
          checkRev
        );
      }
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      if (errMsg.includes('CAMPAIGN_REVISION_CONFLICT')) {
        throw new CampaignRevisionConflictError(
          'Cập nhật thất bại do xung đột revision đồng thời.',
          existing.revision,
          checkRev
        );
      }
      if (errMsg.includes('CAMPAIGN_OVERLAP_CONFLICT')) {
        throw new CampaignConflictError(
          'Xuất hiện xung đột khung giờ khuyến mại với chiến dịch đã xuất bản khác.',
          valid.id,
          valid.name
        );
      }
      throw err;
    }

    return getCampaignById(valid.id, db);
  } else {
    // Create new campaign atomically
    const campaignId = 'camp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const insertCampStmt = db
      .prepare(
        `INSERT INTO PromotionCampaign 
         (id, name, description, status, revision, startAt, endAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`
      )
      .bind(
        campaignId,
        valid.name,
        valid.description || null,
        valid.status || 'DRAFT',
        startAt.toISOString(),
        endAt.toISOString(),
        now,
        now
      );

    const insertItemStmts = valid.items.map((it) => {
      const itemId = it.id || 'citem_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      return db
        .prepare(
          `INSERT INTO PromotionCampaignItem 
           (id, campaignId, productId, variantId, salePrice, regularPrice, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          itemId,
          campaignId,
          it.productId,
          it.variantId || null,
          it.salePrice,
          it.regularPrice || null,
          now,
          now
        );
    });

    try {
      await db.batch([insertCampStmt, ...insertItemStmts, ...adminAuditStatements(db, 'campaign.create', campaignId, 'Campaign created')]);
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      if (errMsg.includes('CAMPAIGN_OVERLAP_CONFLICT')) {
        throw new CampaignConflictError(
          'Xuất hiện xung đột khung giờ khuyến mại với chiến dịch đã xuất bản khác.',
          campaignId,
          valid.name
        );
      }
      throw err;
    }
    return getCampaignById(campaignId, db);
  }
}

/**
 * Publishes a campaign.
 * STRICT INVARIANT: Blocks overlapping published campaigns on the same product/variant,
 * validates targets, and executes CAS revision check.
 */
export async function publishCampaign(
  campaignId: string,
  expectedRevisionOrDb?: number | D1Database,
  d1?: D1Database
) {
  let expectedRevision: number | undefined;
  let dbArg: D1Database | undefined = d1;
  if (typeof expectedRevisionOrDb === 'number') {
    expectedRevision = expectedRevisionOrDb;
  } else if (expectedRevisionOrDb && typeof expectedRevisionOrDb === 'object') {
    dbArg = expectedRevisionOrDb as D1Database;
  }
  const db = await getDb(dbArg);

  const campaign = await db
    .prepare('SELECT id, name, description, status, revision, startAt, endAt FROM PromotionCampaign WHERE id = ?')
    .bind(campaignId)
    .first<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      revision: number;
      startAt: string;
      endAt: string;
    }>();

  if (!campaign) {
    throw new Error('CAMPAIGN_NOT_FOUND');
  }

  if (expectedRevision === undefined || expectedRevision === null) {
    throw new CampaignValidationError(
      'expectedRevision là bắt buộc khi xuất bản chiến dịch.',
      'expectedRevision',
      'MISSING_EXPECTED_REVISION'
    );
  }
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new CampaignValidationError(
      'expectedRevision phải là số nguyên không âm.',
      'expectedRevision',
      'INVALID_EXPECTED_REVISION'
    );
  }

  if (campaign.revision !== expectedRevision) {
    throw new CampaignRevisionConflictError(
      `Xung đột revision khi xuất bản (Hiện tại: rev ${campaign.revision}, Yêu cầu: rev ${expectedRevision}).`,
      campaign.revision,
      expectedRevision
    );
  }

  // Fetch campaign items
  const { results: items } = await db
    .prepare('SELECT id, productId, variantId, salePrice, regularPrice FROM PromotionCampaignItem WHERE campaignId = ?')
    .bind(campaignId)
    .all<CampaignItem>();

  const campItems: CampaignItem[] = (items || []).map((it) => ({
    id: it.id,
    productId: it.productId,
    variantId: it.variantId || null,
    salePrice: it.salePrice,
    regularPrice: it.regularPrice || null,
  }));

  // 1. Validate targets
  await assertValidCampaignTargets(campItems, db);

  // 2. Temporal overlap check
  const startAt = new Date(campaign.startAt);
  const endAt = new Date(campaign.endAt);
  await assertNoPublishedOverlap(campaignId, startAt, endAt, campItems, db);

  // 3. Atomic CAS publish:
  // Using WHERE id = ? triggers campaign_revision_guard and campaign_published_overlap_guard_update at DB level!
  const now = new Date().toISOString();
  const nextRevision = campaign.revision + 1;

  try {
    const statement = db
      .prepare(
        `UPDATE PromotionCampaign 
         SET status = 'PUBLISHED', revision = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(nextRevision, now, campaignId)
      ;
    const [res] = await db.batch([statement, ...adminAuditStatements(db, 'campaign.publish', campaignId, 'Campaign publish', null, 'order', { changed: true })]);

    const meta = res?.meta as { changes?: number } | undefined;
    if (meta?.changes === 0) {
      throw new CampaignRevisionConflictError(
        'Xuất bản thất bại do chiến dịch đã bị thay đổi đồng thời.',
        campaign.revision,
        expectedRevision
      );
    }
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || String(err);
    if (errMsg.includes('CAMPAIGN_REVISION_CONFLICT')) {
      throw new CampaignRevisionConflictError(
        'Xuất bản thất bại do chiến dịch đã bị thay đổi đồng thời.',
        campaign.revision,
        expectedRevision
      );
    }
    if (errMsg.includes('CAMPAIGN_OVERLAP_CONFLICT')) {
      throw new CampaignConflictError(
        'Xung đột khung giờ khuyến mại với chiến dịch đang xuất bản khác.',
        campaignId,
        campaign.name
      );
    }
    throw err;
  }

  return getCampaignById(campaignId, db);
}

export async function archiveCampaign(
  campaignId: string,
  expectedRevisionOrDb?: number | D1Database,
  d1?: D1Database
) {
  let expectedRevision: number | undefined;
  let dbArg: D1Database | undefined = d1;
  if (typeof expectedRevisionOrDb === 'number') {
    expectedRevision = expectedRevisionOrDb;
  } else if (expectedRevisionOrDb && typeof expectedRevisionOrDb === 'object') {
    dbArg = expectedRevisionOrDb as D1Database;
  }
  const db = await getDb(dbArg);

  const existing = await db
    .prepare('SELECT id, revision, status FROM PromotionCampaign WHERE id = ?')
    .bind(campaignId)
    .first<{ id: string; revision: number; status: string }>();

  if (!existing) {
    throw new Error('CAMPAIGN_NOT_FOUND');
  }

  if (expectedRevision === undefined || expectedRevision === null) {
    throw new CampaignValidationError(
      'expectedRevision là bắt buộc khi lưu trữ chiến dịch.',
      'expectedRevision',
      'MISSING_EXPECTED_REVISION'
    );
  }
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new CampaignValidationError(
      'expectedRevision phải là số nguyên không âm.',
      'expectedRevision',
      'INVALID_EXPECTED_REVISION'
    );
  }

  if (existing.revision !== expectedRevision) {
    throw new CampaignRevisionConflictError(
      `Xung đột revision khi lưu trữ (Hiện tại: rev ${existing.revision}, Yêu cầu: rev ${expectedRevision}).`,
      existing.revision,
      expectedRevision
    );
  }

  const now = new Date().toISOString();
  const nextRevision = existing.revision + 1;

  try {
    const statement = db
      .prepare(
        `UPDATE PromotionCampaign 
         SET status = 'ARCHIVED', revision = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(nextRevision, now, campaignId)
      ;
    const [res] = await db.batch([statement, ...adminAuditStatements(db, 'campaign.archive', campaignId, 'Campaign archive', null, 'order', { changed: true })]);

    const meta = res?.meta as { changes?: number } | undefined;
    if (meta?.changes === 0) {
      throw new CampaignRevisionConflictError(
        'Lưu trữ thất bại do xung đột revision đồng thời.',
        existing.revision,
        expectedRevision
      );
    }
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || String(err);
    if (errMsg.includes('CAMPAIGN_REVISION_CONFLICT')) {
      throw new CampaignRevisionConflictError(
        'Lưu trữ thất bại do xung đột revision đồng thời.',
        existing.revision,
        expectedRevision
      );
    }
    throw err;
  }

  return getCampaignById(campaignId, db);
}

/**
 * Resolves all active published campaigns for a given timestamp.
 * Returns a lookup map keying `productId` or `${productId}:${variantId}` -> salePrice & regularPrice.
 * Invariant: Every item carries its campaign startAt/endAt so the calculator can verify item validity.
 */
export async function resolveActiveCampaigns(
  at: Date = new Date(),
  d1?: D1Database
): Promise<ActiveCampaignResolution | null> {
  let db: D1Database;
  try {
    db = await getDb(d1);
  } catch {
    return null;
  }
  if (!db) return null;

  const atIso = at.toISOString();

  // Query campaigns that are published and active at timestamp [startAt, endAt)
  const { results: activeCampaigns } = await db
    .prepare(
      `SELECT id, name, startAt, endAt, revision
       FROM PromotionCampaign
       WHERE status = 'PUBLISHED' AND startAt <= ? AND endAt > ?
       ORDER BY startAt DESC`
    )
    .bind(atIso, atIso)
    .all<{
      id: string;
      name: string;
      startAt: string;
      endAt: string;
      revision: number;
    }>();

  if (!activeCampaigns || activeCampaigns.length === 0) {
    return null;
  }

  const primary = activeCampaigns[0];
  const itemsMap = new Map<string, ActiveCampaignItemData>();

  for (const camp of activeCampaigns) {
    const { results: items } = await db
      .prepare(
        `SELECT productId, variantId, salePrice, regularPrice
         FROM PromotionCampaignItem
         WHERE campaignId = ?`
      )
      .bind(camp.id)
      .all<{
        productId: string;
        variantId: string | null;
        salePrice: number;
        regularPrice: number | null;
      }>();

    for (const it of items || []) {
      const key = it.variantId ? `${it.productId}:${it.variantId}` : it.productId;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          salePrice: it.salePrice,
          regularPrice: it.regularPrice,
          campaignId: camp.id,
          campaignName: camp.name,
          startAt: camp.startAt,
          endAt: camp.endAt,
        });
      }
    }
  }

  return {
    campaignId: primary.id,
    campaignName: primary.name,
    startAt: primary.startAt,
    endAt: primary.endAt,
    items: itemsMap,
  };
}
