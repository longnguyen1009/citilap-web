import { z } from 'zod';
import { internalPathSchema } from './v1';
import { productRuleCriteriaSchema } from './site-builder';

const id = z.string().trim().min(1).max(128);
const name = z.string().trim().min(1).max(120);
const slug = z.string().max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const imageUrl = z.string().max(500).refine(v => !v || /^https:\/\/[^\s\\]+$/.test(v) || internalPathSchema.safeParse(v).success, 'Ảnh cần URL HTTPS hoặc đường dẫn nội bộ.');

const category = z.object({
  id,
  name,
  slug,
  description: z.string().max(500),
  parentId: id.nullable(),
  visible: z.boolean(),
  image: imageUrl,
  assetId: z.string().max(128),
  alt: z.string().max(300),
});

// Collection extends to support both manual product selection and criteria rules
export const collectionSchema = z.object({
  id,
  name,
  slug,
  description: z.string().max(500),
  visible: z.boolean(),
  mode: z.enum(['manual', 'rule']).default('manual'),
  productIds: z.array(id).max(48).default([]),
  rule: productRuleCriteriaSchema.optional(),
  image: imageUrl.optional().default(''),
  seo: z.object({
    title: z.string().max(200).default(''),
    description: z.string().max(500).default(''),
  }).optional(),
});

export const navigationTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('category'), id }),
  z.object({ kind: z.literal('collection'), id }),
  z.object({ kind: z.literal('product'), id }),
  z.object({ kind: z.literal('path'), path: internalPathSchema }),
  z.object({ kind: z.literal('brand'), id }),
  z.object({ kind: z.literal('landing'), id }),
  z.object({ kind: z.literal('page'), id }),
  z.object({ kind: z.literal('external'), url: z.string().url().refine(u => u.startsWith('https://'), 'Chỉ chấp nhận URL HTTPS an toàn.') }),
]);

const item = z.object({ id, label: name, target: navigationTargetSchema });

export const navigationDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  categories: z.array(category).max(200),
  collections: z.array(collectionSchema).max(40),
  menus: z.object({
    main: z.array(item.extend({ children: z.array(item).max(16) })).max(20),
    footer: z.array(item.extend({ children: z.array(item).max(16) })).max(20),
  }),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const unique = (values: string[]) => new Set(values).size === values.length;

  for (const list of [d.categories, d.collections]) {
    for (const key of ['id', 'slug'] as const) {
      if (!unique(list.map(c => c[key]))) issue('ID hoặc slug bị trùng.');
    }
  }

  if (!unique(d.categories.map(c => c.name))) issue('Tên danh mục bị trùng.');

  const categories = new Map(d.categories.map(c => [c.id, c]));
  for (const c of d.categories) {
    const seen = new Set([c.id]);
    let parent = c.parentId;
    while (parent) {
      if (seen.has(parent) || !categories.has(parent)) {
        issue('Danh mục cha không hợp lệ hoặc tạo vòng lặp.');
        break;
      }
      seen.add(parent);
      parent = categories.get(parent)!.parentId;
    }
    if (c.visible && c.parentId && !categories.get(c.parentId)?.visible) {
      issue('Ẩn danh mục con trước khi ẩn danh mục cha.');
    }
  }

  for (const c of d.collections) {
    if (!unique(c.productIds)) issue('Sản phẩm trong bộ sưu tập bị trùng.');
  }

  for (const items of Object.values(d.menus)) {
    const flat = items.flatMap(i => [i, ...i.children]);
    if (!unique(flat.map(i => i.id))) issue('ID mục menu bị trùng.');
    for (const { target: t } of flat) {
      if (t.kind === 'category' && !categories.has(t.id)) issue('Menu tham chiếu danh mục không tồn tại.');
      if (t.kind === 'collection' && !d.collections.some(c => c.id === t.id)) issue('Menu tham chiếu bộ sưu tập không tồn tại.');
    }
  }
});

export const navigationWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['save', 'publish']),
  document: navigationDocumentSchema,
});

export type NavigationDocument = z.infer<typeof navigationDocumentSchema>;
export type NavigationTarget = z.infer<typeof navigationTargetSchema>;
export type NavigationItem = NavigationDocument['menus']['main'][number];
export type NavigationDetail = {
  revision: number;
  publishedRevision: number | null;
  document: NavigationDocument;
  productNames: Record<string, string>;
  categoryIds: string[];
};

export type ResolvedNavigation = {
  schemaVersion: 1;
  revision: number;
  categories: {
    id: string;
    name: string;
    slug: string;
    description: string;
    parentId: string | null;
    image: string | null;
    alt: string;
    href: string;
  }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image?: string;
    href: string;
    mode?: 'manual' | 'rule';
  }[];
  menus: Record<'main' | 'footer', {
    id: string;
    label: string;
    href: string;
    children: { id: string; label: string; href: string }[];
  }[]>;
};
