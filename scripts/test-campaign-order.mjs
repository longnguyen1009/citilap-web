import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './src/lib/campaign-order'; export { adminSettingsDocumentSchema, publicStorefrontSettingsSchema, DEFAULT_ADMIN_SETTINGS } from './src/contracts/cms/settings';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const order = ['SALE MỪNG NHẬP HỌC', 'FLASHSALE'];
const document = api.adminSettingsDocumentSchema.parse({ ...api.DEFAULT_ADMIN_SETTINGS, hotSaleCampaignOrder: order });
assert.deepEqual(api.publicStorefrontSettingsSchema.parse(document).hotSaleCampaignOrder, order);
assert.deepEqual(['FLASHSALE', 'MỚI', ' sale mừng nhập học '].sort((a, b) => api.campaignOrderRank(a, order) - api.campaignOrderRank(b, order)), [' sale mừng nhập học ', 'FLASHSALE', 'MỚI']);
assert.deepEqual(api.publicStorefrontSettingsSchema.parse(api.DEFAULT_ADMIN_SETTINGS).hotSaleCampaignOrder, []);
assert.equal(api.adminSettingsDocumentSchema.safeParse({ ...document, hotSaleCampaignOrder: [''] }).success, false);
console.log('PASS: campaign order survives settings validation and public DTO; matching ignores case/spacing; new campaigns follow saved order.');
