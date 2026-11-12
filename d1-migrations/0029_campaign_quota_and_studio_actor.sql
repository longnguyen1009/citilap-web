-- Migration 0029: Flash Sale quota limits (quantityLimit, perCustomerLimit, soldCount),
-- ProductStudioRevision actor column, and product-vs-variant overlap trigger enhancement.

ALTER TABLE "PromotionCampaignItem" ADD COLUMN "quantityLimit" INTEGER;
ALTER TABLE "PromotionCampaignItem" ADD COLUMN "perCustomerLimit" INTEGER;
ALTER TABLE "PromotionCampaignItem" ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductStudioRevision" ADD COLUMN "actor" TEXT NOT NULL DEFAULT 'admin';

DROP TRIGGER IF EXISTS "campaign_published_overlap_guard_update";
CREATE TRIGGER IF NOT EXISTS "campaign_published_overlap_guard_update"
BEFORE UPDATE ON "PromotionCampaign"
FOR EACH ROW
WHEN NEW.status = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'CAMPAIGN_OVERLAP_CONFLICT')
  WHERE EXISTS (
    SELECT 1
    FROM "PromotionCampaign" other
    JOIN "PromotionCampaignItem" item_other ON item_other.campaignId = other.id
    JOIN "PromotionCampaignItem" item_this ON item_this.campaignId = NEW.id
    WHERE other.id != NEW.id
      AND other.status = 'PUBLISHED'
      AND NEW.startAt < other.endAt
      AND NEW.endAt > other.startAt
      AND item_other.productId = item_this.productId
      AND (
        item_this.variantId IS NULL
        OR item_other.variantId IS NULL
        OR item_other.variantId = item_this.variantId
      )
  );
END;

DROP TRIGGER IF EXISTS "campaign_item_published_overlap_guard_insert";
CREATE TRIGGER IF NOT EXISTS "campaign_item_published_overlap_guard_insert"
BEFORE INSERT ON "PromotionCampaignItem"
FOR EACH ROW
WHEN (SELECT status FROM "PromotionCampaign" WHERE id = NEW.campaignId) = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'CAMPAIGN_OVERLAP_CONFLICT')
  WHERE EXISTS (
    SELECT 1
    FROM "PromotionCampaign" other
    JOIN "PromotionCampaignItem" item_other ON item_other.campaignId = other.id
    JOIN "PromotionCampaign" this_camp ON this_camp.id = NEW.campaignId
    WHERE other.id != this_camp.id
      AND other.status = 'PUBLISHED'
      AND this_camp.startAt < other.endAt
      AND this_camp.endAt > other.startAt
      AND item_other.productId = NEW.productId
      AND (
        NEW.variantId IS NULL
        OR item_other.variantId IS NULL
        OR item_other.variantId = NEW.variantId
      )
  );
END;

DROP TRIGGER IF EXISTS "campaign_item_published_overlap_guard_update";
CREATE TRIGGER IF NOT EXISTS "campaign_item_published_overlap_guard_update"
BEFORE UPDATE ON "PromotionCampaignItem"
FOR EACH ROW
WHEN (SELECT status FROM "PromotionCampaign" WHERE id = NEW.campaignId) = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'CAMPAIGN_OVERLAP_CONFLICT')
  WHERE EXISTS (
    SELECT 1
    FROM "PromotionCampaign" other
    JOIN "PromotionCampaignItem" item_other ON item_other.campaignId = other.id
    JOIN "PromotionCampaign" this_camp ON this_camp.id = NEW.campaignId
    WHERE other.id != this_camp.id
      AND other.status = 'PUBLISHED'
      AND this_camp.startAt < other.endAt
      AND this_camp.endAt > other.startAt
      AND item_other.productId = NEW.productId
      AND (
        NEW.variantId IS NULL
        OR item_other.variantId IS NULL
        OR item_other.variantId = NEW.variantId
      )
  );
END;
