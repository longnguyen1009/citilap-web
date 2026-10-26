export type CategoryNode = { id: string; slug: string; parentId: string | null };

export const RESERVED_CATEGORY_ROOTS = new Set([
  'admin', 'api', 'auth', 'login', 'logout', 'preview', '_next', 'san-pham',
  'product', 'laptop', 'category', 'phan-loai', 'brand', 'collection', 'landing', 'news',
  'search', 'cart', 'checkout', 'contact', 'wishlist', 'profile', 'order-tracking',
  'hot-sale', 'chon-laptop', 'lien-he', 'gioi-thieu', 'he-thong-cua-hang',
  'chinh-sach', 'chinh-sach-bao-hanh', 'chinh-sach-doi-tra', 'chinh-sach-van-chuyen',
  'chinh-sach-bao-mat', 'huong-dan-mua-hang', 'dieu-khoan-mua-hang', 'cau-hoi-thuong-gap',
]);

export function categoryAncestors<T extends CategoryNode>(node: T, categories: readonly T[]): T[] {
  const byId = new Map(categories.map(c => [c.id, c]));
  const chain: T[] = [], seen = new Set<string>();
  let current: T | undefined = node;
  while (current) {
    if (seen.has(current.id)) throw new Error('Category cycle');
    seen.add(current.id);
    chain.unshift(current);
    if (!current.parentId) break;
    current = byId.get(current.parentId);
    if (!current) throw new Error('Missing category parent');
  }
  return chain;
}

export function categoryHref(node: CategoryNode, categories: readonly CategoryNode[]): string {
  return '/' + categoryAncestors(node, categories).map(c => c.slug).join('/');
}

export function canonicalCategoryPath(path: string, categories: readonly (CategoryNode & { href: string })[]): string | undefined {
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/category' || path === '/phan-loai') return '/phan-loai';
  const current = categories.find(c => c.href === path);
  if (current) return current.href;
  const legacy = categories.find(c => c.href === path.replace(/^\/(?:category|phan-loai)\//, '/'));
  if (legacy) return legacy.href;
  const slug = /^\/category\/([^/]+)$/.exec(path)?.[1];
  return slug ? categories.find(c => c.slug === slug)?.href : undefined;
}

export function categoryDescendantIds(node: CategoryNode, categories: readonly CategoryNode[]): string[] {
  const ids = new Set([node.id]);
  for (let size = -1; size !== ids.size;) {
    size = ids.size;
    for (const c of categories) if (c.parentId && ids.has(c.parentId)) ids.add(c.id);
  }
  return [...ids];
}
