"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Laptop, Cpu, Scale, Gpu, MemoryStick, Monitor } from "lucide-react";
import { useOptionalWishlist } from "@/context/WishlistContext";
import { useOptionalCompare } from "@/context/CompareContext";
import { Badge } from "@/components/ui/Badge";
import { SpecChip } from "@/components/ui/SpecChip";
import { ConditionBadge, resolveConditionMeta } from "@/components/ui/ConditionBadge";
import { StockBadge } from "@/components/ui/StockBadge";
import { BrandLogo, detectBrandName, getBrandCardTheme } from "@/components/ui/BrandLogo";
import { defaultWarrantyMonthsForCondition } from "@/contracts/cms/product-studio";
import { productHref as getProductHref } from "@/lib/product-paths";

export type ProductCardProduct = {
  href?: string;
  template?: string;
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  variantId?: string;
  price: number | string;
  oldPrice?: number | string | null;
  originalPrice?: number | string | null;
  discount?: string;
  isFlashSale?: boolean;
  isOnSale?: boolean;
  image?: string | null;
  thumbnailUrl?: string | null;
  brand?: string;
  model?: string;
  series?: string;
  condition?: string; // Stable codes: "NEW", "LIKE_NEW", "USED", or legacy UI strings
  stock?: number | null;
  availability?: string;
  warranty?: string; // e.g. "BH 6 tháng"
  badge?: string; // e.g. "Bán chạy", "Deal Sốc"
  specs?: {
    cpu?: string;
    ram?: string;
    ssd?: string;
    gpu?: string;
    display?: string;
  };
};

export interface ProductCardProps {
  product: ProductCardProduct;
  badgeColor?: string;
  rank?: number;
  footerAction?: React.ReactNode;
  showSpecs?: boolean;
  className?: string;
  imageLoading?: "eager" | "lazy";
  variant?: "default" | "flash";
}

function isMeaningfulSpec(val?: string | null): val is string {
  if (!val) return false;
  const t = val.trim();
  if (!t) return false;
  return !/^(n\/a|đang cập nhật|chưa cập nhật|null|undefined|-|—)$/i.test(t);
}

/**
 * Smart spec formatters for PC grid chips
 */
function formatCpuSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  let s = val.split(/[\/,;]/)[0].replace(/\([^)]*\)/g, "").trim();
  s = s
    .replace(/^(?:Intel|AMD|Apple|Qualcomm)\s+/i, "")
    .replace(/^(?:Core|Processor)\s+/i, "")
    .replace(/Snapdragon\s*X\s*Elite[^ ]*/i, "X Elite")
    .replace(/Snapdragon\s*X\s*Plus[^ ]*/i, "X Plus")
    .replace(/Ryzen\s*AI\s*(\d)\s*(?:PRO\s*)?(?:HX\s*)?(\d+\w*)?/i, (_, g1, g2) => (g2 ? `AI ${g1}-${g2}` : `AI ${g1}`))
    .replace(/Ryzen\s*(\d)\s*(?:PRO\s*)?[-–—]?\s*(\d+\w*)?/i, (_, g1, g2) => (g2 ? `R${g1}-${g2}` : `R${g1}`))
    .replace(/Ultra\s*(\d)\s*[-–—]?\s*(\d+\w*)?/i, (_, g1, g2) => (g2 ? `U${g1}-${g2}` : `U${g1}`))
    .replace(/Core\s*(\d)\s*[-–—]?\s*(\d+\w*)/i, "C$1-$2")
    .replace(/i(\d)\s*[-–—]?\s*(\d+\w*)?/i, (_, g1, g2) => (g2 ? `i${g1}-${g2}` : `i${g1}`))
    .replace(/\bProcessor\b/gi, "")
    .replace(/--+/g, "-")
    .replace(/-+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function formatGpuSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/^(?:NVIDIA|AMD|Intel|Qualcomm|Apple)\s+/i, "")
    .replace(/^(?:GeForce|Radeon|Arc|Iris|Adreno)\s+/i, (m) => (/Iris|Arc|Adreno/i.test(m) ? m : ""))
    .replace(/\bNvidia\s+GeForce\s+/i, "")
    .replace(/\bGeForce\s+/i, "")
    .replace(/\bRadeon\s+/i, "")
    .replace(/\s+Graphics\b/i, "")
    .replace(/\s+\d+\s*GB(\s+GDDR\d+)?/i, "")
    .replace(/\s+Laptop\s+GPU/i, "")
    .replace(/\s+Ada\s+Generation/i, " Ada")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRamSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  const match = val.match(/(\d+)\s*GB/i);
  return match ? `${match[1]}GB` : val.split(" ")[0] || val;
}

function formatStorageSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  const matchTb = val.match(/(\d+)\s*TB/i);
  if (matchTb) return `${matchTb[1]}TB`;
  const matchGb = val.match(/(\d+)\s*GB/i);
  if (matchGb) {
    const n = parseInt(matchGb[1], 10);
    if (n >= 1024 && n % 1024 === 0) return `${n / 1024}TB`;
    return `${n}GB`;
  }
  return val.replace(/SSD|NVMe|PCIe/gi, "").trim();
}

function formatDisplaySpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  const sizeMatch = val.match(/^(\d+(?:\.\d+)?)\s*(?:inch|"|\s)/i) || val.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
  const size = sizeMatch ? `${sizeMatch[1].replace(/\.0$/, "")}"` : "";

  let res = "";
  if (/4K|UHD/i.test(val)) res = "4K";
  else if (/3\.2K|3K|2\.8K|2\.5K/i.test(val)) {
    const m = val.match(/(3\.2K|3K|2\.8K|2\.5K)/i);
    res = m ? m[1].toUpperCase() : "2.5K";
  } else if (/2K|QHD\+?|\bWQXGA\b/i.test(val)) res = "2K";
  else if (/FHD\+?|\bWUXGA\b/i.test(val)) res = "FHD";
  else if (/Retina/i.test(val)) res = "Retina";
  else if (/OLED/i.test(val)) res = "OLED";

  const hzMatch = val.match(/(\d{2,3})\s*Hz/i);
  const hz = hzMatch && parseInt(hzMatch[1], 10) >= 90 ? `${hzMatch[1]}Hz` : "";

  const parts = [size, res, hz].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return val.replace(/\s*inch\b/gi, '"').trim();
}

/**
 * Clean readable formatters for Smartphone (SP) spec lines
 */
function formatMobileRamSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function formatMobileStorageSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/^Ổ\s*cứng\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatWarranty(val?: string, condition?: string): string {
  const defaultMonths = defaultWarrantyMonthsForCondition(condition);
  const fallback = `BH ${defaultMonths} tháng`;
  if (!val || !val.trim()) return fallback;
  const raw = val.trim();
  const isBrand = /hãng|manufacturer|brand/i.test(raw);
  const monthsMatch = raw.match(/(\d+)\s*(?:tháng|th|t\b)/i);
  if (monthsMatch) {
    return isBrand ? `BH Hãng ${monthsMatch[1]} tháng` : `BH ${monthsMatch[1]} tháng`;
  }
  const yearMatch = raw.match(/(\d+)\s*năm/i);
  if (yearMatch) {
    const m = parseInt(yearMatch[1], 10) * 12;
    return isBrand ? `BH Hãng ${m} tháng` : `BH ${m} tháng`;
  }
  if (/^BH\s+hãng$/i.test(raw)) return `BH Hãng ${defaultMonths} tháng`;
  if (/^BH\s+/i.test(raw)) return raw;
  return raw
    .replace(/^Bảo hành\s*chính\s*hãng\s*/i, "BH Hãng ")
    .replace(/^Bảo hành\s*/i, "BH ")
    .replace(/\s*(1\s*đổi\s*1|tại|tiêu\s*chuẩn|toàn\s*diện).*$/i, "")
    .trim();
}

function formatProductTitle(name: string): string {
  if (!name) return "";
  return name
    .replace(/^\[(?:New\s*100%|Mới\s*100%)\]\s*/i, "[Mới 100%] ")
    .replace(/^\[(?:Like\s*New\s*99%|LikeNew\s*99%)\]\s*/i, "[LikeNew 99%] ");
}

function formatVnd(val?: string | number | null): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") return `${val.toLocaleString("vi-VN")}đ`;
  const digits = String(val).replace(/\D/g, "");
  const parsed = parseInt(digits, 10);
  if (!isNaN(parsed)) return `${parsed.toLocaleString("vi-VN")}đ`;
  return String(val);
}

export default function ProductCard({
  product,
  rank,
  footerAction,
  showSpecs = true,
  className = "",
  imageLoading = "lazy",
  variant = "default",
}: ProductCardProps) {
  const isFlash = variant === "flash";
  const wishlistCtx = useOptionalWishlist();
  const compareCtx = useOptionalCompare();
  const liked = wishlistCtx?.isInWishlist(product.id) ?? false;
  const inCompare = compareCtx?.isInCompare(product.id) ?? false;
  const [imageError, setImageError] = useState(false);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!wishlistCtx) return;
    if (liked) {
      wishlistCtx.removeFromWishlist(product.id);
    } else {
      wishlistCtx.addToWishlist({
        productId: product.id,
      });
    }
  };

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!compareCtx) return;
    if (inCompare) {
      compareCtx.removeFromCompare(product.id);
    } else {
      compareCtx.addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug || product.id,
        price: Number(product.price) || 0,
        image: product.image,
        template: product.template,
      });
    }
  };

  const variantQuery = product.sku ? `?sku=${encodeURIComponent(product.sku)}` : (product.variantId ? `?variant=${encodeURIComponent(product.variantId)}` : "");
  const productHref = getProductHref(product) + variantQuery;
  const isOutOfStock = product.availability ? product.availability === "UNAVAILABLE" : product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const resolvedMeta = resolveConditionMeta(product.condition, product.name);
  const inferredCondition = resolvedMeta.code === "OUTLET" ? "NEW" : resolvedMeta.code;
  const warrantyText = formatWarranty(
    product.warranty,
    inferredCondition
  );

  // Intelligent brand detection & delicate pastel styling (original PC styling)
  const detectedBrand = detectBrandName(product);
  const brandTheme = getBrandCardTheme(detectedBrand);
  const effectiveOldPrice = product.originalPrice ?? product.oldPrice;
  const displayName = formatProductTitle(product.name);

  // Derive discount percent
  const discountPercent = product.discount
    ? (product.discount.startsWith("-") ? product.discount : `-${product.discount}`)
    : (product.isOnSale && product.originalPrice && Number(product.originalPrice) > Number(product.price))
    ? `-${Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100)}%`
    : effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price)
    ? `-${Math.round((1 - Number(product.price) / Number(effectiveOldPrice)) * 100)}%`
    : null;

  // Specs calculation (only for laptops)
  const isAccessory =
    Boolean(product.template && product.template !== "LAPTOP") ||
    Boolean(product.href && product.href.startsWith("/phu-kien/"));

  // Desktop specs
  const cpu = isAccessory ? "" : formatCpuSpec(product.specs?.cpu);
  const gpu = isAccessory ? "" : formatGpuSpec(product.specs?.gpu);
  const ram = isAccessory ? "" : formatRamSpec(product.specs?.ram);
  const ssd = isAccessory ? "" : formatStorageSpec(product.specs?.ssd);
  const display = isAccessory ? "" : formatDisplaySpec(product.specs?.display);
  const hasDesktopSpecs = Boolean(cpu || gpu || ram || ssd || display);

  // Mobile (SP < 768px) compact spec badges
  const mRam = isAccessory ? "" : formatMobileRamSpec(product.specs?.ram);
  const mSsd = isAccessory ? "" : formatMobileStorageSpec(product.specs?.ssd);
  const spRamBadge = ram ? ram.replace(/GB$/i, "G") : mRam;
  const spSsdBadge = ssd ? ssd.replace(/GB$/i, "G") : mSsd;
  const spMemoryBadge = [spRamBadge, spSsdBadge].filter(Boolean).join("/");
  const spMemoryTitle = [
    product.specs?.ram ? `RAM: ${product.specs?.ram}` : mRam,
    product.specs?.ssd ? `SSD: ${product.specs?.ssd}` : mSsd,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <article
      className={`group/product relative flex flex-col h-full rounded-lg md:rounded-xl lg:rounded-2xl border md:border-2 ${brandTheme.cardBg} ${brandTheme.cardBorder} ${brandTheme.hoverBorder} shadow-2xs md:shadow-xs hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600/40 transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden ${className}`}
    >
      {/* Top Badges Bar: Rank, Condition & Compare, Wishlist (compact, no overlap) */}
      <div className="absolute top-0 left-0 right-0 md:top-1 md:left-1.5 md:right-1.5 z-20 flex items-start justify-between gap-1 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1 min-w-0 shrink pt-1.5 pl-1.5 md:pt-1 md:pl-0.5">
          {/* Rank Badge */}
          {rank !== undefined && (
            <Badge variant={rank <= 3 ? "rank-top" : "rank-other"} size="xs" className="text-[9px] px-1 py-0.5 rounded-[2px] font-bold shrink-0">
              #{rank}
            </Badge>
          )}

          {/* Real Discount Badge in top-left corner on Flash SP so 120px card has zero overlap */}
          {isFlash && discountPercent && (
            <span className="md:hidden bg-[#D71920] text-white font-black text-[10px] px-1.5 py-0.5 rounded-[4px] leading-none select-none tracking-tight shadow-2xs shrink-0">
              {discountPercent}
            </span>
          )}

          {/* Condition Badge (Standardized Citilap Core: Mới 100%, LikeNew 99%, Máy cũ) */}
          <ConditionBadge
            condition={product.condition}
            fallbackName={product.name}
            size="xs"
            className={`${isFlash ? "hidden md:inline-flex " : ""}text-[8.5px] md:text-[9.5px] px-1 md:px-1.5 py-0.5 rounded-[3px] font-bold leading-tight truncate max-w-full shadow-2xs`}
          />
        </div>

        <div className={`${isFlash ? "hidden md:flex" : "flex"} items-center gap-0 shrink-0 pointer-events-auto`}>
          {/* Compare Button (44x44px non-overlapping hit target) */}
          <button
            type="button"
            onClick={toggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare ? `Bỏ ${product.name} khỏi so sánh` : `Thêm ${product.name} vào so sánh`
            }
            title={inCompare ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
            className={`relative min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 md:before:w-7.5 md:before:h-7.5 before:rounded-full before:shadow-2xs before:transition-[background-color,border-color,transform] before:duration-150 motion-reduce:before:transition-none ${
              inCompare
                ? "text-white before:bg-blue-600 before:border before:border-blue-600"
                : "text-text-muted hover:text-blue-600 before:bg-white/95 before:backdrop-blur-xs hover:before:bg-blue-50/80 before:border before:border-border-default"
            }`}
          >
            <Scale className="relative z-10 w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          {/* Wishlist Button (44x44px non-overlapping hit target) */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={liked}
            aria-label={
              liked ? `Bỏ lưu ${product.name}` : `Lưu ${product.name} vào danh sách yêu thích`
            }
            className={`relative min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 md:before:w-7.5 md:before:h-7.5 before:rounded-full before:shadow-2xs before:transition-[background-color,border-color,transform] before:duration-150 motion-reduce:before:transition-none ${
              liked
                ? "text-error before:bg-red-50 before:border before:border-red-200"
                : "text-text-muted hover:text-error before:bg-white/95 before:backdrop-blur-xs hover:before:bg-red-50/80 before:border before:border-border-default"
            }`}
          >
            <Heart className="relative z-10 w-3.5 h-3.5 md:w-4 md:h-4" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 2.5 : 2} />
          </button>
        </div>
      </div>

      {/* Product Image Container */}
      <div
        className={`relative ${
          isFlash
            ? "aspect-square md:aspect-[4/3] p-2 pt-6 pb-1.5 md:p-3.5 md:pt-8 md:pb-2"
            : "aspect-[16/11] md:aspect-[4/3] p-2 pt-8 pb-1 md:p-3.5 md:pt-8 md:pb-2"
        } w-full border-b border-black/[0.04] ${brandTheme.imageBg} flex items-center justify-center overflow-hidden`}
      >
        <div className="relative block w-full h-full">
          {(() => {
            const rawImage = product.thumbnailUrl || product.image || (product as { primaryImage?: string }).primaryImage || null;
            const cardImage = product.thumbnailUrl || (rawImage && rawImage.startsWith('/api/library/') && !rawImage.includes('?') ? `${rawImage}?size=thumb&v=2` : rawImage);
            return cardImage && !imageError ? (
              <Image
                src={cardImage}
                alt={product.name}
                fill
                loading={imageLoading}
                unoptimized={cardImage.includes('size=thumb') || cardImage.startsWith('/brand/')}
                sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw"
                onError={() => setImageError(true)}
                className={`object-contain transition-transform duration-300 scale-[0.9] md:scale-[0.88] group-hover/product:scale-[0.94] motion-reduce:transform-none ${
                  isOutOfStock ? "grayscale opacity-60" : ""
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Laptop className="w-10 h-10 md:w-14 md:h-14 stroke-1" />
                <span className="text-[10px] md:text-caption font-medium text-text-muted mt-0.5 text-center px-1">Ảnh đang cập nhật</span>
              </div>
            );
          })()}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] rounded-control z-10">
              <span className="bg-slate-900/90 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-control shadow-xs">
                Tạm hết hàng
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Flash SP dedicated 44px non-overlapping action row directly below square image */}
      {isFlash && (
        <div className="md:hidden relative z-20 flex items-center justify-end gap-0 h-11 px-1 border-b border-black/[0.04] bg-white/90">
          <button
            type="button"
            onClick={toggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare ? `Bỏ ${product.name} khỏi so sánh` : `Thêm ${product.name} vào so sánh`
            }
            title={inCompare ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
            className={`relative min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 before:rounded-full before:shadow-2xs before:transition-[background-color,border-color,transform] before:duration-150 motion-reduce:before:transition-none ${
              inCompare
                ? "text-white before:bg-blue-600 before:border before:border-blue-600"
                : "text-text-muted hover:text-blue-600 before:bg-white before:border before:border-border-default"
            }`}
          >
            <Scale className="relative z-10 w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={liked}
            aria-label={
              liked ? `Bỏ lưu ${product.name}` : `Lưu ${product.name} vào danh sách yêu thích`
            }
            className={`relative min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 before:rounded-full before:shadow-2xs before:transition-[background-color,border-color,transform] before:duration-150 motion-reduce:before:transition-none ${
              liked
                ? "text-error before:bg-red-50 before:border before:border-red-200"
                : "text-text-muted hover:text-error before:bg-white before:border before:border-border-default"
            }`}
          >
            <Heart className="relative z-10 w-3.5 h-3.5" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 2.5 : 2} />
          </button>
        </div>
      )}

      {/* Card Body */}
      <div className={`flex flex-col flex-1 ${isFlash ? "p-2 md:p-3 pt-1.5 md:pt-2" : "p-2.5 md:p-3 pt-2 md:pt-2"}`}>
        {/* Top Content: Brand Card (Left) & Old Struck Price + Discount % (Right) */}
        <div className="flex flex-col">
          {/* Row directly under image: Brand Card on left, Struck Old Price + Red Discount % on right */}
          <div className={`${isFlash ? "hidden md:flex" : "flex"} items-center justify-between gap-1 min-h-5 md:h-6 mb-1 min-w-0`}>
            <div className="flex items-center min-w-0 shrink overflow-hidden">
              <BrandLogo brand={detectedBrand} series={product.series} />
            </div>

            {/* Struck Old Price + Red Discount % tag side-by-side */}
            {effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price) && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10.5px] md:text-[13px] text-slate-500 line-through tabular-nums font-bold">
                  {formatVnd(effectiveOldPrice)}
                </span>
                {discountPercent && (
                  <span className="bg-[#D71920] text-white font-black text-[9.5px] md:text-[11.5px] px-1 md:px-1.5 py-0.5 rounded-[3px] leading-none select-none tracking-tight shadow-2xs">
                    {discountPercent}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Title - fixed 2-line height so 1-line and 2-line titles occupy exact same space */}
          <h3
            className={`${
              isFlash
                ? "h-[33px] md:h-11 text-[12px] md:text-[15px] leading-[1.35] md:leading-snug"
                : "h-9 md:h-11 text-[13px] md:text-[15px] leading-[1.35] md:leading-snug"
            } font-semibold text-slate-900 line-clamp-2 overflow-hidden group-hover/product:text-blue-700 transition-colors`}
          >
            <Link
              href={productHref}
              title={product.name}
              className="after:absolute after:inset-0 after:z-10 focus:outline-hidden focus-visible:underline"
            >
              {displayName}
            </Link>
          </h3>

          {/* Price Display: Clear typographic hierarchy (not a button-like pill) */}
          <div className={isFlash ? "mt-1 md:mt-1.5 mb-1 md:mb-2" : "mt-1.5 md:mt-2 mb-1 md:mb-2"}>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span
                className={`font-black text-[#D71920] tracking-tight tabular-nums leading-none ${
                  isFlash
                    ? "text-[14px] sm:text-[15px] md:text-[17px]"
                    : "text-[15px] sm:text-[16px] md:text-[18px]"
                }`}
              >
                {product.availability === 'CONTACT' ? 'Liên hệ' : formatVnd(product.price)}
              </span>
              {isFlash && effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price) && (
                <span className="md:hidden text-[10px] text-slate-400 line-through tabular-nums font-medium">
                  {formatVnd(effectiveOldPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Pinned Section: Cấu hình (Specs) & Bảo hành (Warranty) ALWAYS pinned to bottom */}
        <div className="mt-auto flex flex-col justify-end pt-1 md:pt-1.5">
          {/* TABLET / PC DISPLAY (>= 768px): 2-Column Compact Spec Chips Matrix without truncation */}
          {showSpecs && hasDesktopSpecs && (
            <div className="hidden md:grid grid-cols-2 gap-1 text-[11px] text-text-secondary mb-2 pt-2 border-t border-black/[0.06] min-h-[52px]">
              {cpu && (
                <SpecChip
                  icon={<Cpu className="w-3 h-3 text-slate-500 shrink-0" />}
                  value={cpu}
                  title={`CPU: ${product.specs?.cpu || cpu}`}
                />
              )}
              {gpu && (
                <SpecChip
                  icon={<Gpu className="w-3 h-3 text-blue-600 shrink-0" />}
                  highlight
                  value={gpu}
                  title={`GPU: ${product.specs?.gpu || gpu}`}
                />
              )}
              {(ram || ssd) && (
                <SpecChip
                  icon={<MemoryStick className="w-3 h-3 text-slate-500 shrink-0" />}
                  value={
                    <>
                      <span className="font-semibold text-text-primary">{ram ? ram.replace(/GB$/i, "G") : "RAM"}</span>
                      {ram && ssd && <span className="text-slate-400 mx-[1px]">/</span>}
                      <span className="text-text-secondary">{ssd ? ssd.replace(/GB$/i, "G") : ""}</span>
                    </>
                  }
                  title={`RAM: ${product.specs?.ram || ram} / SSD: ${product.specs?.ssd || ssd}`}
                />
              )}
              {display && (
                <SpecChip
                  icon={<Monitor className="w-3 h-3 text-slate-500 shrink-0" />}
                  value={display}
                  title={`Màn hình: ${product.specs?.display || display}`}
                />
              )}
            </div>
          )}

          {/* SMARTPHONE DISPLAY (< 768px): 2x2 Compact Spec Matrix (Hidden on Flash SP) */}
          {!isFlash && showSpecs && hasDesktopSpecs && (
            <div className="md:hidden mb-1.5 pt-1.5 border-t border-black/[0.06] grid grid-cols-2 gap-1 min-w-0">
              {cpu && (
                <span
                  title={`CPU: ${product.specs?.cpu || cpu}`}
                  className="inline-flex items-center gap-1 rounded bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden"
                >
                  <Cpu className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  <span>{cpu}</span>
                </span>
              )}
              {gpu && (
                <span
                  title={`GPU: ${product.specs?.gpu || gpu}`}
                  className="inline-flex items-center gap-1 rounded bg-blue-50/70 border border-blue-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 leading-tight whitespace-nowrap overflow-hidden"
                >
                  <Gpu className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span>{gpu}</span>
                </span>
              )}
              {spMemoryBadge && (
                <span
                  title={spMemoryTitle || spMemoryBadge}
                  className="inline-flex items-center gap-1 rounded bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden"
                >
                  <MemoryStick className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  <span>{spMemoryBadge}</span>
                </span>
              )}
              {display && (
                <span
                  title={`Màn hình: ${product.specs?.display || display}`}
                  className="inline-flex items-center gap-1 rounded bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 leading-tight whitespace-nowrap overflow-hidden"
                >
                  <Monitor className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  <span>{display}</span>
                </span>
              )}
            </div>
          )}

          {/* Footer Meta: Warranty & Stock Status */}
          <div className="pt-1 md:pt-2 border-t border-black/[0.06] flex items-center justify-between gap-1 text-[10.5px] md:text-caption">
            {/* Warranty tag (hidden on Flash SP to fit 120px width cleanly) */}
            <div
              className={`${isFlash ? "hidden md:flex " : "flex "}items-center gap-0.5 md:gap-1 text-slate-700 font-medium truncate min-w-0`}
              title={product.warranty || warrantyText}
            >
              <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{warrantyText}</span>
            </div>

            {/* Standardized Stock Indicator */}
            {product.availability ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold shrink-0 whitespace-nowrap ${
                  isFlash ? "mx-auto md:mx-0 " : ""
                }${
                  product.availability === 'AVAILABLE' && (product.stock === undefined || product.stock === null || product.stock > 0)
                    ? 'text-emerald-700'
                    : product.availability === 'PREORDER'
                    ? 'text-blue-700'
                    : product.availability === 'CONTACT'
                    ? 'text-amber-700'
                    : 'text-slate-500'
                }`}
              >
                {product.availability === 'AVAILABLE' && (product.stock === undefined || product.stock === null || product.stock > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                )}
                {product.availability === 'AVAILABLE'
                  ? (product.stock !== undefined && product.stock !== null && product.stock <= 0 ? 'Hết hàng' : 'Sẵn hàng')
                  : ({
                      PREORDER: 'Đặt trước',
                      CONTACT: 'Liên hệ',
                      UNAVAILABLE: 'Hết hàng',
                    } as Record<string, string>)[product.availability] || 'Sẵn hàng'}
              </span>
            ) : (
              <StockBadge
                stock={product.stock}
                variant="indicator"
                className={`shrink-0 whitespace-nowrap text-[10px] md:text-caption ${isFlash ? "mx-auto md:mx-0" : ""}`}
              />
            )}
          </div>

          {/* Optional Custom Action Slot (e.g. Wishlist Add To Cart) */}
          {footerAction && (
            <div className="mt-2 pt-1.5 md:mt-2.5 md:pt-2 border-t border-black/[0.06] relative z-20">
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
