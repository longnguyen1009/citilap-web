-- Migration: 0017_site_builder.sql
-- Structured Page Builder for Homepage and Landing Pages in Cloudflare D1
-- Follows the established ProductStudio / PageStudio / SiteSettings architecture:
-- Identity table + Studio draft/published JSON document + Append-only Revision table + CAS trigger guard.

CREATE TABLE LandingPage (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  isHome INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- Unique index for landing slugs among non-home, non-deleted pages
CREATE UNIQUE INDEX LandingPage_slug_idx ON LandingPage(slug) WHERE deletedAt IS NULL AND isHome = 0;

-- Guarantees at most ONE active homepage record
CREATE UNIQUE INDEX LandingPage_single_home_idx ON LandingPage(isHome) WHERE isHome = 1 AND deletedAt IS NULL;

CREATE INDEX LandingPage_status_idx ON LandingPage(status);
CREATE INDEX LandingPage_isHome_idx ON LandingPage(isHome);

CREATE TABLE LandingPageStudio (
  pageId TEXT PRIMARY KEY NOT NULL REFERENCES LandingPage(id) ON DELETE RESTRICT,
  publishedRevision INTEGER,
  publishedAt TEXT,
  publicUpdatedAt TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL CHECK(json_valid(draft)),
  published TEXT CHECK(published IS NULL OR json_valid(published)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LandingPageRevision (
  pageId TEXT NOT NULL REFERENCES LandingPageStudio(pageId) ON DELETE RESTRICT,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  action TEXT NOT NULL CHECK(action IN ('init', 'save', 'publish', 'unpublish', 'restore')),
  actor TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(pageId, revision)
);

-- Optimistic Concurrency Control (CAS) guard trigger
CREATE TRIGGER landing_page_revision_guard BEFORE INSERT ON LandingPageRevision
WHEN NEW.revision != (SELECT revision + 1 FROM LandingPageStudio WHERE pageId = NEW.pageId)
BEGIN SELECT RAISE(ABORT, 'LANDING_PAGE_CONFLICT'); END;
