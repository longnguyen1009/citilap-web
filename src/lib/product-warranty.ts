import { z } from 'zod';

const warrantiesSchema = z.array(z.object({
  name: z.string().trim().min(1).max(240),
  description: z.string().max(500),
  adjustment: z.number().int().min(-2_000_000_000).max(2_000_000_000),
})).max(10);

// ponytail: published warranty names identify selections; add immutable IDs if renaming must preserve pending selections.
export function resolveProductWarranty(published: string | null | undefined, name?: string | null) {
  if (!name) return null;
  const document = published ? JSON.parse(published) : null;
  const list = warrantiesSchema.parse(document?.warranties || []);
  const warranty = list.find(w => w.name === name);
  if (warranty) return warranty;
  // Allow synthesized default 0đ warranty when product has no custom warranty packages configured
  if (list.length === 0) {
    const wType = document?.warrantyType === 'BRAND' ? 'BRAND' : 'SHOP';
    const wMonths = Number(document?.warrantyMonths) || 12;
    const defaultName = wType === 'BRAND'
      ? `Bảo hành Chính hãng ${wMonths} tháng`
      : `Bảo hành ${wMonths} tháng tại CitiLap`;
    if (name === defaultName) {
      return { name: defaultName, description: '', adjustment: 0 };
    }
  }
  throw new Error('WARRANTY_UNAVAILABLE');
}
