-- STORE-20: R07B.3 CAS Revision & Overlap Atomic DB Invariants
-- Migration 0020: Triggers for strict monotonic CAS revision and published overlap prevention

-- 1. CAS Revision Guard: Every update to PromotionCampaign must advance revision by exactly +1
CREATE TRIGGER IF NOT EXISTS "campaign_revision_guard"
BEFORE UPDATE OF revision ON "PromotionCampaign"
FOR EACH ROW
WHEN NEW.revision != OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT, 'CAMPAIGN_REVISION_CONFLICT');
END;

-- 2. Published Overlap Guard on PromotionCampaign:
-- Triggers when a campaign is published or when startAt/endAt is modified while PUBLISHED
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
      AND (
        (item_this.variantId IS NOT NULL AND item_other.variantId = item_this.variantId)
        OR
        (item_this.variantId IS NULL AND item_other.variantId IS NULL AND item_other.productId = item_this.productId)
      )
  );
END;

-- 3. Published Overlap Guard on PromotionCampaignItem (INSERT):
-- Triggers when items are added to a campaign that is already PUBLISHED
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
      AND (
        (NEW.variantId IS NOT NULL AND item_other.variantId = NEW.variantId)
        OR
        (NEW.variantId IS NULL AND item_other.variantId IS NULL AND item_other.productId = NEW.productId)
      )
  );
END;

-- 4. Published Overlap Guard on PromotionCampaignItem (UPDATE):
-- Triggers when items are modified on a campaign that is already PUBLISHED
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
      AND (
        (NEW.variantId IS NOT NULL AND item_other.variantId = NEW.variantId)
        OR
        (NEW.variantId IS NULL AND item_other.variantId IS NULL AND item_other.productId = NEW.productId)
      )
  );
END;
