-- Public inspection facts are separate from private SerialUnit notes and costs.
CREATE TABLE ProductInspection (
  serialUnitId TEXT PRIMARY KEY REFERENCES SerialUnit(id) ON DELETE RESTRICT,
  publicCode TEXT NOT NULL UNIQUE,
  checkedAt TEXT NOT NULL,
  batteryHealth INTEGER CHECK(batteryHealth BETWEEN 0 AND 100),
  appearance TEXT NOT NULL,
  checks TEXT NOT NULL,
  limitations TEXT NOT NULL,
  warranty TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  isDemo INTEGER NOT NULL DEFAULT 0 CHECK(isDemo IN (0,1)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
