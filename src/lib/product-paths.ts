export function productHref(product: { slug?: string; id?: string; template?: string; kind?: string; href?: string }): string {
  if (product.href) return product.href;
  const accessory = product.template ? product.template !== 'LAPTOP' : product.kind === 'ACCESSORY';
  return `/${accessory ? 'phu-kien' : 'laptop'}/${encodeURIComponent(product.slug || product.id || '')}`;
}

export function productVariantHref(product: {
  slug?: string;
  id?: string;
  template?: string;
  kind?: string;
  href?: string;
  sku?: string;
  variantId?: string;
}): string {
  const rawHref = productHref(product);
  const queryStart = rawHref.indexOf('?');
  const cleanedHref =
    queryStart >= 0
      ? rawHref.slice(0, queryStart + 1) + rawHref.slice(queryStart + 1).replace(/\?/g, '&')
      : rawHref;
  try {
    const url = new URL(cleanedHref, 'https://citilap.local');
    if (product.sku) {
      url.searchParams.set('sku', product.sku);
      url.searchParams.delete('variant');
    } else if (product.variantId && !url.searchParams.has('sku')) {
      url.searchParams.set('variant', product.variantId);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawHref;
  }
}
