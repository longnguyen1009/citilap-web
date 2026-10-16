-- STORE-18: R07B.1 Promotion Campaigns, Variant-level Pricing & OrderItem Snapshots
-- Migration 0018: Create PromotionCampaign, PromotionCampaignItem, and add snapshot columns to OrderItem

-- 1. Create PromotionCampaign table
CREATE TABLE IF NOT EXISTS "PromotionCampaign" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  "startAt" DATETIME NOT NULL,
  "endAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PromotionCampaign_status_idx" ON "PromotionCampaign"("status");
CREATE INDEX IF NOT EXISTS "PromotionCampaign_startAt_endAt_idx" ON "PromotionCampaign"("startAt", "endAt");

-- 2. Create PromotionCampaignItem table for product & variant-level campaign pricing
CREATE TABLE IF NOT EXISTS "PromotionCampaignItem" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "campaignId" TEXT NOT NULL REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "variantId" TEXT,
  "salePrice" INTEGER NOT NULL, -- Integer VND
  "regularPrice" INTEGER, -- Integer VND regular price at configuration time
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromotionCampaignItem_unique_target" 
  ON "PromotionCampaignItem"("campaignId", "productId", COALESCE("variantId", ''));
CREATE INDEX IF NOT EXISTS "PromotionCampaignItem_productId_idx" ON "PromotionCampaignItem"("productId");
CREATE INDEX IF NOT EXISTS "PromotionCampaignItem_variantId_idx" ON "PromotionCampaignItem"("variantId");

-- 3. Add authoritative pricing snapshot columns to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "regularPriceSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "compareAtPriceSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "campaignSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "pricingEvaluatedAt" DATETIME;
