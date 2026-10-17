-- R08A: additive identity/session migration; apply to an isolated fixture first.
ALTER TABLE User ADD COLUMN adminDisabled INTEGER NOT NULL DEFAULT 0 CHECK(adminDisabled IN (0,1));
ALTER TABLE User ADD COLUMN adminVersion INTEGER NOT NULL DEFAULT 0;
ALTER TABLE User ADD COLUMN piiExport INTEGER NOT NULL DEFAULT 0 CHECK(piiExport IN (0,1));
CREATE TABLE AdminSession (
  tokenHash TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES User(id),
  version INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);
CREATE INDEX AdminSession_user ON AdminSession(userId);
CREATE TABLE AdminNotificationRead (
  userId TEXT NOT NULL REFERENCES User(id),
  notificationId TEXT NOT NULL REFERENCES AdminNotification(id),
  readAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(userId,notificationId)
);
CREATE TABLE AdminAudit (
  id TEXT PRIMARY KEY,
  actorId TEXT NOT NULL REFERENCES User(id),
  action TEXT NOT NULL,
  entityId TEXT NOT NULL,
  summary TEXT NOT NULL,
  occurredAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX AdminAudit_time ON AdminAudit(occurredAt DESC,id);
CREATE TABLE AdminMutationGuard (id TEXT PRIMARY KEY, allowed INTEGER NOT NULL CHECK(allowed=1));
CREATE TRIGGER Admin_last_owner_update BEFORE UPDATE OF role,adminDisabled ON User
WHEN OLD.role='OWNER' AND OLD.adminDisabled=0 AND (NEW.role!='OWNER' OR NEW.adminDisabled!=0)
  AND (SELECT COUNT(*) FROM User WHERE role='OWNER' AND adminDisabled=0 AND id!=OLD.id)=0
BEGIN SELECT RAISE(ABORT,'LAST_ACTIVE_OWNER'); END;
CREATE TRIGGER Admin_last_owner_delete BEFORE DELETE ON User
WHEN OLD.role='OWNER' AND OLD.adminDisabled=0
  AND (SELECT COUNT(*) FROM User WHERE role='OWNER' AND adminDisabled=0 AND id!=OLD.id)=0
BEGIN SELECT RAISE(ABORT,'LAST_ACTIVE_OWNER'); END;
CREATE TRIGGER Admin_audit_no_update BEFORE UPDATE ON AdminAudit
BEGIN SELECT RAISE(ABORT,'AUDIT_APPEND_ONLY'); END;
CREATE TRIGGER Admin_audit_no_delete BEFORE DELETE ON AdminAudit
BEGIN SELECT RAISE(ABORT,'AUDIT_APPEND_ONLY'); END;
