import { z } from 'zod';
import { seoSchema, RESERVED_SLUGS } from './post';

const text = (maxLen: number) => z.string().trim().max(maxLen);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(220);
const notReserved = (val: string) => !(RESERVED_SLUGS as readonly string[]).includes(val);

// System page types let the public resolver map a known slot (e.g. PDP warranty policy
// lookup) even if the operator later edits the slug. 'CUSTOM' pages have no fixed mapping.
export const PAGE_TYPES = [
  'WARRANTY', 'RETURNS', 'SHIPPING', 'ABOUT', 'STORES', 'CUSTOM',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const pageSlugSchema = slugSchema.refine(notReserved, {
  message: 'Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.',
});

export const pageDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: text(200).min(1, 'Tiêu đề không được để trống'),
  slug: pageSlugSchema,
  pageType: z.enum(PAGE_TYPES).default('CUSTOM'),
  contentHtml: z.string().max(200_000),
  seo: seoSchema,
});

export type PageDocument = z.infer<typeof pageDocumentSchema>;

export const pageStudioWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['save', 'publish', 'unpublish', 'restore']),
  document: pageDocumentSchema,
});

export function blankPage(): PageDocument {
  return {
    schemaVersion: 1,
    title: '',
    slug: '',
    pageType: 'CUSTOM',
    contentHtml: '',
    seo: { title: '', description: '', ogImageAssetId: null },
  };
}

// Public DTO: never leaks draft content or unpublished state.
export const publicPageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  pageType: z.enum(PAGE_TYPES),
  contentHtml: z.string(),
  seo: z.object({ title: z.string(), description: z.string(), ogImageUrl: z.string().nullable() }),
  publishedAt: z.string(),
  updatedAt: z.string(),
});

export type PublicPage = z.infer<typeof publicPageSchema>;
