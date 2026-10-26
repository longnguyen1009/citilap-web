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
  const warranty = warrantiesSchema.parse(document?.warranties || []).find(w => w.name === name);
  if (!warranty) throw new Error('WARRANTY_UNAVAILABLE');
  return warranty;
}
