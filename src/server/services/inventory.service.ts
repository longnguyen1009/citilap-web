import { prisma, type PrismaClient } from "@/lib/prisma";

// ==============================================================================
// INVENTORY DOMAIN TYPES & CONSTANTS
// ==============================================================================

export type SerialUnitStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "ALLOCATED"
  | "SOLD"
  | "QC_HOLD"
  | "REPAIR"
  | "DAMAGED"
  | "RETURNING"
  | "RETURNED";

export type SerialUnitCondition =
  | "NEW"
  | "LIKE_NEW"
  | "USED"
  | "OPEN_BOX"
  | "REFURBISHED";

export type InventoryTransactionType =
  | "RECEIVE"
  | "ADJUSTMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RESERVE"
  | "RELEASE"
  | "ALLOCATE"
  | "SALE"
  | "RETURN"
  | "DAMAGE";

export type ReservationStatus =
  | "ACTIVE"
  | "COMMITTED"
  | "RELEASED"
  | "EXPIRED"
  | "CANCELLED";

export type InventoryTrackingType = "SERIALIZED" | "QUANTITY";

// ==============================================================================
// DOMAIN ERROR HIERARCHY
// ==============================================================================

export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export class InventoryConflictError extends InventoryError {
  constructor(message: string, code = "INVENTORY_CONFLICT") {
    super(message, code, 409);
    this.name = "InventoryConflictError";
  }
}

export class IdempotencyPayloadMismatchError extends InventoryError {
  constructor(message = "Idempotency key reused with different payload parameters") {
    super(message, "IDEMPOTENCY_PAYLOAD_MISMATCH", 409);
    this.name = "IdempotencyPayloadMismatchError";
  }
}

export class InvalidStateTransitionError extends InventoryError {
  constructor(from: string, to: string) {
    super(`Cannot transition SerialUnit from state ${from} to ${to}`, "INVALID_STATE_TRANSITION", 400);
    this.name = "InvalidStateTransitionError";
  }
}

export class InsufficientStockError extends InventoryError {
  constructor(message = "Insufficient available stock") {
    super(message, "INSUFFICIENT_STOCK", 409);
    this.name = "InsufficientStockError";
  }
}

export class SerialUnitNotFoundError extends InventoryError {
  constructor(serialIdOrNumber: string) {
    super(`Serial unit not found: ${serialIdOrNumber}`, "SERIAL_UNIT_NOT_FOUND", 404);
    this.name = "SerialUnitNotFoundError";
  }
}

export class WarehouseNotFoundError extends InventoryError {
  constructor(warehouseIdOrCode: string) {
    super(`Warehouse not found: ${warehouseIdOrCode}`, "WAREHOUSE_NOT_FOUND", 404);
    this.name = "WarehouseNotFoundError";
  }
}

// ==============================================================================
// SERIAL UNIT STATE MACHINE RULES
// ==============================================================================

const ALLOWED_STATE_TRANSITIONS: Record<SerialUnitStatus, readonly SerialUnitStatus[]> = {
  AVAILABLE: ["RESERVED", "ALLOCATED", "QC_HOLD", "REPAIR", "DAMAGED", "SOLD"],
  RESERVED: ["AVAILABLE", "ALLOCATED", "SOLD", "QC_HOLD"],
  ALLOCATED: ["AVAILABLE", "SOLD", "QC_HOLD", "DAMAGED"],
  SOLD: ["RETURNING"],
  QC_HOLD: ["AVAILABLE", "REPAIR", "DAMAGED"],
  REPAIR: ["AVAILABLE", "QC_HOLD", "DAMAGED"],
  DAMAGED: ["REPAIR"],
  RETURNING: ["RETURNED", "SOLD"],
  RETURNED: ["AVAILABLE", "QC_HOLD", "REPAIR", "DAMAGED"],
};

export function validateSerialStateTransition(from: SerialUnitStatus, to: SerialUnitStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// ==============================================================================
// DOMAIN INTERFACES
// ==============================================================================

export interface WarehouseAvailability {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
}

export interface SkuAvailability {
  sku: string;
  variantId: string;
  productId: string;
  productName: string;
  inventoryType: InventoryTrackingType;
  onHand: number;
  reserved: number;
  available: number;
  byWarehouse: WarehouseAvailability[];
}

export interface ReserveInventoryParams {
  warehouseId: string;
  productId: string;
  variantId: string;
  quantity: number;
  serialUnitId?: string;
  referenceType: "CHECKOUT" | "ORDER" | "MANUAL_HOLD";
  referenceId: string;
  expiresAt: Date;
  idempotencyKey?: string;
  actorId?: string;
}

export interface ReserveResult {
  reservationId: string;
  status: ReservationStatus;
  warehouseId: string;
  variantId: string;
  serialUnitId?: string | null;
  quantity: number;
  expiresAt: Date;
  isIdempotentReplay?: boolean;
}

export interface AllocateSerialParams {
  serialUnitId: string;
  orderReference: string;
  actorId?: string;
  idempotencyKey?: string;
}

export interface AllocateResult {
  serialUnitId: string;
  serialNumber: string;
  status: SerialUnitStatus;
  orderReference: string;
  allocatedAt: Date;
  isIdempotentReplay?: boolean;
}

export interface TransferInventoryParams {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  variantId?: string;
  serialUnitId?: string;
  quantity?: number;
  reason?: string;
  actorId?: string;
  idempotencyKey?: string;
}

export interface TransferResult {
  fromWarehouseId: string;
  toWarehouseId: string;
  serialUnitId?: string;
  quantity: number;
  transferredAt: Date;
  isIdempotentReplay?: boolean;
}

export interface ReceiveInventoryParams {
  warehouseId: string;
  productId: string;
  variantId?: string;
  serialNumber?: string;
  condition?: SerialUnitCondition;
  costPrice?: number;
  warrantyMonths?: number;
  notes?: string;
  quantity?: number;
  actorId?: string;
  idempotencyKey?: string;
}

// ==============================================================================
// SERVICE IMPLEMENTATION
// ==============================================================================

/**
 * Lists all active warehouses sorted by display priority.
 */
export async function listActiveWarehouses(client: PrismaClient = prisma) {
  return client.warehouse.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Calculates authoritative stock availability for a given SKU across warehouses.
 * Single source of truth:
 * - SERIALIZED: count of physical SerialUnits (AVAILABLE, RESERVED, ALLOCATED).
 * - QUANTITY: sum of onHand & reserved from InventoryBalance.
 */
export async function getSkuAvailability(
  sku: string,
  warehouseId?: string,
  client: PrismaClient = prisma
): Promise<SkuAvailability> {
  const variant = await client.productVariant.findUnique({
    where: { sku },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          inventoryType: true,
          status: true,
        },
      },
    },
  });

  if (!variant) {
    throw new InventoryError(`SKU not found: ${sku}`, "SKU_NOT_FOUND", 404);
  }

  const inventoryType = (variant.product.inventoryType as InventoryTrackingType) || "SERIALIZED";
  const warehouses = await client.warehouse.findMany({
    where: {
      status: "ACTIVE",
      ...(warehouseId ? { id: warehouseId } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  const byWarehouse: WarehouseAvailability[] = [];
  let totalOnHand = 0;
  let totalReserved = 0;

  if (inventoryType === "SERIALIZED") {
    // Physical serial unit aggregation
    const serialUnits = await client.serialUnit.findMany({
      where: {
        variantId: variant.id,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        warehouseId: true,
        status: true,
      },
    });

    for (const wh of warehouses) {
      const whUnits = serialUnits.filter((u) => u.warehouseId === wh.id);
      const onHand = whUnits.filter((u) => ["AVAILABLE", "RESERVED", "ALLOCATED"].includes(u.status)).length;
      const reserved = whUnits.filter((u) => ["RESERVED", "ALLOCATED"].includes(u.status)).length;
      const available = whUnits.filter((u) => u.status === "AVAILABLE").length;

      totalOnHand += onHand;
      totalReserved += reserved;

      byWarehouse.push({
        warehouseId: wh.id,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        onHand,
        reserved,
        available,
      });
    }
  } else {
    // Quantity goods balance aggregation
    const balances = await client.inventoryBalance.findMany({
      where: {
        variantId: variant.id,
        ...(warehouseId ? { warehouseId } : {}),
      },
    });

    for (const wh of warehouses) {
      const b = balances.find((bal) => bal.warehouseId === wh.id);
      const onHand = b ? b.onHand : 0;
      const reserved = b ? b.reserved : 0;
      const available = Math.max(0, onHand - reserved);

      totalOnHand += onHand;
      totalReserved += reserved;

      byWarehouse.push({
        warehouseId: wh.id,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        onHand,
        reserved,
        available,
      });
    }
  }

  const totalAvailable = Math.max(0, totalOnHand - totalReserved);

  return {
    sku: variant.sku,
    variantId: variant.id,
    productId: variant.productId,
    productName: variant.product.name,
    inventoryType,
    onHand: totalOnHand,
    reserved: totalReserved,
    available: totalAvailable,
    byWarehouse,
  };
}

/**
 * Retrieves physical serial units currently AVAILABLE in inventory for a variant or product.
 * Internal use only — serial numbers are never exposed publicly on the storefront.
 */
export async function getAvailableSerialUnits(
  variantId: string,
  warehouseId?: string,
  client: PrismaClient = prisma
) {
  return client.serialUnit.findMany({
    where: {
      variantId,
      status: "AVAILABLE",
      ...(warehouseId ? { warehouseId } : {}),
    },
    orderBy: { receivedAt: "asc" }, // FIFO priority
  });
}

/**
 * Places a timed inventory hold (Reservation) with atomic conditional D1 queries.
 * Handles idempotency, prevents negative stock, and prevents double-reservation of physical units.
 */
export async function reserveInventory(
  params: ReserveInventoryParams,
  client: PrismaClient = prisma
): Promise<ReserveResult> {
  const {
    warehouseId,
    productId,
    variantId,
    quantity,
    serialUnitId,
    referenceType,
    referenceId,
    expiresAt,
    idempotencyKey,
    actorId,
  } = params;

  if (quantity < 1) {
    throw new InventoryError("Reservation quantity must be at least 1", "INVALID_QUANTITY", 400);
  }

  // 1. Idempotency preflight check
  if (idempotencyKey) {
    const existing = await client.inventoryReservation.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      // Check payload consistency
      const isMatch =
        existing.warehouseId === warehouseId &&
        existing.variantId === variantId &&
        existing.referenceId === referenceId &&
        existing.quantity === quantity &&
        existing.serialUnitId === (serialUnitId || null);

      if (!isMatch) {
        throw new IdempotencyPayloadMismatchError();
      }

      return {
        reservationId: existing.id,
        status: existing.status as ReservationStatus,
        warehouseId: existing.warehouseId,
        variantId: existing.variantId,
        serialUnitId: existing.serialUnitId,
        quantity: existing.quantity,
        expiresAt: existing.expiresAt,
        isIdempotentReplay: true,
      };
    }
  }

  // 2. Fetch product inventory tracking type
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true, inventoryType: true, status: true },
  });

  if (!product || product.status !== "ACTIVE") {
    throw new InventoryError("Product is inactive or not found", "PRODUCT_UNAVAILABLE", 404);
  }

  const isSerialized = product.inventoryType === "SERIALIZED";

  if (isSerialized) {
    // -------------------------------------------------------------
    // SERIALIZED HOLD: Atomic single-unit conditional reservation
    // -------------------------------------------------------------
    let targetUnitId = serialUnitId;

    if (targetUnitId) {
      // Specific serial requested
      const affected = await client.$executeRawUnsafe(
        `UPDATE "SerialUnit"
         SET "status" = 'RESERVED', "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ? AND "warehouseId" = ? AND "status" = 'AVAILABLE'`,
        targetUnitId,
        warehouseId
      );

      if (affected !== 1) {
        throw new InventoryConflictError(
          "Target serial unit is not available for reservation in this warehouse",
          "SERIAL_NOT_AVAILABLE"
        );
      }
    } else {
      // Auto-assign any AVAILABLE unit in FIFO order within the warehouse
      const availableUnit = await client.serialUnit.findFirst({
        where: {
          variantId,
          warehouseId,
          status: "AVAILABLE",
        },
        orderBy: { receivedAt: "asc" },
        select: { id: true },
      });

      if (!availableUnit) {
        throw new InsufficientStockError("No available serial unit found in the requested warehouse");
      }

      const affected = await client.$executeRawUnsafe(
        `UPDATE "SerialUnit"
         SET "status" = 'RESERVED', "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ? AND "status" = 'AVAILABLE'`,
        availableUnit.id
      );

      if (affected !== 1) {
        throw new InventoryConflictError(
          "Serial unit was claimed by a concurrent request. Please retry.",
          "SERIAL_CONCURRENCY_CONFLICT"
        );
      }

      targetUnitId = availableUnit.id;
    }

    // Insert Reservation and Ledger record atomically
    const reservation = await client.inventoryReservation.create({
      data: {
        warehouseId,
        productId,
        variantId,
        serialUnitId: targetUnitId,
        quantity: 1,
        referenceType,
        referenceId,
        status: "ACTIVE",
        expiresAt,
        idempotencyKey,
      },
    });

    await client.inventoryTransaction.create({
      data: {
        warehouseId,
        productId,
        variantId,
        serialUnitId: targetUnitId,
        transactionType: "RESERVE",
        quantityDelta: -1,
        referenceType,
        referenceId,
        actorId,
        idempotencyKey: idempotencyKey ? `tx-${idempotencyKey}` : undefined,
        reason: `Timed hold until ${expiresAt.toISOString()}`,
      },
    });

    return {
      reservationId: reservation.id,
      status: "ACTIVE",
      warehouseId,
      variantId,
      serialUnitId: targetUnitId,
      quantity: 1,
      expiresAt,
    };
  } else {
    // -------------------------------------------------------------
    // QUANTITY HOLD: Atomic conditional increment of reserved balance
    // -------------------------------------------------------------
    const affected = await client.$executeRawUnsafe(
      `UPDATE "InventoryBalance"
       SET "reserved" = "reserved" + ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "warehouseId" = ? AND "variantId" = ? AND ("onHand" - "reserved") >= ?`,
      quantity,
      warehouseId,
      variantId,
      quantity
    );

    if (affected !== 1) {
      throw new InsufficientStockError(
        `Insufficient available quantity in warehouse ${warehouseId} to reserve ${quantity} units`
      );
    }

    const reservation = await client.inventoryReservation.create({
      data: {
        warehouseId,
        productId,
        variantId,
        quantity,
        referenceType,
        referenceId,
        status: "ACTIVE",
        expiresAt,
        idempotencyKey,
      },
    });

    await client.inventoryTransaction.create({
      data: {
        warehouseId,
        productId,
        variantId,
        transactionType: "RESERVE",
        quantityDelta: -quantity,
        referenceType,
        referenceId,
        actorId,
        idempotencyKey: idempotencyKey ? `tx-${idempotencyKey}` : undefined,
        reason: `Quantity hold of ${quantity} units until ${expiresAt.toISOString()}`,
      },
    });

    return {
      reservationId: reservation.id,
      status: "ACTIVE",
      warehouseId,
      variantId,
      serialUnitId: null,
      quantity,
      expiresAt,
    };
  }
}

/**
 * Releases an active inventory reservation (e.g. cart abandon, user cancel, or manual release).
 * Restores unit status to AVAILABLE or decrements reserved balance.
 */
export async function releaseReservation(
  reservationId: string,
  reason = "Reservation released",
  client: PrismaClient = prisma
): Promise<{ released: boolean; reservationId: string }> {
  const reservation = await client.inventoryReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation || reservation.status !== "ACTIVE") {
    return { released: false, reservationId };
  }

  // Atomically change reservation status to RELEASED
  const affected = await client.$executeRawUnsafe(
    `UPDATE "InventoryReservation"
     SET "status" = 'RELEASED', "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "status" = 'ACTIVE'`,
    reservationId
  );

  if (affected !== 1) {
    return { released: false, reservationId };
  }

  if (reservation.serialUnitId) {
    // Restore physical unit status
    await client.$executeRawUnsafe(
      `UPDATE "SerialUnit"
       SET "status" = 'AVAILABLE', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ? AND "status" = 'RESERVED'`,
      reservation.serialUnitId
    );

    await client.inventoryTransaction.create({
      data: {
        warehouseId: reservation.warehouseId,
        productId: reservation.productId,
        variantId: reservation.variantId,
        serialUnitId: reservation.serialUnitId,
        transactionType: "RELEASE",
        quantityDelta: 1,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        reason,
      },
    });
  } else {
    // Decrement reserved balance for quantity items
    await client.$executeRawUnsafe(
      `UPDATE "InventoryBalance"
       SET "reserved" = MAX(0, "reserved" - ?), "updatedAt" = CURRENT_TIMESTAMP
       WHERE "warehouseId" = ? AND "variantId" = ?`,
      reservation.quantity,
      reservation.warehouseId,
      reservation.variantId
    );

    await client.inventoryTransaction.create({
      data: {
        warehouseId: reservation.warehouseId,
        productId: reservation.productId,
        variantId: reservation.variantId,
        transactionType: "RELEASE",
        quantityDelta: reservation.quantity,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        reason,
      },
    });
  }

  return { released: true, reservationId };
}

/**
 * Expires all active reservations whose `expiresAt` has passed.
 * Returns count of released reservations.
 */
export async function expireActiveReservations(client: PrismaClient = prisma): Promise<number> {
  const now = new Date();
  const expiredList = await client.inventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  let count = 0;
  for (const res of expiredList) {
    const outcome = await releaseReservation(res.id, "Reservation expired automatically", client);
    if (outcome.released) {
      // Mark as EXPIRED explicitly
      await client.inventoryReservation.update({
        where: { id: res.id },
        data: { status: "EXPIRED" },
      });
      count++;
    }
  }

  return count;
}

/**
 * Allocates a physical laptop (SerialUnit) to an order.
 * This is an explicit fulfillment action (staff assigning a machine to a paid/confirmed order).
 * Preconditions:
 * - Unit must be AVAILABLE or RESERVED for this order reference.
 * - Cannot allocate SOLD, DAMAGED, or a unit allocated to another reference.
 */
export async function allocateSerial(
  params: AllocateSerialParams,
  client: PrismaClient = prisma
): Promise<AllocateResult> {
  const { serialUnitId, orderReference, actorId, idempotencyKey } = params;

  const unit = await client.serialUnit.findUnique({
    where: { id: serialUnitId },
  });

  if (!unit) {
    throw new SerialUnitNotFoundError(serialUnitId);
  }

  // Idempotency check: if already allocated to the same order reference
  if (unit.status === "ALLOCATED" && unit.allocatedReference === orderReference) {
    return {
      serialUnitId: unit.id,
      serialNumber: unit.serialNumber,
      status: "ALLOCATED",
      orderReference,
      allocatedAt: unit.allocatedAt || unit.updatedAt,
      isIdempotentReplay: true,
    };
  }

  // Validate state transition
  if (!validateSerialStateTransition(unit.status as SerialUnitStatus, "ALLOCATED")) {
    throw new InvalidStateTransitionError(unit.status, "ALLOCATED");
  }

  // Atomic conditional allocation
  const affected = await client.$executeRawUnsafe(
    `UPDATE "SerialUnit"
     SET "status" = 'ALLOCATED',
         "allocatedReference" = ?,
         "allocatedAt" = CURRENT_TIMESTAMP,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND ("status" = 'AVAILABLE' OR ("status" = 'RESERVED' AND ("allocatedReference" IS NULL OR "allocatedReference" = ?)))`,
    orderReference,
    serialUnitId,
    orderReference
  );

  if (affected !== 1) {
    throw new InventoryConflictError(
      `Cannot allocate serial unit ${unit.serialNumber}: it is already allocated to another order or unavailable`,
      "ALLOCATION_CONFLICT"
    );
  }

  // Record audit transaction
  await client.inventoryTransaction.create({
    data: {
      warehouseId: unit.warehouseId,
      productId: unit.productId,
      variantId: unit.variantId,
      serialUnitId: unit.id,
      transactionType: "ALLOCATE",
      quantityDelta: 0, // Allocation tags ownership; onHand unchanged until SOLD
      referenceType: "ORDER",
      referenceId: orderReference,
      actorId,
      idempotencyKey,
      reason: `Allocated physical machine to order ${orderReference}`,
    },
  });

  return {
    serialUnitId: unit.id,
    serialNumber: unit.serialNumber,
    status: "ALLOCATED",
    orderReference,
    allocatedAt: new Date(),
  };
}

/**
 * Business Rule: Commercial Deposit Separation
 * A customer placing a commercial deposit expresses demand for a SKU, but DOES NOT
 * automatically reserve or lock any physical SerialUnit.
 * This function acknowledges deposit commercial demand without touching physical SerialUnit hold.
 */
export function recordCommercialDeposit(
  orderId: string,
  sku: string,
  depositAmount: number
): { success: boolean; orderId: string; sku: string; depositAmount: number; note: string } {
  return {
    success: true,
    orderId,
    sku,
    depositAmount,
    note: "Commercial deposit registered without hard physical unit hold. Staff allocation required prior to delivery.",
  };
}

/**
 * Transfers inventory between warehouses:
 * - Serialized: updates SerialUnit.warehouseId, records TRANSFER_OUT and TRANSFER_IN ledger events.
 * - Quantity: atomically decrements source and increments destination balance.
 */
export async function transferInventory(
  params: TransferInventoryParams,
  client: PrismaClient = prisma
): Promise<TransferResult> {
  const {
    fromWarehouseId,
    toWarehouseId,
    productId,
    variantId,
    serialUnitId,
    quantity = 1,
    reason = "Warehouse transfer",
    actorId,
    idempotencyKey,
  } = params;

  if (fromWarehouseId === toWarehouseId) {
    throw new InventoryError("Source and destination warehouses must be different", "SAME_WAREHOUSE", 400);
  }

  // Verify warehouses exist and are active
  const [fromWh, toWh] = await Promise.all([
    client.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    client.warehouse.findUnique({ where: { id: toWarehouseId } }),
  ]);

  if (!fromWh || fromWh.status !== "ACTIVE") throw new WarehouseNotFoundError(fromWarehouseId);
  if (!toWh || toWh.status !== "ACTIVE") throw new WarehouseNotFoundError(toWarehouseId);

  const transferRef = `TRF-${Date.now().toString(36).toUpperCase()}`;

  if (serialUnitId) {
    // -------------------------------------------------------------
    // SERIALIZED TRANSFER
    // -------------------------------------------------------------
    const unit = await client.serialUnit.findUnique({ where: { id: serialUnitId } });
    if (!unit) throw new SerialUnitNotFoundError(serialUnitId);

    if (unit.status !== "AVAILABLE") {
      throw new InventoryConflictError(
        `Cannot transfer serial unit ${unit.serialNumber}: current status is ${unit.status} (must be AVAILABLE)`,
        "SERIAL_NOT_AVAILABLE_FOR_TRANSFER"
      );
    }

    const affected = await client.$executeRawUnsafe(
      `UPDATE "SerialUnit"
       SET "warehouseId" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ? AND "warehouseId" = ? AND "status" = 'AVAILABLE'`,
      toWarehouseId,
      serialUnitId,
      fromWarehouseId
    );

    if (affected !== 1) {
      throw new InventoryConflictError(
        "Serial unit transfer failed due to concurrent modification",
        "TRANSFER_CONCURRENCY_CONFLICT"
      );
    }

    // Ledger: Transfer Out
    await client.inventoryTransaction.create({
      data: {
        warehouseId: fromWarehouseId,
        productId: unit.productId,
        variantId: unit.variantId,
        serialUnitId,
        transactionType: "TRANSFER_OUT",
        quantityDelta: -1,
        referenceType: "TRANSFER",
        referenceId: transferRef,
        actorId,
        idempotencyKey: idempotencyKey ? `out-${idempotencyKey}` : undefined,
        reason: `Transfer to ${toWh.name}: ${reason}`,
      },
    });

    // Ledger: Transfer In
    await client.inventoryTransaction.create({
      data: {
        warehouseId: toWarehouseId,
        productId: unit.productId,
        variantId: unit.variantId,
        serialUnitId,
        transactionType: "TRANSFER_IN",
        quantityDelta: 1,
        referenceType: "TRANSFER",
        referenceId: transferRef,
        actorId,
        idempotencyKey: idempotencyKey ? `in-${idempotencyKey}` : undefined,
        reason: `Transfer from ${fromWh.name}: ${reason}`,
      },
    });

    return {
      fromWarehouseId,
      toWarehouseId,
      serialUnitId,
      quantity: 1,
      transferredAt: new Date(),
    };
  } else {
    // -------------------------------------------------------------
    // QUANTITY TRANSFER
    // -------------------------------------------------------------
    if (!variantId) {
      throw new InventoryError("variantId is required for quantity transfer", "MISSING_VARIANT_ID", 400);
    }

    // 1. Decrement source balance atomically (must have available >= quantity)
    const outAffected = await client.$executeRawUnsafe(
      `UPDATE "InventoryBalance"
       SET "onHand" = "onHand" - ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "warehouseId" = ? AND "variantId" = ? AND ("onHand" - "reserved") >= ?`,
      quantity,
      fromWarehouseId,
      variantId,
      quantity
    );

    if (outAffected !== 1) {
      throw new InsufficientStockError("Insufficient available quantity at source warehouse for transfer");
    }

    // 2. Increment destination balance (or create if not yet existing)
    const existingDest = await client.inventoryBalance.findUnique({
      where: {
        warehouseId_variantId: { warehouseId: toWarehouseId, variantId },
      },
    });

    if (existingDest) {
      await client.inventoryBalance.update({
        where: { id: existingDest.id },
        data: { onHand: { increment: quantity } },
      });
    } else {
      await client.inventoryBalance.create({
        data: {
          warehouseId: toWarehouseId,
          productId,
          variantId,
          onHand: quantity,
          reserved: 0,
        },
      });
    }

    // Ledger entries
    await client.inventoryTransaction.create({
      data: {
        warehouseId: fromWarehouseId,
        productId,
        variantId,
        transactionType: "TRANSFER_OUT",
        quantityDelta: -quantity,
        referenceType: "TRANSFER",
        referenceId: transferRef,
        actorId,
        reason: `Transfer out to ${toWh.name}: ${reason}`,
      },
    });

    await client.inventoryTransaction.create({
      data: {
        warehouseId: toWarehouseId,
        productId,
        variantId,
        transactionType: "TRANSFER_IN",
        quantityDelta: quantity,
        referenceType: "TRANSFER",
        referenceId: transferRef,
        actorId,
        reason: `Transfer in from ${fromWh.name}: ${reason}`,
      },
    });

    return {
      fromWarehouseId,
      toWarehouseId,
      quantity,
      transferredAt: new Date(),
    };
  }
}

/**
 * Receives inventory stock into a warehouse (Initial receive or purchase receipt).
 */
export async function receiveInventory(
  params: ReceiveInventoryParams,
  client: PrismaClient = prisma
) {
  const {
    warehouseId,
    productId,
    variantId,
    serialNumber,
    condition = "NEW",
    costPrice,
    warrantyMonths = 12,
    notes,
    quantity = 1,
    actorId,
    idempotencyKey,
  } = params;

  if (serialNumber) {
    // Normalized serial number (upper & trimmed)
    const normalizedSerial = serialNumber.trim().toUpperCase();

    const unit = await client.serialUnit.create({
      data: {
        warehouseId,
        productId,
        variantId,
        serialNumber: normalizedSerial,
        condition,
        status: "AVAILABLE",
        costPrice,
        warrantyMonths,
        notes,
      },
    });

    await client.inventoryTransaction.create({
      data: {
        warehouseId,
        productId,
        variantId,
        serialUnitId: unit.id,
        transactionType: "RECEIVE",
        quantityDelta: 1,
        referenceType: "PURCHASE",
        actorId,
        idempotencyKey,
        reason: "Stock reception",
      },
    });

    return { type: "SERIALIZED", unit };
  } else {
    if (!variantId) throw new InventoryError("variantId is required for quantity stock reception", "MISSING_VARIANT_ID");

    const existing = await client.inventoryBalance.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });

    let balance;
    if (existing) {
      balance = await client.inventoryBalance.update({
        where: { id: existing.id },
        data: { onHand: { increment: quantity } },
      });
    } else {
      balance = await client.inventoryBalance.create({
        data: {
          warehouseId,
          productId,
          variantId,
          onHand: quantity,
          reserved: 0,
        },
      });
    }

    await client.inventoryTransaction.create({
      data: {
        warehouseId,
        productId,
        variantId,
        transactionType: "RECEIVE",
        quantityDelta: quantity,
        referenceType: "PURCHASE",
        actorId,
        idempotencyKey,
        reason: "Quantity stock reception",
      },
    });

    return { type: "QUANTITY", balance };
  }
}

/**
 * Transitional helper: Recomputes authoritative stock from SerialUnits / InventoryBalances
 * and synchronizes legacy `Product.stock` & `ProductVariant.stock` fields so legacy queries
 * remain completely accurate without schema divergence.
 */
export async function syncLegacyProductStock(productId: string, client: PrismaClient = prisma) {
  const product = await client.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });

  if (!product) return;

  let productTotalAvailable = 0;

  for (const variant of product.variants) {
    const avail = await getSkuAvailability(variant.sku, undefined, client);
    await client.productVariant.update({
      where: { id: variant.id },
      data: { stock: avail.available },
    });
    productTotalAvailable += avail.available;
  }

  await client.product.update({
    where: { id: productId },
    data: { stock: productTotalAvailable },
  });

  return { productId, synchronizedStock: productTotalAvailable };
}
