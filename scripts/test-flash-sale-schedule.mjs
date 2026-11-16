import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('.wrangler/hot-sale-test', { recursive: true });
await build({ stdin: { contents: `export * from './src/lib/flash-sale-schedule'; export * from './src/contracts/cms/campaign';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: '.wrangler/hot-sale-test/schedule.mjs' });
const api = await import('../.wrangler/hot-sale-test/schedule.mjs');
for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
  process.env.TZ = tz;
  assert.equal(api.vnDateTimeToIso('16/11/2026', '10:00'), '2026-11-16T03:00:00.000Z');
  assert.equal(api.vnDateTimeToIso('17/11/2026', '00:30'), '2026-11-16T17:30:00.000Z');
  assert.equal(api.isoToVnDateDisplay('2026-11-16T17:30:00.000Z'), '17/11/2026');
  assert.equal(api.isoToVnTimeDisplay('2026-11-16T17:30:00.000Z'), '00:30');
  assert.equal(api.getVnTodayParts(Date.parse('2026-11-16T18:00:00Z')).dayKey, '2026-11-17');
}
assert.equal(api.vnDateTimeToIso('31/02/2026', '10:00'), '');
assert.equal(api.vnDateTimeToIso('16/11/2026', '24:00'), '');
const start = '2026-11-16T03:00:00.000Z';
const end = '2026-11-16T05:00:00.000Z';
const startMs = Date.parse(start), endMs = Date.parse(end), showMs = startMs - 7200000;
assert.equal(api.isCampaignSlotInAutoShowWindow(start, end, showMs - 1, 2), false);
assert.equal(api.isCampaignSlotInAutoShowWindow(start, end, showMs, 2), true);
assert.equal(api.isCampaignSlotInAutoShowWindow(start, end, endMs - 1, 2), true);
assert.equal(api.isCampaignSlotInAutoShowWindow(start, end, endMs, 2), false);
assert.equal(api.getNextHotSaleBoundaryMs([{ startAt: start, endAt: end }], showMs - 1), showMs);
assert.equal(api.getNextHotSaleBoundaryMs([{ startAt: start, endAt: end }], showMs), startMs);
assert.equal(api.getNextHotSaleBoundaryMs([{ startAt: start, endAt: end }], startMs), endMs);
const doc = { name: 'Test', startAt: start, endAt: end };
assert(api.campaignDocumentSchema.safeParse(doc).success);
assert(api.campaignDocumentSchema.safeParse({ ...doc, startAt: '2026-11-16T10:00:00+07:00', endAt: '2026-11-16T12:00:00+07:00' }).success);
assert.equal(api.campaignDocumentSchema.safeParse({ ...doc, startAt: '2026-11-16T10:00' }).success, false);
console.log('PASS: Vietnam schedule in 3 timezones, midnight rollover, invalid dates, explicit timezone requirement and exact visibility boundaries.');
