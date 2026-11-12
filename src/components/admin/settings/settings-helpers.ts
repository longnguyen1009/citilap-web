import type { AdminSettingsDocument as StorefrontSettings } from "@/contracts/cms/settings";

export type TabId = "store" | "flashsale" | "banners" | "features" | "shipping" | "product";

export type UpdateSettingFn = <K extends keyof StorefrontSettings>(
  key: K,
  value: StorefrontSettings[K]
) => void;

export interface SettingsTabProps {
  settings: StorefrontSettings;
  update: UpdateSettingFn;
}

export const formatDots = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return new Intl.NumberFormat("vi-VN").format(n);
};

export const parseDots = (raw: string): number => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return Math.min(2000000000, parseInt(digits, 10) || 0);
};

export const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none";

export const labelCls = "block text-[11px] font-semibold text-slate-600 mb-1";

export function toDatetimeLocalGmt7(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const gmt7 = new Date(d.getTime() + 7 * 3600 * 1000);
    return gmt7.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export function fromDatetimeLocalGmt7(localStr: string): string {
  if (!localStr) return "";
  try {
    const [datePart, timePart] = localStr.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [h, min] = timePart.split(":").map(Number);
    return new Date(Date.UTC(y, m - 1, d, h - 7, min, 0)).toISOString();
  } catch {
    return localStr;
  }
}
