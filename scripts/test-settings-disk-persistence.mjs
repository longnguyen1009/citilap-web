import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

// Bundle settings service and contracts
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/settings.service';
      export * from './src/contracts/cms/settings';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const persistDir = join(tmpdir(), `citilap-d1-persist-test-${Date.now()}`);
await mkdir(persistDir, { recursive: true });

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

function createMiniflareConfig(persistPath) {
  return {
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default { fetch() { return new Response("d1-instance"); } }',
      compatibilityDate: '2026-10-01',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: { DB: 'site-settings-disk-db' },
    }),
    resourcePersistencePath: persistPath,
  };
}

try {
  // PHASE 1: Start Instance 1 with on-disk persistence
  let mf1 = new Miniflare(createMiniflareConfig(persistDir));
  const db1 = await mf1.getD1Database('DB');

  // Apply migrations 0001 to 0012
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    for (const stmt of unstable_splitSqlQuery(sql)) {
      await db1.prepare(stmt).run();
    }
  }

  // Initial save on Instance 1
  await check('Instance 1: saves document to disk-backed D1 at revision 1', async () => {
    const res = await api.saveAdminSettings(
      db1,
      {
        expectedRevision: 0,
        document: {
          ...api.DEFAULT_ADMIN_SETTINGS,
          storeName: 'CitiLap Persistent Disk Store',
          shippingFee: 42000,
        },
      },
      'admin-instance-1'
    );
    assert.equal(res.revision, 1);
    assert.equal(res.document.storeName, 'CitiLap Persistent Disk Store');
  });

  // STOP and DISPOSE Instance 1 completely (simulates total process death)
  await mf1.dispose();
  mf1 = null;

  // PHASE 2: Start Instance 2 using the exact same on-disk persistence directory
  const mf2 = new Miniflare(createMiniflareConfig(persistDir));
  const db2 = await mf2.getD1Database('DB');

  // Verify persistence across real instance restart
  await check('Instance 2: verifies state and revision history survived restart intact', async () => {
    const loaded = await api.getAdminSettings(db2);
    assert.equal(loaded.revision, 1);
    assert.equal(loaded.document.storeName, 'CitiLap Persistent Disk Store');
    assert.equal(loaded.document.shippingFee, 42000);

    // Verify history audit table row
    const revRow = await db2.prepare("SELECT * FROM SiteSettingsRevision WHERE revision = 1").first();
    assert.equal(revRow.actor, 'admin-instance-1');
    assert.equal(revRow.action, 'save');
  });

  // Test atomicity of batch & trigger rollback on Instance 2
  await check('Instance 2: batch failure or conflict does not leave partial revisions', async () => {
    // Attempt concurrent write with stale revision 0
    await assert.rejects(
      () =>
        api.saveAdminSettings(db2, {
          expectedRevision: 0, // stale
          document: { ...api.DEFAULT_ADMIN_SETTINGS, storeName: 'Should Not Persist' },
        }),
      (err) => err.status === 409
    );

    // Check revision count remains exactly 1
    const count = await db2.prepare("SELECT COUNT(*) as c FROM SiteSettingsRevision").first();
    assert.equal(count.c, 1);
  });

  // Test missing migration error reporting (missing table)
  await check('Missing table raises 503 infrastructure error without fallback', async () => {
    const mfEmpty = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: 'export default { fetch() { return new Response("empty"); } }',
        compatibilityDate: '2026-10-01',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: { DB: 'empty-db' },
      })
    );
    try {
      const dbEmpty = await mfEmpty.getD1Database('DB');
      await assert.rejects(
        () => api.getAdminSettings(dbEmpty),
        (err) => err.status === 503
      );
    } finally {
      await mfEmpty.dispose();
    }
  });

  await mf2.dispose();
  console.log(`Settings Disk Persistence & Restart: ${passed}/${passed} PASS`);
} finally {
  await rm(persistDir, { recursive: true, force: true }).catch(() => {});
}
