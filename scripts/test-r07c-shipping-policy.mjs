import assert from 'node:assert/strict';
import test from 'node:test';
import { computeShippingFee, ShippingPolicyError } from '../src/server/services/checkout-shipping-policy.ts';

const base = { shippingMethod: 'standard', subtotal: 4_999_999, shippingFee: 30_000, freeShippingThreshold: 5_000_000 };

test('Delivery uses effective subtotal and the inclusive free-shipping boundary', () => {
  assert.equal(computeShippingFee(base), 30_000);
  assert.equal(computeShippingFee({ ...base, subtotal: 5_000_000 }), 0);
  assert.equal(computeShippingFee({ ...base, subtotal: 5_000_001 }), 0);
  // A regular subtotal above the threshold does not grant free ship if sale subtotal is below it.
  assert.equal(computeShippingFee({ ...base, subtotal: 4_000_000 }), 30_000);
});

test('Threshold zero disables threshold-based free shipping; configured zero fee remains valid', () => {
  assert.equal(computeShippingFee({ ...base, subtotal: 0, freeShippingThreshold: 0 }), 30_000);
  assert.equal(computeShippingFee({ ...base, subtotal: 50_000_000, freeShippingThreshold: 0 }), 30_000);
  assert.equal(computeShippingFee({ ...base, shippingFee: 0, freeShippingThreshold: 0 }), 0);
});

test('Pickup costs zero independently of the threshold', () => {
  assert.equal(computeShippingFee({ ...base, shippingMethod: 'pickup', freeShippingThreshold: 0 }), 0);
  assert.equal(computeShippingFee({ ...base, shippingMethod: 'pickup', subtotal: 5_000_000 }), 0);
});

test('Invalid money and shipping method fail closed, including pickup configurations', () => {
  for (const field of ['subtotal', 'shippingFee', 'freeShippingThreshold']) {
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '30000', null, undefined]) {
      assert.throws(() => computeShippingFee({ ...base, [field]: value }), err =>
        err instanceof ShippingPolicyError && err.field === field);
    }
  }
  assert.throws(() => computeShippingFee({ ...base, shippingMethod: 'express' }), ShippingPolicyError);
  assert.throws(() => computeShippingFee({ ...base, shippingMethod: 'pickup', shippingFee: NaN }), ShippingPolicyError);
});

test('Payable totals cannot overflow safe integer VND; inputs remain unchanged', () => {
  assert.throws(() => computeShippingFee({ ...base, subtotal: Number.MAX_SAFE_INTEGER, freeShippingThreshold: 0 }), ShippingPolicyError);
  const frozen = Object.freeze({ ...base });
  assert.equal(computeShippingFee(frozen), 30_000);
  assert.deepEqual(frozen, base);
});
