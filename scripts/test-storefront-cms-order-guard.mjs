import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export * from './src/server/services/storefront-order-guard';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { assertPublishedStudioOrderable } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

const published = (availability, variants = []) => JSON.stringify({ availability, variants });

test('legacy product without a published Studio remains orderable', () => {
  assert.doesNotThrow(() => assertPublishedStudioOrderable(null, null));
});

test('published AVAILABLE and PREORDER remain orderable', () => {
  for (const status of ['AVAILABLE', 'PREORDER']) {
    assert.doesNotThrow(() => assertPublishedStudioOrderable(published(status), null));
    assert.doesNotThrow(() => assertPublishedStudioOrderable(published(status, [{ id: 'v1' }]), 'v1'));
  }
});

test('CONTACT and UNAVAILABLE reject stale cart items', () => {
  for (const status of ['CONTACT', 'UNAVAILABLE']) {
    assert.throws(() => assertPublishedStudioOrderable(published(status), null), /PRODUCT_UNAVAILABLE/);
  }
});

test('removed or unselected published variant is rejected', () => {
  const doc = published('AVAILABLE', [{ id: 'v2' }]);
  assert.throws(() => assertPublishedStudioOrderable(doc, 'v1'), /VARIANT_UNAVAILABLE/);
  assert.throws(() => assertPublishedStudioOrderable(doc, null), /VARIANT_UNAVAILABLE/);
  assert.throws(() => assertPublishedStudioOrderable(published('AVAILABLE'), 'v1'), /VARIANT_UNAVAILABLE/);
});

test('corrupted published payload rejects purchase rather than throwing an unrelated 500', () => {
  for (const broken of ['{', 'null', '{}', '{"availability":"AVAILABLE","variants":[null]}']) {
    const error = broken.includes('AVAILABLE') ? 'VARIANT_UNAVAILABLE' : 'PRODUCT_UNAVAILABLE';
    assert.throws(() => assertPublishedStudioOrderable(broken, 'v1'), new RegExp(error));
  }
});
