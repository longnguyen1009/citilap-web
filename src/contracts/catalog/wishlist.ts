export const MAX_WISHLIST_PRODUCTS = 100;

export function wishlistIds(value: unknown): string[] {
  const items = Array.isArray(value) ? value :
    value && typeof value === 'object' && 'version' in value && value.version === 1 && 'ids' in value ? value.ids : [];
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map(item => typeof item === 'string' ? item : item?.productId)
    .filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id)))].slice(0, MAX_WISHLIST_PRODUCTS);
}
