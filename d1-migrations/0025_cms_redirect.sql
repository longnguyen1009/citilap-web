CREATE TABLE CmsRedirect (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL UNIQUE,
  target TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  note TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  CHECK(source!=target)
);
-- Prevent chains and cycles inside the transaction, including concurrent writes.
CREATE TRIGGER CmsRedirect_no_chain_insert BEFORE INSERT ON CmsRedirect WHEN NEW.enabled=1
AND EXISTS(SELECT 1 FROM CmsRedirect WHERE enabled=1 AND (source=NEW.target OR target=NEW.source))
BEGIN SELECT RAISE(ABORT,'REDIRECT_CHAIN'); END;
CREATE TRIGGER CmsRedirect_no_chain_update BEFORE UPDATE ON CmsRedirect WHEN NEW.enabled=1
AND EXISTS(SELECT 1 FROM CmsRedirect WHERE enabled=1 AND id!=OLD.id AND (source=NEW.target OR target=NEW.source))
BEGIN SELECT RAISE(ABORT,'REDIRECT_CHAIN'); END;
