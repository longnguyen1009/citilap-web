/** Pure R07C preparation. Runtime integration waits for R07B.3 review. */
export interface ShippingFeeInput {
  shippingMethod: 'standard' | 'pickup';
  /** Effective line subtotal after campaign pricing, in integer VND. */
  subtotal: number;
  shippingFee: number;
  /** Zero disables threshold-based free shipping. */
  freeShippingThreshold: number;
}

export class ShippingPolicyError extends Error {
  readonly code = 'INVALID_SHIPPING_POLICY';
  readonly field: keyof ShippingFeeInput;

  constructor(field: keyof ShippingFeeInput) {
    super(`Invalid shipping policy field: ${field}`);
    this.name = 'ShippingPolicyError';
    this.field = field;
  }
}

function assertVnd(value: number, field: keyof ShippingFeeInput): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ShippingPolicyError(field);
  }
}

export function computeShippingFee(input: ShippingFeeInput): number {
  if (input.shippingMethod !== 'standard' && input.shippingMethod !== 'pickup') {
    throw new ShippingPolicyError('shippingMethod');
  }
  assertVnd(input.subtotal, 'subtotal');
  assertVnd(input.shippingFee, 'shippingFee');
  assertVnd(input.freeShippingThreshold, 'freeShippingThreshold');

  if (input.shippingMethod === 'pickup') return 0;
  if (input.freeShippingThreshold > 0 && input.subtotal >= input.freeShippingThreshold) return 0;
  if (!Number.isSafeInteger(input.subtotal + input.shippingFee)) {
    throw new ShippingPolicyError('subtotal');
  }
  return input.shippingFee;
}
