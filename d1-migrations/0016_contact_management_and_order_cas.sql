-- ==============================================================================
-- Migration: 0016_contact_management_and_order_cas.sql
-- Description: Adds revision, startedProcessingAt, and ContactEvent timeline
--              to ContactSubmission for strict CAS optimistic concurrency,
--              audit history, and non-destructive note tracking.
-- ==============================================================================

-- 1. Add revision to ContactSubmission for CAS optimistic concurrency control
ALTER TABLE "ContactSubmission" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- 2. Add startedProcessingAt to track when triage began vs when it finished
ALTER TABLE "ContactSubmission" ADD COLUMN "startedProcessingAt" DATETIME;

-- 3. Create ContactEvent table for append-only audit history of status & notes
CREATE TABLE IF NOT EXISTS "ContactEvent" (
  "id" TEXT PRIMARY KEY,
  "contactId" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- STATUS_CHANGE, NOTE_ADDED
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "note" TEXT,
  "actor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("contactId") REFERENCES "ContactSubmission"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_contact_event_contact" ON "ContactEvent"("contactId");
CREATE INDEX IF NOT EXISTS "idx_contact_event_created_at" ON "ContactEvent"("createdAt");

-- 4. Preserve existing internal notes by seeding initial ContactEvent records
INSERT INTO "ContactEvent" ("id", "contactId", "action", "fromStatus", "toStatus", "note", "actor", "createdAt")
SELECT
  'ce-init-' || "id",
  "id",
  CASE WHEN "status" = 'HANDLED' THEN 'STATUS_CHANGE' ELSE 'NOTE_ADDED' END,
  'PENDING',
  "status",
  "internalNote",
  COALESCE("handledBy", 'Admin vận hành (Phiên dùng chung)'),
  COALESCE("handledAt", "createdAt")
FROM "ContactSubmission"
WHERE "internalNote" IS NOT NULL AND TRIM("internalNote") != '';
