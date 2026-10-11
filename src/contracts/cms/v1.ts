import { z } from 'zod';

// Transport-only contract: no database, React, secrets or storage URLs.
const id = z.string().trim().min(1).max(128);
const label = z.string().trim().min(1).max(160);
const uniqueIds = (values: string[]) => new Set(values).size === values.length;
export const internalPathSchema = z.string().max(512).refine(
  (value) => /^\/(?!\/)/.test(value) && !/[\\\s\u0000-\u001f%]/.test(value),
  'Use a root-relative path without encoded characters, spaces or backslashes',
);
export const linkTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('category'), categoryId: id }),
  z.strictObject({ kind: z.literal('product'), productId: id }),
  z.strictObject({ kind: z.literal('page'), pageId: id }),
  z.strictObject({ kind: z.literal('path'), path: internalPathSchema }),
]);
export const imageRefSchema = z.strictObject({
  assetId: id,
  alt: z.string().trim().max(300),
  decorative: z.boolean().default(false),
}).refine((image) => image.decorative || image.alt.length > 0, {
  message: 'Meaningful images require alt text', path: ['alt'],
});
export const productSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('manual'),
    productIds: z.array(id).min(1).max(24).refine(uniqueIds, 'Duplicate products'),
  }),
  z.strictObject({
    kind: z.literal('category'), categoryId: id,
    limit: z.number().int().min(1).max(24),
    sort: z.enum(['newest', 'price-asc', 'price-desc']),
  }),
]);
const baseBlock = {
  id,
  enabled: z.boolean(),
};
export const blockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...baseBlock, type: z.literal('hero'),
    title: label, description: z.string().max(500),
    desktopImage: imageRefSchema, mobileImage: imageRefSchema.optional(),
    action: z.strictObject({ label, target: linkTargetSchema }).optional(),
  }),
  z.strictObject({
    ...baseBlock, type: z.literal('category-grid'), title: label,
    items: z.array(z.strictObject({ categoryId: id, image: imageRefSchema.optional() }))
      .min(1).max(24).refine((items) => uniqueIds(items.map((item) => item.categoryId)), 'Duplicate categories'),
  }),
  z.strictObject({
    ...baseBlock, type: z.literal('product-grid'), title: label,
    source: productSourceSchema,
  }),
]);
export const layoutDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  blocks: z.array(blockSchema).max(30)
    .refine((blocks) => uniqueIds(blocks.map((block) => block.id)), 'Duplicate block IDs'),
});
export const saveLayoutDraftSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  document: layoutDocumentSchema,
});
export const publishLayoutSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  draftRevisionId: id,
});
const menuItem = z.strictObject({ id, label, target: linkTargetSchema });
export const menuDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  location: z.enum(['header', 'footer', 'mobile']),
  items: z.array(menuItem.extend({ children: z.array(menuItem).max(16) })).max(16),
}).refine((menu) => uniqueIds(menu.items.flatMap((item) => [item.id, ...item.children.map((child) => child.id)])), 'Duplicate menu IDs');

export type LayoutDocument = z.infer<typeof layoutDocumentSchema>;
export type LayoutBlock = z.infer<typeof blockSchema>;
export type MenuDocument = z.infer<typeof menuDocumentSchema>;
export type LinkTarget = z.infer<typeof linkTargetSchema>;
