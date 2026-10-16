-- STORE-19: R07B.2 Promotion Campaign CAS Revision & Concurrency Guard
ALTER TABLE "PromotionCampaign" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
