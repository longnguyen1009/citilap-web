import type { CampaignItemDetail, CampaignItemForm } from './types';

/** Restore every option for each included product; blank sale prices stay out of saved targets. */
export function restoreCampaignOptions(items: CampaignItemDetail[]): CampaignItemForm[] {
  const products = new Map<string, CampaignItemDetail[]>();
  for (const item of items) products.set(item.productId, [...(products.get(item.productId) ?? []), item]);
  const toForm = (it: CampaignItemDetail): CampaignItemForm => ({
    id: it.id, productId: it.productId, variantId: it.variantId || '',
    displayName: [it.product?.name, it.variant?.name].filter(Boolean).join(' · '),
    salePrice: it.salePrice, regularPrice: it.regularPrice ?? it.variant?.price ?? it.product?.price ?? '',
    quantityLimit: it.quantityLimit ?? '', perCustomerLimit: it.perCustomerLimit ?? '', soldCount: it.soldCount ?? 0,
  });
  return [...products.values()].flatMap(saved => {
    const product = saved[0].product;
    const variants = product?.variants ?? [];
    if (!variants.length) return saved.map(toForm);
    const current = variants.map(variant => {
      const existing = saved.find(item => item.variantId === variant.id);
      return existing ? { ...toForm(existing), displayName: `${product!.name} · ${variant.name || variant.sku || variant.id}` } : {
        productId: saved[0].productId, variantId: variant.id,
        displayName: `${product!.name} · ${variant.name || variant.sku || variant.id}`,
        salePrice: '', regularPrice: variant.price, quantityLimit: '', perCustomerLimit: '', soldCount: 0,
      };
    });
    return [...current, ...saved.filter(item => !variants.some(v => v.id === item.variantId)).map(toForm)];
  });
}
