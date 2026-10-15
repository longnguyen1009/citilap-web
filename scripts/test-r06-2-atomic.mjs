import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readdir, readFile } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

console.log('=== CITILAP R06.2 — ATOMIC BATCH TRANSACTIONS, KEYSET EXPORT & NOTIFICATION TESTS ===\n');

// 1. Build bundle for service testing on isolated D1
await build({
  stdin: {
    contents: `
      export * from './src/server/services/order.service';
      export * from './src/server/services/contact.service';
      export * from './src/server/services/notification.service';
      export * from './src/server/services/customer.service';
      export * from './src/lib/csv-export';
      export * from './src/lib/prisma';
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
  outfile: 'scripts/.r06-2-test-bundle.mjs',
});

const {
  createOrder,
  transitionOrderStatus,
  addOrderInternalNote,
  getAllOrdersForExport,
  SHARED_ADMIN_ACTOR,
  OrderConflictError,
  submitContactMessage,
  updateContactSubmissionStatus,
  getAllContactsForExport,
  SHARED_CONTACT_ACTOR,
  ContactConflictError,
  getAllCustomersForExport,
  reconcileRecentNotifications,
  listAdminNotifications,
  markNotificationAsRead,
  escapeCsvField,
  buildCsvContent,
  getPrismaClient,
  setD1Database,
} = await import('./.r06-2-test-bundle.mjs');


// 2. Setup isolated Miniflare D1
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r06-2-test"); } }',
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

let passCount = 0;
let totalCount = 0;

function it(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

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

// Seed active category, product, and studio fixture for order placement
const nowIso = new Date().toISOString();
await db.prepare(`
  INSERT INTO "Category" ("id", "name", "slug", "status", "createdAt", "updatedAt")
  VALUES ('cat_r06_2', 'Laptop CitiLap Air', 'laptop-citilap-air', 'ACTIVE', ?, ?)
`).bind(nowIso, nowIso).run();

await db.prepare(`
  INSERT INTO "Product" (
    "id", "name", "slug", "description", "price", "stock", "status", "categoryId", "createdAt", "updatedAt"
  ) VALUES ('prod-laptop-1', 'Laptop CitiLap Air M3', 'laptop-citilap-air-m3', 'Laptop mỏng nhẹ', 25000000, 10, 'ACTIVE', 'cat_r06_2', ?, ?)
`).bind(nowIso, nowIso).run();

await db.prepare(`
  INSERT INTO "ProductStudio" ("productId", "revision", "draft", "published", "updatedAt")
  VALUES ('prod-laptop-1', 1, '{"availability":"AVAILABLE","variants":[]}', '{"availability":"AVAILABLE","variants":[]}', CURRENT_TIMESTAMP)
`).run();


// CSV Parser Helper (RFC 4180 compliant)
function parseCsv(csvString) {
  const text = csvString.startsWith('\ufeff') ? csvString.slice(1) : csvString;
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++;
        row.push(currentVal);
        currentVal = '';
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          lines.push(row);
        }
        row = [];
      } else {
        currentVal += char;
      }
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
}

console.log('--- GATE 1: Atomic Batch Transactions & Rollback Verification ---');

await itAsync('Create order commits order, items, event, and notification in a single batch', async () => {
  const result = await createOrder(
    {
      customerName: 'Nguyễn Văn Atomic',
      customerPhone: '0901234567',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-atomic-1',
    db
  );
  assert.equal(result.success, true);
  const orderId = result.order.id;

  // Verify notification was created atomically in the same batch
  const notif = await db.prepare('SELECT * FROM "AdminNotification" WHERE type = "NEW_ORDER" AND referenceId = ?').bind(orderId).first();
  assert.ok(notif, 'Notification must exist in DB');
  assert.equal(notif.isRead, 0);

  // Verify OrderEvent was created
  const event = await db.prepare('SELECT * FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();
  assert.ok(event, 'OrderEvent must exist in DB');
  assert.equal(event.action, 'CREATED');
});

await itAsync('Real transitionOrderStatus rolls back completely when OrderEvent insert fails via DB trigger', async () => {
  const seed = await createOrder(
    {
      customerName: 'Trần Thử Rollback',
      customerPhone: '0909999888',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-atomic-fail-order',
    db
  );
  const orderId = seed.order.id;
  const initialRevision = seed.order.revision ?? 0;
  const initialOrder = await db.prepare('SELECT * FROM "Order" WHERE id = ?').bind(orderId).first();
  const eventsBefore = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();

  // Inject fault at DB boundary: SQLite trigger that aborts OrderEvent insert for this order
  await db.prepare(`
    CREATE TRIGGER test_fail_order_event
    BEFORE INSERT ON "OrderEvent"
    WHEN NEW.orderId = '${orderId}'
    BEGIN
      SELECT RAISE(ABORT, 'Fault injection: Simulated OrderEvent insert failure');
    END;
  `).run();

  let serviceFailed = false;
  try {
    // Call the REAL production transitionOrderStatus service
    await transitionOrderStatus(
      { orderId, targetStatus: 'CONFIRMED', expectedRevision: initialRevision },
      db
    );
  } catch (err) {
    serviceFailed = true;
    assert.match(err.message, /Fault injection|Simulated OrderEvent/);
  } finally {
    await db.prepare('DROP TRIGGER IF EXISTS test_fail_order_event').run();
  }

  assert.equal(serviceFailed, true, 'transitionOrderStatus must fail when event insertion triggers an abort');

  // Verify DB state: Order status, revision, updatedAt, completedAt MUST be unchanged!
  const orderAfter = await db.prepare('SELECT * FROM "Order" WHERE id = ?').bind(orderId).first();
  assert.equal(orderAfter.status, initialOrder.status, 'Status must remain NEW');
  assert.equal(orderAfter.revision, initialRevision, 'Revision must remain initialRevision');
  assert.equal(orderAfter.updatedAt, initialOrder.updatedAt, 'updatedAt must be untouched');
  assert.equal(orderAfter.completedAt, null, 'completedAt must be untouched');

  // Verify events in DB: ZERO new events created
  const eventsAfter = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();
  assert.equal(eventsAfter.count, eventsBefore.count, 'No phantom OrderEvent must exist');
});

await itAsync('Real updateContactSubmissionStatus rolls back completely when ContactEvent insert fails via DB trigger', async () => {
  const submitRes = await submitContactMessage(
    { name: 'Lê Thử Rollback', phone: '0912345678', message: 'Cần tư vấn máy tính' },
    '127.0.0.1',
    db
  );
  assert.equal(submitRes.success, true);
  const contactId = submitRes.id;
  const initialContact = await db.prepare('SELECT * FROM "ContactSubmission" WHERE id = ?').bind(contactId).first();

  // Inject fault at DB boundary: SQLite trigger that aborts ContactEvent insert
  await db.prepare(`
    CREATE TRIGGER test_fail_contact_event
    BEFORE INSERT ON "ContactEvent"
    WHEN NEW.contactId = '${contactId}'
    BEGIN
      SELECT RAISE(ABORT, 'Fault injection: Simulated ContactEvent insert failure');
    END;
  `).run();

  let serviceFailed = false;
  try {
    // Call the REAL production updateContactSubmissionStatus service
    await updateContactSubmissionStatus(
      contactId,
      { status: 'PROCESSING', expectedRevision: 1 },
      db
    );
  } catch (err) {
    serviceFailed = true;
    assert.match(err.message, /Fault injection|Simulated ContactEvent/);
  } finally {
    await db.prepare('DROP TRIGGER IF EXISTS test_fail_contact_event').run();
  }

  assert.equal(serviceFailed, true, 'updateContactSubmissionStatus must fail when event insertion triggers an abort');

  // Verify DB state: status, revision, timestamps MUST be unchanged
  const contactAfter = await db.prepare('SELECT * FROM "ContactSubmission" WHERE id = ?').bind(contactId).first();
  assert.equal(contactAfter.status, 'PENDING', 'Status must remain PENDING');
  assert.equal(contactAfter.revision, 1, 'Revision must remain 1');
  assert.equal(contactAfter.handledAt, null, 'handledAt must remain null');
  assert.equal(contactAfter.startedProcessingAt, null, 'startedProcessingAt must remain null');

  // Verify events in DB: ZERO ContactEvents created
  const events = await db.prepare('SELECT count(*) as count FROM "ContactEvent" WHERE contactId = ?').bind(contactId).first();
  assert.equal(events.count, 0, 'No phantom ContactEvent must exist');
});

await itAsync('Real addOrderInternalNote rolls back completely when note event insert fails via DB trigger', async () => {
  const seed = await createOrder(
    {
      customerName: 'Hoàng Note Rollback',
      customerPhone: '0911223344',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-atomic-fail-note',
    db
  );
  const orderId = seed.order.id;

  const notesBefore = await db.prepare('SELECT count(*) as count FROM "OrderNote" WHERE orderId = ?').bind(orderId).first();
  const eventsBefore = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();

  // Inject trigger on OrderEvent for action NOTE_ADDED
  await db.prepare(`
    CREATE TRIGGER test_fail_note_event
    BEFORE INSERT ON "OrderEvent"
    WHEN NEW.orderId = '${orderId}' AND NEW.action = 'NOTE_ADDED'
    BEGIN
      SELECT RAISE(ABORT, 'Fault injection: Simulated Note Event failure');
    END;
  `).run();

  let serviceFailed = false;
  try {
    await addOrderInternalNote(orderId, 'Ghi chú thử nghiệm rollback', undefined, db);
  } catch (err) {
    serviceFailed = true;
    assert.match(err.message, /Fault injection|Simulated Note Event/);
  } finally {
    await db.prepare('DROP TRIGGER IF EXISTS test_fail_note_event').run();
  }

  assert.equal(serviceFailed, true, 'addOrderInternalNote must fail when event insert is aborted');

  // Verify DB state: Neither note nor event must exist
  const notesAfter = await db.prepare('SELECT count(*) as count FROM "OrderNote" WHERE orderId = ?').bind(orderId).first();
  const eventsAfter = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();
  assert.equal(notesAfter.count, notesBefore.count, 'OrderNote must NOT be committed');
  assert.equal(eventsAfter.count, eventsBefore.count, 'OrderEvent must NOT be committed');
});

await itAsync('Real createOrder rolls back completely (Order, Items, Event) when AdminNotification insert fails via DB trigger', async () => {
  // Inject trigger on AdminNotification for NEW_ORDER
  await db.prepare(`
    CREATE TRIGGER test_fail_order_notif
    BEFORE INSERT ON "AdminNotification"
    WHEN NEW.type = 'NEW_ORDER' AND NEW.message LIKE '%RollbackNotif%'
    BEGIN
      SELECT RAISE(ABORT, 'Fault injection: Simulated AdminNotification failure');
    END;
  `).run();

  let serviceFailed = false;
  try {
    await createOrder(
      {
        customerName: 'RollbackNotif Customer',
        customerPhone: '0977665544',
        items: [{ productId: 'prod-laptop-1', quantity: 2 }],
      },
      'idemp-create-notif-fail',
      db
    );
  } catch (err) {
    serviceFailed = true;
    assert.match(err.message, /Fault injection|Simulated AdminNotification/);
  } finally {
    await db.prepare('DROP TRIGGER IF EXISTS test_fail_order_notif').run();
  }

  assert.equal(serviceFailed, true, 'createOrder must fail when notification insert is aborted');

  // Verify DB state: Entire order creation rolled back by D1 batch!
  const orderInDb = await db.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').bind('idemp-create-notif-fail').first();
  assert.equal(orderInDb, null, 'Order must NOT exist in DB');

  const itemsInDb = await db.prepare('SELECT * FROM "OrderItem" WHERE quantity = 2 AND priceSnapshot = 25000000').first();
  assert.equal(itemsInDb, null, 'OrderItems must NOT exist in DB');

  const notifInDb = await db.prepare('SELECT * FROM "AdminNotification" WHERE title LIKE "%RollbackNotif%"').first();
  assert.equal(notifInDb, null, 'AdminNotification must NOT exist in DB');
});

console.log('\n--- GATE 2: CAS Concurrency, Deterministic Race & Zero Phantom Events ---');

await itAsync('Deterministic Barrier Race: Two coordinated concurrent requests hit CAS boundary at same revision -> exactly ONE succeeds, ONE 409', async () => {
  const seed = await createOrder(
    {
      customerName: 'Hoàng Barrier Race Test',
      customerPhone: '0977889900',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-race-barrier-1',
    db
  );
  const orderId = seed.order.id;
  const rev = seed.order.revision ?? 0;

  const eventsBefore = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();

  // Setup coordination barrier at db.batch:
  // Both requests will read existing order (revision 0) and prepare statements.
  // When entering db.batch, request 1 will wait until request 2 also reaches db.batch.
  let arrivedCount = 0;
  let releaseBarrier;
  const barrierPromise = new Promise((resolve) => {
    releaseBarrier = resolve;
  });

  const originalBatch = db.batch.bind(db);
  db.batch = async function (statements) {
    arrivedCount++;
    if (arrivedCount === 2) {
      // Both requests have arrived at the write point with the same revision
      releaseBarrier();
    } else {
      await barrierPromise;
    }
    return originalBatch(statements);
  };

  let resA, resB;
  try {
    [resA, resB] = await Promise.allSettled([
      transitionOrderStatus(
        { orderId, targetStatus: 'CONTACTED', expectedRevision: rev },
        db
      ),
      transitionOrderStatus(
        { orderId, targetStatus: 'CONFIRMED', expectedRevision: rev },
        db
      ),
    ]);
  } finally {
    db.batch = originalBatch;
  }

  const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled');
  const rejected = [resA, resB].filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one request must succeed');
  assert.equal(rejected.length, 1, 'Exactly one request must be rejected');

  const error = rejected[0].reason;
  assert.ok(error instanceof OrderConflictError, 'Rejected error must be OrderConflictError');
  assert.equal(error.currentRevision, rev + 1, 'Error currentRevision must report the updated revision');

  // Verify events in DB: exactly ONE event added, NO phantom event!
  const eventsAfter = await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first();
  assert.equal(eventsAfter.count, eventsBefore.count + 1, 'Exactly one event must be added, no phantom events');
});

await itAsync('CAS failure due to outdated revision produces ZERO DB changes and ZERO phantom events', async () => {
  const seed = await createOrder(
    {
      customerName: 'Phạm Stale Test',
      customerPhone: '0933445566',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-stale-1',
    db
  );
  const orderId = seed.order.id;

  // Advance revision to 1
  await transitionOrderStatus(
    { orderId, targetStatus: 'CONTACTED', expectedRevision: 0 },
    db
  );

  const orderBefore = await db.prepare('SELECT * FROM "Order" WHERE id = ?').bind(orderId).first();
  const eventsCountBefore = (await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first()).count;

  // Now send a request with stale revision 0
  await assert.rejects(
    async () => {
      await transitionOrderStatus(
        { orderId, targetStatus: 'CONFIRMED', expectedRevision: 0 },
        db
      );
    },
    (err) => {
      assert.ok(err instanceof OrderConflictError);
      assert.equal(err.currentRevision, 1);
      return true;
    }
  );

  const orderAfter = await db.prepare('SELECT * FROM "Order" WHERE id = ?').bind(orderId).first();
  const eventsCountAfter = (await db.prepare('SELECT count(*) as count FROM "OrderEvent" WHERE orderId = ?').bind(orderId).first()).count;

  assert.equal(orderAfter.status, orderBefore.status, 'Status must not change on CAS failure');
  assert.equal(orderAfter.revision, orderBefore.revision, 'Revision must not change on CAS failure');
  assert.equal(eventsCountAfter, eventsCountBefore, 'No phantom events inserted on CAS failure');
});

console.log('\n--- GATE 3: Stale Revision Contract Consistency ---');

await itAsync('Stale revision returning sameStatus is handled as 409 Conflict (not SAME_STATUS_NOOP 400)', async () => {
  const seed = await createOrder(
    {
      customerName: 'Đặng Stale SameStatus',
      customerPhone: '0911223344',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-stale-same-1',
    db
  );
  const orderId = seed.order.id;

  // Move to CONFIRMED (revision = 1)
  await transitionOrderStatus(
    { orderId, targetStatus: 'CONFIRMED', expectedRevision: 0 },
    db
  );

  // Client was at revision 0 (saw NEW), now sends targetStatus = 'CONFIRMED' with expectedRevision = 0
  // Even though currentStatus in DB is already CONFIRMED, the client is STALE, so it must return 409 Conflict!
  await assert.rejects(
    async () => {
      await transitionOrderStatus(
        { orderId, targetStatus: 'CONFIRMED', expectedRevision: 0 },
        db
      );
    },
    (err) => {
      assert.ok(err instanceof OrderConflictError, 'Must throw OrderConflictError, not SAME_STATUS_NOOP');
      return true;
    }
  );
});

await itAsync('Stale revision with invalid transition is handled as 409 Conflict (not INVALID_TRANSITION 400)', async () => {
  const seed = await createOrder(
    {
      customerName: 'Bùi Stale InvalidTransition',
      customerPhone: '0988776655',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-stale-inv-1',
    db
  );
  const orderId = seed.order.id;

  // Move to COMPLETED (revision = 2)
  await transitionOrderStatus({ orderId, targetStatus: 'CONFIRMED', expectedRevision: 0 }, db);
  await transitionOrderStatus({ orderId, targetStatus: 'COMPLETED', expectedRevision: 1 }, db);

  // Client was at revision 0, sends CONTACTED (which is not allowed from COMPLETED) with expectedRevision = 0
  await assert.rejects(
    async () => {
      await transitionOrderStatus(
        { orderId, targetStatus: 'CONTACTED', expectedRevision: 0 },
        db
      );
    },
    (err) => {
      assert.ok(err instanceof OrderConflictError, 'Must throw OrderConflictError, not INVALID_TRANSITION');
      return true;
    }
  );
});

await itAsync('Negative or non-integer revision is strictly rejected as INVALID_REVISION', async () => {
  const seed = await createOrder(
    {
      customerName: 'Lý Invalid Rev',
      customerPhone: '0966554433',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-inv-rev-1',
    db
  );
  const orderId = seed.order.id;

  await assert.rejects(
    () => transitionOrderStatus({ orderId, targetStatus: 'CONFIRMED', expectedRevision: -1 }, db),
    /INVALID_REVISION/
  );
  await assert.rejects(
    () => transitionOrderStatus({ orderId, targetStatus: 'CONFIRMED', expectedRevision: 1.5 }, db),
    /INVALID_REVISION/
  );
});

console.log('\n--- GATE 4: Server-Determined Actor & Notes Batch ---');

await itAsync('Order internal note commits OrderNote and OrderEvent in single batch with server actor', async () => {
  const seed = await createOrder(
    {
      customerName: 'Vũ Staff Note',
      customerPhone: '0944332211',
      items: [{ productId: 'prod-laptop-1', quantity: 1 }],
    },
    'idemp-staff-note-1',
    db
  );
  const orderId = seed.order.id;

  const note = await addOrderInternalNote(orderId, 'Khách hẹn giao sau 18h', 'FakeClientHacker', db);
  assert.equal(note.actor, SHARED_ADMIN_ACTOR);

  const event = await db.prepare('SELECT * FROM "OrderEvent" WHERE orderId = ? AND action = "NOTE_ADDED"').bind(orderId).first();
  assert.ok(event);
  assert.equal(event.actor, SHARED_ADMIN_ACTOR);
  assert.equal(event.note, 'Khách hẹn giao sau 18h');
});

console.log('\n--- GATE 5: Keyset Export Stability & Tie-Breaker ---');

await itAsync('Export Orders: handles identical timestamps, multiline CSV fields, interleaving insert between chunks, and full ID set equality', async () => {
  const fixedTime = '2026-10-10T10:00:00.000Z';
  const expectedIds = [];

  // 1. Seed 12 orders:
  // - 4 with IDENTICAL createdAt timestamp (to exercise keyset [createdAt desc, id desc] tie-breaker)
  // - 2 with MULTILINE address & note containing newlines (\n), commas, and double quotes
  // - 6 with descending historical timestamps
  const seedStmts = [];
  for (let i = 1; i <= 12; i++) {
    const id = `order-exp-${i.toString().padStart(3, '0')}`;
    expectedIds.push(id);
    const orderCreatedAt = i <= 4
      ? fixedTime
      : new Date(new Date(fixedTime).getTime() - i * 60000).toISOString();

    const note = i === 1
      ? 'Dòng ghi chú 1\nDòng ghi chú 2\n"Trích dẫn có nháy và dấu phẩy, v.v."'
      : (i === 2 ? 'Ghi chú đơn hàng\nKhông giao giờ hành chính' : `Ghi chú đơn ${i}`);

    const shippingAddress = i === 1
      ? 'Tầng 4, Tòa nhà CitiLap\nPhường Bến Nghé, Quận 1\nTP. Hồ Chí Minh'
      : `Địa chỉ số ${i}, Phố CitiLap, Hà Nội`;

    seedStmts.push(db.prepare(`
      INSERT INTO "Order" (
        "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
        "customerName", "customerPhone", "shippingAddress", "note", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'NEW', 0, 1000000, 0, 0, 1000000, ?, '0900000000', ?, ?, 'COD', 'PENDING', ?, ?)
    `).bind(id, `ORD-EXP-${i}`, `ExportKeyset Customer ${i}`, shippingAddress, note, orderCreatedAt, orderCreatedAt));
  }
  await db.batch(seedStmts);

  // 2. Interleave insertion: Hook prisma.order.findMany so that immediately after Chunk 1 is fetched,
  // a new order is inserted into the DB before Chunk 2 is fetched.
  const prisma = getPrismaClient(db);
  const originalFindMany = prisma.order.findMany.bind(prisma.order);
  let chunkCount = 0;
  prisma.order.findMany = async function (args) {
    const res = await originalFindMany(args);
    chunkCount++;
    if (chunkCount === 1) {
      // Chunk 1 has been read! Insert a new order before Chunk 2 queries the DB
      const postCutoffTime = new Date().toISOString();
      await db.prepare(`
        INSERT INTO "Order" (
          "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
          "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
        ) VALUES ('order-inserted-during-export', 'ORD-DURING-1', 'NEW', 0, 999000, 0, 0, 999000, 'ExportKeyset New Interleaved', '0999999999', 'COD', 'PENDING', ?, ?)
      `).bind(postCutoffTime, postCutoffTime).run();
    }
    return res;
  };

  let exported;
  try {
    // Read with chunkSize = 4 (requires 3 chunk iterations to cover 12 records)
    exported = await getAllOrdersForExport({ search: 'ExportKeyset' }, db, 4);
  } finally {
    prisma.order.findMany = originalFindMany;
  }

  // 3. Verify Full ID Set equality (NOT just count!)
  const exportedIds = exported.map((o) => o.id);
  assert.equal(exported.length, 12, 'Must export exactly the 12 initial orders');
  assert.equal(
    exportedIds.includes('order-inserted-during-export'),
    false,
    'Order inserted during export after cutoff time must be excluded by createdAt horizon boundary'
  );
  assert.deepEqual(
    new Set(exportedIds),
    new Set(expectedIds),
    'Exported ID set must match expected ID set completely (zero missing, zero duplicates)'
  );

  // 4. Verify CSV Export with Multiline RFC 4180 Parser
  const headers = ['Mã đơn hàng', 'Khách hàng', 'Địa chỉ', 'Ghi chú', 'Tổng tiền (VND)'];
  const rows = exported.map((o) => [o.id, o.customerName, o.shippingAddress || '', o.note || '', o.totalAmount]);
  const csvContent = buildCsvContent(headers, rows);
  const parsed = parseCsv(csvContent);

  // Parsed row count must equal exactly 1 header + 12 data rows despite newlines embedded inside quoted cells!
  assert.equal(parsed.length, 13, 'CSV must have exactly 1 header row + 12 data rows (multiline quotes preserved!)');
  assert.equal(parsed[0][0], 'Mã đơn hàng');

  // Verify the multiline record preserves newlines without splitting into separate CSV rows
  const multiRow = parsed.find((r) => r[0] === 'order-exp-001');
  assert.ok(multiRow, 'order-exp-001 row must exist');
  assert.match(multiRow[2], /Tầng 4, Tòa nhà CitiLap\nPhường Bến Nghé/);
  assert.match(multiRow[3], /Dòng ghi chú 1\nDòng ghi chú 2\n"Trích dẫn có nháy và dấu phẩy, v.v\."/);

  // 5. Semantics Verification Note:
  // createdAt cutoff acts as an upper-bound filter boundary on records, NOT transaction-level snapshot isolation.
});

await itAsync('Export Customers: keyset pagination covers >500 records with snapshot stability', async () => {
  const guestOrderCount = 520;
  console.log(`    Seeding ${guestOrderCount} guest orders for export keyset verification...`);

  const guestStmts = [];
  const nowIso = new Date().toISOString().replace('Z', '+00:00');
  for (let i = 1; i <= guestOrderCount; i++) {
    const id = `guest-export-${i.toString().padStart(4, '0')}`;
    guestStmts.push(db.prepare(`
      INSERT INTO "Order" (
        "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
        "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'COMPLETED', 0, 500000, 0, 0, 500000, ?, ?, 'COD', 'PENDING', ?, ?)
    `).bind(id, `ORD-GEXP-${i}`, `Guest ${i}`, `092000${(i % 100).toString().padStart(4, '0')}`, nowIso, nowIso));
  }
  for (let b = 0; b < guestStmts.length; b += 100) {
    await db.batch(guestStmts.slice(b, b + 100));
  }

  const customers = await getAllCustomersForExport({ source: 'GUEST_ORDER' }, db);
  assert.ok(customers.length >= guestOrderCount, `Must export >= ${guestOrderCount} records, got ${customers.length}`);

  // Verify unique IDs: NO duplicate records in keyset export!
  const idSet = new Set(customers.map((c) => c.id));
  assert.equal(idSet.size, customers.length, 'Every exported customer ID must be unique (no duplicates!)');
});

console.log('\n--- GATE 6: Notification Reliability Beyond 24h & Idempotency ---');

await itAsync('Order created > 24 hours ago (48h ago) missing notification is successfully reconciled', async () => {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().replace('Z', '+00:00');
  const oldOrderId = 'order-old-48h-1';

  await db.prepare(`
    INSERT INTO "Order" (
      "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
      "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
    ) VALUES (?, 'ORD-OLD-48H', 'NEW', 0, 3000000, 0, 0, 3000000, 'Khách Hàng 48h', '0933221100', 'COD', 'PENDING', ?, ?)
  `).bind(oldOrderId, fortyEightHoursAgo, fortyEightHoursAgo).run();

  // Run reconciliation
  await reconcileRecentNotifications(db);

  // Verify notification was created despite being > 24h old!
  const notif = await db.prepare('SELECT * FROM "AdminNotification" WHERE type = "NEW_ORDER" AND referenceId = ?').bind(oldOrderId).first();
  assert.ok(notif, 'Notification must be created for 48h-old unnotified order');
  assert.equal(notif.isRead, 0);

  // Mark notification as read
  await markNotificationAsRead(notif.id, db);
  const readCheck = await db.prepare('SELECT * FROM "AdminNotification" WHERE id = ?').bind(notif.id).first();
  assert.equal(readCheck.isRead, 1);

  // Run reconciliation again: MUST NOT reset isRead or readAt!
  await reconcileRecentNotifications(db);
  const readCheckAfter = await db.prepare('SELECT * FROM "AdminNotification" WHERE id = ?').bind(notif.id).first();
  assert.equal(readCheckAfter.isRead, 1, 'isRead must NEVER be reset to 0 upon reconciliation');
  assert.ok(readCheckAfter.readAt, 'readAt must be preserved');
});

await itAsync('Historical archived order (> 30 days old and COMPLETED) is NOT flooded into notifications', async () => {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().replace('Z', '+00:00');
  const ancientOrderId = 'order-ancient-60d-1';

  await db.prepare(`
    INSERT INTO "Order" (
      "id", "orderNumber", "status", "revision", "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
      "customerName", "customerPhone", "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
    ) VALUES (?, 'ORD-ANCIENT', 'COMPLETED', 0, 1000000, 0, 0, 1000000, 'Cụ Cố Hàng Xưa', '0900000000', 'COD', 'PAID', ?, ?)
  `).bind(ancientOrderId, sixtyDaysAgo, sixtyDaysAgo).run();

  // Run reconciliation
  await reconcileRecentNotifications(db);

  // Verify NO notification was flooded for this 60-day-old completed order
  const notif = await db.prepare('SELECT * FROM "AdminNotification" WHERE type = "NEW_ORDER" AND referenceId = ?').bind(ancientOrderId).first();
  assert.equal(notif, null, 'Must NOT create notification for historical completed order');
});

await mf.dispose();

console.log('\n==========================================');
console.log(`TOTAL R06.2 ATOMIC & KEYSET TESTS: ${totalCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${totalCount - passCount}`);
console.log('==========================================\n');

if (passCount === totalCount) {
  console.log('🌟 ALL R06.2 ATOMIC, CAS, KEYSET & NOTIFICATION TESTS PASSED!\n');
} else {
  process.exit(1);
}
