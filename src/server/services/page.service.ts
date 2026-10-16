import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import { pageStudioWriteSchema, type PageDocument, type PageType } from '../../contracts/cms/page';
import { RESERVED_SLUGS } from '../../contracts/cms/post';
import { sanitizeHtml } from '../../lib/sanitize-html';
import { MediaError, mediaDetail, type MediaEnvironment } from './media-library.service';

import { contentAssets } from './content-media.service';

type Studio = { pageId: string; revision: number; draft: string; published: string | null };

export interface PageListItem {
  id: string;
  slug: string;
  title: string;
  pageType: string;
  revision: number;
  isPublished: boolean;
  hasUnpublishedDraft: boolean;
  updatedAt: string;
}

export async function pageList(db: D1Database, opts: { q?: string; page?: number; limit?: number } = {}) {
  const page = Math.max(1, Math.floor(Number(opts.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(opts.limit) || 20)));
  const offset = (page - 1) * limit;
  const q = String(opts.q || '').trim().slice(0, 200);

  const whereClauses: string[] = ['p.deletedAt IS NULL'];
  const params: (string | number)[] = [];
  if (q) {
    whereClauses.push(`(
      instr(lower(COALESCE(json_extract(s.draft, '$.title'), '')), lower(?)) > 0
      OR instr(lower(COALESCE(json_extract(s.draft, '$.slug'), p.slug)), lower(?)) > 0
    )`);
    params.push(q, q);
  }
  const whereSql = whereClauses.join(' AND ');

  const countRow = await db.prepare(`SELECT count(*) AS total FROM Page p LEFT JOIN PageStudio s ON s.pageId = p.id WHERE ${whereSql}`).bind(...params).first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const rows = await db.prepare(`
    SELECT p.id, p.slug, p.pageType, p.updatedAt, s.revision, s.draft, s.published,
      json_extract(s.draft, '$.title') AS draftTitle,
      json_extract(s.draft, '$.slug') AS draftSlug,
      json_extract(s.draft, '$.pageType') AS draftPageType
    FROM Page p LEFT JOIN PageStudio s ON s.pageId = p.id
    WHERE ${whereSql}
    ORDER BY p.updatedAt DESC, p.id DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all<Record<string, unknown>>();

  const items: PageListItem[] = (rows.results || []).map((r) => ({
    id: String(r.id),
    slug: String(r.draftSlug || r.slug),
    title: String(r.draftTitle || '(Chưa có tiêu đề)'),
    pageType: String(r.draftPageType || r.pageType || 'CUSTOM'),
    revision: Number(r.revision ?? 0),
    isPublished: !!r.published,
    hasUnpublishedDraft: !!r.published && !!r.draft && r.draft !== r.published,
    updatedAt: String(r.updatedAt),
  }));

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function pageDetail(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM PageStudio WHERE pageId=?').bind(id).first<Studio>();
  if (!row) throw new MediaError('Không tìm thấy trang.', 404);
  return { id, revision: row.revision, document: JSON.parse(row.draft) as PageDocument, published: !!row.published };
}

async function assertSlugAvailable(db: D1Database, slug: string, excludePageId: string | null) {
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    throw new MediaError('Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.', 400);
  }
  const existing = await db.prepare(`
    SELECT p.id FROM Page p LEFT JOIN PageStudio s ON s.pageId = p.id
    WHERE (p.slug=? OR json_extract(s.published, '$.slug')=?) AND p.deletedAt IS NULL
  `).bind(slug, slug).first<{ id: string }>();
  if (existing && existing.id !== excludePageId) {
    throw new MediaError('Đường dẫn (slug) này đã được dùng cho trang khác.', 409);
  }
}

export async function writePage(env: MediaEnvironment, id: string | null, input: unknown) {
  const { expectedRevision, action, document: d } = pageStudioWriteSchema.parse(input);
  d.contentHtml = sanitizeHtml(d.contentHtml || '');
  const db = env.DB;

  const existing = id ? await pageDetail(db, id).catch((e) => { if (e instanceof MediaError && e.status === 404) return null; throw e; }) : null;
  if (id && !existing) throw new MediaError('Không tìm thấy nội dung.', 404);
  await assertSlugAvailable(db, d.slug, id);
  if ((existing?.revision ?? 0) !== expectedRevision) {
    throw new MediaError('Trang đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  }

  const pageId = id || crypto.randomUUID();
  const assetIds = action === 'unpublish' ? new Set<string>() : await contentAssets(env, d.contentHtml, [d.seo.ogImageAssetId], action === 'publish');
  if (action === 'publish' && !d.contentHtml.trim()) {
    throw new MediaError('Cần có nội dung trước khi xuất bản.');
  }

  const version = expectedRevision + 1;
  const snapshot = JSON.stringify(d);
  const statements = [];

  if (!id) {
    statements.push(db.prepare('INSERT INTO Page(id,slug,pageType) VALUES(?,?,?)').bind(pageId, d.slug, d.pageType));
  } else if (action === 'publish' || !existing?.published) {
    statements.push(db.prepare('UPDATE Page SET slug=?,pageType=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?').bind(d.slug, d.pageType, pageId));
  } else {
    statements.push(db.prepare('UPDATE Page SET updatedAt=CURRENT_TIMESTAMP WHERE id=?').bind(pageId));
  }

  statements.push(db.prepare('INSERT INTO PageStudio(pageId,draft,published) VALUES(?,?,?) ON CONFLICT(pageId) DO NOTHING').bind(
    pageId, snapshot, action === 'publish' ? snapshot : null
  ));
  statements.push(db.prepare('INSERT INTO PageStudioRevision(pageId,revision,document,action,actor) VALUES(?,?,?,?,?)').bind(pageId, version, snapshot, action, adminActor()));

  statements.push(db.prepare(`
    UPDATE PageStudio
    SET draft = ?,
        revision = ?,
        published = CASE
          WHEN ? = 'publish' THEN ?
          WHEN ? = 'unpublish' THEN NULL
          ELSE published
        END,
        publishedRevision = CASE WHEN ? = 'publish' THEN ? WHEN ? = 'unpublish' THEN NULL ELSE publishedRevision END,
        publishedAt = CASE WHEN ? = 'publish' THEN COALESCE(publishedAt, CURRENT_TIMESTAMP) ELSE publishedAt END,
        publicUpdatedAt = CASE WHEN ? = 'publish' THEN CURRENT_TIMESTAMP ELSE publicUpdatedAt END,
        updatedAt = CURRENT_TIMESTAMP
    WHERE pageId = ?
  `).bind(snapshot, version, action, snapshot, action, action, version, action, action, action, pageId));

  for (const assetId of assetIds) {
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PAGE_REVISION',?,?)").bind(crypto.randomUUID(), assetId, pageId, `${version}:${assetId}`));
  }

  try {
    await db.batch([...statements, ...adminAuditStatements(db, 'page.' + action, pageId, 'CMS mutation')]);
  } catch (e) {
    if (e instanceof Error && /PAGE_STUDIO_CONFLICT|UNIQUE constraint/.test(e.message)) {
      throw new MediaError('Xung đột phiên bản hoặc đường dẫn trùng. Tải lại và kiểm tra dữ liệu.', 409);
    }
    throw e;
  }

  return pageDetail(db, pageId);
}

export async function archivePage(env: MediaEnvironment, id: string, expectedRevision: number) {
  const detail = await pageDetail(env.DB, id);
  return writePage(env, id, { expectedRevision, action: 'unpublish', document: detail.document });
}
export const unpublishPage = archivePage;

export async function listPageRevisions(db: D1Database, pageId: string) {
  const studio = await db.prepare('SELECT revision, published, publishedRevision FROM PageStudio WHERE pageId=?').bind(pageId).first<{ revision: number; published: string | null; publishedRevision: number | null }>();
  const revs = await db.prepare('SELECT revision, action, actor, createdAt, document FROM PageStudioRevision WHERE pageId=? ORDER BY revision DESC').bind(pageId).all<{ revision: number; action: string; actor: string; createdAt: string; document: string }>();

  const currentRevision = studio?.revision ?? 0;
  const isPublished = !!studio?.published;

  const revisions = (revs.results || []).map((r) => {
    let summary = '';
    try { summary = JSON.parse(r.document).title || 'Trang'; } catch { summary = 'Bản ghi revision'; }
    return {
      revision: r.revision, action: r.action, actor: r.actor, createdAt: r.createdAt, summary,
      isCurrent: r.revision === currentRevision,
      isPublished: isPublished && r.revision === studio?.publishedRevision,
    };
  });
  return { pageId, currentRevision, isPublished, revisions };
}

export async function getPageRevisionSnapshot(db: D1Database, pageId: string, revision: number) {
  const rev = await db.prepare('SELECT revision, document FROM PageStudioRevision WHERE pageId=? AND revision=?').bind(pageId, revision).first<{ revision: number; document: string }>();
  if (!rev) throw new MediaError('Không tìm thấy phiên bản yêu cầu.', 404);
  return { pageId, revision: rev.revision, document: JSON.parse(rev.document) as PageDocument };
}

export async function restorePageRevision(env: MediaEnvironment, pageId: string, targetRevision: number, expectedRevision: number) {
  const snapshot = await getPageRevisionSnapshot(env.DB, pageId, targetRevision);
  const writeResult = await writePage(env, pageId, { expectedRevision, action: 'restore', document: snapshot.document });
  return {
    success: true,
    message: `Đã khôi phục phiên bản #${targetRevision} thành bản nháp mới (rev #${writeResult.revision}). Website chưa thay đổi cho đến khi xuất bản.`,
    restoredFromRevision: targetRevision,
    newRevision: writeResult.revision,
    document: snapshot.document,
  };
}

/**
 * Public DTO resolver: resolves strictly the published snapshot. Drafts never leave this boundary.
 */
export async function publicPageBySlug(db: D1Database, slug: string) {
  let row = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Page p JOIN PageStudio s ON s.pageId = p.id
    WHERE json_extract(s.published, '$.slug')=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
  `).bind(slug).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();

  if (!row) {
    const alias = await db.prepare(`
      SELECT r.pageId FROM PageStudioRevision r
      JOIN Page p ON p.id = r.pageId
      JOIN PageStudio s ON s.pageId = p.id
      WHERE r.action='publish' AND json_extract(r.document, '$.slug')=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
      ORDER BY r.revision DESC LIMIT 1
    `).bind(slug).first<{ pageId: string }>();
    if (alias) {
      row = await db.prepare(`
        SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
        FROM Page p JOIN PageStudio s ON s.pageId = p.id
        WHERE p.id=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
      `).bind(alias.pageId).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();
    }
  }

  if (!row) throw new MediaError('Không tìm thấy trang đã xuất bản.', 404);
  return toPublicPage(db, row.id, row.published, row.updatedAt, row.publishedAt);
}

/**
 * Resolves a published page by its system pageType (e.g. 'WARRANTY' for PDP policy
 * integration). Returns null (not throw) when none is published, so callers can fall
 * back gracefully instead of erroring the whole page.
 */
export async function publicPageByType(db: D1Database, pageType: string) {
  const row = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Page p JOIN PageStudio s ON s.pageId = p.id
    WHERE (p.pageType = ? OR json_extract(s.published, '$.pageType') = ?)
      AND p.deletedAt IS NULL AND s.published IS NOT NULL
    ORDER BY s.publicUpdatedAt DESC, p.id DESC LIMIT 1
  `).bind(pageType, pageType).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();
  if (!row) return null;
  return toPublicPage(db, row.id, row.published, row.updatedAt, row.publishedAt);
}

export type SystemPageResolution =
  | { state: 'PUBLISHED'; page: Awaited<ReturnType<typeof toPublicPage>> }
  | { state: 'NO_CMS_RECORD' }
  | { state: 'DRAFT_ONLY'; pageId: string }
  | { state: 'UNPUBLISHED'; pageId: string };

/**
 * Distinguishes the 4 publication states (A: NO_CMS_RECORD, B: DRAFT_ONLY, C: PUBLISHED, D: UNPUBLISHED).
 * Throws on database/infrastructure errors (State E: Fail-Closed) so callers do NOT mask infrastructure
 * failures as legitimate static fallbacks.
 */
export async function getSystemPageResolution(db: D1Database, pageType: PageType): Promise<SystemPageResolution> {
  // 1. Check for published page
  const publishedRow = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Page p JOIN PageStudio s ON s.pageId = p.id
    WHERE (p.pageType = ? OR json_extract(s.published, '$.pageType') = ?)
      AND p.deletedAt IS NULL AND s.published IS NOT NULL
    ORDER BY s.publicUpdatedAt DESC, p.id DESC LIMIT 1
  `).bind(pageType, pageType).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();

  if (publishedRow) {
    const page = await toPublicPage(db, publishedRow.id, publishedRow.published, publishedRow.updatedAt, publishedRow.publishedAt);
    return { state: 'PUBLISHED', page };
  }

  // 2. Check if a CMS record exists in draft or historical state
  const studioRow = await db.prepare(`
    SELECT p.id, s.publicUpdatedAt,
      (SELECT COUNT(*) FROM PageStudioRevision r WHERE r.pageId = p.id AND r.action = 'publish') AS publishCount,
      (SELECT COUNT(*) FROM PageStudioRevision r WHERE r.pageId = p.id AND r.action = 'unpublish') AS unpublishCount
    FROM Page p JOIN PageStudio s ON s.pageId = p.id
    WHERE (p.pageType = ? OR json_extract(s.draft, '$.pageType') = ?)
      AND p.deletedAt IS NULL
    ORDER BY s.updatedAt DESC LIMIT 1
  `).bind(pageType, pageType).first<{ id: string; publicUpdatedAt: string | null; publishCount: number; unpublishCount: number }>();

  if (!studioRow) {
    // State A: Never had any CMS record
    return { state: 'NO_CMS_RECORD' };
  }

  if (studioRow.publishCount > 0 || studioRow.unpublishCount > 0 || studioRow.publicUpdatedAt !== null) {
    // State D: Intentionally unpublished by operator
    return { state: 'UNPUBLISHED', pageId: studioRow.id };
  }

  // State B: Draft exists, but has never been published
  return { state: 'DRAFT_ONLY', pageId: studioRow.id };
}

async function toPublicPage(db: D1Database, id: string, publishedJson: string, updatedAt: string, publishedAt: string) {
  const d = JSON.parse(publishedJson) as PageDocument;
  let ogImageUrl: string | null = null;
  if (d.seo.ogImageAssetId) {
    const { asset } = await mediaDetail(db, d.seo.ogImageAssetId);
    ogImageUrl = asset.url;
  }
  return {
    id,
    slug: d.slug,
    title: d.title,
    pageType: d.pageType,
    contentHtml: d.contentHtml,
    seo: { title: d.seo.title || d.title, description: d.seo.description, ogImageUrl },
    publishedAt,
    updatedAt,
  };
}
