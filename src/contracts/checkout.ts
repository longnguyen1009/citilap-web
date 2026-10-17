import { z } from 'zod';

const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = z.string().trim().min(1).max(200);
export const checkoutSelectionSchema = z.object({
  items: z.array(z.object({
    productId: id,
    variantId: id.nullish(),
    sku: z.string().max(200).nullish(),
    quantity: z.number().int().min(1).max(5),
    expectedPrice: money.nullish(),
  })).min(1).max(10).refine(items => new Set(items.map(i => `${i.productId}:${i.variantId || ''}`)).size === items.length, 'Duplicate target'),
  shippingMethod: z.enum(['standard', 'pickup']),
  showroomId: id.nullish(),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER']).optional(),
});
export const checkoutAcknowledgmentSchema = z.object({
  shippingFee: money,
  totalAmount: money,
  termsVersion: z.string().regex(/^[a-f0-9]{64}$/),
});
export type CheckoutSelection = z.infer<typeof checkoutSelectionSchema>;
export type CheckoutAcknowledgment = z.infer<typeof checkoutAcknowledgmentSchema>;
export interface CheckoutSnapshot {
  settingsRevision: number;
  bankAccountInfo: string | null;
  showroom: { id: string; name: string; address: string; phone: string } | null;
}
export interface CheckoutQuote {
  evaluatedAt: string;
  lines: Array<{ productId: string; variantId: string | null; productName: string; quantity: number; price: number; lineTotal: number }>;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingMethod: 'standard' | 'pickup';
  paymentMethod: 'COD' | 'BANK_TRANSFER' | null;
  allowedPaymentMethods: Array<'COD' | 'BANK_TRANSFER'>;
  showrooms: NonNullable<CheckoutSnapshot['showroom']>[];
  snapshot: CheckoutSnapshot;
  termsVersion: string;
}
