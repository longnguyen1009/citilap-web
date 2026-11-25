import type { D1Database } from '@cloudflare/workers-types';
import { couponInputSchema, type CouponInput, type CouponRecord, type PublicCouponDto } from '@/contracts/coupon';

export class CouponError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

interface RawCouponRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  quantityLimit: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  status: string;
  applyScope: string;
  productIdsJson: string;
  createdAt: string;
  updatedAt: string;
}

function parseCouponRow(row: RawCouponRow): CouponRecord {
  let productIds: string[] = [];
  try {
    const parsed = JSON.parse(row.productIdsJson || '[]');
    if (Array.isArray(parsed)) productIds = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    productIds = [];
  }
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
    discountValue: Number(row.discountValue) || 0,
    maxDiscountAmount: row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
    minOrderAmount: Number(row.minOrderAmount) || 0,
    quantityLimit: row.quantityLimit != null ? Number(row.quantityLimit) : null,
    usedCount: Number(row.usedCount) || 0,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    applyScope:
      row.applyScope === 'CONDITION_LIKE_NEW' || row.applyScope === 'PRODUCTS'
        ? row.applyScope
        : 'ALL',
    productIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCoupons(db: D1Database): Promise<CouponRecord[]> {
  const { results } = await db
    .prepare('SELECT * FROM "Coupon" ORDER BY "createdAt" DESC, "discountValue" DESC')
    .all<RawCouponRow>();
  return (results || []).map(parseCouponRow);
}

export async function getCouponById(db: D1Database, id: string): Promise<CouponRecord | null> {
  const row = await db.prepare('SELECT * FROM "Coupon" WHERE "id" = ?').bind(id).first<RawCouponRow>();
  return row ? parseCouponRow(row) : null;
}

export async function getCouponByCode(db: D1Database, rawCode: string): Promise<CouponRecord | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const row = await db.prepare('SELECT * FROM "Coupon" WHERE "code" = ?').bind(code).first<RawCouponRow>();
  return row ? parseCouponRow(row) : null;
}

export async function createCoupon(db: D1Database, rawInput: unknown): Promise<CouponRecord> {
  const input: CouponInput = couponInputSchema.parse(rawInput);
  const existing = await getCouponByCode(db, input.code);
  if (existing) {
    throw new CouponError('COUPON_CODE_EXISTS', `Mã giảm giá "${input.code}" đã tồn tại.`, 409);
  }
  const id = 'cpn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const startIso = new Date(input.startAt).toISOString();
  const endIso = new Date(input.endAt).toISOString();
  const uniqueProductIds = [...new Set(input.productIds)];

  await db
    .prepare(
      `INSERT INTO "Coupon" (
        "id", "code", "name", "description", "discountType", "discountValue",
        "maxDiscountAmount", "minOrderAmount", "quantityLimit", "usedCount",
        "startAt", "endAt", "status", "applyScope", "productIdsJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.code,
      input.name,
      input.description || null,
      input.discountType,
      input.discountValue,
      input.maxDiscountAmount ?? null,
      input.minOrderAmount ?? 0,
      input.quantityLimit ?? null,
      startIso,
      endIso,
      input.status,
      input.applyScope,
      JSON.stringify(input.applyScope === 'PRODUCTS' ? uniqueProductIds : []),
      now,
      now
    )
    .run();

  const created = await getCouponById(db, id);
  if (!created) throw new CouponError('COUPON_CREATE_FAILED', 'Không thể tạo mã giảm giá.', 500);
  return created;
}

export async function updateCoupon(db: D1Database, id: string, rawInput: unknown): Promise<CouponRecord> {
  const existing = await getCouponById(db, id);
  if (!existing) throw new CouponError('COUPON_NOT_FOUND', 'Không tìm thấy mã giảm giá.', 404);

  const input: CouponInput = couponInputSchema.parse(rawInput);
  if (input.code !== existing.code) {
    const dup = await getCouponByCode(db, input.code);
    if (dup && dup.id !== id) {
      throw new CouponError('COUPON_CODE_EXISTS', `Mã giảm giá "${input.code}" đã tồn tại.`, 409);
    }
  }
  let effectiveQuantityLimit = input.quantityLimit ?? null;
  let effectiveUsedCount = existing.usedCount;

  if (effectiveQuantityLimit != null) {
    if (input.remainingCount != null) {
      if (input.remainingCount > effectiveQuantityLimit) {
        effectiveQuantityLimit = input.remainingCount;
        effectiveUsedCount = 0;
      } else {
        effectiveUsedCount = effectiveQuantityLimit - input.remainingCount;
      }
    } else if (effectiveQuantityLimit < existing.usedCount) {
      throw new CouponError(
        'COUPON_LIMIT_TOO_LOW',
        `Số lượng phát hành (${effectiveQuantityLimit}) không được nhỏ hơn số lượt đã dùng (${existing.usedCount}).`,
        400
      );
    }
  }

  const now = new Date().toISOString();
  const startIso = new Date(input.startAt).toISOString();
  const endIso = new Date(input.endAt).toISOString();
  const uniqueProductIds = [...new Set(input.productIds)];

  await db
    .prepare(
      `UPDATE "Coupon"
       SET "code" = ?, "name" = ?, "description" = ?, "discountType" = ?, "discountValue" = ?,
           "maxDiscountAmount" = ?, "minOrderAmount" = ?, "quantityLimit" = ?, "usedCount" = ?,
           "startAt" = ?, "endAt" = ?, "status" = ?, "applyScope" = ?, "productIdsJson" = ?, "updatedAt" = ?
       WHERE "id" = ?`
    )
    .bind(
      input.code,
      input.name,
      input.description || null,
      input.discountType,
      input.discountValue,
      input.maxDiscountAmount ?? null,
      input.minOrderAmount ?? 0,
      effectiveQuantityLimit,
      effectiveUsedCount,
      startIso,
      endIso,
      input.status,
      input.applyScope,
      JSON.stringify(input.applyScope === 'PRODUCTS' ? uniqueProductIds : []),
      now,
      id
    )
    .run();

  const updated = await getCouponById(db, id);
  if (!updated) throw new CouponError('COUPON_UPDATE_FAILED', 'Không thể cập nhật mã giảm giá.', 500);
  return updated;
}

export async function deleteCoupon(db: D1Database, id: string): Promise<void> {
  const existing = await getCouponById(db, id);
  if (!existing) throw new CouponError('COUPON_NOT_FOUND', 'Không tìm thấy mã giảm giá.', 404);
  await db.prepare('DELETE FROM "Coupon" WHERE "id" = ?').bind(id).run();
}

export async function listPublicCoupons(db: D1Database, at = new Date()): Promise<PublicCouponDto[]> {
  const nowIso = at.toISOString();
  const { results } = await db
    .prepare(
      `SELECT * FROM "Coupon"
       WHERE "status" = 'ACTIVE' AND "endAt" >= ?
       ORDER BY "discountValue" DESC, "createdAt" DESC`
    )
    .bind(nowIso)
    .all<RawCouponRow>();

  return (results || []).map((row) => {
    const c = parseCouponRow(row);
    const remaining = c.quantityLimit != null ? Math.max(0, c.quantityLimit - c.usedCount) : null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscountAmount: c.maxDiscountAmount,
      minOrderAmount: c.minOrderAmount,
      quantityLimit: c.quantityLimit,
      usedCount: c.usedCount,
      remaining,
      startAt: c.startAt,
      endAt: c.endAt,
      applyScope: c.applyScope,
      isExhausted: remaining !== null && remaining <= 0,
    };
  });
}

export interface CouponEvaluationItem {
  productId: string;
  condition: string;
  lineTotal: number;
}

export interface EvaluatedCoupon {
  coupon: CouponRecord;
  discountAmount: number;
  eligibleSubtotal: number;
}

export async function evaluateCouponForCheckout(
  db: D1Database,
  rawCode: string,
  items: CouponEvaluationItem[],
  at = new Date()
): Promise<EvaluatedCoupon> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await getCouponByCode(db, code);
  if (!coupon) {
    throw new CouponError('COUPON_NOT_FOUND', `Mã giảm giá "${code}" không tồn tại.`, 400);
  }
  if (coupon.status !== 'ACTIVE') {
    throw new CouponError('COUPON_INACTIVE', `Mã giảm giá "${code}" hiện đang tạm ngưng.`, 400);
  }
  const nowMs = at.getTime();
  const startMs = Date.parse(coupon.startAt);
  const endMs = Date.parse(coupon.endAt);
  if (Number.isFinite(startMs) && nowMs < startMs) {
    throw new CouponError('COUPON_NOT_STARTED', `Mã giảm giá "${code}" chưa đến thời gian áp dụng.`, 400);
  }
  if (Number.isFinite(endMs) && nowMs > endMs) {
    throw new CouponError('COUPON_EXPIRED', `Mã giảm giá "${code}" đã hết hạn sử dụng.`, 400);
  }
  if (coupon.quantityLimit != null && coupon.usedCount >= coupon.quantityLimit) {
    throw new CouponError('COUPON_EXHAUSTED', `Mã giảm giá "${code}" đã hết lượt sử dụng.`, 400);
  }

  let eligibleItems = items;
  if (coupon.applyScope === 'CONDITION_LIKE_NEW') {
    eligibleItems = items.filter((i) => i.condition === 'LIKE_NEW');
    if (eligibleItems.length === 0) {
      throw new CouponError(
        'COUPON_SCOPE_MISMATCH',
        `Mã giảm giá "${code}" chỉ áp dụng cho sản phẩm Laptop LikeNew 99%.`,
        400
      );
    }
  } else if (coupon.applyScope === 'PRODUCTS') {
    const allowedSet = new Set(coupon.productIds);
    eligibleItems = items.filter((i) => allowedSet.has(i.productId));
    if (eligibleItems.length === 0) {
      throw new CouponError(
        'COUPON_SCOPE_MISMATCH',
        `Mã giảm giá "${code}" không áp dụng cho sản phẩm trong giỏ hàng hiện tại.`,
        400
      );
    }
  }

  const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.lineTotal, 0);
  if (coupon.minOrderAmount > 0 && eligibleSubtotal < coupon.minOrderAmount) {
    throw new CouponError(
      'COUPON_MIN_ORDER',
      `Mã "${code}" yêu cầu đơn hàng tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}đ.`,
      400
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENT') {
    discountAmount = Math.floor((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount != null) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }
  discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));

  return { coupon, discountAmount, eligibleSubtotal };
}
