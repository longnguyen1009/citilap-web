import { z } from 'zod';

const text = (maxLen: number) => z.string().trim().max(maxLen);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(220);

// Routes reserved by other R05/R04 features or Next.js app segments. A post/page slug
// must never collide with these at the storefront root.
export const RESERVED_SLUGS = [
  'news', 'product', 'category', 'brand', 'collection', 'search', 'cart', 'checkout',
  'contact', 'lien-he', 'wishlist', 'profile', 'order-tracking', 'hot-sale', 'admin',
  'api', 'login',
] as const;

const notReserved = (val: string) => !(RESERVED_SLUGS as readonly string[]).includes(val);

export const postSlugSchema = slugSchema.refine(notReserved, {
  message: 'Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.',
});

export const seoSchema = z.object({
  title: text(70),
  description: text(300),
  ogImageAssetId: z.string().trim().max(128).nullable().default(null),
});

export const postDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: text(200).min(1, 'Tiêu đề không được để trống'),
  slug: postSlugSchema,
  excerpt: text(500),
  contentHtml: z.string().max(200_000),
  categoryId: z.string().trim().max(128).nullable().default(null),
  authorName: text(100),
  coverImage: z.object({
    assetId: z.string().trim().max(128),
    alt: text(300),
  }).nullable().default(null),
  isFeatured: z.boolean().default(false),
  seo: seoSchema,
  relatedProductIds: z.array(z.string().trim().min(1)).max(10).default([]),
}).superRefine((d, ctx) => {
  if (d.coverImage && !d.coverImage.alt.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Ảnh đại diện cần có mô tả ALT.', path: ['coverImage', 'alt'] });
  }
  if (new Set(d.relatedProductIds).size !== d.relatedProductIds.length) {
    ctx.addIssue({ code: 'custom', message: 'Danh sách sản phẩm liên quan không được chứa mã trùng lặp.', path: ['relatedProductIds'] });
  }
});

export type PostDocument = z.infer<typeof postDocumentSchema>;

export const postStudioWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['save', 'publish', 'unpublish', 'restore']),
  document: postDocumentSchema,
});

export function blankPost(): PostDocument {
  return {
    schemaVersion: 1,
    title: '',
    slug: '',
    excerpt: '',
    contentHtml: '',
    categoryId: null,
    authorName: '',
    coverImage: null,
    isFeatured: false,
    seo: { title: '', description: '', ogImageAssetId: null },
    relatedProductIds: [],
  };
}

export const postCategoryDocumentSchema = z.object({
  name: text(120).min(1, 'Tên chuyên mục không được để trống'),
  slug: slugSchema.refine(notReserved, {
    message: 'Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.',
  }),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type PostCategoryDocument = z.infer<typeof postCategoryDocumentSchema>;

export const postCategoryWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  document: postCategoryDocumentSchema,
});

// Public DTO: never leaks draft content, internal actor names, or unpublished state.
export const publicPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  contentHtml: z.string(),
  authorName: z.string(),
  isFeatured: z.boolean(),
  category: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
  coverImage: z.object({ url: z.string(), alt: z.string() }).nullable(),
  seo: z.object({ title: z.string(), description: z.string(), ogImageUrl: z.string().nullable() }),
  relatedProductIds: z.array(z.string()),
  publishedAt: z.string(),
  updatedAt: z.string(),
});

export type PublicPost = z.infer<typeof publicPostSchema>;
