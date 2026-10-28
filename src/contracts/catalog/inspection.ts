import { z } from 'zod';

export const inspectionSchema = z.object({
  serialUnitId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  publicCode: z.string().trim().regex(/^[a-zA-Z0-9_-]{2,64}$/),
  checkedAt: z.string().datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now(), 'Ngày kiểm tra không được ở tương lai'),
  batteryHealth: z.number().int().min(0).max(100).nullable(),
  appearance: z.string().trim().min(1).max(1000),
  checks: z.string().trim().min(1).max(2000),
  limitations: z.string().trim().max(1000),
  warranty: z.string().trim().min(1).max(1000),
  published: z.boolean(),
  expectedUpdatedAt: z.string().max(50).nullable(),
});
export type InspectionInput = z.infer<typeof inspectionSchema>;
export interface PublicInspection {
  publicCode: string; checkedAt: string; batteryHealth: number | null;
  appearance: string; checks: string; limitations: string; warranty: string; isDemo: number;
  variantId?: string | null;
}

export interface PublicInspectionLookupResult extends PublicInspection {
  productId: string;
  productName: string;
  productSlug: string;
  productHref: string;
}
