import type { D1Database } from '@cloudflare/workers-types';
import { inspectionSchema, type PublicInspection, type PublicInspectionLookupResult } from '@/contracts/catalog/inspection';
import { productHref } from '@/lib/product-paths';
import { MediaError } from './media-library.service';
import { adminAuditStatements } from '../admin-context';

const PUBLIC_CODE_PATTERN = /^[a-zA-Z0-9_-]{2,64}$/;

interface StudioPublishedVariantDoc {
  id?: string;
  availability?: string;
  status?: string;
}

interface StudioPublishedDoc {
  name?: string;
  slug?: string;
  template?: string;
  availability?: string;
  status?: string;
  variants?: StudioPublishedVariantDoc[];
}

function evaluateStudioVisibility(
  studioPublished: string | null | undefined,
  variantIdsToVerify: Array<string | null | undefined>
): { visible: boolean; doc: StudioPublishedDoc | null } {
  if (!studioPublished) {
    return { visible: true, doc: null };
  }
  try {
    const doc = JSON.parse(studioPublished) as StudioPublishedDoc;
    if (doc.availability === 'HIDDEN' || doc.status === 'INACTIVE') {
      return { visible: false, doc: null };
    }
    if (Array.isArray(doc.variants)) {
      for (const vid of variantIdsToVerify) {
        if (!vid) continue;
        const matched = doc.variants.find((v) => v && v.id === vid);
        if (matched && (matched.availability === 'HIDDEN' || matched.status === 'INACTIVE')) {
          return { visible: false, doc: null };
        }
      }
    }
    return { visible: true, doc };
  } catch {
    return { visible: true, doc: null };
  }
}

interface RawPublicInspectionRow extends PublicInspection {
  variantId: string | null;
  studioPublished: string | null;
}

export async function publicInspections(db: D1Database, productId: string, variantId: string | null) {
  if (variantId !== null) {
    const requestedVariant = await db
      .prepare('SELECT productId, status FROM ProductVariant WHERE id = ? LIMIT 1')
      .bind(variantId)
      .first<{ productId: string; status: string | null }>();
    if (
      requestedVariant &&
      (requestedVariant.productId !== productId ||
        !['ACTIVE', 'active'].includes(requestedVariant.status ?? ''))
    ) {
      return [];
    }
  }

  const result = await db
    .prepare(
      `SELECT
        i.publicCode,
        i.checkedAt,
        i.batteryHealth,
        i.appearance,
        i.checks,
        i.limitations,
        i.warranty,
        i.isDemo,
        u.variantId AS variantId,
        s.published AS studioPublished
      FROM ProductInspection i
      JOIN SerialUnit u ON u.id = i.serialUnitId
      JOIN Product p ON p.id = u.productId
      LEFT JOIN ProductVariant v ON v.id = u.variantId AND v.productId = u.productId
      LEFT JOIN ProductStudio s ON s.productId = p.id
      WHERE u.productId = ?
        AND (u.variantId = ? OR u.variantId IS NULL)
        AND u.status = 'AVAILABLE'
        AND i.published = 1
        AND p.status IN ('ACTIVE', 'active')
        AND p.deletedAt IS NULL
        AND (u.variantId IS NULL OR v.status IN ('ACTIVE', 'active'))
        AND (s.productId IS NULL OR s.published IS NOT NULL)
      ORDER BY (u.variantId IS NULL) ASC, i.checkedAt DESC, i.publicCode LIMIT 20`
    )
    .bind(productId, variantId)
    .all<RawPublicInspectionRow>();

  return result.results
    .filter((row) => {
      const code = row.publicCode?.trim() ?? '';
      if (!PUBLIC_CODE_PATTERN.test(code)) return false;
      return evaluateStudioVisibility(row.studioPublished, [variantId, row.variantId]).visible;
    })
    .map(({ studioPublished: _studioPublished, ...inspection }) => ({
      ...inspection,
      publicCode: inspection.publicCode.trim(),
    }));
}

interface RawInspectionLookupRow extends PublicInspection {
  variantId: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  studioPublished: string | null;
}

export async function lookupPublicInspectionByCode(
  db: D1Database,
  rawCode: string
): Promise<PublicInspectionLookupResult | null> {
  const code = rawCode.trim();
  if (!PUBLIC_CODE_PATTERN.test(code)) return null;

  const row = await db
    .prepare(
      `SELECT
        i.publicCode,
        i.checkedAt,
        i.batteryHealth,
        i.appearance,
        i.checks,
        i.limitations,
        i.warranty,
        i.isDemo,
        u.variantId AS variantId,
        p.id AS productId,
        p.name AS productName,
        p.slug AS productSlug,
        s.published AS studioPublished
      FROM ProductInspection i
      JOIN SerialUnit u ON u.id = i.serialUnitId
      JOIN Product p ON p.id = u.productId
      LEFT JOIN ProductVariant v ON v.id = u.variantId AND v.productId = u.productId
      LEFT JOIN ProductStudio s ON s.productId = p.id
      WHERE LOWER(i.publicCode) = LOWER(?)
        AND u.status = 'AVAILABLE'
        AND i.published = 1
        AND p.status IN ('ACTIVE', 'active')
        AND p.deletedAt IS NULL
        AND (u.variantId IS NULL OR v.status IN ('ACTIVE', 'active'))
        AND (s.productId IS NULL OR s.published IS NOT NULL)
      ORDER BY i.checkedAt DESC, i.publicCode ASC
      LIMIT 1`
    )
    .bind(code)
    .first<RawInspectionLookupRow>();

  if (!row) return null;

  const studioCheck = evaluateStudioVisibility(row.studioPublished, [row.variantId]);
  if (!studioCheck.visible) {
    return null;
  }

  let resolvedName = row.productName;
  let resolvedSlug = row.productSlug;
  let resolvedTemplate: string | undefined;

  if (studioCheck.doc) {
    if (typeof studioCheck.doc.name === 'string' && studioCheck.doc.name.trim()) {
      resolvedName = studioCheck.doc.name.trim();
    }
    if (typeof studioCheck.doc.slug === 'string' && studioCheck.doc.slug.trim()) {
      resolvedSlug = studioCheck.doc.slug.trim();
    }
    if (typeof studioCheck.doc.template === 'string' && studioCheck.doc.template.trim()) {
      resolvedTemplate = studioCheck.doc.template.trim();
    }
  }

  return {
    publicCode: row.publicCode.trim(),
    checkedAt: row.checkedAt,
    batteryHealth: row.batteryHealth,
    appearance: row.appearance,
    checks: row.checks,
    limitations: row.limitations,
    warranty: row.warranty,
    isDemo: row.isDemo,
    variantId: row.variantId,
    productId: row.productId,
    productName: resolvedName,
    productSlug: resolvedSlug,
    productHref: productHref({
      slug: resolvedSlug,
      id: row.productId,
      template: resolvedTemplate,
    }),
  };
}

export async function writeInspection(db: D1Database, productId: string, raw: unknown) {
  const d = inspectionSchema.parse(raw);
  const unit = await db.prepare('SELECT id FROM SerialUnit WHERE id=? AND productId=?').bind(d.serialUnitId, productId).first();
  if (!unit) throw new MediaError('Máy không thuộc sản phẩm này.', 404);
  const current = await db.prepare('SELECT updatedAt FROM ProductInspection WHERE serialUnitId=?').bind(d.serialUnitId).first<{ updatedAt: string }>();
  if ((current?.updatedAt ?? null) !== d.expectedUpdatedAt) throw new MediaError('Hồ sơ đã thay đổi. Tải lại trước khi lưu.', 409);
  const now = new Date(Math.max(Date.now(), (current ? Date.parse(current.updatedAt) : 0) + 1)).toISOString();
  const statement = db.prepare(`INSERT INTO ProductInspection(serialUnitId,publicCode,checkedAt,batteryHealth,appearance,checks,limitations,warranty,published,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(serialUnitId) DO UPDATE SET
    publicCode=excluded.publicCode,checkedAt=excluded.checkedAt,batteryHealth=excluded.batteryHealth,
    appearance=excluded.appearance,checks=excluded.checks,limitations=excluded.limitations,warranty=excluded.warranty,
    published=excluded.published,updatedAt=excluded.updatedAt WHERE ProductInspection.updatedAt=?`)
    .bind(d.serialUnitId, d.publicCode, d.checkedAt, d.batteryHealth, d.appearance, d.checks, d.limitations, d.warranty, Number(d.published), now, d.expectedUpdatedAt);
  const result = await db.batch([statement, ...adminAuditStatements(db, 'product.inspection', productId, `Inspection ${d.publicCode}`, null, 'order', { changed: true })]);
  if (result[0].meta.changes !== 1) throw new MediaError('Hồ sơ đã thay đổi. Tải lại trước khi lưu.', 409);
  return { updatedAt: now };
}
