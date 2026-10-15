-- STORE-15: R06 Order Management, Internal Notes, Timeline Audit, Notifications & Contacts
-- Migration 0015: Add revision to Order, create OrderEvent, OrderNote, AdminNotification, and enhance ContactSubmission

-- 1. Add revision to Order for optimistic concurrency control (CAS)
ALTER TABLE "Order" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

-- 2. Migrate legacy status values to clean standardized status codes
-- PENDING -> NEW (Mới), COMPLETED remains COMPLETED (Hoàn tất)
UPDATE "Order"
SET "status" = 'NEW'
WHERE "status" = 'PENDING' OR "status" = 'Chờ xác nhận' OR "status" = 'Đang xử lý';

UPDATE "Order"
SET "status" = 'COMPLETED'
WHERE "status" = 'Đã hoàn thành';

-- 3. Create OrderEvent for append-only timeline and status change audit
CREATE TABLE IF NOT EXISTS "OrderEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'CREATED', 'STATUS_CHANGE', 'NOTE_ADDED', 'CANCELLED', 'REOPENED'
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reason" TEXT,
  "note" TEXT,
  "actor" TEXT NOT NULL DEFAULT 'Hệ thống',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");
CREATE INDEX IF NOT EXISTS "OrderEvent_createdAt_idx" ON "OrderEvent"("createdAt");

-- 4. Create OrderNote for tracked internal staff notes
CREATE TABLE IF NOT EXISTS "OrderNote" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'Nhân viên vận hành',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderNote_orderId_idx" ON "OrderNote"("orderId");
CREATE INDEX IF NOT EXISTS "OrderNote_createdAt_idx" ON "OrderNote"("createdAt");

-- 5. Create AdminNotification for in-admin order and contact alerts
CREATE TABLE IF NOT EXISTS "AdminNotification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "type" TEXT NOT NULL, -- 'NEW_ORDER', 'ORDER_STATUS_CHANGED', 'NEW_CONTACT'
  "referenceId" TEXT NOT NULL, -- orderId or contactId
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" INTEGER NOT NULL DEFAULT 0,
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_idx" ON "AdminNotification"("isRead");
CREATE INDEX IF NOT EXISTS "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminNotification_type_referenceId_key" ON "AdminNotification"("type", "referenceId");

-- 6. Enhance ContactSubmission with internal note and handled timestamp
ALTER TABLE "ContactSubmission" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "ContactSubmission" ADD COLUMN "handledAt" DATETIME;
ALTER TABLE "ContactSubmission" ADD COLUMN "handledBy" TEXT;
