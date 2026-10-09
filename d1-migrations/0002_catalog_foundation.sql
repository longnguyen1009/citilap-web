-- Migration: 0002_catalog_foundation.sql
-- Goal: Introduce Brand model, ProductImage model, Category extensions,
--       normalize Product & Variant filter specifications, and migrate all monetary fields to INTEGER (VND).

-- 1. Create Brand table
CREATE TABLE IF NOT EXISTS "Brand" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX IF NOT EXISTS "Brand_status_idx" ON "Brand"("status");

-- 2. Extend Category table
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "Category_status_idx" ON "Category"("status");
CREATE INDEX IF NOT EXISTS "Category_sortOrder_idx" ON "Category"("sortOrder");

-- 3. Recreate Product table with Integer money, Brand relation, and filter spec columns
CREATE TABLE "Product_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "shortDescription" TEXT,
  "contentHtml" TEXT,
  "brand" TEXT,
  "brandId" TEXT,
  "model" TEXT,
  "series" TEXT,
  "warranty" TEXT,
  "condition" TEXT NOT NULL DEFAULT 'NEW',
  "origin" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalSlug" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
  "isNewArrival" BOOLEAN NOT NULL DEFAULT 0,
  "isFlashSale" BOOLEAN NOT NULL DEFAULT 0,
  "isBestSeller" BOOLEAN NOT NULL DEFAULT 0,
  "allowBackorder" BOOLEAN NOT NULL DEFAULT 0,
  "minOrderQty" INTEGER NOT NULL DEFAULT 1,
  "maxOrderQty" INTEGER,
  "lowestPrice30d" INTEGER,
  "publishAt" DATETIME,
  "unpublishAt" DATETIME,
  "price" INTEGER NOT NULL,
  "originalPrice" INTEGER,
  "images" TEXT NOT NULL DEFAULT '[]',
  "stock" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cpu" TEXT,
  "cpuSeries" TEXT,
  "gpu" TEXT,
  "gpuSeries" TEXT,
  "ram" TEXT,
  "ramGb" INTEGER,
  "storage" TEXT,
  "storageGb" INTEGER,
  "display" TEXT,
  "screenSize" REAL,
  "refreshRate" INTEGER,
  "specs" TEXT,
  "tags" TEXT,
  "categoryId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Product_new" (
  "id", "name", "slug", "description", "contentHtml", "brand", "model", "series",
  "warranty", "condition", "origin", "seoTitle", "seoDescription", "canonicalSlug",
  "isFeatured", "isNewArrival", "isFlashSale", "isBestSeller", "allowBackorder",
  "minOrderQty", "maxOrderQty", "lowestPrice30d", "publishAt", "unpublishAt",
  "price", "originalPrice", "images", "stock", "status", "specs", "tags",
  "categoryId", "createdAt", "updatedAt"
)
SELECT
  "id", "name", "slug", "description", "contentHtml", "brand", "model", "series",
  "warranty", COALESCE("condition", 'NEW'), "origin", "seoTitle", "seoDescription", "canonicalSlug",
  "isFeatured", "isNewArrival", "isFlashSale", "isBestSeller", "allowBackorder",
  "minOrderQty", "maxOrderQty", CAST("lowestPrice30d" AS INTEGER), "publishAt", "unpublishAt",
  CAST("price" AS INTEGER), CAST("originalPrice" AS INTEGER), "images", "stock",
  CASE WHEN UPPER("status") = 'ACTIVE' THEN 'ACTIVE' WHEN UPPER("status") = 'DRAFT' THEN 'DRAFT' WHEN UPPER("status") = 'ARCHIVED' THEN 'ARCHIVED' ELSE 'ACTIVE' END,
  "specs", "tags", "categoryId", "createdAt", "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "Product_new" RENAME TO "Product";

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_condition_idx" ON "Product"("condition");
CREATE INDEX "Product_price_idx" ON "Product"("price");
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
CREATE INDEX "Product_isNewArrival_idx" ON "Product"("isNewArrival");
CREATE INDEX "Product_isFlashSale_idx" ON "Product"("isFlashSale");
CREATE INDEX "Product_isBestSeller_idx" ON "Product"("isBestSeller");
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "Product_ramGb_idx" ON "Product"("ramGb");
CREATE INDEX "Product_cpuSeries_idx" ON "Product"("cpuSeries");
CREATE INDEX "Product_gpuSeries_idx" ON "Product"("gpuSeries");

-- 4. Recreate ProductVariant table with Integer money and spec columns
CREATE TABLE "ProductVariant_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "options" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "originalPrice" INTEGER,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cpu" TEXT,
  "gpu" TEXT,
  "ram" TEXT,
  "storage" TEXT,
  "display" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "ProductVariant_new" ("id", "productId", "sku", "name", "options", "price", "originalPrice", "stock", "image", "status", "createdAt", "updatedAt")
SELECT "id", "productId", "sku", "name", "options", CAST("price" AS INTEGER), CAST("originalPrice" AS INTEGER), "stock", "image", CASE WHEN UPPER("status") = 'ACTIVE' THEN 'ACTIVE' ELSE 'INACTIVE' END, "createdAt", "updatedAt"
FROM "ProductVariant";

DROP TABLE "ProductVariant";
ALTER TABLE "ProductVariant_new" RENAME TO "ProductVariant";

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_status_idx" ON "ProductVariant"("status");

-- 5. Create ProductImage table (metadata for Cloudflare R2)
CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "r2Key" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT DEFAULT 'image/webp',
  "width" INTEGER,
  "height" INTEGER,
  "size" INTEGER,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX IF NOT EXISTS "ProductImage_variantId_idx" ON "ProductImage"("variantId");
CREATE INDEX IF NOT EXISTS "ProductImage_isPrimary_idx" ON "ProductImage"("isPrimary");
CREATE INDEX IF NOT EXISTS "ProductImage_sortOrder_idx" ON "ProductImage"("sortOrder");

-- 6. Migrate User money field (totalSpend) to Integer
CREATE TABLE "User_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "tier" TEXT NOT NULL DEFAULT 'Mới',
  "totalSpend" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "User_new" ("id", "email", "password", "name", "phone", "role", "tier", "totalSpend", "createdAt", "updatedAt")
SELECT "id", "email", "password", "name", "phone", "role", "tier", CAST("totalSpend" AS INTEGER), "createdAt", "updatedAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "User_new" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- 7. Migrate Order and OrderItem money fields to Integer
CREATE TABLE "Order_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderNumber" TEXT,
  "idempotencyKey" TEXT,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Chờ xác nhận',
  "totalAmount" INTEGER NOT NULL,
  "shippingFee" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "shippingAddress" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "shippingMethod" TEXT,
  "note" TEXT,
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'Chưa thanh toán',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "Order_new" ("id", "orderNumber", "idempotencyKey", "userId", "status", "totalAmount", "shippingFee", "discountAmount", "shippingAddress", "customerName", "customerPhone", "customerEmail", "shippingMethod", "note", "paymentMethod", "paymentStatus", "createdAt", "updatedAt")
SELECT "id", "orderNumber", "idempotencyKey", "userId", "status", CAST("totalAmount" AS INTEGER), CAST("shippingFee" AS INTEGER), CAST("discountAmount" AS INTEGER), "shippingAddress", "customerName", "customerPhone", "customerEmail", "shippingMethod", "note", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "Order_new" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

CREATE TABLE "OrderItem_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productName" TEXT,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "OrderItem_new" ("id", "orderId", "productId", "variantId", "productName", "sku", "quantity", "price", "createdAt", "updatedAt")
SELECT "id", "orderId", "productId", "variantId", "productName", "sku", "quantity", CAST("price" AS INTEGER), "createdAt", "updatedAt"
FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "OrderItem_new" RENAME TO "OrderItem";
