-- Content CMS: Post (Tin tức/Review) and Page (Trang tĩnh) authoring + public read models.
-- Follows the ProductStudio/SiteSettings pattern: identity table + revision/draft/published
-- JSON document + append-only revision log + DB-level optimistic concurrency trigger.
-- Does NOT alter any existing catalog table (Product, Category, Brand, MediaAsset...).

-- Article categories are independent from product Category (business requirement: keep separate).
CREATE TABLE PostCategory (
  revision INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX PostCategory_status_idx ON PostCategory(status);
CREATE INDEX PostCategory_sortOrder_idx ON PostCategory(sortOrder);

-- Post identity: stable id + slug + category pointer. All editorial fields live in
-- PostStudio.draft/published JSON (title, excerpt, body, SEO, relatedProductIds, etc.)
-- so adding fields later does not require another ALTER TABLE.
CREATE TABLE Post (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoryId TEXT REFERENCES PostCategory(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);
CREATE INDEX Post_categoryId_idx ON Post(categoryId);
CREATE INDEX Post_updatedAt_idx ON Post(updatedAt);

CREATE TABLE PostStudio (
  postId TEXT PRIMARY KEY NOT NULL REFERENCES Post(id) ON DELETE RESTRICT,
  publishedRevision INTEGER,
  publishedAt TEXT,
  publicUpdatedAt TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL CHECK(json_valid(draft)),
  published TEXT CHECK(published IS NULL OR json_valid(published)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PostStudioRevision (
  postId TEXT NOT NULL REFERENCES PostStudio(postId) ON DELETE RESTRICT,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  action TEXT NOT NULL CHECK(action IN ('init', 'save', 'publish', 'unpublish', 'restore')),
  actor TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(postId, revision)
);

-- Abort the whole D1 batch when another editor has advanced the revision (same guard
-- shape as studio_revision_guard in 0010_product_studio.sql).
CREATE TRIGGER post_studio_revision_guard BEFORE INSERT ON PostStudioRevision
WHEN NEW.revision != (SELECT revision + 1 FROM PostStudio WHERE postId = NEW.postId)
BEGIN SELECT RAISE(ABORT, 'POST_STUDIO_CONFLICT'); END;

-- Static/system pages (warranty, returns, shipping, about, stores...). pageType lets the
-- public resolver map a known system slot even if the operator edits the slug later.
CREATE TABLE Page (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  pageType TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);
CREATE INDEX Page_pageType_idx ON Page(pageType);

CREATE TABLE PageStudio (
  pageId TEXT PRIMARY KEY NOT NULL REFERENCES Page(id) ON DELETE RESTRICT,
  publishedRevision INTEGER,
  publishedAt TEXT,
  publicUpdatedAt TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL CHECK(json_valid(draft)),
  published TEXT CHECK(published IS NULL OR json_valid(published)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PageStudioRevision (
  pageId TEXT NOT NULL REFERENCES PageStudio(pageId) ON DELETE RESTRICT,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  action TEXT NOT NULL CHECK(action IN ('init', 'save', 'publish', 'unpublish', 'restore')),
  actor TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(pageId, revision)
);

CREATE TRIGGER page_studio_revision_guard BEFORE INSERT ON PageStudioRevision
WHEN NEW.revision != (SELECT revision + 1 FROM PageStudio WHERE pageId = NEW.pageId)
BEGIN SELECT RAISE(ABORT, 'PAGE_STUDIO_CONFLICT'); END;

CREATE UNIQUE INDEX PostStudio_public_slug_idx ON PostStudio(json_extract(published, '$.slug')) WHERE published IS NOT NULL;

CREATE UNIQUE INDEX PageStudio_public_slug_idx ON PageStudio(json_extract(published, '$.slug')) WHERE published IS NOT NULL;
CREATE UNIQUE INDEX PageStudio_public_type_idx ON PageStudio(json_extract(published, '$.pageType')) WHERE published IS NOT NULL AND json_extract(published, '$.pageType') != 'CUSTOM';
