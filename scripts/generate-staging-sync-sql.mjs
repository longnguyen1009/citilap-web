import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/b65da93ea2843a376d3060d680e68bc0241759acd637c928159fd6791d37ffe8.sqlite';
const db = new DatabaseSync(dbPath, { readOnly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all();
const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all();

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'bigint') return String(val);
  const str = String(val);
  return "'" + str.replace(/'/g, "''") + "'";
}

const lines = [];
lines.push('-- CitiLap local to staging synchronization dump');
lines.push(`-- Generated at: ${new Date().toISOString()}`);
lines.push('PRAGMA foreign_keys = OFF;');
lines.push('PRAGMA defer_foreign_keys = TRUE;');
lines.push('');

// 1. Drop all triggers so deletions and inserts are fast and unblocked
lines.push('-- 1. DROP ALL TRIGGERS');
for (const trig of triggers) {
  lines.push(`DROP TRIGGER IF EXISTS "${trig.name}";`);
}
lines.push('');

// 2. Clear all tables
lines.push('-- 2. CLEAR ALL TABLES');
for (const t of tables) {
  lines.push(`DELETE FROM "${t.name}";`);
}
lines.push('');

// 3. Insert all rows (1 row per INSERT statement to stay well below SQLITE_TOOBIG limit)
lines.push('-- 3. INSERT ALL ROWS');
let totalRows = 0;
for (const t of tables) {
  const tableName = t.name;
  const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
  if (!rows.length) continue;

  const cols = Object.keys(rows[0]);
  const colNames = cols.map(c => `"${c}"`).join(', ');

  for (const row of rows) {
    const vals = cols.map(c => escapeValue(row[c]));
    lines.push(`INSERT INTO "${tableName}" (${colNames}) VALUES (${vals.join(', ')});`);
  }
  totalRows += rows.length;
  console.log(`Table ${tableName}: ${rows.length} rows`);
}
lines.push('');

// 4. Recreate triggers
lines.push('-- 4. RECREATE TRIGGERS');
for (const trig of triggers) {
  lines.push(`${trig.sql};`);
}
lines.push('');
lines.push('PRAGMA foreign_keys = ON;');
lines.push('');

const outputPath = 'backups/sync-staging.sql';
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
const stats = fs.statSync(outputPath);
console.log(`\nDump completed: ${outputPath}`);
console.log(`Tables: ${tables.length}, Triggers: ${triggers.length}, Total Rows: ${totalRows}`);
console.log(`SQL File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
