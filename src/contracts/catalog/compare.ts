/**
 * CitiLap Product Comparison Contract (STORE-07 / R04-C)
 */

export const MAX_COMPARE_PRODUCTS = 3;

export interface CompareProductItem {
  id: string;
  variantId?: string | null;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string | null;
  kind: string; // "LAPTOP" | "ACCESSORY"
  template: string; // e.g. "LAPTOP", "MOUSE", "KEYBOARD", ...
  brand?: string;
  condition?: string;
  conditionLabel?: string;
  availability?: string;
  warranty?: string;
}

export interface CompareSpecRow {
  key: string;
  label: string;
  group?: string;
  values: Record<string, string>; // productId -> specValue
  isDifferent: boolean;
}

export interface CompareApiResponse {
  success: boolean;
  error?: string;
  compatible: boolean;
  groupType: string;
  products: CompareProductItem[];
  specs: CompareSpecRow[];
}
