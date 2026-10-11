import { z } from 'zod';

const text = z.string().trim().max(200);
const money = z.number().int().min(0).max(2_000_000_000);
export const attributeTemplates = {
  LAPTOP: ['CPU', 'GPU', 'RAM', 'SSD', 'Màn hình'],
  MOUSE: ['Kết nối', 'DPI', 'Cảm biến', 'Trọng lượng'],
  ACCESSORY: ['Kết nối', 'Tương thích', 'Kích thước', 'Chất liệu'],
  TECH: ['Tính năng', 'Kết nối', 'Pin', 'Tương thích'],
} as const;
export const availabilityLabels = { AVAILABLE: 'Sẵn hàng', PREORDER: 'Đặt trước', CONTACT: 'Liên hệ', UNAVAILABLE: 'Tạm ngừng nhận đơn' } as const;
export const productDocumentSchema = z.object({
  schemaVersion: z.literal(1), name: text.min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
  categoryId: text.min(1), brand: text, template: z.enum(['LAPTOP', 'MOUSE', 'ACCESSORY', 'TECH']),
  description: z.string().max(2000), contentHtml: z.string().max(100000),
  price: money, originalPrice: money.nullable(), availability: z.enum(['AVAILABLE', 'PREORDER', 'CONTACT', 'UNAVAILABLE']),
  seoTitle: text, seoDescription: z.string().max(300),
  specs: z.array(z.object({ key: text.min(1), value: text })).max(60),
  media: z.array(z.object({ assetId: text.min(1), alt: z.string().max(300), variantId: text })).max(30),
  variants: z.array(z.object({ id: text.min(1), name: text.min(1), sku: text.min(1), condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED']), price: money, ram: text, storage: text, gpu: text })).max(40),
  warranties: z.array(z.object({ name: text.min(1), description: z.string().max(500), adjustment: z.number().int().min(-2_000_000_000).max(2_000_000_000), recommended: z.boolean() })).max(10),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (d.originalPrice !== null && d.originalPrice < d.price) issue('Giá gốc phải lớn hơn hoặc bằng giá bán.');
  for (const values of [d.variants.map(v => v.id), d.variants.map(v => v.sku), d.media.map(m => m.assetId), d.specs.map(s => s.key)]) if (new Set(values).size !== values.length) issue('Không được trùng mã, ảnh hoặc tên thông số.');
  if (d.media.some(m => m.variantId && !d.variants.some(v => v.id === m.variantId))) issue('Ảnh tham chiếu biến thể không tồn tại.');
  if (d.warranties.filter(w => w.recommended).length > 1) issue('Chỉ chọn một gói bảo hành khuyên dùng.');
  if (d.warranties.some(w => Math.min(d.price, ...d.variants.map(v => v.price)) + w.adjustment < 0)) issue('Giá sau bảo hành không được âm.');
});
export type ProductDocument = z.infer<typeof productDocumentSchema>;
export const studioWriteSchema = z.object({ expectedRevision: z.number().int().nonnegative(), action: z.enum(['save', 'publish', 'unpublish']), document: productDocumentSchema });
export function blankProduct(): ProductDocument {
  return { schemaVersion: 1, name: '', slug: '', categoryId: '', brand: '', template: 'LAPTOP', description: '', contentHtml: '', price: 0, originalPrice: null, availability: 'CONTACT', seoTitle: '', seoDescription: '', specs: attributeTemplates.LAPTOP.map(key => ({ key, value: '' })), media: [], variants: [], warranties: [] };
}
