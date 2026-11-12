export interface CampaignItemForm {
  displayName?: string;
  id?: string;
  productId: string;
  variantId?: string | null;
  salePrice: number | string;
  regularPrice?: number | string | null;
  quantityLimit?: number | string | null;
  perCustomerLimit?: number | string | null;
  soldCount?: number;
}

export interface CampaignItemDetail {
  id: string;
  productId: string;
  variantId: string | null;
  salePrice: number;
  regularPrice: number | null;
  quantityLimit?: number | null;
  perCustomerLimit?: number | null;
  soldCount?: number;
  product?: { name: string; price?: number; originalPrice?: number | null };
  variant?: { name: string; sku?: string; price?: number; originalPrice?: number | null } | null;
}

export interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  revision: number;
  startAt: string;
  endAt: string;
  itemCount: number;
  items?: CampaignItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface BannerSettingsState {
  hotSaleBannerImage: string;
  hotSaleBannerLink: string;
  flashSaleEnabled: boolean;
  flashSaleTitle: string;
  flashSaleStartAt: string;
  flashSaleEndAt: string;
}

export type FilterTab = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'INACTIVE';

export function formatGmt7(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function isoToDatetimeLocalGmt7(isoString: string): string {
  try {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const gmt7Date = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return gmt7Date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

export function datetimeLocalGmt7ToIso(localStr: string): string {
  try {
    if (!localStr) return '';
    const [datePart, timePart] = localStr.split('T');
    if (!datePart || !timePart) return '';
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0));
    return utcDate.toISOString();
  } catch {
    return '';
  }
}

/**
 * Computes bulk discounted sale price from regular price.
 * - Low-priced items (< 50,000₫) round to 100₫; medium (< 500,000₫) round to 1,000₫; higher round to 10,000₫.
 * - Clamps salePrice <= Math.max(1000, reg - 1000) (and strictly < reg) so bulk % discount never produces salePrice >= regularPrice.
 */
export function calculateBulkDiscountedPrice(reg: number, pct: number): number {
  if (!Number.isFinite(reg) || reg <= 0) return 0;
  const raw = reg * (1 - pct / 100);
  const step = reg < 50000 ? 100 : reg < 500000 ? 1000 : 10000;
  const rounded = Math.round(raw / step) * step;
  if (reg <= 1000) {
    return Math.max(1, Math.min(reg - 1, Math.floor(raw)));
  }
  const minDiff = reg < 50000 ? 100 : 1000;
  const upperBound = Math.min(reg - minDiff, Math.max(1000, reg - 1000));
  return Math.max(100, Math.min(upperBound, rounded));
}
