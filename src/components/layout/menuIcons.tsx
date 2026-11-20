import { createElement } from "react";
import { siAcer, siApple, siAsus, siDell, siHp, siHuawei, siLenovo, siLg, siMsi, siRazer, siSamsung, siXiaomi } from "simple-icons";
import {
  Apple, Award, Backpack, BatteryCharging, BookOpen, Box, Briefcase, Building2, Cable,
  Clapperboard, Compass, Cpu, Crosshair, Crown, Fan, Feather, Flame, Gamepad2, Gauge,
  GraduationCap, HardDrive, Headphones, HelpCircle, Info, Keyboard, Lamp, Laptop,
  Layers, MapPin, MemoryStick, MessageCircle, Monitor, MonitorSmartphone, Mouse,
  Newspaper, Palette, PenTool, RefreshCw, Rocket, Scale, Server, Shield, ShieldCheck,
  Sparkles, Star, Store, Swords, Tablet, Truck, Usb, Wind, Wrench, Zap, type LucideIcon,
} from "lucide-react";

const RULES: [RegExp, LucideIcon][] = [
  // Hot sale / promos
  [/hot|sale|khuy[eế]n|deal|x[aả]\s*kho/i, Flame],

  // Apple Mac lineup (distinct icon per product form factor)
  [/macbook\s*air/i, Feather],
  [/macbook\s*pro/i, Laptop],
  [/mac\s*mini/i, Box],
  [/mac\s*studio/i, Server],
  [/imac/i, Monitor],
  [/mac|apple/i, Apple],

  // Gaming series (distinct icons per line)
  [/legion|alienware|titan|raider/i, Crown],
  [/rog|aorus|blade/i, Zap],
  [/predator|crosshair/i, Crosshair],
  [/zephyrus|stealth/i, Wind],
  [/tuf|victus/i, Shield],
  [/loq|nitro|cyborg/i, Rocket],
  [/katana|sword|omen/i, Swords],
  [/gaming/i, Gamepad2],

  // Workstation / Creator / Graphics (distinct icons)
  [/proart|creator|conceptd|aero/i, Palette],
  [/precision|zbook|thinkpad\s*p/i, Server],
  [/đ[oồ]\s*ho[aạ]|workstation|k[yỹ]\s*thu[aậ]t/i, PenTool],
  [/render|d[uự]ng\s*phim|video/i, Clapperboard],

  // Ultrabook / Business / Office / Student (distinct icons)
  [/thinkpad|latitude|elitebook/i, ShieldCheck],
  [/thinkbook|probook|vostro|expertbook/i, Building2],
  [/xps|zenbook|spectre|envy|gram|omnibook|swift|prestige/i, Sparkles],
  [/yoga|surface|2\s*in\s*1|c[aả]m\s*[uứ]ng/i, Tablet],
  [/ideapad|vivobook|inspiron|aspire|modern|pavilion|sinh\s*vi[eê]n/i, GraduationCap],
  [/v[aă]n\s*ph[oò]ng|business|doanh\s*nh[aâ]n/i, Briefcase],
  [/m[oỏ]ng\s*nh[eẹ]|ultrabook/i, Feather],
  [/ai\b|copilot/i, Cpu],

  // Accessories (distinct icons)
  [/chu[oộ]t(?!.*b[aà]n\s*ph[ií]m)/i, Mouse],
  [/chu[oộ]t|b[aà]n\s*ph[ií]m/i, Keyboard],
  [/balo|t[uú]i/i, Backpack],
  [/s[aạ]c|gan/i, BatteryCharging],
  [/hub|type-c|c[aá]p/i, Usb],
  [/t[aả]n\s*nhi[eệ]t|gi[aá]\s*đ[oỡ]/i, Fan],
  [/đ[eè]n|desk|screenbar/i, Lamp],
  [/tai\s*nghe|[aâ]m\s*thanh/i, Headphones],
  [/ssd|[oổ]\s*c[uứ]ng/i, HardDrive],
  [/ram|n[aâ]ng\s*c[aấ]p/i, MemoryStick],
  [/ph[uụ]\s*ki[eệ]n/i, Cable],

  // News, Reviews, Guides & About (distinct icons)
  [/review|đ[aá]nh\s*gi[aá]/i, Star],
  [/so\s*s[aá]nh/i, Scale],
  [/t[uư]\s*v[aấ]n|ch[oọ]n\s*laptop|ch[oọ]n\s*m[aá]y/i, Compass],
  [/h[uướ]ng\s*d[aẫ]n|th[uủ]\s*thu[aậ]t|kinh\s*nghi[eệ]m/i, BookOpen],
  [/tin\s*t[uứ]c|news/i, Newspaper],
  [/b[aả]o\s*h[aà]nh/i, Award],
  [/đ[oổ]i\s*tr[aả]/i, RefreshCw],
  [/v[aậ]n\s*chuy[eể]n|giao\s*h[aà]ng/i, Truck],
  [/gi[oớ]i\s*thi[eệ]u/i, Info],
  [/c[uử]a\s*h[aà]ng|showroom/i, Store],
  [/đ[iị]a\s*ch[iỉ]|b[aả]n\s*đ[oồ]/i, MapPin],
  [/c[aâ]u\s*h[oỏ]i|faq/i, HelpCircle],
  [/li[eê]n\s*h[eệ]|h[oỗ]\s*tr[oợ]/i, MessageCircle],
  [/ki[eể]m\s*đ[iị]nh|k[yỹ]\s*thu[aậ]t/i, Wrench],
  [/like\s*new|c[uũ]/i, MonitorSmartphone],
  [/hi[eệ]u\s*n[aă]ng/i, Gauge],
  [/studio/i, Layers],
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
