-- ==============================================================================
-- CITILAP E-COMMERCE: D1 MIGRATION 0004 — INVENTORY FOUNDATION
-- Warehouses, SerialUnit, Stock Ledger (InventoryTransaction),
-- Quantity Balances (InventoryBalance), and Timed Reservations (InventoryReservation).
-- ==============================================================================

-- 1. Extend Product table with inventoryType
ALTER TABLE "Product" ADD COLUMN "inventoryType" TEXT NOT NULL DEFAULT 'SERIALIZED';

-- 2. Create Warehouse table
CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "address" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_code_key" ON "Warehouse"("code");
CREATE INDEX IF NOT EXISTS "Warehouse_status_idx" ON "Warehouse"("status");
CREATE INDEX IF NOT EXISTS "Warehouse_sortOrder_idx" ON "Warehouse"("sortOrder");

-- 3. Create SerialUnit table (Laptop physical unit)
CREATE TABLE IF NOT EXISTS "SerialUnit" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "warehouseId" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "condition" TEXT NOT NULL DEFAULT 'NEW',
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "costPrice" INTEGER,
  "warrantyMonths" INTEGER,
  "notes" TEXT,
  "allocatedReference" TEXT,
  "allocatedAt" DATETIME,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SerialUnit_serialNumber_key" ON "SerialUnit"("serialNumber");
CREATE INDEX IF NOT EXISTS "SerialUnit_productId_idx" ON "SerialUnit"("productId");
CREATE INDEX IF NOT EXISTS "SerialUnit_variantId_idx" ON "SerialUnit"("variantId");
CREATE INDEX IF NOT EXISTS "SerialUnit_warehouseId_idx" ON "SerialUnit"("warehouseId");
CREATE INDEX IF NOT EXISTS "SerialUnit_status_idx" ON "SerialUnit"("status");
CREATE INDEX IF NOT EXISTS "SerialUnit_condition_idx" ON "SerialUnit"("condition");
CREATE INDEX IF NOT EXISTS "SerialUnit_warehouse_status_idx" ON "SerialUnit"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "SerialUnit_variant_status_idx" ON "SerialUnit"("variantId", "status");

-- 4. Create InventoryBalance table (Quantity goods / Non-serialized)
CREATE TABLE IF NOT EXISTS "InventoryBalance" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("onHand" >= 0),
  CHECK ("reserved" >= 0),
  CHECK ("reserved" <= "onHand"),
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryBalance_warehouse_variant_key" ON "InventoryBalance"("warehouseId", "variantId");
CREATE INDEX IF NOT EXISTS "InventoryBalance_productId_idx" ON "InventoryBalance"("productId");
CREATE INDEX IF NOT EXISTS "InventoryBalance_variantId_idx" ON "InventoryBalance"("variantId");
CREATE INDEX IF NOT EXISTS "InventoryBalance_warehouseId_idx" ON "InventoryBalance"("warehouseId");

-- 5. Create InventoryTransaction table (Stock Ledger - Append-only)
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "serialUnitId" TEXT,
  "transactionType" TEXT NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "idempotencyKey" TEXT,
  "actorId" TEXT,
  "reason" TEXT,
  "balanceBefore" INTEGER,
  "balanceAfter" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("serialUnitId") REFERENCES "SerialUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryTransaction_idempotencyKey_key" ON "InventoryTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_warehouseId_idx" ON "InventoryTransaction"("warehouseId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_variantId_idx" ON "InventoryTransaction"("variantId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_serialUnitId_idx" ON "InventoryTransaction"("serialUnitId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_transactionType_idx" ON "InventoryTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_reference_idx" ON "InventoryTransaction"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- 6. Create InventoryReservation table (Timed stock hold)
CREATE TABLE IF NOT EXISTS "InventoryReservation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "serialUnitId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" DATETIME NOT NULL,
  "idempotencyKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("serialUnitId") REFERENCES "SerialUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryReservation_idempotencyKey_key" ON "InventoryReservation"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "InventoryReservation_warehouseId_idx" ON "InventoryReservation"("warehouseId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_variantId_idx" ON "InventoryReservation"("variantId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_serialUnitId_idx" ON "InventoryReservation"("serialUnitId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_status_idx" ON "InventoryReservation"("status");
CREATE INDEX IF NOT EXISTS "InventoryReservation_expiresAt_idx" ON "InventoryReservation"("expiresAt");
CREATE INDEX IF NOT EXISTS "InventoryReservation_reference_idx" ON "InventoryReservation"("referenceType", "referenceId");
