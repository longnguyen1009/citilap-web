-- 0031_coupons.sql: Coupon management & redemption tracking
CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discountType" TEXT NOT NULL DEFAULT 'FIXED' CHECK ("discountType" IN ('FIXED', 'PERCENT')),
  "discountValue" INTEGER NOT NULL CHECK ("discountValue" > 0),
  "maxDiscountAmount" INTEGER CHECK ("maxDiscountAmount" IS NULL OR "maxDiscountAmount" > 0),
  "minOrderAmount" INTEGER NOT NULL DEFAULT 0 CHECK ("minOrderAmount" >= 0),
  "quantityLimit" INTEGER CHECK ("quantityLimit" IS NULL OR "quantityLimit" > 0),
  "usedCount" INTEGER NOT NULL DEFAULT 0 CHECK ("usedCount" >= 0),
  "startAt" TEXT NOT NULL,
  "endAt" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  "applyScope" TEXT NOT NULL DEFAULT 'ALL' CHECK ("applyScope" IN ('ALL', 'CONDITION_LIKE_NEW', 'PRODUCTS')),
  "productIdsJson" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("productIdsJson") AND json_type("productIdsJson") = 'array'),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ("startAt" < "endAt")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_status_startAt_endAt_idx" ON "Coupon"("status", "startAt", "endAt");

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "couponId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderNumber" TEXT,
  "customerPhone" TEXT,
  "discountAmount" INTEGER NOT NULL CHECK ("discountAmount" >= 0),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_orderId_idx" ON "CouponRedemption"("orderId");
