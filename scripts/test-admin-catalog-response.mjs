import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/app/admin/products/page.tsx', 'utf8');
const start = source.indexOf('const fetchCatalog = useCallback(async () => {');
const end = source.indexOf('}, [q, kind,', start);
assert(start >= 0 && end > start);
const body = source.slice(start + 'const fetchCatalog = useCallback(async () => {'.length, end);
const compiled = ts.transpile(`async function run(context) {
  const {fetch, setData, setError, setLoading} = context;
  const requestId = {current: 0}, router = {replace() {}}, pathname = '/admin/products';
  const window = {location: {origin: 'http://localhost:3001'}};
  const q = '', kind = 'ALL', categoryId = '', brand = '', publicationStatus = 'ALL', availability = 'ALL', sort = 'updatedAt', order = 'desc', page = 1, limit = 20;
  ${body}
}`, { target: ts.ScriptTarget.ES2022 });
const run = new Function(compiled + '; return run;')();
const catalog = { items: [{ id: 'sample', name: 'Sample laptop' }], total: 1, page: 1, limit: 20, totalPages: 1, categories: [], brands: [] };
async function check(payload, status = 200) {
  const state = { data: null, error: null, loading: null };
  await run({ fetch: async () => Response.json(payload, { status }), setData: data => { state.data = data; }, setError: error => { state.error = error; }, setLoading: loading => { state.loading = loading; } });
  assert.equal(state.loading, false);
  return state;
}
assert.deepEqual((await check({ success: true, data: catalog })).data, catalog);
assert.deepEqual((await check({ success: true, data: { ...catalog, items: [], total: 0 } })).data.items, []);
for (const payload of [null, {}, catalog, { success: false }, { success: true, data: {} }, { success: true, data: { ...catalog, items: undefined } }, { success: true, data: { ...catalog, categories: null } }, { success: true, data: { ...catalog, total: '1' } }]) {
  const state = await check(payload);
  assert.equal(state.data, null);
  assert(state.error);
}
assert.equal((await check({ success: false, error: 'Unauthorized' }, 401)).error, 'Unauthorized');
console.log('PASS catalog fetch: API envelope, populated/empty lists, malformed payloads, HTTP failure');

// Verify Order Detail reason dialog contract in src/app/admin/orders/[id]/page.tsx
const orderDetailSource = readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
assert(orderDetailSource.includes('<dialog'), 'Order detail reason modal must use native <dialog>');
assert(orderDetailSource.includes('dialog.showModal()'), 'Order detail reason modal must open with dialog.showModal()');
assert(orderDetailSource.includes('reasonInputRef.current?.focus()'), 'Order detail reason modal must auto-focus #reason-modal-input on open');
assert(orderDetailSource.includes('opener?.focus()'), 'Order detail reason modal must restore focus to opener on close');
assert(orderDetailSource.includes('htmlFor="reason-modal-input"'), 'Order detail reason textarea must have an associated <label htmlFor="reason-modal-input">');
assert(orderDetailSource.includes('id="btn-cancel-reason-modal"'), 'Order detail reason modal must have #btn-cancel-reason-modal');
assert(orderDetailSource.includes('id="btn-confirm-reason-submit"'), 'Order detail reason modal must have #btn-confirm-reason-submit');
console.log('PASS order detail reason dialog contract: native <dialog>, showModal(), auto-focus, focus restore, accessible label');
