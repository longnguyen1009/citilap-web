-- Migration 0006: Add serialUnitId column to OrderItem if missing
ALTER TABLE "OrderItem" ADD COLUMN "serialUnitId" TEXT;
