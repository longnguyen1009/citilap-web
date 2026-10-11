import assert from 'node:assert/strict';
import test from 'node:test';
import {
  layoutDocumentSchema, menuDocumentSchema, saveLayoutDraftSchema,
  publishLayoutSchema, internalPathSchema,
} from '../src/contracts/cms/v1.ts';

const category = { id: 'accessories', enabled: true, type: 'category-grid', title: 'Phụ kiện', items: [{ categoryId: 'cat-accessories' }] };
const hero = { id: 'hero', enabled: true, type: 'hero', title: 'CitiLap', description: '', desktopImage: { assetId: 'asset-1', alt: 'Cửa hàng CitiLap' } };
const document = { schemaVersion: 1, blocks: [hero, category] };
test('round-trip editor payload preserves the three supported block types', () => {
  const input = { ...document, blocks: [...document.blocks, { id: 'products', enabled: true, type: 'product-grid', title: 'Gợi ý', source: { kind: 'manual', productIds: ['p-1'] } }] };
  const parsed = layoutDocumentSchema.parse(JSON.parse(JSON.stringify(input)));
  assert.equal(parsed.blocks.length, 3);
  assert.equal(parsed.blocks[1].title, 'Phụ kiện');
});
test('reject unsupported versions and blocks instead of silently discarding content', () => {
  assert.equal(layoutDocumentSchema.safeParse({ ...document, schemaVersion: 2 }).success, false);
  assert.equal(layoutDocumentSchema.safeParse({ schemaVersion: 1, blocks: [{ ...hero, type: 'html', html: '<script/>' }] }).success, false);
});
test('reject duplicate block identities that would break reorder and edit', () => {
  assert.equal(layoutDocumentSchema.safeParse({ ...document, blocks: [hero, hero] }).success, false);
});
test('reject arbitrary CSS, HTML and fields outside the renderer contract', () => {
  for (const extra of [{ css: 'body{display:none}' }, { html: '<iframe/>' }, { secret: 'x' }]) {
    assert.equal(layoutDocumentSchema.safeParse({ ...document, blocks: [{ ...hero, ...extra }] }).success, false);
  }
});
test('require alt text except explicitly decorative images', () => {
  const build = (image) => ({ ...document, blocks: [{ ...hero, desktopImage: image }] });
  assert.equal(layoutDocumentSchema.safeParse(build({ assetId: 'a', alt: '' })).success, false);
  assert.equal(layoutDocumentSchema.safeParse(build({ assetId: 'a', alt: '', decorative: true })).success, true);
});
test('block executable, protocol-relative and encoded navigation targets', () => {
  for (const path of ['javascript:alert(1)', '//evil.test', '/\\evil.test', '/%2f%2fevil', '/a\nb', 'https://evil.test']) {
    assert.equal(internalPathSchema.safeParse(path).success, false, path);
  }
  assert.equal(internalPathSchema.safeParse('/category/phu-kien').success, true);
});
test('write requests require concurrency metadata', () => {
  assert.equal(saveLayoutDraftSchema.safeParse({ document }).success, false);
  assert.equal(saveLayoutDraftSchema.safeParse({ expectedRevision: -1, document }).success, false);
  assert.equal(saveLayoutDraftSchema.safeParse({ expectedRevision: 0, document }).success, true);
  assert.equal(publishLayoutSchema.safeParse({ expectedRevision: 1 }).success, false);
  assert.equal(publishLayoutSchema.safeParse({ expectedRevision: 1, draftRevisionId: 'r1' }).success, true);
});
test('menu has bounded depth and unique item identities', () => {
  const item = { id: 'accessories', label: 'Phụ kiện', target: { kind: 'category', categoryId: 'cat-accessories' } };
  const menu = { schemaVersion: 1, location: 'header', items: [{ ...item, children: [] }] };
  assert.equal(menuDocumentSchema.safeParse(menu).success, true);
  assert.equal(menuDocumentSchema.safeParse({ ...menu, items: [{ ...item, children: [item] }] }).success, false);
  assert.equal(menuDocumentSchema.safeParse({ ...menu, items: [{ ...item, children: [{ ...item, id: 'child', children: [] }] }] }).success, false);
});
test('bound payload growth and reject duplicate product/category references', () => {
  assert.equal(layoutDocumentSchema.safeParse({ ...document, blocks: Array.from({ length: 31 }, (_, i) => ({ ...hero, id: String(i) })) }).success, false);
  assert.equal(layoutDocumentSchema.safeParse({ ...document, blocks: [{ ...category, items: [{ categoryId: 'a' }, { categoryId: 'a' }] }] }).success, false);
  assert.equal(layoutDocumentSchema.safeParse({ ...document, blocks: [{ id: 'p', type: 'product-grid', enabled: true, title: 'P', source: { kind: 'manual', productIds: ['a', 'a'] } }] }).success, false);
});
