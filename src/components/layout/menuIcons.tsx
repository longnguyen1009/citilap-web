import { createElement } from "react";
import { siAcer, siApple, siAsus, siDell, siHp, siHuawei, siLenovo, siLg, siMsi, siRazer, siSamsung, siXiaomi } from "simple-icons";
import {
  Apple, Backpack, BatteryCharging, Briefcase, Cable, Cpu, Flame, Gamepad2, Headphones, HelpCircle,
  Info, Keyboard, Laptop, Lamp, MapPin, MessageCircle, MonitorSmartphone, Newspaper, Palette,
  Sparkles, Usb, Wind, type LucideIcon,
} from "lucide-react";

const RULES: [RegExp, LucideIcon][] = [
  [/hot|sale|khuy[eế]n/i, Flame],
  [/gaming|rog|tuf|legion|loq|omen|victus|nitro|predator|alienware|aorus|katana|cyborg|raider|stealth|titan|vector|sword|crosshair|blade/i, Gamepad2],
  [/v[aă]n ph[oò]ng|business|thinkpad|latitude|vostro|expertbook|probook|elitebook/i, Briefcase],
  [/đ[oồ] ho[aạ]|workstation|creator|studio|precision|zbook/i, Palette],
  [/mac|apple/i, Apple],
  [/chu[oộ]t|b[aà]n ph[ií]m/i, Keyboard],
  [/balo|t[uú]i/i, Backpack],
  [/s[aạ]c|gan/i, BatteryCharging],
  [/hub|type-c|c[aá]p/i, Usb],
  [/t[aả]n nhi[eệ]t|gi[aá] đ[oỡ]/i, Wind],
  [/đ[eè]n|desk/i, Lamp],
  [/tai nghe|[aâ]m thanh/i, Headphones],
  [/ram|ssd|n[aâ]ng c[aấ]p/i, Cpu],
  [/gi[oớ]i thi[eệ]u/i, Info],
  [/c[uử]a h[aà]ng/i, MapPin],
  [/t[uư] v[aấ]n|ch[oọ]n/i, Sparkles],
  [/c[aâ]u h[oỏ]i|faq/i, HelpCircle],
  [/li[eê]n h[eệ]|h[oỗ] tr[oợ]/i, MessageCircle],
  [/tin t[uứ]c|news/i, Newspaper],
  [/like new|c[uũ]/i, MonitorSmartphone],
  [/ph[uụ] ki[eệ]n/i, Cable],
];

export function iconForName(name: string): LucideIcon {
  return RULES.find(([re]) => re.test(name))?.[1] ?? Laptop;
}

export function MenuNodeIcon({ name, className }: { name: string; className?: string }) {
  return createElement(iconForName(name), { className, "aria-hidden": true });
}

const BRAND_COLORS: Record<string, string> = {
  lenovo: "bg-red-600 text-white",
  asus: "bg-slate-900 text-white",
  msi: "bg-red-700 text-white",
  acer: "bg-lime-600 text-white",
  gigabyte: "bg-orange-500 text-white",
  dell: "bg-sky-600 text-white",
  hp: "bg-blue-600 text-white",
  razer: "bg-green-500 text-black",
  apple: "bg-neutral-800 text-white",
  lg: "bg-rose-700 text-white",
  samsung: "bg-indigo-700 text-white",
  microsoft: "bg-cyan-600 text-white",
};

export function brandBadgeClass(brand: string) {
  return BRAND_COLORS[brand.toLowerCase()] ?? "bg-slate-200 text-slate-700";
}

type SimpleIcon = { path: string; hex: string; title: string };
const BRAND_ICONS: Record<string, SimpleIcon> = {
  lenovo: siLenovo, asus: siAsus, msi: siMsi, acer: siAcer, dell: siDell, hp: siHp,
  razer: siRazer, apple: siApple, macbook: siApple, lg: siLg, samsung: siSamsung,
  huawei: siHuawei, xiaomi: siXiaomi,
};

/** Accent colour per brand (used for borders / tints). */
const BRAND_ACCENT: Record<string, string> = {
  lenovo: "#E2231A", asus: "#0B5ED7", msi: "#E60012", acer: "#83B81A", gigabyte: "#F97316",
  dell: "#007DB8", hp: "#0096D6", razer: "#16A34A", apple: "#334155", macbook: "#334155",
  lg: "#A50034", samsung: "#1428A0", huawei: "#E11D48", xiaomi: "#FF6900",
};

export function brandKey(name: string) {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

export function brandAccent(name: string) {
  return BRAND_ACCENT[brandKey(name)] ?? "#2563EB";
}

/** Lightweight inline SVG brand logo (Simple Icons, CC0). Falls back to a letter badge. */
export function BrandLogo({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const icon = BRAND_ICONS[brandKey(name)];
  if (!icon) {
    return <span className="text-[11px] font-black leading-none">{brandKey(name).slice(0, 2).toUpperCase()}</span>;
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}
