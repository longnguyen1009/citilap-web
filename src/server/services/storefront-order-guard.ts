/**
 * Published Product Studio controls whether an item can enter checkout.
 * Draft edits never change ordering until they are published.
 */
export function assertPublishedStudioOrderable(
  publishedJson: string | null | undefined,
  variantId: string | null,
): void {
  if (!publishedJson) return;

  let document: unknown;
  try {
    document = JSON.parse(publishedJson);
  } catch {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  if (!document || typeof document !== 'object') {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  const published = document as Record<string, unknown>;
  if (published.availability !== 'AVAILABLE' && published.availability !== 'PREORDER') {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  if (!Array.isArray(published.variants)) {
    throw new Error('VARIANT_UNAVAILABLE');
  }

  const variants = published.variants as unknown[];
  if (variants.length > 0 && !variants.some(v =>
    v !== null && typeof v === 'object' && (v as Record<string, unknown>).id === variantId
  )) {
    throw new Error('VARIANT_UNAVAILABLE');
  }
  if (variants.length === 0 && variantId) {
    throw new Error('VARIANT_UNAVAILABLE');
  }
}
