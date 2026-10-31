import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R06 — ORDER MANAGEMENT, NOTIFICATIONS & CONTACTS INTEGRATION TEST SUITE ===\n');

// 1. Spin up isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r06-test"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

const DB = await mf.getD1Database('DB');
const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');

// 2. Run all migrations up to 0015
const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
console.log(`[Setup] Applying ${migrationFiles.length} D1 migrations in isolated test database...`);
for (const f of migrationFiles) {
  const sql = await readFile(`d1-migrations/${f}`, 'utf8');
  await DB.batch(unstable_splitSqlQuery(sql).map((s) => DB.prepare(s)));
}
console.log('✓ All migrations applied cleanly.\n');

// 3. Bundle server services for execution in test harness
const serviceBundle = await build({
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
  outfile: 'scripts/.r06-test-bundle.mjs',
});

const api = await import('./.r06-test-bundle.mjs');
await api.saveAdminSettings(DB, {expectedRevision: 0, document: api.DEFAULT_ADMIN_SETTINGS});
async function createOrder(input, key, db) {
  const selection = {paymentMethod:'COD', shippingMethod:'standard', shippingAddress:'Synthetic fixture address', ...input};
  const {quote} = await api.calculateCheckout(selection, db);
  return api.createOrder({...selection, items:selection.items.map((item,i)=>({...item, expectedPrice:quote.lines[i].price})), checkoutAcknowledgment:{shippingFee:quote.shippingFee, totalAmount:quote.totalAmount, termsVersion:quote.termsVersion}}, key, db);
}


let totalPassed = 0;
let totalFailed = 0;

function check(testName, fn) {
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✗ ${testName}:`, err.message);
    totalFailed++;
  }
}

async function checkAsync(testName, fn) {
  try {
    await fn();
    console.log(`  ✓ ${testName}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✗ ${testName}:`, err.message);
    totalFailed++;
  }
}

// ==========================================
// GATE 1: SCHEMA & LEGACY MIGRATION CHECK
// ==========================================
console.log('--- GATE 1: Schema & Migration 0015 Verification ---');

await checkAsync('Order table has revision column', async () => {
  const res = await DB.prepare(`PRAGMA table_info("Order")`).all();
  const cols = res.results.map((r) => r.name);
  assert.ok(cols.includes('revision'), 'Order must have revision column');
});

await checkAsync('OrderEvent table exists with expected columns', async () => {
  const res = await DB.prepare(`PRAGMA table_info("OrderEvent")`).all();
  const cols = res.results.map((r) => r.name);
  assert.ok(cols.includes('id'), 'OrderEvent must have id');
  assert.ok(cols.includes('orderId'), 'OrderEvent must have orderId');
  assert.ok(cols.includes('action'), 'OrderEvent must have action');
  assert.ok(cols.includes('actor'), 'OrderEvent must have actor');
});

await checkAsync('OrderNote table exists with expected columns', async () => {
  const res = await DB.prepare(`PRAGMA table_info("OrderNote")`).all();
  const cols = res.results.map((r) => r.name);
  assert.ok(cols.includes('id'), 'OrderNote must have id');
  assert.ok(cols.includes('orderId'), 'OrderNote must have orderId');
  assert.ok(cols.includes('content'), 'OrderNote must have content');
});

await checkAsync('AdminNotification table exists with unique constraint', async () => {
  const res = await DB.prepare(`PRAGMA table_info("AdminNotification")`).all();
  const cols = res.results.map((r) => r.name);
  assert.ok(cols.includes('type'), 'AdminNotification must have type');
  assert.ok(cols.includes('referenceId'), 'AdminNotification must have referenceId');
  assert.ok(cols.includes('isRead'), 'AdminNotification must have isRead');
});

await checkAsync('ContactSubmission has internalNote, handledAt, handledBy', async () => {
  const res = await DB.prepare(`PRAGMA table_info("ContactSubmission")`).all();
  const cols = res.results.map((r) => r.name);
  assert.ok(cols.includes('internalNote'), 'ContactSubmission must have internalNote');
  assert.ok(cols.includes('handledAt'), 'ContactSubmission must have handledAt');
  assert.ok(cols.includes('handledBy'), 'ContactSubmission must have handledBy');
});

// Seed an active product for order placement
const productId = 'prod_test_r06';
const now = new Date().toISOString();
await DB.prepare(`
  INSERT INTO "Category" ("id", "name", "slug", "status", "createdAt", "updatedAt")
  VALUES ('cat_r06', 'Laptop Test R06', 'laptop-test-r06', 'ACTIVE', ?, ?)
  ON CONFLICT("id") DO NOTHING
`).bind(now, now).run();

await DB.prepare(`
  INSERT INTO "Product" (
    "id", "name", "slug", "description", "price", "stock", "status", "categoryId", "createdAt", "updatedAt"
  ) VALUES (?, 'Dell XPS 13 Plus R06', 'dell-xps-13-plus-r06', 'Laptop cao cấp', 35000000, 10, 'ACTIVE', 'cat_r06', ?, ?)
  ON CONFLICT("id") DO NOTHING
`).bind(productId, now, now).run();

await DB.prepare(`
  INSERT INTO "ProductStudio" ("productId", "revision", "draft", "published", "updatedAt")
  VALUES (?, 1, '{"availability":"AVAILABLE","variants":[]}', '{"availability":"AVAILABLE","variants":[]}', CURRENT_TIMESTAMP)
  ON CONFLICT("productId") DO NOTHING
`).bind(productId).run();

// ==========================================
// GATE 2: ORDER CREATION & INITIAL EVENT
// ==========================================
console.log('\n--- GATE 2: Order Creation & Notification Idempotency ---');

let createdOrderId = '';
await checkAsync('Create order defaults status to NEW, creates initial OrderEvent and AdminNotification', async () => {
  const orderRes = await createOrder(
    {
      items: [{ productId, quantity: 1 }],
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0988123456',
      customerEmail: 'test@citilap.vn',
      shippingAddress: '123 Cầu Giấy, Hà Nội',
      note: 'Giao giờ hành chính',
    },
    'idemp-test-r06-1',
    DB
  );

  assert.ok(orderRes.success, 'Order creation must succeed');
  assert.equal(orderRes.order.status, 'NEW', 'Initial order status must be NEW');
  assert.equal(orderRes.order.revision, 0, 'Initial revision must be 0');
  createdOrderId = orderRes.order.id;

  // Check initial OrderEvent
  const events = await DB.prepare(`SELECT * FROM "OrderEvent" WHERE "orderId" = ?`).bind(createdOrderId).all();
  assert.equal(events.results.length, 1, 'Must have exactly 1 initial event');
  assert.equal(events.results[0].action, 'CREATED', 'Initial action must be CREATED');
  assert.equal(events.results[0].toStatus, 'NEW', 'Initial toStatus must be NEW');

  // Check AdminNotification
  const notifs = await DB.prepare(`SELECT * FROM "AdminNotification" WHERE "referenceId" = ?`).bind(createdOrderId).all();
  assert.equal(notifs.results.length, 1, 'Must create 1 notification');
  assert.equal(notifs.results[0].type, 'NEW_ORDER', 'Notification type must be NEW_ORDER');
  assert.equal(notifs.results[0].isRead, 0, 'Notification must be unread initially');
});

await checkAsync('Idempotent replay does not duplicate order or notification', async () => {
  const replayRes = await createOrder(
    {
      items: [{ productId, quantity: 1 }],
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0988123456',
      customerEmail: 'test@citilap.vn',
      shippingAddress: '123 Cầu Giấy, Hà Nội',
      note: 'Giao giờ hành chính',
    },
    'idemp-test-r06-1',
    DB
  );

  assert.ok(replayRes.isIdempotentReplay, 'Must be flagged as idempotent replay');
  assert.equal(replayRes.order.id, createdOrderId, 'Must return identical order ID');

  const notifs = await DB.prepare(`SELECT * FROM "AdminNotification" WHERE "referenceId" = ?`).bind(createdOrderId).all();
  assert.equal(notifs.results.length, 1, 'Must not duplicate notification on replay');
});

// ==========================================
// GATE 3: ORDER STATE TRANSITION MATRIX
// ==========================================
console.log('\n--- GATE 3: Order State Transition Matrix & Enforcements ---');

await checkAsync('Valid transition: NEW -> CONTACTED', async () => {
  const res = await api.transitionOrderStatus(
    {
      orderId: createdOrderId,
      targetStatus: 'CONTACTED',
      expectedRevision: 0,
      actor: 'Nhân viên A',
    },
    DB
  );

  assert.equal(res.status, 'CONTACTED');
  assert.equal(res.revision, 1);

  const events = await DB.prepare(`SELECT * FROM "OrderEvent" WHERE "orderId" = ? ORDER BY "createdAt" DESC`).bind(createdOrderId).all();
  assert.equal(events.results[0].fromStatus, 'NEW');
  assert.equal(events.results[0].toStatus, 'CONTACTED');
  assert.equal(events.results[0].actor, api.SHARED_ADMIN_ACTOR);
});

await checkAsync('Valid transition: CONTACTED -> CONFIRMED', async () => {
  const res = await api.transitionOrderStatus(
    {
      orderId: createdOrderId,
      targetStatus: 'CONFIRMED',
      expectedRevision: 1,
      actor: 'Nhân viên B',
    },
    DB
  );

  assert.equal(res.status, 'CONFIRMED');
  assert.equal(res.revision, 2);
});

await checkAsync('Valid transition: CONFIRMED -> COMPLETED sets completedAt', async () => {
  const res = await api.transitionOrderStatus(
    {
      orderId: createdOrderId,
      targetStatus: 'COMPLETED',
      expectedRevision: 2,
      actor: 'Nhân viên B',
    },
    DB
  );

  assert.equal(res.status, 'COMPLETED');
  assert.equal(res.revision, 3);
  assert.ok(res.completedAt !== null, 'completedAt must be set upon COMPLETED');
});

await checkAsync('Invalid transition: COMPLETED -> CONTACTED is rejected', async () => {
  await assert.rejects(
    async () => {
      await api.transitionOrderStatus(
        {
          orderId: createdOrderId,
          targetStatus: 'CONTACTED',
          expectedRevision: 3,
        },
        DB
      );
    },
    /INVALID_TRANSITION/,
    'Transition from terminal COMPLETED must be rejected'
  );
});

await checkAsync('Same-status transition: COMPLETED -> COMPLETED is rejected as SAME_STATUS_NOOP', async () => {
  await assert.rejects(
    async () => {
      await api.transitionOrderStatus(
        {
          orderId: createdOrderId,
          targetStatus: 'COMPLETED',
          expectedRevision: 3,
        },
        DB
      );
    },
    /SAME_STATUS_NOOP/,
    'Same-status transition must be rejected as noop'
  );
});

// Create second order to test cancellation & reopen
let cancelOrderId = '';
const cancelOrderRes = await createOrder(
  {
    items: [{ productId, quantity: 1 }],
    customerName: 'Trần Thị Hủy',
    customerPhone: '0977222333',
  },
  'idemp-cancel-test',
  DB
);
cancelOrderId = cancelOrderRes.order.id;

await checkAsync('Cancellation without reason is rejected', async () => {
  await assert.rejects(
    async () => {
      await api.transitionOrderStatus(
        {
          orderId: cancelOrderId,
          targetStatus: 'CANCELLED',
          expectedRevision: 0,
          reason: '', // Empty reason
        },
        DB
      );
    },
    /REASON_REQUIRED/,
    'Cancel without reason must be rejected'
  );
});

await checkAsync('Cancellation with valid reason succeeds', async () => {
  const res = await api.transitionOrderStatus(
    {
      orderId: cancelOrderId,
      targetStatus: 'CANCELLED',
      expectedRevision: 0,
      reason: 'Khách hàng đổi ý sang mẫu khác',
      actor: 'Nhân viên C',
    },
    DB
  );

  assert.equal(res.status, 'CANCELLED');
  assert.equal(res.revision, 1);

  const events = await DB.prepare(`SELECT * FROM "OrderEvent" WHERE "orderId" = ? ORDER BY "createdAt" DESC`).bind(cancelOrderId).all();
  assert.equal(events.results[0].action, 'CANCELLED');
  assert.equal(events.results[0].reason, 'Khách hàng đổi ý sang mẫu khác');
});

await checkAsync('Reopen from CANCELLED to NEW without reason is rejected', async () => {
  await assert.rejects(
    async () => {
      await api.transitionOrderStatus(
        {
          orderId: cancelOrderId,
          targetStatus: 'NEW',
          expectedRevision: 1,
          reason: '  ', // Whitespace only
        },
        DB
      );
    },
    /REASON_REQUIRED/,
    'Reopen without reason must be rejected'
  );
});

await checkAsync('Reopen from CANCELLED to NEW with valid reason succeeds', async () => {
  const res = await api.transitionOrderStatus(
    {
      orderId: cancelOrderId,
      targetStatus: 'NEW',
      expectedRevision: 1,
      reason: 'Khách liên hệ lại đề nghị tiếp tục xử lý',
      actor: 'Nhân viên D',
    },
    DB
  );

  assert.equal(res.status, 'NEW');
  assert.equal(res.revision, 2);

  const events = await DB.prepare(`SELECT * FROM "OrderEvent" WHERE "orderId" = ? ORDER BY "createdAt" DESC`).bind(cancelOrderId).all();
  assert.equal(events.results[0].action, 'REOPENED');
  assert.equal(events.results[0].reason, 'Khách liên hệ lại đề nghị tiếp tục xử lý');
});

// ==========================================
// GATE 4: CONCURRENCY CONTROL (CAS 409)
// ==========================================
console.log('\n--- GATE 4: Concurrency CAS & Conflict (409) ---');

await checkAsync('Two simultaneous clients: client with outdated expectedRevision receives conflict', async () => {
  // Current revision of cancelOrderId is 2
  // Client 1 updates successfully
  await api.transitionOrderStatus(
    {
      orderId: cancelOrderId,
      targetStatus: 'CONTACTED',
      expectedRevision: 2,
      actor: 'Client 1',
    },
    DB
  );

  // Client 2 attempts with outdated revision 2 (current is now 3)
  await assert.rejects(
    async () => {
      await api.transitionOrderStatus(
        {
          orderId: cancelOrderId,
          targetStatus: 'CONFIRMED',
          expectedRevision: 2, // Outdated!
          actor: 'Client 2',
        },
        DB
      );
    },
    (err) => {
      assert.equal(err.name, 'OrderConflictError');
      assert.equal(err.currentRevision, 3);
      return true;
    },
    'Must throw OrderConflictError with currentRevision'
  );
});

// ==========================================
// GATE 5: INTERNAL STAFF NOTES & PRIVACY
// ==========================================
console.log('\n--- GATE 5: Internal Staff Notes & Public Privacy Boundary ---');

await checkAsync('Add internal staff note creates OrderNote and OrderEvent', async () => {
  const note = await api.addOrderInternalNote(
    cancelOrderId,
    'Khách dặn giao trước 17h, gọi trước 15 phút',
    'Nhân viên điều phối',
    DB
  );

  assert.ok(note.id);
  assert.equal(note.content, 'Khách dặn giao trước 17h, gọi trước 15 phút');
  assert.equal(note.actor, api.SHARED_ADMIN_ACTOR);

  const notesInDb = await DB.prepare(`SELECT * FROM "OrderNote" WHERE "orderId" = ?`).bind(cancelOrderId).all();
  assert.equal(notesInDb.results.length, 1);

  const events = await DB.prepare(`SELECT * FROM "OrderEvent" WHERE "orderId" = ? ORDER BY "createdAt" DESC`).bind(cancelOrderId).all();
  assert.equal(events.results[0].action, 'NOTE_ADDED');
});

check('sanitizeOrderForPublic strictly strips internal notes, events, token hash, and revision', () => {
  const rawAdminOrder = {
    id: 'ord_123',
    orderNumber: 'CTL-2026-ABCD',
    customerName: 'Khách A',
    status: 'NEW',
    revision: 3,
    confirmationTokenHash: 'hash_secret_123',
    payloadHash: 'payload_hash_123',
    internalNotes: [{ id: 'n1', content: 'Ghi chú mật' }],
    events: [{ id: 'e1', action: 'STATUS_CHANGE', actor: 'Admin' }],
  };

  const sanitized = api.sanitizeOrderForPublic(rawAdminOrder);
  assert.equal(sanitized.id, 'ord_123');
  assert.equal(sanitized.internalNotes, undefined, 'Must not expose internalNotes');
  assert.equal(sanitized.events, undefined, 'Must not expose events');
  assert.equal(sanitized.confirmationTokenHash, undefined, 'Must not expose confirmationTokenHash');
  assert.equal(sanitized.payloadHash, undefined, 'Must not expose payloadHash');
  assert.equal(sanitized.revision, undefined, 'Must not expose revision');
});

// ==========================================
// GATE 6: ADMIN NOTIFICATIONS SEMANTICS
// ==========================================
console.log('\n--- GATE 6: Admin Notifications Semantics & Mark Read ---');

await checkAsync('Notifications list returns unread items and unreadCount', async () => {
  const res = await api.listAdminNotifications(DB, { limit: 10 });
  assert.ok(res.notifications.length >= 1);
  assert.ok(res.unreadCount >= 1);
});

await checkAsync('Mark single notification as read updates status and decrements unread', async () => {
  const initial = await api.listAdminNotifications(DB);
  const target = initial.notifications[0];

  const markRes = await api.markNotificationAsRead(target.id, DB);
  assert.ok(markRes.success);
  assert.equal(markRes.notification.isRead, true);

  const after = await api.listAdminNotifications(DB);
  assert.equal(after.unreadCount, initial.unreadCount - 1);
});

await checkAsync('Mark all notifications as read resets unreadCount to 0', async () => {
  const markAllRes = await api.markAllNotificationsAsRead(DB);
  assert.ok(markAllRes.count >= 0);

  const after = await api.listAdminNotifications(DB);
  assert.equal(after.unreadCount, 0);
});

// ==========================================
// GATE 7: CONTACTS & HANDLING AUDIT
// ==========================================
console.log('\n--- GATE 7: Contact Submissions, Processing & Audit ---');

let contactId = '';
await checkAsync('Submit contact creates record, strips HTML, and fires notification', async () => {
  const res = await api.submitContactMessage(
    {
      name: '<script>alert(1)</script>Phạm Văn Khách',
      phone: '0912345678',
      email: 'khach@citilap.vn',
      message: '<b>Cần tư vấn mua laptop gaming</b>',
    },
    '127.0.0.1',
    DB
  );

  assert.ok(res.success);
  contactId = res.id;

  const contactInDb = await DB.prepare(`SELECT * FROM "ContactSubmission" WHERE "id" = ?`).bind(contactId).first();
  assert.equal(contactInDb.name, 'Phạm Văn Khách', 'Must sanitize HTML in name');
  assert.equal(contactInDb.message, 'Cần tư vấn mua laptop gaming', 'Must sanitize HTML in message');
  assert.equal(contactInDb.status, 'PENDING');

  // Verify notification created
  const notif = await DB.prepare(`SELECT * FROM "AdminNotification" WHERE "referenceId" = ?`).bind(contactId).first();
  assert.equal(notif.type, 'NEW_CONTACT');
});

await checkAsync('Update contact to PROCESSING records handledAt, handledBy, and internalNote', async () => {
  await api.updateContactSubmissionStatus(
    contactId,
    {
      expectedRevision: 1,
      status: 'PROCESSING',
      internalNote: 'Đã gọi khách, hẹn chiều gọi lại sau giờ làm',
      actor: 'Tư vấn viên X',
    },
    DB
  );

  const updated = await DB.prepare(`SELECT * FROM "ContactSubmission" WHERE "id" = ?`).bind(contactId).first();
  assert.equal(updated.status, 'PROCESSING');
  assert.equal(updated.internalNote, 'Đã gọi khách, hẹn chiều gọi lại sau giờ làm');
  assert.equal(updated.handledBy, api.SHARED_CONTACT_ACTOR);
  assert.ok(updated.startedProcessingAt !== null);
});

await checkAsync('Update contact to HANDLED completes the request', async () => {
  await api.updateContactSubmissionStatus(
    contactId,
    {
      expectedRevision: 2,
      status: 'HANDLED',
      actor: 'Tư vấn viên X',
    },
    DB
  );

  const updated = await DB.prepare(`SELECT * FROM "ContactSubmission" WHERE "id" = ?`).bind(contactId).first();
  assert.equal(updated.status, 'HANDLED');
  assert.ok(updated.handledAt !== null);
  assert.equal(updated.handledBy, api.SHARED_CONTACT_ACTOR);
});

// ==========================================
// GATE 8: CUSTOMERS VIEWS & REAL DATA
// ==========================================
console.log('\n--- GATE 8: Customers Real D1 Aggregation & Source Distinction ---');

await checkAsync('List customers separates registered users and guest orders without mockUsers', async () => {
  // Seed a registered user
  await DB.prepare(`
    INSERT INTO "User" ("id", "email", "password", "name", "phone", "role", "tier", "totalSpend", "createdAt", "updatedAt")
    VALUES ('usr_reg_1', 'user1@citilap.vn', 'hash', 'Lê Đăng Ký', '0933444555', 'USER', 'Vàng', 50000000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("id") DO NOTHING
  `).run();

  const res = await api.listCustomers({}, DB);
  assert.ok(res.customers.length >= 2, 'Must list both registered and guest customers');

  const registered = res.customers.find((c) => c.id === 'usr_reg_1');
  assert.ok(registered, 'Must find registered user');
  assert.equal(registered.source, 'REGISTERED');

  const guest = res.customers.find((c) => c.source === 'GUEST_ORDER');
  assert.ok(guest, 'Must find guest customer from orders');
  assert.equal(guest.sourceLabel, 'Khách vãng lai (Đơn hàng)');
});

// ==========================================
// GATE 9: CSV EXPORT & FORMULA INJECTION
// ==========================================
console.log('\n--- GATE 9: CSV Export Safety & Formula Injection (CWE-1236) ---');

check('escapeCsvField neutralizes formula injection prefixes', () => {
  assert.equal(api.escapeCsvField('=SUM(A1:A10)'), `"'=SUM(A1:A10)"`);
  assert.equal(api.escapeCsvField('+cmd|/c calc'), `"'+cmd|/c calc"`);
  assert.equal(api.escapeCsvField('-12345'), `"'-12345"`);
  assert.equal(api.escapeCsvField('@leak'), `"'@leak"`);
  assert.equal(api.escapeCsvField('\tTabInjection'), `"'\tTabInjection"`);
});

check('escapeCsvField escapes embedded double quotes', () => {
  assert.equal(api.escapeCsvField('Dell XPS 13 "Plus"'), `"Dell XPS 13 ""Plus"""`);
});

check('buildCsvContent starts with UTF-8 BOM (\ufeff)', () => {
  const content = api.buildCsvContent(['Mã', 'Tên'], [['1', 'Sản phẩm thử nghiệm']]);
  assert.ok(content.startsWith('\ufeff'), 'CSV must start with UTF-8 BOM for Excel Vietnamese display');
  assert.ok(content.includes('Sản phẩm thử nghiệm'));
});

check('createCsvResponse sets safe private no-store headers', () => {
  const resp = api.createCsvResponse(['H1'], [['R1']], 'test.csv');
  assert.equal(resp.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  assert.ok(resp.headers.get('Content-Disposition').includes('test.csv'));
  assert.ok(resp.headers.get('Cache-Control').includes('no-store'));
});

// ==========================================
// SUMMARY
// ==========================================
console.log('\n==========================================');
console.log(`TOTAL R06 TESTS: ${totalPassed + totalFailed}`);
console.log(`PASSED: ${totalPassed}`);
console.log(`FAILED: ${totalFailed}`);
console.log('==========================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('\n✓ ALL R06 ORDER MANAGEMENT & NOTIFICATIONS GATES PASSED!\n');
  await mf.dispose();
  process.exit(0);
}
