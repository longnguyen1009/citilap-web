import type { D1Database } from '@cloudflare/workers-types';
import { inspectionSchema, type PublicInspection } from '@/contracts/catalog/inspection';
import { MediaError } from './media-library.service';
import { adminAuditStatements } from '../admin-context';

export async function publicInspections(db: D1Database, productId: string, variantId: string | null) {
  const result = await db.prepare(`SELECT i.publicCode,i.checkedAt,i.batteryHealth,i.appearance,i.checks,i.limitations,i.warranty,i.isDemo
    FROM ProductInspection i JOIN SerialUnit u ON u.id=i.serialUnitId
    JOIN Product p ON p.id=u.productId LEFT JOIN ProductStudio s ON s.productId=p.id
    WHERE u.productId=? AND (u.variantId=? OR (u.variantId IS NULL AND ? IS NULL))
      AND u.status='AVAILABLE' AND i.published=1 AND p.status IN ('ACTIVE','active')
      AND p.deletedAt IS NULL AND (s.productId IS NULL OR s.published IS NOT NULL)
    ORDER BY i.checkedAt DESC,i.publicCode LIMIT 20`).bind(productId, variantId, variantId).all<PublicInspection>();
  return result.results;
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
