import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readdir, readFile } from "node:fs/promises";
import { unstable_splitSqlQuery } from "wrangler";
import assert from "node:assert/strict";
import { build } from "esbuild";

console.log("=== CITILAP ROUND 05 — ORDERS P0 INTEGRITY & CONCURRENCY REGRESSION SUITE ===\n");

// 1. Bundle route handlers and auth/prisma helpers using external next/server.js (matching repro setup)
await build({
  stdin: {
    contents: `
      export { GET as getOrderRoute, PUT as putOrderRoute } from './src/app/api/orders/[id]/route';
      export { GET as listOrdersRoute } from './src/app/api/orders/route';
      export { POST as inventoryPost } from './src/app/api/admin/inventory/route';
      export { loginAdmin } from './src/server/services/admin-identity.service';
      export { setD1Database, getPrismaClient } from './src/lib/prisma';
      export { DEFAULT_ADMIN_SETTINGS } from './src/contracts/cms/settings';
      export { createOrder as createOrderService, transitionOrderStatus } from './src/server/services/order.service';
      export { calculateCheckout } from './src/server/services/checkout.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  platform: "node",
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  external: ["cloudflare:workers", "node:*", "next/server", "next/server.js"],
  plugins: [
    {
      name: "wasm-and-next",
      setup(b) {
        b.onResolve({ filter: /\.wasm/ }, (a) => ({ path: a.path, external: true }));
        b.onResolve({ filter: /^next\/server$/ }, () => ({
          path: "next/server.js",
          external: true,
        }));
        b.onResolve({ filter: /^server-only$/ }, (a) => ({
          path: a.path,
          namespace: "so",
        }));
        b.onLoad({ filter: /.*/, namespace: "so" }, () => ({ contents: "" }));
      },
    },
  ],
  outfile: "scripts/.r06-round05-bundle.mjs",
});

const {
  getOrderRoute,
  putOrderRoute,
  listOrdersRoute,
  inventoryPost,
  loginAdmin,
  setD1Database,
  DEFAULT_ADMIN_SETTINGS,
  createOrderService,
  calculateCheckout,
} = await import("./.r06-round05-bundle.mjs");

// 2. Setup isolated Miniflare D1
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("round05-test"); } }',
    d1Databases: ["DB"],
    r2Buckets: ["PRODUCT_MEDIA"],
  })
);

const db = await mf.getD1Database("DB");
globalThis.env = { DB: db, PRODUCT_MEDIA: await mf.getR2Bucket("PRODUCT_MEDIA") };
setD1Database(db);

const migrationFiles = (await readdir("d1-migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const file of migrationFiles) {
  const sql = await readFile(`d1-migrations/${file}`, "utf-8");
  for (const statement of unstable_splitSqlQuery(sql)) {
    if (statement.trim()) {
      await db.prepare(statement).run();
    }
  }
}
console.log(`Applied ${migrationFiles.length} D1 migrations to isolated Miniflare database.`);

await db
  .prepare("INSERT INTO SiteSettings(id, revision, document) VALUES('site', 0, ?)")
  .bind(
    JSON.stringify({
      ...DEFAULT_ADMIN_SETTINGS,
      codEnabled: true,
      shippingFee: 30000,
      freeShippingThreshold: 50000000,
    })
  )
  .run();

// Authenticate via real loginAdmin + admin_session cookie fixture (no legacy Bearer token)
process.env.ADMIN_EMAIL = "qa-integrity@example.test";
process.env.ADMIN_PASSWORD = "TemporaryFixturePassword123!";
process.env.ADMIN_SESSION_SECRET = "test-admin-secret-32-chars-minimum-r05!!";

const { token } = await loginAdmin(
  { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  db
);
assert.ok(token, "loginAdmin fixture must return session token");
const adminCookie = `admin_session=${token}`;

function makePutReq(orderId, body, opts = {}) {
  const headers = {
    "content-type": "application/json",
    ...(opts.skipCookie ? {} : { cookie: adminCookie }),
    ...(opts.skipOrigin ? {} : { origin: opts.origin ?? "http://localhost" }),
  };
  return new Request(`http://localhost/api/orders/${orderId}`, {
    method: "PUT",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeGetReq(orderId, opts = {}) {
  const headers = {
    ...(opts.skipCookie ? {} : { cookie: adminCookie }),
  };
  return new Request(`http://localhost/api/orders/${orderId}`, {
    method: "GET",
    headers,
  });
}

async function callPut(orderId, body, opts = {}) {
  const res = await putOrderRoute(makePutReq(orderId, body, opts), {
    params: Promise.resolve({ id: orderId }),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function callGet(orderId, opts = {}) {
  const res = await getOrderRoute(makeGetReq(orderId, opts), {
    params: Promise.resolve({ id: orderId }),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

let passCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err);
    throw err;
  }
}

// Seed base catalog & warehouse fixtures
const nowIso = new Date().toISOString();
await db
  .prepare(
    `INSERT INTO Category (id, name, slug, createdAt, updatedAt) VALUES ('cat-r05', 'Laptops', 'laptops-r05', ?, ?)`
  )
  .bind(nowIso, nowIso)
  .run();

await db
  .prepare(
    `INSERT INTO Warehouse (id, code, name)
     VALUES ('wh-r05', 'WH-HN', 'Kho Hà Nội')`
  )
  .run();

// Product A: Has 2 active variants (var-a1, var-a2)
await db
  .prepare(
    `INSERT INTO Product (id, name, slug, description, price, originalPrice, stock, status, categoryId, createdAt, updatedAt)
     VALUES ('prod-a', 'ThinkPad X1 Carbon Gen 11', 'thinkpad-x1-g11', '', 25000000, 28000000, 10, 'ACTIVE', 'cat-r05', ?, ?)`
  )
  .bind(nowIso, nowIso)
  .run();

await db
  .prepare(
    `INSERT INTO ProductVariant (id, productId, sku, name, cpu, ram, storage, price, originalPrice, stock, status, options, createdAt, updatedAt)
     VALUES
       ('var-a1', 'prod-a', 'SKU-X1-16G', 'i7 / 16GB / 512GB', 'i7-1355U', '16GB', '512GB', 25000000, 28000000, 5, 'ACTIVE', '{}', ?, ?),
       ('var-a2', 'prod-a', 'SKU-X1-32G', 'i7 / 32GB / 1TB', 'i7-1365U', '32GB', '1TB', 29000000, 32000000, 5, 'ACTIVE', '{}', ?, ?)`
  )
  .bind(nowIso, nowIso, nowIso, nowIso)
  .run();

// Product B: Different product
await db
  .prepare(
    `INSERT INTO Product (id, name, slug, description, price, stock, status, categoryId, createdAt, updatedAt)
     VALUES ('prod-b', 'Dell Latitude 7440', 'dell-lat-7440', '', 22000000, 5, 'ACTIVE', 'cat-r05', ?, ?)`
  )
  .bind(nowIso, nowIso)
  .run();

// Product C: Legacy product with NO ProductVariant rows
await db
  .prepare(
    `INSERT INTO Product (id, name, slug, description, price, stock, status, categoryId, createdAt, updatedAt)
     VALUES ('prod-legacy', 'HP EliteBook 840 G8', 'hp-840-g8', '', 12000000, 5, 'ACTIVE', 'cat-r05', ?, ?)`
  )
  .bind(nowIso, nowIso)
  .run();

// Serial units in warehouse
const serials = [
  // Product A, Variant A1
  { id: "su-a1-free-1", productId: "prod-a", variantId: "var-a1", sn: "SN-A1-FREE-1", status: "AVAILABLE" },
  { id: "su-a1-free-2", productId: "prod-a", variantId: "var-a1", sn: "SN-A1-FREE-2", status: "AVAILABLE" },
  { id: "su-a1-race", productId: "prod-a", variantId: "var-a1", sn: "SN-A1-RACE", status: "AVAILABLE" },
  { id: "su-a1-reserved-ext", productId: "prod-a", variantId: "var-a1", sn: "SN-A1-RESV-EXT", status: "AVAILABLE" },
  // Product A, Variant A2
  { id: "su-a2-free-1", productId: "prod-a", variantId: "var-a2", sn: "SN-A2-FREE-1", status: "AVAILABLE" },
  // Product B (no variant)
  { id: "su-b-free-1", productId: "prod-b", variantId: null, sn: "SN-B-FREE-1", status: "AVAILABLE" },
  // Product C (legacy null variant)
  { id: "su-legacy-free-1", productId: "prod-legacy", variantId: null, sn: "SN-LEGACY-1", status: "AVAILABLE" },
];

for (const s of serials) {
  await db
    .prepare(
      `INSERT INTO SerialUnit (id, productId, variantId, warehouseId, serialNumber, status, condition, warrantyMonths, costPrice, createdAt, updatedAt)
       VALUES (?, ?, ?, 'wh-r05', ?, ?, 'LIKE_NEW', 12, 20000000, ?, ?)`
    )
    .bind(s.id, s.productId, s.variantId, s.sn, s.status, nowIso, nowIso)
    .run();
}

// Active InventoryReservation holding su-a1-reserved-ext
const futureIso = new Date(Date.now() + 3600_000).toISOString();
await db
  .prepare(
    `INSERT INTO InventoryReservation (id, productId, variantId, warehouseId, serialUnitId, quantity, status, referenceType, referenceId, expiresAt, createdAt, updatedAt)
     VALUES ('resv-active-1', 'prod-a', 'var-a1', 'wh-r05', 'su-a1-reserved-ext', 1, 'ACTIVE', 'CART', 'sess-other', ?, ?, ?)`
  )
  .bind(futureIso, nowIso, nowIso)
  .run();

async function createFixtureOrder({
  id,
  orderNumber,
  status = "NEW",
  paymentStatus = "PENDING",
  shippingMethod = "standard",
  shippingFee = 30000,
  items,
}) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const total = subtotal + shippingFee;
  await db
    .prepare(
      `INSERT INTO "Order" (
        id, orderNumber, status, revision, subtotalAmount, shippingFee, totalAmount,
        customerName, customerPhone, customerEmail, shippingAddress, shippingMethod,
        paymentMethod, paymentStatus, createdAt, updatedAt
      ) VALUES (?, ?, ?, 0, ?, ?, ?, 'Nguyen Van Test', '0901234567', 'test@citilap.vn', '123 Cau Giay, HN', ?, 'COD', ?, ?, ?)`
    )
    .bind(id, orderNumber, status, subtotal, shippingFee, total, shippingMethod, paymentStatus, nowIso, nowIso)
    .run();

  for (const it of items) {
    await db
      .prepare(
        `INSERT INTO "OrderItem" (
          id, orderId, productId, variantId, serialUnitId, quantity,
          price, priceSnapshot, regularPriceSnapshot, compareAtPriceSnapshot,
          campaignSnapshot, lineTotal, productName, productNameSnapshot,
          sku, skuSnapshot, variantNameSnapshot, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(
        it.id,
        id,
        it.productId,
        it.variantId ?? null,
        it.serialUnitId ?? null,
        it.quantity,
        it.price,
        it.priceSnapshot ?? it.price,
        it.regularPriceSnapshot ?? it.price + 1000000,
        it.compareAtPriceSnapshot ?? it.price + 3000000,
        it.campaignSnapshot ?? '{"campaignId":"camp-1","discount":1000000}',
        it.price * it.quantity,
        it.productName ?? "ThinkPad X1 Carbon Gen 11",
        it.productNameSnapshot ?? "ThinkPad X1 Carbon Gen 11",
        it.sku ?? "SKU-X1-16G",
        it.skuSnapshot ?? "SKU-X1-16G",
        it.variantNameSnapshot ?? "i7 / 16GB / 512GB"
      )
      .run();
  }
}

await createFixtureOrder({
  id: "ord-main",
  orderNumber: "CL-261112-MAIN01",
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  shippingMethod: "standard",
  shippingFee: 30000,
  items: [
    {
      id: "item-main-a1",
      productId: "prod-a",
      variantId: "var-a1",
      quantity: 1,
      price: 25000000,
    },
    {
      id: "item-main-a1-second",
      productId: "prod-a",
      variantId: "var-a1",
      quantity: 1,
      price: 25000000,
    },
  ],
});

await createFixtureOrder({
  id: "ord-other",
  orderNumber: "CL-261112-OTHR02",
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  shippingMethod: "standard",
  shippingFee: 30000,
  items: [
    {
      id: "item-other-a1",
      productId: "prod-a",
      variantId: "var-a1",
      quantity: 1,
      price: 25000000,
    },
  ],
});

await createFixtureOrder({
  id: "ord-legacy",
  orderNumber: "CL-261112-LEGC03",
  status: "NEW",
  paymentStatus: "PENDING",
  shippingMethod: "standard",
  shippingFee: 0,
  items: [
    {
      id: "item-null-var-with-variants",
      productId: "prod-a",
      variantId: null,
      quantity: 1,
      price: 25000000,
    },
    {
      id: "item-null-var-no-variants",
      productId: "prod-legacy",
      variantId: null,
      quantity: 1,
      price: 12000000,
    },
  ],
});

await createFixtureOrder({
  id: "ord-pickup",
  orderNumber: "CL-261112-PKUP04",
  status: "NEW",
  paymentStatus: "PENDING",
  shippingMethod: "pickup",
  shippingFee: 0,
  items: [
    {
      id: "item-pickup-1",
      productId: "prod-b",
      variantId: null,
      quantity: 1,
      price: 22000000,
    },
  ],
});

console.log("\n--- 1. Auth, CSRF, 404 & Input Validation Guards ---");

await test("1.1 Customer GET requires confirmation token; admin PUT requires session", async () => {
  const getRes = await callGet("ord-main", { skipCookie: true });
  assert.equal(getRes.status, 403);

  const putRes = await callPut(
    "ord-main",
    { action: "UPDATE_BILLING", expectedRevision: 0, paymentStatus: "PAID" },
    { skipCookie: true }
  );
  assert.equal(putRes.status, 401);
});

await test("1.2 Cross-site or missing Origin on PUT /api/orders/[id] with session cookie returns 403 CSRF error", async () => {
  const noOriginRes = await callPut(
    "ord-main",
    { action: "UPDATE_BILLING", expectedRevision: 0, paymentStatus: "PAID" },
    { skipOrigin: true }
  );
  assert.equal(noOriginRes.status, 403);

  const evilOriginRes = await callPut(
    "ord-main",
    { action: "UPDATE_BILLING", expectedRevision: 0, paymentStatus: "PAID" },
    { origin: "https://evil.example.com" }
  );
  assert.equal(evilOriginRes.status, 403);
});

await test("1.3 Non-existent order ID returns 404 on GET and PUT across all actions", async () => {
  const getRes = await callGet("ord-does-not-exist");
  assert.equal(getRes.status, 404);

  const putBilling = await callPut("ord-does-not-exist", {
    action: "UPDATE_BILLING",
    expectedRevision: 0,
    paymentStatus: "PAID",
  });
  assert.equal(putBilling.status, 404);

  const putSerial = await callPut("ord-does-not-exist", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-main-a1",
    serialUnitId: "su-a1-free-1",
  });
  assert.equal(putSerial.status, 404);

  const putTransition = await callPut("ord-does-not-exist", {
    status: "CONTACTED",
    expectedRevision: 0,
  });
  assert.equal(putTransition.status, 404);
});

await test("1.4 Invalid JSON body and missing/non-integer expectedRevision return 400", async () => {
  const badJson = await callPut("ord-main", "{not-valid-json");
  assert.equal(badJson.status, 400);

  for (const badRev of [undefined, null, -1, 1.5, "0", NaN]) {
    const r1 = await callPut("ord-main", {
      action: "UPDATE_BILLING",
      expectedRevision: badRev,
      paymentStatus: "PAID",
    });
    assert.equal(r1.status, 400, `UPDATE_BILLING must reject expectedRevision=${String(badRev)}`);

    const r2 = await callPut("ord-main", {
      action: "ASSIGN_SERIAL",
      expectedRevision: badRev,
      orderItemId: "item-main-a1",
      serialUnitId: "su-a1-free-1",
    });
    assert.equal(r2.status, 400, `ASSIGN_SERIAL must reject expectedRevision=${String(badRev)}`);
  }
});

console.log("\n--- 2. ASSIGN_SERIAL Product/Variant/Reservation/Concurrency/Lifecycle Invariants ---");

await test("2.1 Rejects assigning serial from wrong product (400 SERIAL_PRODUCT_MISMATCH)", async () => {
  const res = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-main-a1",
    serialUnitId: "su-b-free-1",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, "SERIAL_PRODUCT_MISMATCH");

  const orderRow = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-main").first();
  assert.equal(orderRow.revision, 0);
});

await test("2.2 Rejects assigning serial from wrong variant of same product (400 SERIAL_VARIANT_MISMATCH)", async () => {
  const res = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-main-a1", // var-a1
    serialUnitId: "su-a2-free-1", // var-a2
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, "SERIAL_VARIANT_MISMATCH");
});

await test("2.3 Enforces legacy NULL variant semantics (rejects variant serial when product has variants; allows null-variant serial on legacy product)", async () => {
  // item-null-var-with-variants is on prod-a (which has active variants var-a1, var-a2) -> cannot assign var-a1 serial
  const rejectRes = await callPut("ord-legacy", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-null-var-with-variants",
    serialUnitId: "su-a1-free-1",
  });
  assert.equal(rejectRes.status, 400);
  assert.equal(rejectRes.body.error?.code, "SERIAL_VARIANT_MISMATCH");

  // item-null-var-no-variants is on prod-legacy (0 variants) with su-legacy-free-1 (variantId NULL) -> allowed!
  const okRes = await callPut("ord-legacy", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-null-var-no-variants",
    serialUnitId: "su-legacy-free-1",
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.body.data.revision, 1);

  const suRow = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-legacy-free-1").first();
  assert.equal(suRow.status, "RESERVED");
});

await test("2.4 Rejects serial held by active InventoryReservation elsewhere (409 SERIAL_RESERVED_ELSEWHERE)", async () => {
  const res = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-main-a1",
    serialUnitId: "su-a1-reserved-ext",
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error?.code, "SERIAL_RESERVED_ELSEWHERE");

  // Also verify GET /api/orders/ord-main does NOT list su-a1-reserved-ext in availableSerials
  const getRes = await callGet("ord-main");
  assert.equal(getRes.status, 200);
  const availIds = getRes.body.data.availableSerials.map((s) => s.id);
  assert.equal(availIds.includes("su-a1-reserved-ext"), false, "Reserved serial must not appear in availableSerials");
});

await test("2.5 Valid serial assignment reserves serial, increments Order.revision, writes event + audit, and preserves item price snapshots", async () => {
  const res = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-main-a1",
    serialUnitId: "su-a1-free-1",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.revision, 1);

  const itemRow = await db
    .prepare(
      'SELECT serialUnitId, price, priceSnapshot, regularPriceSnapshot, compareAtPriceSnapshot, campaignSnapshot, lineTotal FROM "OrderItem" WHERE id = ?'
    )
    .bind("item-main-a1")
    .first();
  assert.equal(itemRow.serialUnitId, "su-a1-free-1");
  assert.equal(itemRow.price, 25000000);
  assert.equal(itemRow.priceSnapshot, 25000000);
  assert.equal(itemRow.regularPriceSnapshot, 26000000);
  assert.equal(itemRow.compareAtPriceSnapshot, 28000000);
  assert.equal(itemRow.campaignSnapshot, '{"campaignId":"camp-1","discount":1000000}');
  assert.equal(itemRow.lineTotal, 25000000);

  const suRow = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-a1-free-1").first();
  assert.equal(suRow.status, "RESERVED");
});

await test("2.6 Rejects assigning a serial already held by another item in the same order or another active order", async () => {
  // Same order, second item tries to claim su-a1-free-1
  const sameOrderRes = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 1,
    orderItemId: "item-main-a1-second",
    serialUnitId: "su-a1-free-1",
  });
  assert.equal(sameOrderRes.status, 409);
  assert.equal(sameOrderRes.body.error?.code, "SERIAL_HELD_BY_OTHER_ORDER");

  // Other active order tries to claim su-a1-free-1
  const otherOrderRes = await callPut("ord-other", {
    action: "ASSIGN_SERIAL",
    expectedRevision: 0,
    orderItemId: "item-other-a1",
    serialUnitId: "su-a1-free-1",
  });
  assert.equal(otherOrderRes.status, 409);
  assert.ok(
    ["SERIAL_NOT_AVAILABLE", "SERIAL_HELD_BY_OTHER_ORDER"].includes(otherOrderRes.body.error?.code),
    `Expected serial conflict code, got ${otherOrderRes.body.error?.code}`
  );
});

await test("2.7 Two orders racing concurrently for the same AVAILABLE serial: exactly one wins (200) and one gets 409 with zero partial writes", async () => {
  const [rMain, rOther] = await Promise.all([
    callPut("ord-main", {
      action: "ASSIGN_SERIAL",
      expectedRevision: 1,
      orderItemId: "item-main-a1-second",
      serialUnitId: "su-a1-race",
    }),
    callPut("ord-other", {
      action: "ASSIGN_SERIAL",
      expectedRevision: 0,
      orderItemId: "item-other-a1",
      serialUnitId: "su-a1-race",
    }),
  ]);

  const statuses = [rMain.status, rOther.status].sort();
  assert.deepEqual(statuses, [200, 409], `Expected one 200 and one 409, got ${statuses.join(", ")}`);

  // Verify su-a1-race is assigned to exactly ONE OrderItem in DB
  const holders = await db
    .prepare('SELECT id, orderId FROM "OrderItem" WHERE serialUnitId = ?')
    .bind("su-a1-race")
    .all();
  assert.equal(holders.results.length, 1, "Serial must belong to exactly one OrderItem");
});

await test("2.8 Completed order locks serial assignment/unassignment and transitions serial to SOLD; SOLD serial never reverts to AVAILABLE", async () => {
  // Check current revision of ord-main
  const ordMainBefore = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-main").first();

  // Transition ord-main (CONFIRMED) -> COMPLETED
  const completeRes = await callPut("ord-main", {
    status: "COMPLETED",
    expectedRevision: ordMainBefore.revision,
  });
  assert.equal(completeRes.status, 200);
  const completedRev = completeRes.body.data.revision;

  // Assigned serial su-a1-free-1 must now be SOLD in DB
  const suSold = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-a1-free-1").first();
  assert.equal(suSold.status, "SOLD", "Completing an order must mark its assigned serials as SOLD");

  // Attempt to unassign serial on COMPLETED order -> must fail with 400 and leave serial as SOLD
  const unassignCompleted = await callPut("ord-main", {
    action: "ASSIGN_SERIAL",
    expectedRevision: completedRev,
    orderItemId: "item-main-a1",
    serialUnitId: null,
  });
  assert.equal(unassignCompleted.status, 400);
  assert.equal(unassignCompleted.body.error?.code, "ORDER_COMPLETED_SERIAL_LOCKED");

  const suStillSold = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-a1-free-1").first();
  assert.equal(suStillSold.status, "SOLD", "Unassign attempt on COMPLETED order must not revert serial to AVAILABLE");
});

await test("2.9 Cancelling an order releases its RESERVED serials back to AVAILABLE and blocks assigning new serials while CANCELLED", async () => {
  // Ensure ord-other has su-a1-free-2 assigned first
  const ordOtherBefore = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-other").first();
  const assignRes = await callPut("ord-other", {
    action: "ASSIGN_SERIAL",
    expectedRevision: ordOtherBefore.revision,
    orderItemId: "item-other-a1",
    serialUnitId: "su-a1-free-2",
  });
  assert.equal(assignRes.status, 200);

  const suReserved = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-a1-free-2").first();
  assert.equal(suReserved.status, "RESERVED");

  // Cancel ord-other
  const cancelRes = await callPut("ord-other", {
    status: "CANCELLED",
    expectedRevision: assignRes.body.data.revision,
    reason: "Khach doi y huy don",
  });
  assert.equal(cancelRes.status, 200);

  // Verify su-a1-free-2 is released back to AVAILABLE and item-other-a1.serialUnitId is NULL
  const suReleased = await db.prepare('SELECT status FROM "SerialUnit" WHERE id = ?').bind("su-a1-free-2").first();
  assert.equal(suReleased.status, "AVAILABLE", "Cancelling order must release RESERVED serial back to AVAILABLE");

  const itemReleased = await db
    .prepare('SELECT serialUnitId FROM "OrderItem" WHERE id = ?')
    .bind("item-other-a1")
    .first();
  assert.equal(itemReleased.serialUnitId, null);

  // Attempt to assign serial to CANCELLED order -> must fail with 400
  const assignCancelled = await callPut("ord-other", {
    action: "ASSIGN_SERIAL",
    expectedRevision: cancelRes.body.data.revision,
    orderItemId: "item-other-a1",
    serialUnitId: "su-a1-free-2",
  });
  assert.equal(assignCancelled.status, 400);
  assert.equal(assignCancelled.body.error?.code, "ORDER_CANCELLED_SERIAL_LOCKED");
});

console.log("\n--- 3. UPDATE_BILLING CAS, Input Validation, Financial Locks & Concurrency ---");

await test("3.1 Rejects invalid paymentStatus enums and invalid shippingFee numbers with 400 (no silent fallback)", async () => {
  const ordLegacy = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-legacy").first();

  for (const badStatus of ["INVALID", "REFUNDED", "PARTIAL", "", 123]) {
    const res = await callPut("ord-legacy", {
      action: "UPDATE_BILLING",
      expectedRevision: ordLegacy.revision,
      paymentStatus: badStatus,
    });
    assert.equal(res.status, 400, `paymentStatus=${String(badStatus)} must return 400`);
  }

  for (const badFee of [-1, -50000, 12.5, "30000", 60000000, null, true]) {
    const res = await callPut("ord-legacy", {
      action: "UPDATE_BILLING",
      expectedRevision: ordLegacy.revision,
      shippingFee: badFee,
    });
    assert.equal(res.status, 400, `shippingFee=${String(badFee)} must return 400`);
  }

  const emptyBilling = await callPut("ord-legacy", {
    action: "UPDATE_BILLING",
    expectedRevision: ordLegacy.revision,
  });
  assert.equal(emptyBilling.status, 400);
});

await test("3.2 Valid UPDATE_BILLING increments revision, updates totalAmount, preserves item snapshots, and rejects stale expectedRevision with 409", async () => {
  const ordBefore = await db
    .prepare('SELECT revision, subtotalAmount, shippingFee, totalAmount FROM "Order" WHERE id = ?')
    .bind("ord-legacy")
    .first();

  const res = await callPut("ord-legacy", {
    action: "UPDATE_BILLING",
    expectedRevision: ordBefore.revision,
    shippingFee: 45000,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.revision, ordBefore.revision + 1);
  assert.equal(res.body.data.shippingFee, 45000);
  assert.equal(res.body.data.totalAmount, ordBefore.subtotalAmount + 45000);

  // Stale expectedRevision must return 409 Conflict
  const staleRes = await callPut("ord-legacy", {
    action: "UPDATE_BILLING",
    expectedRevision: ordBefore.revision,
    paymentStatus: "PAID",
  });
  assert.equal(staleRes.status, 409);
  assert.equal(staleRes.body.error?.code, "CONFLICT_REVISION_MISMATCH");
  assert.equal(staleRes.body.error?.currentRevision, ordBefore.revision + 1);
});

await test("3.3 Enforces financial & lifecycle locks (pickup shippingFee=0, PAID locks shippingFee, COMPLETED & CANCELLED locks)", async () => {
  // Pickup order cannot have shippingFee > 0
  const pickupRes = await callPut("ord-pickup", {
    action: "UPDATE_BILLING",
    expectedRevision: 0,
    shippingFee: 25000,
  });
  assert.equal(pickupRes.status, 400);
  assert.equal(pickupRes.body.error?.code, "PICKUP_SHIPPING_FEE_MUST_BE_ZERO");

  // Mark ord-legacy as PAID
  const ordLegacyBefore = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-legacy").first();
  const markPaidRes = await callPut("ord-legacy", {
    action: "UPDATE_BILLING",
    expectedRevision: ordLegacyBefore.revision,
    paymentStatus: "PAID",
  });
  assert.equal(markPaidRes.status, 200);
  assert.equal(markPaidRes.body.data.paymentStatus, "PAID");

  // Once PAID, changing shippingFee must be blocked (PAID_AMOUNT_LOCKED)
  const changeFeeAfterPaid = await callPut("ord-legacy", {
    action: "UPDATE_BILLING",
    expectedRevision: markPaidRes.body.data.revision,
    shippingFee: 10000,
  });
  assert.equal(changeFeeAfterPaid.status, 400);
  assert.equal(changeFeeAfterPaid.body.error?.code, "ORDER_PAID_SHIPPING_LOCKED");

  // CANCELLED order (ord-other) blocks billing updates
  const ordOtherCancelled = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-other").first();
  const billingOnCancelled = await callPut("ord-other", {
    action: "UPDATE_BILLING",
    expectedRevision: ordOtherCancelled.revision,
    paymentStatus: "PAID",
  });
  assert.equal(billingOnCancelled.status, 400);
  assert.equal(billingOnCancelled.body.error?.code, "ORDER_CANCELLED_BILLING_LOCKED");

  // COMPLETED order (ord-main) blocks shippingFee changes
  const ordMainCompleted = await db.prepare('SELECT revision FROM "Order" WHERE id = ?').bind("ord-main").first();
  const feeOnCompleted = await callPut("ord-main", {
    action: "UPDATE_BILLING",
    expectedRevision: ordMainCompleted.revision,
    shippingFee: 99000,
  });
  assert.equal(feeOnCompleted.status, 400);
  assert.equal(feeOnCompleted.body.error?.code, "ORDER_COMPLETED_SHIPPING_LOCKED");
});

await test("3.4 Race between status transition (CANCELLED) and UPDATE_BILLING (PAID) at same revision: one wins (200), loser gets 409/400", async () => {
  await createFixtureOrder({
    id: "ord-race-state-billing",
    orderNumber: "CL-261112-RACE05",
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    shippingMethod: "standard",
    shippingFee: 30000,
    items: [
      {
        id: "item-race-sb",
        productId: "prod-b",
        variantId: null,
        quantity: 1,
        price: 22000000,
      },
    ],
  });

  const [rCancel, rBilling] = await Promise.all([
    callPut("ord-race-state-billing", {
      status: "CANCELLED",
      expectedRevision: 0,
      reason: "Khach bao huy",
    }),
    callPut("ord-race-state-billing", {
      action: "UPDATE_BILLING",
      expectedRevision: 0,
      paymentStatus: "PAID",
    }),
  ]);

  const codes = [rCancel.status, rBilling.status].sort();
  assert.equal(codes[0], 200, "Exactly one concurrent operation must win with 200");
  assert.ok([400, 409].includes(codes[1]), `Loser must be rejected with 409 or 400, got ${codes[1]}`);

  const afterRow = await db
    .prepare('SELECT status, paymentStatus, revision FROM "Order" WHERE id = ?')
    .bind("ord-race-state-billing")
    .first();
  assert.equal(afterRow.revision, 1, "Revision must increment exactly once");
  assert.equal(
    afterRow.status === "CANCELLED" && afterRow.paymentStatus === "PAID",
    false,
    "Order must never end up both CANCELLED and PAID from concurrent race"
  );
});

console.log("\n--- 4. All-or-Nothing D1 Batch Rollback Verification (Fault Injection) ---");

await test("4.1 Fault injection on AdminAudit rolls back entire D1 batch for both ASSIGN_SERIAL and UPDATE_BILLING (zero partial stock/item/order/event writes)", async () => {
  await createFixtureOrder({
    id: "ord-rollback-test",
    orderNumber: "CL-261112-RLBK06",
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    shippingMethod: "standard",
    shippingFee: 30000,
    items: [
      {
        id: "item-rlbk-a1",
        productId: "prod-a",
        variantId: "var-a1",
        quantity: 1,
        price: 25000000,
      },
    ],
  });

  const eventsBefore = await db
    .prepare('SELECT COUNT(*) as cnt FROM "OrderEvent" WHERE orderId = ?')
    .bind("ord-rollback-test")
    .first();

  // Inject trigger on AdminAudit (the final statement in the batch)
  await db
    .prepare(
      `CREATE TRIGGER fail_audit_on_rollback_test
       BEFORE INSERT ON "AdminAudit"
       WHEN NEW.entityId = 'ord-rollback-test'
       BEGIN
         SELECT RAISE(ABORT, 'injected_audit_failure');
       END;`
    )
    .run();

  try {
    // 1) Attempt ASSIGN_SERIAL with su-a1-free-2 -> must fail and rollback SerialUnit, OrderItem, Order, OrderEvent
    const assignRes = await callPut("ord-rollback-test", {
      action: "ASSIGN_SERIAL",
      expectedRevision: 0,
      orderItemId: "item-rlbk-a1",
      serialUnitId: "su-a1-free-2",
    });
    assert.ok(assignRes.status >= 400, "Fault-injected ASSIGN_SERIAL must not return 200");

    const suAfterAssign = await db
      .prepare('SELECT status FROM "SerialUnit" WHERE id = ?')
      .bind("su-a1-free-2")
      .first();
    assert.equal(suAfterAssign.status, "AVAILABLE", "SerialUnit status must rollback to AVAILABLE");

    const itemAfterAssign = await db
      .prepare('SELECT serialUnitId FROM "OrderItem" WHERE id = ?')
      .bind("item-rlbk-a1")
      .first();
    assert.equal(itemAfterAssign.serialUnitId, null, "OrderItem.serialUnitId must rollback to NULL");

    // 2) Attempt UPDATE_BILLING -> must fail and rollback Order and OrderEvent
    const billingRes = await callPut("ord-rollback-test", {
      action: "UPDATE_BILLING",
      expectedRevision: 0,
      paymentStatus: "PAID",
      shippingFee: 50000,
    });
    assert.ok(billingRes.status >= 400, "Fault-injected UPDATE_BILLING must not return 200");

    const ordAfter = await db
      .prepare('SELECT revision, paymentStatus, shippingFee FROM "Order" WHERE id = ?')
      .bind("ord-rollback-test")
      .first();
    assert.equal(ordAfter.revision, 0, "Order.revision must remain 0 after batch rollback");
    assert.equal(ordAfter.paymentStatus, "PENDING", "Order.paymentStatus must remain PENDING after batch rollback");
    assert.equal(ordAfter.shippingFee, 30000, "Order.shippingFee must remain 30000 after batch rollback");

    const eventsAfter = await db
      .prepare('SELECT COUNT(*) as cnt FROM "OrderEvent" WHERE orderId = ?')
      .bind("ord-rollback-test")
      .first();
    assert.equal(eventsAfter.cnt, eventsBefore.cnt, "Zero partial OrderEvent rows may remain after rollback");
  } finally {
    await db.prepare("DROP TRIGGER IF EXISTS fail_audit_on_rollback_test").run();
  }
});

async function inventory(body) {
  return inventoryPost(new Request('http://localhost/api/admin/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', Cookie: adminCookie }, body: JSON.stringify(body) }));
}
await test('5.1 Manual inventory changes cannot release SOLD or order-owned serials', async () => {
  await db.prepare("INSERT INTO SerialUnit(id,productId,variantId,warehouseId,serialNumber,status,updatedAt) VALUES('su-manual-sold','prod-a','var-a1','wh-r05','MANUAL-SOLD','SOLD',?)").bind(nowIso).run();
  const response=await inventory({action:'UPDATE_SERIAL_STATUS',id:'su-manual-sold',status:'AVAILABLE',expectedUpdatedAt:nowIso});
  assert.equal(response.status,409);
  assert.equal((await db.prepare("SELECT status FROM SerialUnit WHERE id='su-manual-sold'").first()).status,'SOLD');
  const owned=await inventory({action:'UPDATE_SERIAL_STATUS',id:'su-a1-reserved-ext',status:'QC_HOLD',expectedUpdatedAt:nowIso});
  assert.equal(owned.status,409);
});
await test('5.2 Manual QC transition uses CAS; concurrent writers have one winner', async () => {
  await db.prepare("INSERT INTO SerialUnit(id,productId,variantId,warehouseId,serialNumber,status,updatedAt) VALUES('su-manual-qc','prod-a','var-a1','wh-r05','MANUAL-QC','QC_HOLD',?)").bind(nowIso).run();
  const results=await Promise.all(['AVAILABLE','REPAIR'].map(status=>inventory({action:'UPDATE_SERIAL_STATUS',id:'su-manual-qc',status,expectedUpdatedAt:nowIso})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const missing=await inventory({action:'UPDATE_SERIAL_STATUS',id:'missing',status:'AVAILABLE',expectedUpdatedAt:nowIso});
  assert.equal(missing.status,404);
});
await test('5.3 Intake rejects invalid variant, enum, warranty and fabricated QC defaults', async () => {
  const input={action:'CREATE_SERIAL',productId:'prod-a',variantId:'var-a1',warehouseId:'wh-r05',serialNumber:'INTAKE-QA',publicCode:'INTAKE-QA'};
  for(const invalid of [{variantId:'not-owned'},{status:'SOLD'},{warrantyMonths:-1},{condition:'anything'},{batteryHealth:101},{serialNumber:{}}]) assert.equal((await inventory({...input,...invalid})).status,400);
  const response=await inventory(input);
  assert.equal(response.status,200);
  const {id}=await response.json();
  const inspection=await db.prepare('SELECT batteryHealth,appearance,checks,published FROM ProductInspection WHERE serialUnitId=?').bind(id).first();
  assert.deepEqual(inspection,{batteryHealth:null,appearance:'',checks:'',published:0});
});
delete globalThis.env;
await mf.dispose();

console.log(`\n=== SUMMARY: ${passCount}/${totalCount} ROUND 05 ORDER INTEGRITY TESTS PASSED ===`);
if (passCount !== totalCount) {
  process.exit(1);
}
