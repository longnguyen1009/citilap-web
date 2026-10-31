#!/usr/bin/env node
// Usage: node scripts/backup-d1.mjs --env=local|staging|production
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const environment = args[0]?.replace(/^--env=/, '') || 'local';
if (args.length > 1 || (args.length && !args[0].startsWith('--env=')) ||
    !['local', 'staging', 'production'].includes(environment)) {
  console.error('Usage: node scripts/backup-d1.mjs --env=local|staging|production');
  process.exit(1);
}

const backupsDir = path.join(rootDir, 'backups');
fs.mkdirSync(backupsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(backupsDir, `d1-backup-${environment}-${timestamp}.sql`);
const partial = `${output}.partial`;
const scope = environment === 'local' ? ['--local'] : ['--remote', '--env', environment];

try {
  // Wrangler exports the configured D1 binding, including committed WAL data.
  const result = spawnSync(process.execPath, [
    path.join(rootDir, 'node_modules/wrangler/bin/wrangler.js'),
    'd1', 'export', 'DB', ...scope, '--output', partial,
  ], { cwd: rootDir, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(partial) || fs.statSync(partial).size === 0) {
    throw new Error(`D1 export failed (exit ${result.status}); no completed backup created.`);
  }
  fs.renameSync(partial, output);
  console.log(`Backup saved: ${output}`);
  console.log('Verify the SQL in an isolated D1 database before restoring.');
} catch (error) {
  fs.rmSync(partial, { force: true });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
