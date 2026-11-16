-- One campaign owns all its daily windows; legacy continuous campaigns stay unchanged.
ALTER TABLE PromotionCampaign ADD COLUMN scheduleJson TEXT
  CHECK (scheduleJson IS NULL OR (json_valid(scheduleJson) AND json_type(scheduleJson) = 'array' AND json_array_length(scheduleJson) > 0));

CREATE VIEW PromotionCampaignWindow AS
SELECT c.id AS campaignId, json_extract(w.value,'$.startAt') AS startAt, json_extract(w.value,'$.endAt') AS endAt
FROM PromotionCampaign c, json_each(COALESCE(c.scheduleJson,
  json_array(json_object('startAt',c.startAt,'endAt',c.endAt)))) w;

DROP TRIGGER IF EXISTS campaign_published_overlap_guard_update;
CREATE TRIGGER campaign_published_overlap_guard_update BEFORE UPDATE ON PromotionCampaign
FOR EACH ROW WHEN NEW.status = 'PUBLISHED'
BEGIN
 SELECT RAISE(ABORT,'CAMPAIGN_OVERLAP_CONFLICT') WHERE EXISTS (
  SELECT 1 FROM PromotionCampaign other
  JOIN PromotionCampaignWindow ow ON ow.campaignId=other.id
  JOIN PromotionCampaignItem oi ON oi.campaignId=other.id
  JOIN PromotionCampaignItem ti ON ti.campaignId=NEW.id
  JOIN json_each(COALESCE(NEW.scheduleJson,json_array(json_object('startAt',NEW.startAt,'endAt',NEW.endAt)))) nw
  WHERE other.id!=NEW.id AND other.status='PUBLISHED'
    AND json_extract(nw.value,'$.startAt')<ow.endAt AND json_extract(nw.value,'$.endAt')>ow.startAt
    AND oi.productId=ti.productId AND (oi.variantId IS NULL OR ti.variantId IS NULL OR oi.variantId=ti.variantId)
 );
END;

DROP TRIGGER IF EXISTS campaign_item_published_overlap_guard_insert;
CREATE TRIGGER campaign_item_published_overlap_guard_insert BEFORE INSERT ON PromotionCampaignItem
FOR EACH ROW WHEN (SELECT status FROM PromotionCampaign WHERE id=NEW.campaignId)='PUBLISHED'
BEGIN
 SELECT RAISE(ABORT,'CAMPAIGN_OVERLAP_CONFLICT') WHERE EXISTS (
  SELECT 1 FROM PromotionCampaign other
  JOIN PromotionCampaignWindow ow ON ow.campaignId=other.id
  JOIN PromotionCampaignItem oi ON oi.campaignId=other.id
  JOIN PromotionCampaignWindow tw ON tw.campaignId=NEW.campaignId
  WHERE other.id!=NEW.campaignId AND other.status='PUBLISHED'
    AND tw.startAt<ow.endAt AND tw.endAt>ow.startAt
    AND oi.productId=NEW.productId AND (oi.variantId IS NULL OR NEW.variantId IS NULL OR oi.variantId=NEW.variantId)
 );
END;

DROP TRIGGER IF EXISTS campaign_item_published_overlap_guard_update;
CREATE TRIGGER campaign_item_published_overlap_guard_update BEFORE UPDATE ON PromotionCampaignItem
FOR EACH ROW WHEN (SELECT status FROM PromotionCampaign WHERE id=NEW.campaignId)='PUBLISHED'
BEGIN
 SELECT RAISE(ABORT,'CAMPAIGN_OVERLAP_CONFLICT') WHERE EXISTS (
  SELECT 1 FROM PromotionCampaign other
  JOIN PromotionCampaignWindow ow ON ow.campaignId=other.id
  JOIN PromotionCampaignItem oi ON oi.campaignId=other.id
  JOIN PromotionCampaignWindow tw ON tw.campaignId=NEW.campaignId
  WHERE other.id!=NEW.campaignId AND other.status='PUBLISHED'
    AND tw.startAt<ow.endAt AND tw.endAt>ow.startAt
    AND oi.productId=NEW.productId AND (oi.variantId IS NULL OR NEW.variantId IS NULL OR oi.variantId=NEW.variantId)
 );
END;
