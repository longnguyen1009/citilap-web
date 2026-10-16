import { z } from "zod";

export const campaignStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Mã sản phẩm không được để trống"),
  variantId: z.string().nullable().optional(),
  salePrice: z.number().int().positive("Giá sale phải là số nguyên dương"),
  regularPrice: z.number().int().positive("Giá bán thường phải là số nguyên dương").nullable().optional(),
});
export type CampaignItem = z.infer<typeof campaignItemSchema>;

export const campaignDocumentSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Tên chiến dịch không được để trống").max(120),
    description: z.string().max(500).nullable().optional(),
    status: campaignStatusSchema.default("DRAFT"),
    revision: z.number().int().nonnegative().optional().default(0),
    startAt: z.string().min(1, "Thời điểm bắt đầu không được để trống"), // ISO 8601 UTC
    endAt: z.string().min(1, "Thời điểm kết thúc không được để trống"), // ISO 8601 UTC
    items: z.array(campaignItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startAt).getTime();
    const end = new Date(data.endAt).getTime();
    if (Number.isNaN(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời điểm bắt đầu không hợp lệ (cần định dạng ISO 8601 UTC).",
        path: ["startAt"],
      });
    }
    if (Number.isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời điểm kết thúc không hợp lệ (cần định dạng ISO 8601 UTC).",
        path: ["endAt"],
      });
    }
    if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời điểm bắt đầu chiến dịch phải trước thời điểm kết thúc.",
        path: ["startAt"],
      });
    }

    const seenTargets = new Set<string>();
    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      const key = `${it.productId}:${it.variantId || ''}`;
      if (seenTargets.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Mục khuyến mại trùng lặp: Sản phẩm ${it.productId}${it.variantId ? ` (Biến thể: ${it.variantId})` : ''} đã có trong danh sách.`,
          path: ["items", i],
        });
      }
      seenTargets.add(key);

      if (it.regularPrice !== null && it.regularPrice !== undefined && it.salePrice >= it.regularPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Giá khuyến mại phải nhỏ hơn giá bán thường.",
          path: ["items", i, "salePrice"],
        });
      }
    }
  });

export type CampaignDocument = z.infer<typeof campaignDocumentSchema>;
