import { z } from 'zod';

export const couponDiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);
export const couponStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const couponApplyScopeSchema = z.enum(['ALL', 'CONDITION_LIKE_NEW', 'PRODUCTS']);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Mã giảm giá cần tối thiểu 3 ký tự')
      .max(40, 'Mã giảm giá tối đa 40 ký tự')
      .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ gồm chữ cái không dấu, số, gạch ngang hoặc gạch dưới')
      .transform((v) => v.toUpperCase()),
    name: z.string().trim().min(2, 'Vui lòng nhập tên chương trình mã giảm giá').max(160),
    description: z.string().trim().max(500).nullish(),
    discountType: couponDiscountTypeSchema.default('FIXED'),
    discountValue: z.number().int().positive('Mức giảm phải lớn hơn 0'),
    maxDiscountAmount: z.number().int().positive().nullish(),
    minOrderAmount: z.number().int().min(0).default(0),
    quantityLimit: z.number().int().positive('Số lượng phải lớn hơn 0').nullish(),
    startAt: z.string().trim().min(1, 'Vui lòng chọn thời gian bắt đầu'),
    endAt: z.string().trim().min(1, 'Vui lòng chọn thời gian kết thúc'),
    status: couponStatusSchema.default('ACTIVE'),
    applyScope: couponApplyScopeSchema.default('ALL'),
    productIds: z.array(z.string().trim().min(1)).max(500).default([]),
  })
  .superRefine((data, ctx) => {
    const startMs = Date.parse(data.startAt);
    const endMs = Date.parse(data.endAt);
    if (!Number.isFinite(startMs)) {
      ctx.addIssue({ code: 'custom', path: ['startAt'], message: 'Thời gian bắt đầu không hợp lệ' });
    }
    if (!Number.isFinite(endMs)) {
      ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'Thời gian kết thúc không hợp lệ' });
    }
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs >= endMs) {
      ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
    }
    if (data.discountType === 'PERCENT' && data.discountValue > 100) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Phần trăm giảm tối đa 100%' });
    }
    if (data.applyScope === 'PRODUCTS' && data.productIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Vui lòng chọn ít nhất 1 sản phẩm áp dụng' });
    }
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

export interface CouponRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  quantityLimit: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  applyScope: 'ALL' | 'CONDITION_LIKE_NEW' | 'PRODUCTS';
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicCouponDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  quantityLimit: number | null;
  usedCount: number;
  remaining: number | null;
  startAt: string;
  endAt: string;
  applyScope: 'ALL' | 'CONDITION_LIKE_NEW' | 'PRODUCTS';
  isExhausted: boolean;
}
