ALTER TABLE ProductStudio ADD COLUMN publishedRevision INTEGER;
UPDATE ProductStudio SET publishedRevision=(SELECT max(revision) FROM ProductStudioRevision r WHERE r.productId=ProductStudio.productId AND r.action='publish') WHERE published IS NOT NULL;
CREATE TABLE CmsSchedule (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL CHECK(entityType IN ('product','post','page','landing','navigation')),
  entityId TEXT NOT NULL,
  revision INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('publish','unpublish')),
  executeAt INTEGER NOT NULL,
  actorId TEXT NOT NULL REFERENCES User(id),
  actorVersion INTEGER NOT NULL,
  publicSnapshot TEXT,
  publicRevision INTEGER,
  state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','RUNNING','DONE','CANCELLED','CONFLICT','BLOCKED','FAILED')),
  leaseUntil INTEGER,
  claimToken TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  errorCode TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX CmsSchedule_due ON CmsSchedule(state,executeAt,leaseUntil);
CREATE UNIQUE INDEX CmsSchedule_active ON CmsSchedule(entityType,entityId) WHERE state IN ('PENDING','RUNNING');
