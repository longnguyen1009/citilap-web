-- 0021 is reserved for the separate R08 identity branch.
-- Legacy orders stay NULL; never backfill using current payment instructions.
ALTER TABLE "Order" ADD COLUMN "checkoutSnapshot" TEXT;
