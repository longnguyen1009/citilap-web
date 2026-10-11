-- One editorial snapshot keeps taxonomy, menus and collections consistent.
-- Category remains the catalog identity; never delete category/product history.
CREATE TABLE NavigationStudio (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='site'),
 revision INTEGER NOT NULL DEFAULT 0,
 draft TEXT NOT NULL CHECK(json_valid(draft)),
 published TEXT CHECK(published IS NULL OR json_valid(published)),
 publishedRevision INTEGER,
 updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE NavigationRevision (
 revision INTEGER PRIMARY KEY NOT NULL,
 document TEXT NOT NULL CHECK(json_valid(document)),
 action TEXT NOT NULL CHECK(action IN ('save','publish')),
 actor TEXT NOT NULL DEFAULT 'admin',
 createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER navigation_revision_guard BEFORE INSERT ON NavigationRevision
WHEN NEW.revision != (SELECT revision+1 FROM NavigationStudio WHERE id='site')
BEGIN SELECT RAISE(ABORT,'NAVIGATION_CONFLICT'); END;
