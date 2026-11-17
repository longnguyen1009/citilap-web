import assert from 'node:assert/strict';
import { variantSpecs } from '../src/lib/variant-presentation.ts';
import { productVariantSchema } from '../src/contracts/cms/product-studio.ts';

const base = [{ key: 'CPU', value: 'Ultra 5' }, { key: 'Pin', value: '60Wh' }];
const variant = productVariantSchema.parse(JSON.parse(JSON.stringify({
  id: 'v1', sku: 'SKU-1', name: 'Ultra 7', price: 100,
  options: { productName: 'Laptop Ultra 7', 'spec:cpu': 'Ultra 7', 'spec:Pin': '', 'spec:Cổng kết nối': 'USB4', color: 'Đen' },
})));
assert.equal(variant.options.productName, 'Laptop Ultra 7');
assert.deepEqual(variantSpecs(base, variant.options), [
  { key: 'CPU', value: 'Ultra 7' }, { key: 'Pin', value: '60Wh' }, { key: 'Cổng kết nối', value: 'USB4' },
]);
assert.deepEqual(variantSpecs(base), base);
assert.equal(base[0].value, 'Ultra 5');
assert.deepEqual(variantSpecs(base, { 'spec:CPU': 'Ultra 5' }), base);
console.log('Variant names, spec overrides, fallback, and document round-trip: OK');
