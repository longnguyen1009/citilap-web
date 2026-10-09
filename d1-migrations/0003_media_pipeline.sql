-- ==============================================================================
-- CITILAP E-COMMERCE: D1 MIGRATION 0003 — MEDIA PIPELINE
-- Makes ProductImage.url nullable (r2Key is source of truth)
-- Adds index on ProductImage.r2Key for fast lookup
-- Deterministic SQLite table migration
-- ==============================================================================

-- 1. Create new ProductImage table with nullable url
CREATE TABLE "new_ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "r2Key" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT DEFAULT 'image/webp',
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Copy existing metadata from old table
INSERT INTO "new_ProductImage" ("id", "productId", "variantId", "r2Key", "url", "mimeType", "width", "height", "size", "alt", "sortOrder", "isPrimary", "createdAt")
SELECT "id", "productId", "variantId", "r2Key", "url", "mimeType", "width", "height", "size", "alt", "sortOrder", "isPrimary", "createdAt"
FROM "ProductImage";

-- 3. Replace old table
DROP TABLE "ProductImage";
ALTER TABLE "new_ProductImage" RENAME TO "ProductImage";

-- 4. Re-create indexes including new r2Key index
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX "ProductImage_variantId_idx" ON "ProductImage"("variantId");
CREATE INDEX "ProductImage_r2Key_idx" ON "ProductImage"("r2Key");
CREATE INDEX "ProductImage_isPrimary_idx" ON "ProductImage"("isPrimary");
CREATE INDEX "ProductImage_sortOrder_idx" ON "ProductImage"("sortOrder");
