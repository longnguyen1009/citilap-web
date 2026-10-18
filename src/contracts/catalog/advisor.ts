import { z } from 'zod';

export const advisorSchema = z.object({
  budget: z.coerce.number().int().min(5_000_000).max(200_000_000).default(25_000_000),
  need: z.enum(['office', 'gaming', 'creator']).default('office'),
  condition: z.enum(['any', 'NEW', 'USED']).default('any'),
  portable: z.enum(['any', 'yes']).default('any'),
});
export type AdvisorInput = z.infer<typeof advisorSchema>;

export function matchLaptop(input: AdvisorInput, product: { price: number; condition: string; specs: { ram?: string; gpu?: string }; availability?: string }, facts: Record<string, string>) {
  if (product.price <= 0 || product.price > input.budget || ['CONTACT', 'UNAVAILABLE', 'PREORDER'].includes(product.availability || '')) return null;
  if (input.condition === 'NEW' && product.condition !== 'NEW') return null;
  if (input.condition === 'USED' && !['USED', 'LIKE_NEW', 'REFURBISHED'].includes(product.condition)) return null;
  const ram = Number((product.specs.ram || '').match(/(?:^|\s)(\d+)\s*GB\b/i)?.[1] || 0);
  if (ram < 16) return null;
  const gpu = product.specs.gpu || '';
  if (input.need !== 'office' && !/RTX|GTX|Radeon RX/i.test(gpu)) return null;
  const weightText = facts['Trọng lượng'] || facts.weight || '';
  const weightMatch = weightText.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*kg/i);
  const weight = weightMatch ? Number(weightMatch[1]) : null;
  if (input.portable === 'yes' && (weight === null || weight <= 0 || weight > 1.6)) return null;
  const reasons = [`Trong ngân sách ${input.budget.toLocaleString('vi-VN')}đ`, `RAM ${ram}GB`];
  if (input.need !== 'office') reasons.push(`GPU rời ${gpu}; cần thử đúng game/phần mềm`);
  if (input.portable === 'yes') reasons.push(`Máy ${weight} kg, chưa gồm sạc`);
  return { reasons, limitation: facts['Hạn chế'] || 'Chưa có đánh giá thực tế. Xác minh màn hình, pin và khả năng nâng cấp trước khi mua.', score: (ram >= 32 && input.need === 'creator' ? 2 : 0) + (facts['Phù hợp'] ? 1 : 0) };
}
