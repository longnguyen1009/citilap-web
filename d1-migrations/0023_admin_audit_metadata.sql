-- Additive; existing events keep unknown metadata rather than invented revisions.
ALTER TABLE AdminAudit ADD COLUMN requestId TEXT;
ALTER TABLE AdminAudit ADD COLUMN entityType TEXT;
ALTER TABLE AdminAudit ADD COLUMN beforeRevision INTEGER;
ALTER TABLE AdminAudit ADD COLUMN afterRevision INTEGER;
ALTER TABLE AdminAudit ADD COLUMN executor TEXT NOT NULL DEFAULT 'request';
