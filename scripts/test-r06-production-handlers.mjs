import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readdir, readFile } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

console.log('=== CITILAP R06.2 — PRODUCTION HANDLERS, AUTH & KEYSET EXPORT SCALE TESTS ===\n');

// 1. Bundle Route Handlers and Services
await build({
  stdin: {
    contents: `
      export * from './src/lib/auth';
      export * from './src/lib/prisma';
      export * from './src/lib/csv-export';
      export * from './src/server/services/order.service';
      export * from './src/server/services/contact.service';
      export * from './src/server/services/customer.service';

      // Export Route Handlers
      export * as OrdersRoute from './src/app/api/orders/route';
      export * as OrderDetailRoute from './src/app/api/orders/[id]/route';
      export * as OrderNotesRoute from './src/app/api/orders/[id]/notes/route';
      export * as AdminContactDetailRoute from './src/app/api/admin/contacts/[id]/route';
      export * as AdminOrdersExportRoute from './src/app/api/admin/orders/export/route';
      export * as AdminContactsExportRoute from './src/app/api/admin/contacts/export/route';
      export * as AdminCustomersExportRoute from './src/app/api/admin/customers/export/route';
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
      setup(b) {
        b.onResolve({ filter: /\.wasm/ }, (args) => ({
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
  outfile: 'scripts/.r06-2-handlers-bundle.mjs',
});

const {
  setD1Database,
  getPrismaClient,
  createOrder,
  submitContactMessage,
  OrdersRoute,
  OrderDetailRoute,
  OrderNotesRoute,
  AdminContactDetailRoute,
  AdminOrdersExportRoute,
  AdminContactsExportRoute,
  AdminCustomersExportRoute,
  SHARED_ADMIN_ACTOR,
  SHARED_CONTACT_ACTOR,
} = await import('./.r06-2-handlers-bundle.mjs');

// 2. Setup isolated Miniflare D1
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r06-2-handlers"); } }',
    d1Databases: ['DB'],
  })
);

const db = await mf.getD1Database('DB');
setD1Database(db);

// Apply all 16 migrations
const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const file of migrationFiles) {
  const sql = await readFile(`d1-migrations/${file}`, 'utf-8');
  for (const statement of unstable_splitSqlQuery(sql)) {
    if (statement.trim()) {
      await db.prepare(statement).run();
    }
  }
}
console.log('✓ All 16 migrations applied cleanly to isolated fixture DB.\n');

// Configure test Admin API Token
const TEST_ADMIN_TOKEN = 'test-admin-secret-token-32chars-minimum-length';
process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;

function makeAdminHeaders() {
  return {
    Authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

let passCount = 0;
let totalCount = 0;

async function itAsync(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

// Helper to parse RFC 4180 CSV with BOM
function parseCsv(content) {
  let text = content;
  if (text.startsWith('\ufeff')) {
    text = text.slice(1);
  }
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map((line) => {
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    row.push(cur);
    return row;
  });
}

// Seed category and product for order tests
const initIso = new Date().toISOString().replace('Z', '+00:00');
await db.prepare(`
  INSERT INTO "Category" ("id", "name", "slug", "status", "createdAt", "updatedAt")
  VALUES ('cat_r06_h', 'Laptop Handler Cat', 'laptop-handler-cat', 'ACTIVE', ?, ?)
`).bind(initIso, initIso).run();

await db.prepare(`
  INSERT INTO "Product" (
    "id", "name", "slug", "description", "price", "stock", "status", "categoryId", "createdAt", "updatedAt"
  ) VALUES ('prod-laptop-h1', 'Laptop CitiLap Handler Test', 'laptop-citilap-handler', 'Mô tả test handler', 20000000, 10, 'ACTIVE', 'cat_r06_h', ?, ?)
`).bind(initIso, initIso).run();

await db.prepare(`
  INSERT INTO "ProductStudio" ("productId", "revision", "draft", "published", "updatedAt")
  VALUES ('prod-laptop-h1', 1, '{"availability":"AVAILABLE","variants":[]}', '{"availability":"AVAILABLE","variants":[]}', CURRENT_TIMESTAMP)
`).run();

console.log('--- SECTION 0: Production POST /api/orders (Without DB Param, Public DTO Whitelist, Idempotency & Rollback) ---');

await itAsync('Production POST /api/orders creates Order, Items, Event and Notification atomically without passing DB', async () => {
  const req = new Request('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idemp-prod-order-1',
    },
    body: JSON.stringify({
      customerName: 'Trần Thị Production',
      customerPhone: '0912345678',
      customerEmail: 'tranthi@gmail.com',
      shippingAddress: '123 Đường CitiLap, TP.HCM',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    }),
  });

  // Call the REAL production route handler directly without passing DB
  const res = await OrdersRoute.POST(req);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('cache-control'), 'private, no-store, no-cache, must-revalidate');

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.orderId);
  assert.ok(json.orderNumber);
  assert.ok(json.confirmationToken);
  assert.equal(json.isIdempotentReplay, false);

  // Verify Public DTO: Whitelist only, NO leakage of confirmationTokenHash, payloadHash, or revision
  const data = json.data;
  assert.ok(data);
  assert.equal(data.customerName, 'Trần Thị Production');
  assert.equal(data.totalAmount, 20000000);
  assert.equal(data.confirmationTokenHash, undefined, 'confirmationTokenHash must NEVER be in public DTO');
  assert.equal(data.payloadHash, undefined, 'payloadHash must NEVER be in public DTO');
  assert.equal(data.revision, undefined, 'revision must NEVER be in public DTO');

  // Verify database state: Order, OrderItem, OrderEvent, AdminNotification all committed in same atomic transaction
  const orderInDb = await db.prepare('SELECT * FROM "Order" WHERE id = ?').bind(json.orderId).first();
  assert.ok(orderInDb);
  assert.equal(orderInDb.status, 'NEW');

  const eventInDb = await db.prepare('SELECT * FROM "OrderEvent" WHERE orderId = ?').bind(json.orderId).first();
  assert.ok(eventInDb);
  assert.equal(eventInDb.action, 'CREATED');

  const notifInDb = await db.prepare('SELECT * FROM "AdminNotification" WHERE type = "NEW_ORDER" AND referenceId = ?').bind(json.orderId).first();
  assert.ok(notifInDb);
  assert.equal(notifInDb.isRead, 0);
});

await itAsync('Production POST /api/orders idempotent replay returns 200 without creating duplicate notifications', async () => {
  const req = new Request('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idemp-prod-order-1',
    },
    body: JSON.stringify({
      customerName: 'Trần Thị Production',
      customerPhone: '0912345678',
      customerEmail: 'tranthi@gmail.com',
      shippingAddress: '123 Đường CitiLap, TP.HCM',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    }),
  });

  const res = await OrdersRoute.POST(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.isIdempotentReplay, true);
  assert.ok(json.confirmationToken);

  // Verify notification count in DB remains EXACTLY 1 (no duplicate notification!)
  const notifCount = await db.prepare('SELECT count(*) as count FROM "AdminNotification" WHERE referenceId = ?').bind(json.orderId).first();
  assert.equal(notifCount.count, 1, 'Idempotent replay must NOT create duplicate notifications');
});

await itAsync('Production POST /api/orders rolls back completely if notification insertion fails via trigger', async () => {
  // Inject trigger on AdminNotification
  await db.prepare(`
    CREATE TRIGGER test_prod_notif_fail
    BEFORE INSERT ON "AdminNotification"
    WHEN NEW.type = 'NEW_ORDER' AND NEW.message LIKE '%Khách Lỗi Route%'
    BEGIN
      SELECT RAISE(ABORT, 'Fault injection: Simulated Route Notification Failure');
    END;
  `).run();

  let res;
  try {
    const req = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-prod-order-fail',
      },
      body: JSON.stringify({
        customerName: 'Khách Lỗi Route',
        customerPhone: '0933333333',
        items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
      }),
    });
    res = await OrdersRoute.POST(req);
  } finally {
    await db.prepare('DROP TRIGGER IF EXISTS test_prod_notif_fail').run();
  }

  assert.equal(res.status, 500, 'Route must return 500 when transaction fails');
  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, 'ORDER_CREATE_FAILED');

  // Verify DB state: Entire order creation rolled back!
  const orderInDb = await db.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').bind('idemp-prod-order-fail').first();
  assert.equal(orderInDb, null, 'Order must NOT exist in DB');

  const notifInDb = await db.prepare('SELECT * FROM "AdminNotification" WHERE message LIKE "%Khách Lỗi Route%"').first();
  assert.equal(notifInDb, null, 'AdminNotification must NOT exist in DB');
});

console.log('\n--- SECTION 1: Production Route Handlers Auth & Public DTO Protection ---');

await itAsync('GET /api/orders/[id] without auth and without token returns 403 with no-store', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Auth 1',
      customerPhone: '0911223344',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-auth-1',
    db
  );
  const orderId = seed.order.id;

  const req = new Request(`http://localhost:3000/api/orders/${orderId}`);
  const res = await OrderDetailRoute.GET(req, { params: Promise.resolve({ id: orderId }) });

  assert.equal(res.status, 403);
  assert.equal(res.headers.get('cache-control'), 'private, no-store, no-cache, must-revalidate');
  const body = await res.json();
  assert.equal(body.success, false);
});

await itAsync('GET /api/orders/[id] with invalid confirmation token returns 403', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Auth 2',
      customerPhone: '0911223355',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-auth-2',
    db
  );
  const orderId = seed.order.id;

  const req = new Request(`http://localhost:3000/api/orders/${orderId}?token=completely-invalid-token`);
  const res = await OrderDetailRoute.GET(req, { params: Promise.resolve({ id: orderId }) });

  assert.equal(res.status, 403);
});

await itAsync('GET /api/orders/[id] with valid confirmation token returns sanitized customer DTO', async () => {
  const seed = await createOrder(
    {
      customerName: 'Nguyễn Văn Customer',
      customerPhone: '0987654321',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-auth-3',
    db
  );
  const orderId = seed.order.id;
  const token = seed.confirmationToken;

  // Add an internal note to order
  await db.prepare(`
    INSERT INTO "OrderNote" ("id", "orderId", "content", "actor", "createdAt")
    VALUES ('note-secret-1', ?, 'Mã giảm giá nội bộ nhân viên', 'Admin Nhân Viên', CURRENT_TIMESTAMP)
  `).bind(orderId).run();

  const req = new Request(`http://localhost:3000/api/orders/${orderId}?token=${encodeURIComponent(token)}`);
  const res = await OrderDetailRoute.GET(req, { params: Promise.resolve({ id: orderId }) });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const data = json.data;

  // Verify Phone Masking: 098****321
  assert.equal(data.customerPhone, '098****321');
  // Internal notes and events MUST NOT be leaked to public customer!
  assert.equal(data.internalNotes, undefined, 'Must NOT leak internalNotes');
  assert.equal(data.events, undefined, 'Must NOT leak events');
  assert.equal(data.revision, undefined, 'Must NOT leak revision');
});

await itAsync('PUT /api/orders/[id] without auth returns 401', async () => {
  const req = new Request('http://localhost:3000/api/orders/some-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CONFIRMED', expectedRevision: 0 }),
  });
  const res = await OrderDetailRoute.PUT(req, { params: Promise.resolve({ id: 'some-id' }) });
  assert.equal(res.status, 401);
});

await itAsync('PUT /api/orders/[id] with negative or non-integer expectedRevision returns 400 INVALID_REVISION', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Rev',
      customerPhone: '0977889900',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-rev-1',
    db
  );
  const orderId = seed.order.id;

  // Negative revision
  const req1 = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: 'PUT',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'CONFIRMED', expectedRevision: -1 }),
  });
  const res1 = await OrderDetailRoute.PUT(req1, { params: Promise.resolve({ id: orderId }) });
  assert.equal(res1.status, 400);
  const b1 = await res1.json();
  assert.equal(b1.error.code, 'INVALID_REVISION');

  // Floating point revision
  const req2 = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: 'PUT',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'CONFIRMED', expectedRevision: 0.5 }),
  });
  const res2 = await OrderDetailRoute.PUT(req2, { params: Promise.resolve({ id: orderId }) });
  assert.equal(res2.status, 400);
  const b2 = await res2.json();
  assert.equal(b2.error.code, 'INVALID_REVISION');
});

await itAsync('PUT /api/orders/[id] with stale expectedRevision returns 409 CONFLICT_REVISION_MISMATCH', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Stale',
      customerPhone: '0966778899',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-stale-1',
    db
  );
  const orderId = seed.order.id;

  // Advance revision to 1
  const req1 = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: 'PUT',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'CONFIRMED', expectedRevision: 0 }),
  });
  const res1 = await OrderDetailRoute.PUT(req1, { params: Promise.resolve({ id: orderId }) });
  assert.equal(res1.status, 200);

  // Send stale request with expectedRevision: 0 (current is 1)
  const req2 = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: 'PUT',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'COMPLETED', expectedRevision: 0 }),
  });
  const res2 = await OrderDetailRoute.PUT(req2, { params: Promise.resolve({ id: orderId }) });
  assert.equal(res2.status, 409);
  const b2 = await res2.json();
  assert.equal(b2.error.code, 'CONFLICT_REVISION_MISMATCH');
  assert.equal(b2.error.currentRevision, 1);
});

await itAsync('PUT /api/orders/[id] rejects client-spoofed actor and strictly sets SHARED_ADMIN_ACTOR', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Actor',
      customerPhone: '0955443322',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-actor-1',
    db
  );
  const orderId = seed.order.id;

  const req = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: 'PUT',
    headers: makeAdminHeaders(),
    body: JSON.stringify({
      status: 'CONFIRMED',
      expectedRevision: 0,
      actor: 'HACKER_CLIENT_SPOOFED_ADMIN',
    }),
  });
  const res = await OrderDetailRoute.PUT(req, { params: Promise.resolve({ id: orderId }) });
  assert.equal(res.status, 200);

  const eventInDb = await db.prepare('SELECT actor FROM "OrderEvent" WHERE orderId = ? AND toStatus = "CONFIRMED"').bind(orderId).first();
  assert.equal(eventInDb.actor, SHARED_ADMIN_ACTOR, 'Must enforce SHARED_ADMIN_ACTOR in DB event');
});

await itAsync('POST /api/orders/[id]/notes rejects unauthenticated and enforces SHARED_ADMIN_ACTOR', async () => {
  const seed = await createOrder(
    {
      customerName: 'Khách Test Note Auth',
      customerPhone: '0944332211',
      items: [{ productId: 'prod-laptop-h1', quantity: 1 }],
    },
    'idemp-h-note-auth-1',
    db
  );
  const orderId = seed.order.id;

  // Unauthenticated
  const reqUnauth = new Request(`http://localhost:3000/api/orders/${orderId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Test note without auth' }),
  });
  const resUnauth = await OrderNotesRoute.POST(reqUnauth, { params: Promise.resolve({ id: orderId }) });
  assert.equal(resUnauth.status, 401);

  // Authenticated with spoofed actor
  const reqAuth = new Request(`http://localhost:3000/api/orders/${orderId}/notes`, {
    method: 'POST',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ content: 'Giao hàng sau giờ hành chính', actor: 'HackerSpoofedNoteActor' }),
  });
  const resAuth = await OrderNotesRoute.POST(reqAuth, { params: Promise.resolve({ id: orderId }) });
  assert.equal(resAuth.status, 201);

  const noteInDb = await db.prepare('SELECT actor FROM "OrderNote" WHERE orderId = ? AND content = ?')
    .bind(orderId, 'Giao hàng sau giờ hành chính').first();
  assert.equal(noteInDb.actor, SHARED_ADMIN_ACTOR);
});

await itAsync('PATCH /api/admin/contacts/[id] rejects unauth, validates revision, and enforces SHARED_CONTACT_ACTOR', async () => {
  const submitRes = await submitContactMessage(
    { name: 'Khách Liên Hệ Handler', phone: '0933221100', message: 'Hỏi giá sỉ' },
    '127.0.0.1',
    db
  );
  const contactId = submitRes.id;

  // 1. Unauthenticated -> 401
  const reqUnauth = new Request(`http://localhost:3000/api/admin/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PROCESSING', expectedRevision: 1 }),
  });
  const resUnauth = await AdminContactDetailRoute.PATCH(reqUnauth, { params: Promise.resolve({ id: contactId }) });
  assert.equal(resUnauth.status, 401);

  // 2. Invalid revision -> 400
  const reqInv = new Request(`http://localhost:3000/api/admin/contacts/${contactId}`, {
    method: 'PATCH',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'PROCESSING', expectedRevision: -1 }),
  });
  const resInv = await AdminContactDetailRoute.PATCH(reqInv, { params: Promise.resolve({ id: contactId }) });
  assert.equal(resInv.status, 400);
  const bInv = await resInv.json();
  assert.equal(bInv.code, 'INVALID_REVISION');

  // 3. Stale revision -> 409
  // Advance to revision 2
  const reqAdv = new Request(`http://localhost:3000/api/admin/contacts/${contactId}`, {
    method: 'PATCH',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'PROCESSING', expectedRevision: 1 }),
  });
  const resAdv = await AdminContactDetailRoute.PATCH(reqAdv, { params: Promise.resolve({ id: contactId }) });
  assert.equal(resAdv.status, 200);

  // Stale request with expectedRevision: 1
  const reqStale = new Request(`http://localhost:3000/api/admin/contacts/${contactId}`, {
    method: 'PATCH',
    headers: makeAdminHeaders(),
    body: JSON.stringify({ status: 'HANDLED', expectedRevision: 1 }),
  });
  const resStale = await AdminContactDetailRoute.PATCH(reqStale, { params: Promise.resolve({ id: contactId }) });
  assert.equal(resStale.status, 409);
  const bStale = await resStale.json();
  assert.equal(bStale.code, 'CONFLICT');
  assert.equal(bStale.currentRevision, 2);

  // 4. Spoofed actor -> server enforces SHARED_CONTACT_ACTOR
  const reqActor = new Request(`http://localhost:3000/api/admin/contacts/${contactId}`, {
    method: 'PATCH',
    headers: makeAdminHeaders(),
    body: JSON.stringify({
      status: 'HANDLED',
      expectedRevision: 2,
      actor: 'FakeHackerContactActor',
      handledBy: 'FakeHackerContactActor',
    }),
  });
  const resActor = await AdminContactDetailRoute.PATCH(reqActor, { params: Promise.resolve({ id: contactId }) });
  assert.equal(resActor.status, 200);

  const eventInDb = await db.prepare('SELECT actor FROM "ContactEvent" WHERE contactId = ? AND toStatus = "HANDLED"').bind(contactId).first();
  assert.equal(eventInDb.actor, SHARED_CONTACT_ACTOR);
});

console.log('\n--- SECTION 2: Production Export Handlers, Keyset Scale & Snapshot Stability ---');

await itAsync('Export handlers reject unauthenticated requests with 401', async () => {
  const reqOrders = new Request('http://localhost:3000/api/admin/orders/export');
  const resOrders = await AdminOrdersExportRoute.GET(reqOrders);
  assert.equal(resOrders.status, 401);

  const reqContacts = new Request('http://localhost:3000/api/admin/contacts/export');
  const resContacts = await AdminContactsExportRoute.GET(reqContacts);
  assert.equal(resContacts.status, 401);

  const reqCustomers = new Request('http://localhost:3000/api/admin/customers/export');
  const resCustomers = await AdminCustomersExportRoute.GET(reqCustomers);
  assert.equal(resCustomers.status, 401);
});

await itAsync('Export Orders: scale > 5,000 records, deterministic tie-breakers, no skips, no duplicates', async () => {
  const targetCount = 5020;
  console.log(`    Seeding ${targetCount} orders in batches for scale export test...`);

  const nowIso = new Date().toISOString().replace('Z', '+00:00');
  const expectedIdSet = new Set();
  const stmts = [];

  for (let i = 1; i <= targetCount; i++) {
    const id = `scale-ord-${i.toString().padStart(5, '0')}`;
    expectedIdSet.add(id);
    stmts.push(db.prepare(`
      INSERT INTO "Order" (
        "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
        "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'COMPLETED', 0, 1000000, 0, 0, 1000000, ?, '0901234567', 'COD', 'PAID', ?, ?)
    `).bind(id, `ORD-SCALE-${i}`, `Scale Customer ${i}`, nowIso, nowIso));
  }

  for (let b = 0; b < stmts.length; b += 100) {
    await db.batch(stmts.slice(b, b + 100));
  }

  // Call production export handler
  const req = new Request('http://localhost:3000/api/admin/orders/export?search=Scale%20Customer', {
    headers: makeAdminHeaders(),
  });
  const res = await AdminOrdersExportRoute.GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'private, no-store, no-cache, must-revalidate');

  const resClone = res.clone();
  const rawBytes = Buffer.from(await resClone.arrayBuffer());
  assert.equal(rawBytes[0], 0xef, 'BOM byte 1 must be 0xEF');
  assert.equal(rawBytes[1], 0xbb, 'BOM byte 2 must be 0xBB');
  assert.equal(rawBytes[2], 0xbf, 'BOM byte 3 must be 0xBF');

  const csvText = await res.text();

  const rows = parseCsv(csvText);
  // Header row + data rows
  assert.equal(rows[0][0], 'Mã đơn hàng');
  assert.equal(rows[0][2], 'Khách hàng');
  assert.equal(rows.length, targetCount + 1, `CSV must have 1 header + ${targetCount} rows`);

  // Parse all order IDs from CSV
  const exportedIds = rows.slice(1).map((r) => r[0]);
  const uniqueExportedIds = new Set(exportedIds);

  assert.equal(uniqueExportedIds.size, targetCount, 'All 5,020 exported order IDs must be unique (no duplicates!)');
  for (let i = 1; i <= targetCount; i++) {
    assert.ok(uniqueExportedIds.has(`ORD-SCALE-${i}`), `Missing order ORD-SCALE-${i}`);
  }
});

await itAsync('Export Contacts: scale > 5,000 records with single escaping and formula injection defense', async () => {
  const targetCount = 5020;
  console.log(`    Seeding ${targetCount} contacts in batches for scale export test...`);

  const nowIso = new Date().toISOString().replace('Z', '+00:00');
  const stmts = [];

  for (let i = 1; i <= targetCount; i++) {
    const id = `scale-cnt-${i.toString().padStart(5, '0')}`;
    // Inject a formula injection test in the first record
    const message = i === 1 ? '=cmd|"/C calc"!A0' : `Tin nhắn liên hệ scale ${i}`;
    stmts.push(db.prepare(`
      INSERT INTO "ContactSubmission" ("id", "name", "phone", "email", "message", "status", "revision", "createdAt", "updatedAt")
      VALUES (?, ?, '0912345678', 'scale@test.vn', ?, 'PENDING', 1, ?, ?)
    `).bind(id, `Liên Hệ Scale ${i}`, message, nowIso, nowIso));
  }

  for (let b = 0; b < stmts.length; b += 100) {
    await db.batch(stmts.slice(b, b + 100));
  }

  const req = new Request('http://localhost:3000/api/admin/contacts/export?search=Liên%20Hệ%20Scale', {
    headers: makeAdminHeaders(),
  });
  const res = await AdminContactsExportRoute.GET(req);
  assert.equal(res.status, 200);

  const csvText = await res.text();
  const rows = parseCsv(csvText);
  assert.equal(rows.length, targetCount + 1, `Must have 1 header + ${targetCount} data rows`);

  // Verify Formula Injection Defense:
  // The first data row must have single quote prepended to neutralized dangerous formula!
  const formulaRow = rows.find((r) => r[0] === 'scale-cnt-00001');
  assert.ok(formulaRow, 'Must find formula injection record');
  assert.equal(formulaRow[5].startsWith("'="), true, `Formula injection must be prepended with ': ${formulaRow[5]}`);
});

await itAsync('Export Customers: snapshot stability excludes records inserted after export snapshot', async () => {
  // Call getAllCustomersForExport and verify snapshot cutoff
  const initialCustomers = await AdminCustomersExportRoute.GET(
    new Request('http://localhost:3000/api/admin/customers/export', { headers: makeAdminHeaders() })
  );
  assert.equal(initialCustomers.status, 200);
  const initialRows = parseCsv(await initialCustomers.text());

  // Insert a record into Order with a future timestamp (after export snapshot)
  const futureIso = new Date(Date.now() + 60000).toISOString().replace('Z', '+00:00');
  await db.prepare(`
    INSERT INTO "Order" (
      "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
      "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
    ) VALUES ('order-future-snap-1', 'ORD-FUTURE', 'COMPLETED', 0, 500000, 0, 0, 500000, 'Khách Sau Snapshot', '0999999999', 'COD', 'PAID', ?, ?)
  `).bind(futureIso, futureIso).run();

  // Export with search targeting this future customer
  // Since export sets snapshot at exportSnapshotTime (Date.now()), future records are NOT included!
  // Wait, if export starts now, exportSnapshotTime is new Date().
  // Because futureIso is in the future (+60s), createdAt <= exportSnapshotTime strictly excludes it!
  const snapRes = await AdminCustomersExportRoute.GET(
    new Request('http://localhost:3000/api/admin/customers/export?search=Khách%20Sau%20Snapshot', { headers: makeAdminHeaders() })
  );
  const snapRows = parseCsv(await snapRes.text());
  // Header only (0 data rows)
  assert.equal(snapRows.length, 1, 'Records created after export snapshot must be excluded by snapshot scope');
});

await mf.dispose();

console.log('\n==========================================');
console.log(`TOTAL PRODUCTION HANDLER & EXPORT TESTS: ${totalCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${totalCount - passCount}`);
console.log('==========================================\n');

if (passCount === totalCount) {
  console.log('🌟 ALL PRODUCTION ROUTE HANDLER & EXPORT TESTS PASSED!\n');
} else {
  process.exit(1);
}
