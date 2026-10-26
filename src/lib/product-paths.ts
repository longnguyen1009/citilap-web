export function productHref(product: { slug?: string; id?: string; template?: string; kind?: string; href?: string }): string {
  if (product.href) return product.href;
  const accessory = product.template ? product.template !== 'LAPTOP' : product.kind === 'ACCESSORY';
  return `/${accessory ? 'phu-kien' : 'laptop'}/${encodeURIComponent(product.slug || product.id || '')}`;
}
