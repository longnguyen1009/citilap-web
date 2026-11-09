import React from "react";

export type SupportedBrand =
  | "lenovo"
  | "asus"
  | "acer"
  | "hp"
  | "dell"
  | "apple"
  | "gigabyte"
  | "msi"
  | "lecoo"
  | "lg"
  | "microsoft"
  | "other";

/**
 * Intelligent brand detector: scans brand field, product name and slug
 */
export function detectBrandName(product: {
  brand?: string | null;
  name?: string | null;
  slug?: string | null;
}): string {
  if (product.brand && product.brand.trim()) {
    return product.brand.trim();
  }
  const str = `${product.name || ""} ${product.slug || ""}`.toLowerCase();
  if (/\basus\b|\btuf\b|\brog\b|\bzenbook\b|\bvivobook\b/.test(str)) return "ASUS";
  if (/\blenovo\b|\bthinkpad\b|\blegion\b|\bloq\b|\byoga\b|\bideapad\b|\bxiaoxin\b|\bgeekpro\b/.test(str))
    return "Lenovo";
  if (/\blecoo\b/.test(str)) return "Lecoo";
  if (/\bhp\b|\bvictus\b|\bomen\b|\bpavilion\b|\benvy\b|\belitebook\b|\bprobook\b|\bomnibook\b/.test(str))
    return "HP";
  if (/\bdell\b|\bxps\b|\binspiron\b|\blatitude\b|\balienware\b|\bvostro\b|\bprecision\b/.test(str))
    return "Dell";
  if (/\bacer\b|\bpredator\b|\bnitro\b|\baspire\b|\bswift\b/.test(str)) return "Acer";
  if (/\bapple\b|\bmacbook\b|\bmac\b|\bipad\b/.test(str)) return "Apple";
  if (/\bgigabyte\b|\baorus\b|\baero\b/.test(str)) return "Gigabyte";
  if (/\bmsi\b|\bstealth\b|\braider\b|\bkatana\b|\bmodern\b|\bprestige\b|\bcyborg\b/.test(str)) return "MSI";
  if (/\blg\b|\bgram\b/.test(str)) return "LG";
  if (/\bsurface\b|\bmicrosoft\b/.test(str)) return "Microsoft";
  return "";
}

export function normalizeBrandKey(brand?: string | null): SupportedBrand {
  if (!brand) return "other";
  const b = brand.toLowerCase().trim();
  if (b.includes("asus") || b.includes("rog") || b.includes("tuf")) return "asus";
  if (b.includes("lenovo") || b.includes("thinkpad") || b.includes("legion") || b.includes("loq"))
    return "lenovo";
  if (b.includes("lecoo")) return "lecoo";
  if (b.includes("acer") || b.includes("predator") || b.includes("nitro")) return "acer";
  if (b.includes("hp") || b.includes("victus") || b.includes("omen") || b.includes("omnibook"))
    return "hp";
  if (b.includes("dell") || b.includes("xps") || b.includes("alienware")) return "dell";
  if (b.includes("apple") || b.includes("macbook")) return "apple";
  if (b.includes("gigabyte") || b.includes("aorus")) return "gigabyte";
  if (b.includes("msi")) return "msi";
  if (b.includes("lg") || b.includes("gram")) return "lg";
  if (b.includes("microsoft") || b.includes("surface")) return "microsoft";
  return "other";
}

export interface BrandCardTheme {
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  imageBg: string;
  badgeBg: string;
}

/**
 * Returns delicate pastel colors per brand matching user requirements
 */
export function getBrandCardTheme(brandKeyOrName?: string | null): BrandCardTheme {
  const key = normalizeBrandKey(brandKeyOrName);

  switch (key) {
    case "asus":
      return {
        cardBg: "bg-[#F1F6FD]", // Soft light ice tech blue
        cardBorder: "border-[#93C5FD]", // Distinct blue border
        hoverBorder: "hover:border-blue-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-blue-100/70 text-blue-700",
      };
    case "lenovo":
      return {
        cardBg: "bg-[#FFF6F6]", // Soft delicate blush / light rose
        cardBorder: "border-[#FCA5A5]", // Distinct rose-red border
        hoverBorder: "hover:border-red-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-red-100/70 text-red-700",
      };
    case "acer":
      return {
        cardBg: "bg-[#F2FAF4]", // Soft light mint / sage green
        cardBorder: "border-[#86EFAC]", // Distinct fresh green border
        hoverBorder: "hover:border-green-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-emerald-100/70 text-emerald-700",
      };
    case "hp":
      return {
        cardBg: "bg-[#F1F8FD]", // Soft light sky cyan
        cardBorder: "border-[#7DD3FC]", // Distinct sky cyan border
        hoverBorder: "hover:border-sky-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-sky-100/70 text-sky-700",
      };
    case "dell":
      return {
        cardBg: "bg-[#F3F7FA]", // Soft light slate blue
        cardBorder: "border-[#93C5FD]", // Distinct tech blue border
        hoverBorder: "hover:border-blue-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-sky-100/70 text-sky-800",
      };
    case "gigabyte":
      return {
        cardBg: "bg-[#FFF8F1]", // Soft light peach amber
        cardBorder: "border-[#FDBA74]", // Distinct warm orange/amber border
        hoverBorder: "hover:border-orange-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-orange-100/70 text-orange-700",
      };
    case "msi":
      return {
        cardBg: "bg-[#FFF5F6]", // Soft light crimson
        cardBorder: "border-[#FDA4AF]", // Distinct crimson border
        hoverBorder: "hover:border-rose-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-rose-100/70 text-rose-700",
      };
    case "apple":
      return {
        cardBg: "bg-[#F8F9FA]", // Soft light neutral silver
        cardBorder: "border-[#CBD5E1]", // Distinct silver slate border
        hoverBorder: "hover:border-slate-500",
        imageBg: "bg-white/85",
        badgeBg: "bg-slate-200/70 text-slate-700",
      };
    case "lecoo":
      return {
        cardBg: "bg-[#F2FAF9]", // Soft light teal
        cardBorder: "border-[#5EEAD4]", // Distinct teal border
        hoverBorder: "hover:border-teal-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-teal-100/70 text-teal-700",
      };
    case "lg":
      return {
        cardBg: "bg-[#FFF5F8]", // Soft light pink
        cardBorder: "border-[#F9A8D4]", // Distinct berry pink border
        hoverBorder: "hover:border-pink-600",
        imageBg: "bg-white/85",
        badgeBg: "bg-pink-100/70 text-pink-700",
      };
    default:
      return {
        cardBg: "bg-[#FAFAFB]", // Soft clean off-white
        cardBorder: "border-slate-300", // Distinct clean slate border
        hoverBorder: "hover:border-blue-500",
        imageBg: "bg-white/85",
        badgeBg: "bg-slate-100 text-slate-700",
      };
  }
}

export interface BrandLogoProps {
  brand?: string | null;
  series?: string | null;
  className?: string;
}

/**
 * Standard rectangular brand card with authentic logo/typography like Lenovo
 */
export function BrandLogo({ brand, series, className = "" }: BrandLogoProps) {
  const key = normalizeBrandKey(brand);

  const renderCard = () => {
    switch (key) {
      case "lenovo":
        // Official Lenovo Red Card with White text
        return (
          <div className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#E2231A] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-bold text-[11px] sm:text-xs tracking-tight leading-none font-sans">
              Lenovo
            </span>
          </div>
        );

      case "asus":
        // Official ASUS Royal Blue Card with White typography
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#00539B] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <svg
              viewBox="0 0 54 14"
              className="h-2.5 sm:h-3 w-auto select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="ASUS"
            >
              <text
                x="27"
                y="11.5"
                fill="#FFFFFF"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="12"
                letterSpacing="1.1"
                textAnchor="middle"
              >
                ASUS
              </text>
              <line x1="14" y1="7" x2="20" y2="7" stroke="#00539B" strokeWidth="1.4" />
            </svg>
          </div>
        );

      case "acer":
        // Official Acer Green Card with White lowercase logo
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#78A814] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-extrabold text-[11px] tracking-tight leading-none lowercase font-sans">
              acer
            </span>
          </div>
        );

      case "dell":
        // Official Dell Navy Card with White bold text
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#0076CE] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-black text-[11px] tracking-wider leading-none font-sans">
              DELL
            </span>
          </div>
        );

      case "hp":
        // Official HP Cyan Blue Card with White logo & text
        return (
          <div className="inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#0096D6] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="7.5" fill="#FFFFFF" />
              <text
                x="8"
                y="11.2"
                fill="#0096D6"
                fontFamily="'Times New Roman', serif"
                fontWeight="bold"
                fontStyle="italic"
                fontSize="9"
                textAnchor="middle"
              >
                hp
              </text>
            </svg>
            <span className="font-bold text-[10.5px] tracking-wide leading-none font-sans">
              HP
            </span>
          </div>
        );

      case "gigabyte":
        // Official GIGABYTE Blue Card with White text
        return (
          <div className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#0066CC] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-extrabold text-[10px] sm:text-[10.5px] tracking-wider leading-none font-sans">
              GIGABYTE
            </span>
          </div>
        );

      case "msi":
        // Official MSI Crimson Red Card with White italic text
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#D80027] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-black italic text-[11px] tracking-wider leading-none font-sans">
              msi
            </span>
          </div>
        );

      case "apple":
        // Sleek Apple Midnight Slate Card with White icon & text
        return (
          <div className="inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#0F172A] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <svg viewBox="0 0 32 38" className="h-2.5 w-auto fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.2,20.5 C26.2,15.5 30.3,13 30.5,12.8 C28.2,9.4 24.6,8.9 23.3,8.8 C20.3,8.5 17.3,10.6 15.7,10.6 C14.1,10.6 11.7,8.8 9.2,8.9 C6,9 3,10.8 1.4,13.6 C-1.8,19.2 0.6,27.5 3.7,32 C5.2,34.2 7,36.7 9.4,36.6 C11.7,36.5 12.6,35.1 15.4,35.1 C18.2,35.1 19,36.6 21.4,36.5 C23.9,36.4 25.4,34.2 26.9,32 C28.6,29.5 29.3,27 29.4,26.9 C29.3,26.8 26.2,25.6 26.2,20.5 Z" />
              <path d="M20.9,5.8 C22.2,4.2 23.1,2.1 22.8,0 C21,0.1 18.7,1.2 17.5,2.7 C16.4,3.9 15.4,6.1 15.7,8.2 C17.7,8.3 19.7,7.2 20.9,5.8 Z" />
            </svg>
            <span className="font-semibold text-[10.5px] tracking-tight leading-none font-sans">
              Apple
            </span>
          </div>
        );

      case "lecoo":
        // Lecoo Deep Teal Card with White text
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#0D9488] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-extrabold text-[10.5px] tracking-wide leading-none font-sans">
              Lecoo
            </span>
          </div>
        );

      case "lg":
        // LG Ruby Card with White text
        return (
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-[3px] bg-[#A50034] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-black text-[11px] tracking-wider leading-none font-sans">
              LG
            </span>
          </div>
        );

      case "microsoft":
        // Microsoft Tech Blue Card with White text
        return (
          <div className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#0078D4] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-bold text-[10.5px] tracking-wide leading-none font-sans">
              Microsoft
            </span>
          </div>
        );

      default:
        // Universal clean slate rectangular card
        return brand ? (
          <div className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-[3px] bg-[#475569] text-white select-none shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0 h-[20px]">
            <span className="font-bold text-[10.5px] uppercase tracking-wider leading-none font-sans">
              {brand}
            </span>
          </div>
        ) : null;
    }
  };

  const cardElement = renderCard();

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 min-w-0 shrink ${className}`}>
      {cardElement}
      {series && (
        <span className="hidden sm:inline text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide truncate">
          • {series}
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
