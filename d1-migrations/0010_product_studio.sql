-- Product remains the catalog identity. Studio holds private editorial revisions.
CREATE TABLE ProductStudio (
 productId TEXT PRIMARY KEY NOT NULL REFERENCES Product(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL DEFAULT 0,
 draft TEXT NOT NULL CHECK(json_valid(draft)),
 published TEXT CHECK(published IS NULL OR json_valid(published)),
 updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ProductStudioRevision (
 productId TEXT NOT NULL REFERENCES ProductStudio(productId) ON DELETE RESTRICT,
 revision INTEGER NOT NULL,
 document TEXT NOT NULL CHECK(json_valid(document)),
 action TEXT NOT NULL,
 createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(productId,revision)
);
-- Abort the whole D1 batch when another editor has advanced the revision.
CREATE TRIGGER studio_revision_guard BEFORE INSERT ON ProductStudioRevision
WHEN NEW.revision != (SELECT revision+1 FROM ProductStudio WHERE productId=NEW.productId)
BEGIN SELECT RAISE(ABORT,'STUDIO_CONFLICT'); END;
