import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.wrangler/competitor-research/official-store-result.json')) {
  await import('./test-official-store.mjs');
  process.exit(0);
}

const base = 'http://localhost:3001';
const seed = JSON.parse(readFileSync('.wrangler/competitor-research/complete-demo-result.json', 'utf8'));
for (const path of ['/', '/news', '/category/laptop-gaming', '/collection/goi-y-office', '/product/ref-tgs-31242', '/lien-he']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  if (path === '/') {
    const html = await response.text();
    assert(html.includes('Cẩm nang chọn và sử dụng laptop'));
    assert(html.includes('Cùng chọn chiếc laptop phù hợp'));
    assert(!html.includes('dQw4w9WgXcQ'), 'No placeholder review videos');
  }
  console.log('PASS route', path);
}
const advisor = await fetch(base + '/chon-laptop?budget=20000000&need=office').then(r => r.text());
assert(advisor.includes('Vì sao có trong gợi ý?'), 'Advisor must handle catalog over 500 products');
const selection = { items: [{ productId: seed.example, variantId: seed.variantId, quantity: 1, expectedPrice: seed.price }], shippingMethod: 'standard', paymentMethod: 'COD' };
async function post(path, body, headers = {}) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const result = await response.json();
  assert(response.ok && result.success, JSON.stringify(result));
  return result;
}
const { data: quote } = await post('/api/checkout/quote', selection);
assert.equal(quote.subtotal, seed.price);
assert.deepEqual(quote.allowedPaymentMethods, ['COD']);
assert.equal(quote.showrooms.length, 1);
assert(quote.showrooms[0].address.includes('Tạ Quang Bửu'));
console.log('PASS advisor, quote, COD, Hanoi pickup');
// Explicit opt-in creates one local demo order. Replays use the same idempotency key.
if (process.argv.includes('--create-order')) {
  const body = { ...selection, customerName: 'Khách trải nghiệm DEMO LOCAL', customerPhone: '0900000000', customerEmail: 'demo@example.invalid', shippingAddress: 'Địa chỉ mô phỏng - không giao hàng', note: 'DEMO LOCAL: không liên hệ, không giao hàng, không thu tiền.', checkoutAcknowledgment: { shippingFee: quote.shippingFee, totalAmount: quote.totalAmount, termsVersion: quote.termsVersion } };
  const order = await post('/api/orders', body, { 'Idempotency-Key': 'complete-local-demo-order-1' });
  console.log('PASS local demo order', order.orderNumber);
}
