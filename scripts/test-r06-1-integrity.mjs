import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R06.1 — INTEGRITY, ATOMIC CAS, ACTOR & TRUTHFUL METRICS TEST SUITE ===\n');

// 1. Setup isolated Miniflare runtime with D1 & R2
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r06.1-test"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

const DB = await mf.getD1Database('DB');

// 2. Apply all migrations cleanly
const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
console.log(`[Setup] Applying ${migrationFiles.length} D1 migrations to isolated fixture DB...`);
for (const f of migrationFiles) {
  const sql = await readFile(`d1-migrations/${f}`, 'utf8');
  await DB.batch(unstable_splitSqlQuery(sql).map((s) => DB.prepare(s)));
}
console.log('✓ All migrations applied cleanly.\n');

// 3. Seed active product fixture for order placement
const productId = 'prod_test_r06_1';
const now = new Date().toISOString();
await DB.prepare(`
  INSERT INTO "Category" ("id", "name", "slug", "status", "createdAt", "updatedAt")
  VALUES ('cat_r06_1', 'Laptop Test R06.1', 'laptop-test-r06-1', 'ACTIVE', ?, ?)
  ON CONFLICT("id") DO NOTHING
`).bind(now, now).run();

await DB.prepare(`
  INSERT INTO "Product" (
    "id", "name", "slug", "description", "price", "stock", "status", "categoryId", "createdAt", "updatedAt"
  ) VALUES (?, 'Dell XPS 13 Plus R06.1', 'dell-xps-13-plus-r06-1', 'Laptop cao cấp', 35000000, 10, 'ACTIVE', 'cat_r06_1', ?, ?)
  ON CONFLICT("id") DO NOTHING
`).bind(productId, now, now).run();

await DB.prepare(`
  INSERT INTO "ProductStudio" ("productId", "revision", "draft", "published", "updatedAt")
  VALUES (?, 1, '{"availability":"AVAILABLE","variants":[]}', '{"availability":"AVAILABLE","variants":[]}', CURRENT_TIMESTAMP)
  ON CONFLICT("productId") DO NOTHING
`).bind(productId).run();

// 4. Bundle services
await build({
  stdin: {
    contents: `
      export * from './src/server/services/order.service';
      export * from './src/server/services/checkout.service';
      export * from './src/server/services/settings.service';
      export { DEFAULT_ADMIN_SETTINGS } from './src/contracts/cms/settings';
      export * from './src/server/services/contact.service';
      export * from './src/server/services/notification.service';
      export * from './src/server/services/customer.service';
      export * from './src/lib/csv-export';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['cloudflare:workers', 'node:*'],
  plugins: [
    {
      name: 'wasm-external',
      setup(build) {
        build.onResolve({ filter: /\.wasm/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
    {
      name: 'mock-server-only',
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, (args) => ({ path: args.path, namespace: 'server-only-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
      },
    },
  ],
  outfile: 'scripts/.r06-1-test-bundle.mjs',
});

const api = await import('./.r06-1-test-bundle.mjs');
await api.saveAdminSettings(DB, {expectedRevision: 0, document: api.DEFAULT_ADMIN_SETTINGS});
async function createOrder(input, key, db) {
  const selection = {paymentMethod:'COD', shippingMethod:'standard', shippingAddress:'Synthetic fixture address', ...input};
  const {quote} = await api.calculateCheckout(selection, db);
  return api.createOrder({...selection, items:selection.items.map((item,i)=>({...item, expectedPrice:quote.lines[i].price})), checkoutAcknowledgment:{shippingFee:quote.shippingFee, totalAmount:quote.totalAmount, termsVersion:quote.termsVersion}}, key, db);
}


let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

// =========================================================================
// SECTION 1: ORDER CAS AT DB WRITE POINT & RACE CONCURRENCY
// =========================================================================
console.log('--- SECTION 1: Order CAS at DB Write Point & Race Concurrency ---');

let testOrderId;
await test('Seed base order with revision = 1', async () => {
  const created = await createOrder(
    {
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      shippingAddress: '123 Đường Test, Q1, TP.HCM',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'COD',
    },
    'idemp-r06-1-base',
    DB
  );
  assert.equal(created.order.status, 'NEW');
  assert.equal(created.order.revision, 0);
  testOrderId = created.order.id;
});

await test('Missing or invalid expectedRevision is strictly rejected', async () => {
  await assert.rejects(
    () =>
      api.transitionOrderStatus(
        {
          orderId: testOrderId,
          targetStatus: 'CONTACTED',
          expectedRevision: undefined,
        },
        DB
      ),
    (err) => err.code === 'INVALID_REVISION'
  );

  await assert.rejects(
    () =>
      api.transitionOrderStatus(
        {
          orderId: testOrderId,
          targetStatus: 'CONTACTED',
          expectedRevision: -1,
        },
        DB
      ),
    (err) => err.code === 'INVALID_REVISION'
  );

  await assert.rejects(
    () =>
      api.transitionOrderStatus(
        {
          orderId: testOrderId,
          targetStatus: 'CONTACTED',
          expectedRevision: 1.5,
        },
        DB
      ),
    (err) => err.code === 'INVALID_REVISION'
  );
});

await test('Two concurrent transition requests with same revision: exactly ONE succeeds, ONE gets 409 Conflict', async () => {
  const current = await api.getOrderById(testOrderId, DB);
  assert.equal(current.revision, 0);

  // Launch two concurrent mutations simultaneously via Promise.all
  const results = await Promise.allSettled([
    api.transitionOrderStatus(
      {
        orderId: testOrderId,
        targetStatus: 'CONTACTED',
        expectedRevision: 0,
        reason: 'Client A transition',
      },
      DB
    ),
    api.transitionOrderStatus(
      {
        orderId: testOrderId,
        targetStatus: 'CONTACTED',
        expectedRevision: 0,
        reason: 'Client B transition',
      },
      DB
    ),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one request must succeed');
  assert.equal(rejected.length, 1, 'Exactly one request must fail with conflict');

  const conflictErr = rejected[0].reason;
  assert.equal(conflictErr.name, 'OrderConflictError');
  assert.equal(conflictErr.currentRevision, 1);

  // Verify DB state after the race
  const afterOrder = await api.getOrderById(testOrderId, DB);
  assert.equal(afterOrder.revision, 1, 'Revision must be incremented by exactly 1');
  assert.equal(afterOrder.status, 'CONTACTED');

  // Verify exactly one OrderEvent was created for this transition
  const events = await DB.prepare(
    `SELECT * FROM "OrderEvent" WHERE "orderId" = ? AND "action" = 'STATUS_CHANGE'`
  )
    .bind(testOrderId)
    .all();
  assert.equal(events.results.length, 1, 'Only one transition event must exist in DB');
});

// =========================================================================
// SECTION 2: SERVER-ENFORCED ACTOR (ZERO TRUST IN CLIENT)
// =========================================================================
console.log('\n--- SECTION 2: Server-Determined Actor (Zero Trust in Client) ---');

await test('Client-supplied actor in order transition is discarded; server label is enforced', async () => {
  const order = await api.getOrderById(testOrderId, DB);
  const updated = await api.transitionOrderStatus(
    {
      orderId: testOrderId,
      targetStatus: 'CONFIRMED',
      expectedRevision: order.revision,
      actor: 'FakeAttackerUser', // Client tries to spoof actor
      reason: 'Xác nhận đơn hợp lệ',
    },
    DB
  );

  const latestEvent = updated.events[0];
  assert.equal(latestEvent.action, 'STATUS_CHANGE');
  assert.equal(
    latestEvent.actor,
    api.SHARED_ADMIN_ACTOR,
    'Actor in OrderEvent must strictly be server SHARED_ADMIN_ACTOR'
  );
  assert.notEqual(latestEvent.actor, 'FakeAttackerUser');
});

await test('Client-supplied actor in addOrderInternalNote is discarded; server label is enforced', async () => {
  const note = await api.addOrderInternalNote(
    testOrderId,
    'Ghi chú kiểm tra phân quyền actor',
    'MaliciousAdminName', // Spoofed
    DB
  );

  assert.equal(note.actor, api.SHARED_ADMIN_ACTOR);
  assert.notEqual(note.actor, 'MaliciousAdminName');

  // Verify in DB directly
  const dbNote = await DB.prepare(`SELECT * FROM "OrderNote" WHERE "id" = ?`).bind(note.id).first();
  assert.equal(dbNote.actor, api.SHARED_ADMIN_ACTOR);
});

// =========================================================================
// SECTION 3: CONTACT INTEGRITY, CAS & TIMELINE
// =========================================================================
console.log('\n--- SECTION 3: Contacts Integrity, CAS & Timeline ---');

let testContactId;
await test('Submit contact creates record with initial revision = 1', async () => {
  const res = await api.submitContactMessage(
    {
      name: 'Võ Thị Khách Hàng',
      phone: '0987654321',
      email: 'vothikhach@example.com',
      message: 'Tôi muốn tư vấn cấu hình laptop đồ họa 3D',
    },
    '127.0.0.1',
    DB
  );
  assert.equal(res.success, true);
  testContactId = res.id;

  const contact = await api.getContactSubmissionById(testContactId, DB);
  assert.equal(contact.status, 'PENDING');
  assert.equal(contact.revision, 1);
  assert.equal(contact.startedProcessingAt, null);
  assert.equal(contact.handledAt, null);
});

await test('Concurrent contact updates with same revision: exactly ONE succeeds, ONE gets 409 Conflict', async () => {
  const results = await Promise.allSettled([
    api.updateContactSubmissionStatus(
      testContactId,
      {
        expectedRevision: 1,
        status: 'PROCESSING',
        internalNote: 'Đang gọi tư vấn khách lần 1',
      },
      DB
    ),
    api.updateContactSubmissionStatus(
      testContactId,
      {
        expectedRevision: 1,
        status: 'PROCESSING',
        internalNote: 'Đang liên hệ qua Zalo',
      },
      DB
    ),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one contact update must succeed');
  assert.equal(rejected.length, 1, 'Exactly one contact update must get 409 conflict');
  assert.equal(rejected[0].reason.name, 'ContactConflictError');

  // Verify updated contact has revision = 2, startedProcessingAt is set, and event is recorded
  const contact = await api.getContactSubmissionById(testContactId, DB);
  assert.equal(contact.revision, 2);
  assert.equal(contact.status, 'PROCESSING');
  assert.ok(contact.startedProcessingAt, 'startedProcessingAt must be recorded on PROCESSING');
  assert.equal(contact.handledAt, null, 'handledAt must not be set yet');
  assert.equal(contact.events.length, 1, 'One ContactEvent must be recorded');
  assert.equal(contact.events[0].actor, api.SHARED_CONTACT_ACTOR);
});

await test('Transition PROCESSING -> HANDLED records handledAt and appends to ContactEvent timeline', async () => {
  const current = await api.getContactSubmissionById(testContactId, DB);
  assert.equal(current.revision, 2);

  const updated = await api.updateContactSubmissionStatus(
    testContactId,
    {
      expectedRevision: 2,
      status: 'HANDLED',
      internalNote: 'Đã tư vấn xong và gửi báo giá qua email',
    },
    DB
  );

  assert.equal(updated.status, 'HANDLED');
  assert.equal(updated.revision, 3);
  assert.ok(updated.startedProcessingAt, 'startedProcessingAt must remain preserved');
  assert.ok(updated.handledAt, 'handledAt must be set on HANDLED');
  assert.equal(updated.handledBy, api.SHARED_CONTACT_ACTOR);
  assert.equal(updated.events.length, 2, 'Timeline must contain both events');
});

await test('Reopen HANDLED -> PENDING clears handledAt and resets timestamps', async () => {
  const current = await api.getContactSubmissionById(testContactId, DB);
  assert.equal(current.revision, 3);

  const reopened = await api.updateContactSubmissionStatus(
    testContactId,
    {
      expectedRevision: 3,
      status: 'PENDING',
      internalNote: 'Khách yêu cầu hỗ trợ lại thêm cấu hình khác',
    },
    DB
  );

  assert.equal(reopened.status, 'PENDING');
  assert.equal(reopened.revision, 4);
  assert.equal(reopened.handledAt, null);
  assert.equal(reopened.startedProcessingAt, null);
  assert.equal(reopened.events.length, 3, 'Timeline records all 3 lifecycle transitions');
});

// =========================================================================
// SECTION 4: CUSTOMERS TRUTHFUL DATA & METRICS
// =========================================================================
console.log('\n--- SECTION 4: Customer Truthful Data & Honest Metrics ---');

let guestOrderAId;
let guestOrderBId;
const sharedPhone = '0988777666';

await test('Seed 2 guest orders with SAME phone but DIFFERENT customer names', async () => {
  const orderA = await createOrder(
    {
      customerName: 'Khách A Đặt Máy',
      customerPhone: sharedPhone,
      customerEmail: 'khachA@example.com',
      items: [{ productId, quantity: 1 }],
    },
    'idemp-cust-a',
    DB
  );
  guestOrderAId = orderA.order.id;

  const orderB = await createOrder(
    {
      customerName: 'Khách B Dùng Chung SĐT',
      customerPhone: sharedPhone,
      customerEmail: 'khachB@example.com',
      items: [{ productId, quantity: 1 }],
    },
    'idemp-cust-b',
    DB
  );
  guestOrderBId = orderB.order.id;
});

await test('listCustomers does NOT auto-merge guest orders by phone into a single profile', async () => {
  const res = await api.listCustomers({ search: sharedPhone, source: 'GUEST_ORDER' }, DB);
  assert.equal(res.customers.length, 2, 'Must list 2 separate guest records, not merge them');

  const names = res.customers.map((c) => c.name);
  assert.ok(names.includes('Khách A Đặt Máy'));
  assert.ok(names.includes('Khách B Dùng Chung SĐT'));

  const ids = res.customers.map((c) => c.id);
  assert.ok(ids.includes(`guest-${guestOrderAId}`));
  assert.ok(ids.includes(`guest-${guestOrderBId}`));
});

await test('nonCancelledTotal excludes CANCELLED orders correctly', async () => {
  // Cancel order B with valid reason
  const orderB = await api.getOrderById(guestOrderBId, DB);
  await api.transitionOrderStatus(
    {
      orderId: guestOrderBId,
      targetStatus: 'CANCELLED',
      expectedRevision: orderB.revision,
      reason: 'Khách đổi ý muốn hủy đơn',
    },
    DB
  );

  const resA = await api.listCustomers({ search: 'Khách A Đặt Máy' }, DB);
  const custA = resA.customers[0];
  assert.equal(custA.nonCancelledTotal, 35000000, 'Order A is not cancelled, total = 35M');

  const resB = await api.listCustomers({ search: 'Khách B Dùng Chung SĐT' }, DB);
  const custB = resB.customers[0];
  assert.equal(custB.nonCancelledTotal, 0, 'Order B is CANCELLED, nonCancelledTotal must be 0');
});

await test('getCustomerDetail shows primary order and suggests related orders by phone without merging', async () => {
  const detailA = await api.getCustomerDetail(`guest-${guestOrderAId}`, DB);
  assert.ok(detailA);
  assert.equal(detailA.name, 'Khách A Đặt Máy');
  assert.equal(detailA.orders.length, 1, 'Primary order is order A');
  assert.equal(detailA.orders[0].id, guestOrderAId);

  // Suggested orders
  assert.ok(detailA.suggestedOrders, 'suggestedOrders must exist');
  assert.equal(detailA.suggestedOrders.length, 1);
  assert.equal(detailA.suggestedOrders[0].id, guestOrderBId);
  assert.equal(detailA.suggestedOrders[0].customerName, 'Khách B Dùng Chung SĐT');
});

await test('Pagination does NOT clamp at 500 records: can count and paginate 550 records cleanly', async () => {
  console.log('    Seeding 520 guest orders to verify pagination beyond 500...');
  const batchStatements = [];
  const baseTime = Date.now();
  for (let i = 1; i <= 520; i++) {
    const id = `bulk_test_ord_${i}`;
    const ordNum = `ORD-BULK-${String(i).padStart(4, '0')}`;
    const iso = new Date(baseTime - i * 1000).toISOString();
    batchStatements.push(
      DB.prepare(
        `INSERT INTO "Order" ("id", "orderNumber", "customerName", "customerPhone", "customerEmail", "status", "revision", "subtotalAmount", "totalAmount", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 'NEW', 1, 100000, 100000, ?, ?)`
      ).bind(id, ordNum, `Khách Hàng Bulk ${i}`, `097000${String(i).padStart(4, '0')}`, `bulk${i}@test.com`, iso, iso)
    );
  }

  // Execute in batches of 100 to stay within D1 batch limits
  for (let i = 0; i < batchStatements.length; i += 100) {
    await DB.batch(batchStatements.slice(i, i + 100));
  }

  const res = await api.listCustomers({ source: 'GUEST_ORDER', limit: 100, page: 1 }, DB);
  assert.ok(res.pagination.total >= 520, `Total must be at least 520, got: ${res.pagination.total}`);
  assert.ok(res.pagination.totalPages >= 6, `Total pages must be at least 6, got: ${res.pagination.totalPages}`);

  // Fetch page 6 (beyond 500 records)
  const page6 = await api.listCustomers({ source: 'GUEST_ORDER', limit: 100, page: 6 }, DB);
  assert.ok(page6.customers.length > 0, 'Page 6 beyond 500 records must return data without clamping');
});

// =========================================================================
// SECTION 5: CSV EXPORT COMPLETENESS & SINGLE ESCAPING
// =========================================================================
console.log('\n--- SECTION 5: CSV Export Completeness & Single-Escaping ---');

await test('No double escaping: field is escaped exactly once, formula injection is neutralized', async () => {
  const headers = ['Tên', 'Địa chỉ', 'Giá trị', 'Formula'];
  const rows = [
    [
      'CitiLap "Gaming" VIP', // quotes
      'Hà Nội, Việt Nam',    // comma
      15000000,
      '=1+1',                // dangerous formula prefix '='
    ],
  ];

  const csv = api.buildCsvContent(headers, rows);

  // 1. Starts with UTF-8 BOM
  assert.ok(csv.startsWith('\ufeff'), 'CSV must start with UTF-8 BOM');

  // 2. Normal quoted field must NOT be triple-quoted ("""Gaming""")
  assert.ok(
    csv.includes('"CitiLap ""Gaming"" VIP"'),
    'Quotes inside field must be doubled (""), not quadrupled/sextupled'
  );
  assert.ok(!csv.includes('"""CitiLap'), 'Must not contain triple quotes');

  // 3. Formula prefix '=' must be neutralized with leading single quote
  assert.ok(csv.includes('"\'=1+1"'), 'Formula injection must be prepended with single quote');
});

await test('getAllCustomersForExport retrieves ALL records beyond 100 and 500 via chunking', async () => {
  const exportList = await api.getAllCustomersForExport({ source: 'GUEST_ORDER' }, DB);
  assert.ok(
    exportList.length >= 520,
    `getAllCustomersForExport must export all 520+ records without silent 100/5000 clamp. Got: ${exportList.length}`
  );
});

// =========================================================================
// SECTION 6: NOTIFICATIONS RECONCILIATION & NO DUPLICATION
// =========================================================================
console.log('\n--- SECTION 6: Notification Reliability & Reconciliation ---');

await test('Missing notification from last 24h is reconciled automatically', async () => {
  // Create an order directly in DB without notification (simulating transient network error during checkout)
  const droppedOrderId = 'dropped_notif_order_1';
  const now = new Date().toISOString();
  await DB.prepare(
    `INSERT INTO "Order" ("id", "orderNumber", "customerName", "customerPhone", "customerEmail", "status", "revision", "subtotalAmount", "totalAmount", "createdAt", "updatedAt")
     VALUES (?, 'ORD-DROPPED-1', 'Khách Rơi Thông Báo', '0999888777', 'drop@test.com', 'NEW', 1, 5000000, 5000000, ?, ?)`
  )
    .bind(droppedOrderId, now, now)
    .run();

  // Verify notification does not exist yet
  const beforeNotif = await DB.prepare(
    `SELECT * FROM "AdminNotification" WHERE "type" = 'NEW_ORDER' AND "referenceId" = ?`
  )
    .bind(droppedOrderId)
    .first();
  assert.equal(beforeNotif, null);

  // Call listAdminNotifications (which triggers reconcileRecentNotifications)
  const inbox = await api.listAdminNotifications(DB);
  const found = inbox.notifications.find((n) => n.referenceId === droppedOrderId);
  assert.ok(found, 'Dropped notification must be reconciled into admin inbox');
  assert.equal(found.isRead, false);

  // Mark this notification as read
  await api.markNotificationAsRead(found.id, DB);

  const readCheck = await DB.prepare(`SELECT * FROM "AdminNotification" WHERE "id" = ?`).bind(found.id).first();
  assert.equal(readCheck.isRead, 1);

  // Run reconciliation AGAIN: verify isRead is NOT reset and no duplicate is created
  await api.reconcileRecentNotifications(DB);

  const afterReconcile = await DB.prepare(
    `SELECT * FROM "AdminNotification" WHERE "type" = 'NEW_ORDER' AND "referenceId" = ?`
  )
    .bind(droppedOrderId)
    .all();

  assert.equal(afterReconcile.results.length, 1, 'Must not duplicate notification on re-reconciliation');
  assert.equal(afterReconcile.results[0].isRead, 1, 'isRead status must NEVER be reset to 0');
});

await test('Old orders (> 24 hours ago) are NOT flooded into notifications', async () => {
  const oldOrderId = 'old_ancient_order_999';
  const ancientDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
  await DB.prepare(
    `INSERT INTO "Order" ("id", "orderNumber", "customerName", "customerPhone", "customerEmail", "status", "revision", "subtotalAmount", "totalAmount", "createdAt", "updatedAt")
     VALUES (?, 'ORD-ANCIENT-1', 'Khách Đơn Cũ', '0999000111', 'old@test.com', 'NEW', 1, 1000000, 1000000, ?, ?)`
  )
    .bind(oldOrderId, ancientDate, ancientDate)
    .run();

  await api.reconcileRecentNotifications(DB);

  const ancientNotif = await DB.prepare(
    `SELECT * FROM "AdminNotification" WHERE "type" = 'NEW_ORDER' AND "referenceId" = ?`
  )
    .bind(oldOrderId)
    .first();
  assert.equal(ancientNotif, null, 'Ancient orders > 24h must NOT be flooded into notifications');
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n==========================================');
console.log(`TOTAL R06.1 TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('==========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🌟 ALL R06.1 INTEGRITY, CAS & METRIC REQUIREMENTS VERIFIED SUCCESSFULLY!\n');
}
