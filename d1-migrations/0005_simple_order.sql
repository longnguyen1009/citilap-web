-- STORE-10: Simple Cart, Checkout & Order Persistence
-- Migration 0005: Update Order table for guest checkout, status simplification (PENDING/COMPLETED),
-- snapshot fields, and idempotency payload tracking.

PRAGMA foreign_keys = OFF;

CREATE TABLE "Order_v2" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderNumber" TEXT,
  "idempotencyKey" TEXT,
  "payloadHash" TEXT,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
  "shippingFee" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "shippingAddress" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "shippingMethod" TEXT DEFAULT 'standard',
  "note" TEXT,
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Order_v2" (
  "id", "orderNumber", "idempotencyKey", "userId", "status",
  "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
  "shippingAddress", "customerName", "customerPhone", "customerEmail",
  "shippingMethod", "note", "paymentMethod", "paymentStatus",
  "createdAt", "updatedAt"
)
SELECT
  "id", "orderNumber", "idempotencyKey", "userId",
  CASE 
    WHEN "status" = 'Đã hoàn thành' THEN 'COMPLETED'
    ELSE 'PENDING'
  END,
  "totalAmount",
  COALESCE("shippingFee", 0),
  COALESCE("discountAmount", 0),
  COALESCE("totalAmount", 0),
  "shippingAddress",
  COALESCE("customerName", 'Khách vãng lai'),
  COALESCE("customerPhone", '0900000000'),
  "customerEmail",
  COALESCE("shippingMethod", 'standard'),
  "note",
  COALESCE("paymentMethod", 'COD'),
  COALESCE("paymentStatus", 'PENDING'),
  "createdAt", "updatedAt"
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "Order_v2" RENAME TO "Order";

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- Add snapshot and lineTotal columns to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "productNameSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "skuSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantNameSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "priceSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "lineTotal" INTEGER NOT NULL DEFAULT 0;

UPDATE "OrderItem"
SET 
  "productNameSnapshot" = "productName",
  "skuSnapshot" = "sku",
  "priceSnapshot" = "price",
  "lineTotal" = "price" * "quantity"
WHERE "productNameSnapshot" IS NULL;

PRAGMA foreign_keys = ON;
