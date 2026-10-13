-- SiteSettings stores singleton operational & storefront configurations.
-- Every mutation increases revision and appends an immutable revision log.
CREATE TABLE SiteSettings (
  id TEXT PRIMARY KEY NOT NULL CHECK(id='site'),
  revision INTEGER NOT NULL DEFAULT 0,
  document TEXT NOT NULL CHECK(json_valid(document)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SiteSettingsRevision (
  revision INTEGER PRIMARY KEY NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  action TEXT NOT NULL CHECK(action IN ('init', 'save')),
  actor TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER site_settings_revision_guard BEFORE INSERT ON SiteSettingsRevision
WHEN NEW.revision != (SELECT revision+1 FROM SiteSettings WHERE id='site')
BEGIN SELECT RAISE(ABORT, 'SETTINGS_CONFLICT'); END;
