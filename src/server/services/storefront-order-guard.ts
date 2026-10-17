/**
 * Published Product Studio controls whether an item can enter checkout.
 * Draft edits never change ordering until they are published.
 * CMS-owned products that are unpublished or in draft state can NEVER enter checkout.
 */
export type StudioOrderContext =
  | string
  | null
  | undefined
  | { hasStudio: boolean; published?: string | null | undefined };

export function assertPublishedStudioOrderable(
  context: StudioOrderContext,
  variantId: string | null,
): void {
  let hasStudio = false;
  let publishedJson: string | null | undefined = null;

  if (typeof context === 'object' && context !== null) {
    hasStudio = context.hasStudio;
    publishedJson = context.published;
  } else {
    publishedJson = context;
  }

  // If item is managed by CMS ProductStudio, it MUST have a published snapshot to be orderable.
  // Drafts or unpublished items can never enter checkout.
  if (hasStudio && !publishedJson) {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

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
  const selected = variants.find(v=>v !== null && typeof v==='object' && (v as Record<string,unknown>).id===variantId) as Record<string,unknown> | undefined;
  if (selected?.availability !== undefined && selected.availability !== 'AVAILABLE' && selected.availability !== 'PREORDER') throw new Error('VARIANT_UNAVAILABLE');
}
