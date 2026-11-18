import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { resolve } from 'node:path';

const d1Root = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const dbFile = fs.readdirSync(d1Root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(d1Root, dbFile), { readOnly: true });

const rawTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name").all().map((t) => t.name);
const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all();

// Topological sort: parent tables before child tables for INSERT; reverse for DELETE
const deps = new Map(rawTables.map((t) => [t, new Set()]));
for (const t of rawTables) {
  for (const fk of db.prepare(`PRAGMA foreign_key_list("${t}")`).all()) {
    if (fk.table !== t && deps.has(fk.table)) deps.get(t).add(fk.table);
  }
}
const insertOrder = [];
const visited = new Set();
function visit(t) {
  if (visited.has(t)) return;
  visited.add(t);
  for (const parent of deps.get(t) || []) visit(parent);
  insertOrder.push(t);
}
for (const t of rawTables) visit(t);
const deleteOrder = [...insertOrder].reverse();

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'bigint') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const lines = [
  '-- CitiLap local to production synchronization dump',
  `-- Generated at: ${new Date().toISOString()}`,
  'PRAGMA foreign_keys = OFF;',
  'PRAGMA defer_foreign_keys = TRUE;',
  '',
  '-- 1. DROP ALL TRIGGERS',
  ...triggers.map((trig) => `DROP TRIGGER IF EXISTS "${trig.name}";`),
  '',
  '-- 2. CLEAR ALL TABLES (children first)',
  'UPDATE "Category" SET "parentId" = NULL;',
  ...deleteOrder.map((name) => `DELETE FROM "${name}";`),
  '',
  '-- 3. INSERT ALL ROWS (parents first)',
];

let totalRows = 0;
for (const tableName of insertOrder) {
  let rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
  if (!rows.length) continue;
  if (tableName === 'Category') {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = [];
    const seenCat = new Set();
    const addCat = (r) => {
      if (!r || seenCat.has(r.id)) return;
      if (r.parentId && byId.has(r.parentId)) addCat(byId.get(r.parentId));
      seenCat.add(r.id);
      ordered.push(r);
    };
    for (const r of rows) addCat(r);
    rows = ordered;
  }
  const cols = Object.keys(rows[0]);
  const colNames = cols.map((c) => `"${c}"`).join(', ');
  for (const row of rows) {
    const vals = cols.map((c) => escapeValue(row[c]));
    const stmt = `INSERT INTO "${tableName}" (${colNames}) VALUES (${vals.join(', ')});`;
    if (Buffer.byteLength(stmt, 'utf8') > 80000 && cols.includes('published') && cols.includes('id') && row.published != null) {
      const valsNoPub = cols.map((c) => (c === 'published' ? 'NULL' : escapeValue(row[c])));
      lines.push(`INSERT INTO "${tableName}" (${colNames}) VALUES (${valsNoPub.join(', ')});`);
      lines.push(`UPDATE "${tableName}" SET "published" = ${escapeValue(row.published)} WHERE "id" = ${escapeValue(row.id)};`);
    } else {
      lines.push(stmt);
    }
  }
  totalRows += rows.length;
}
lines.push('', '-- 4. RECREATE TRIGGERS', ...triggers.map((trig) => `${trig.sql};`), '', 'PRAGMA foreign_keys = ON;', '');

fs.mkdirSync('backups', { recursive: true });
const outputPath = 'backups/sync-production.sql';
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
const stats = fs.statSync(outputPath);
console.log(`Generated ${outputPath}: ${insertOrder.length} tables, ${triggers.length} triggers, ${totalRows} rows (${(stats.size / 1048576).toFixed(2)} MB)`);
db.close();
