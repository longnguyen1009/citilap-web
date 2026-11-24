-- Admin query performance indexes (prevents full table scans and D1 timeouts as data scales)

-- 1. OrderItem foreign-key indexes (previously had NO secondary indexes)
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "OrderItem_serialUnitId_idx" ON "OrderItem"("serialUnitId");

-- 2. Product & ProductStudio indexes for admin catalog sorting, brand counts, and low-stock checks
CREATE INDEX IF NOT EXISTS "Product_deletedAt_status_updatedAt_idx" ON "Product"("deletedAt", "status", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "Product_brandId_deletedAt_idx" ON "Product"("brandId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductStudio_updatedAt_idx" ON "ProductStudio"("updatedAt" DESC);

-- 3. Content CMS admin list sorting
CREATE INDEX IF NOT EXISTS "Post_deletedAt_updatedAt_idx" ON "Post"("deletedAt", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "Page_deletedAt_updatedAt_idx" ON "Page"("deletedAt", "updatedAt" DESC);

-- 4. Formalize MediaFolder schema & index in migration (so runtime GET requests never run DDL)
CREATE TABLE IF NOT EXISTS "MediaFolder" (
  "slug" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "isSystem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS "MediaAsset_folder_idx" ON "MediaAsset"("state", "folder", "createdAt" DESC);
