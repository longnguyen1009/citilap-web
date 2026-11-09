"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Laptop, Scale } from "lucide-react";
import { useOptionalWishlist } from "@/context/WishlistContext";
import { useOptionalCompare } from "@/context/CompareContext";
import { Badge } from "@/components/ui/Badge";
import { ConditionBadge } from "@/components/ui/ConditionBadge";
import { detectBrandName, getBrandCardTheme } from "@/components/ui/BrandLogo";
import { defaultWarrantyMonthsForCondition } from "@/contracts/cms/product-studio";
import { productHref as getProductHref } from '@/lib/product-paths';

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
}

function isMeaningfulSpec(val?: string | null): val is string {
  if (!val) return false;
  const t = val.trim();
  if (!t) return false;
  return !/^(n\/a|đang cập nhật|chưa cập nhật|null|undefined|-|—)$/i.test(t);
}

/**
 * Readable spec formatters for Thế Giới Số-style vertical spec list
 */
function formatCpuSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/®|™/g, "")
    .replace(/^Intel\s+/i, "")
    .replace(/^AMD\s+/i, "")
    .replace(/\bProcessor\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatGpuSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/®|™/g, "")
    .replace(/^NVIDIA\s+GeForce\s+/i, "")
    .replace(/^NVIDIA\s+/i, "")
    .replace(/^GeForce\s+/i, "")
    .replace(/\bLaptop\s+GPU\b/gi, "")
    .replace(/\s+GDDR\d+[A-Z]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRamSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function formatStorageSpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  return val
    .replace(/\([^)]*\)/g, "")
    .split(/[\/,;]/)[0]
    .replace(/^Ổ\s*cứng\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDisplaySpec(val?: string): string {
  if (!isMeaningfulSpec(val)) return "";
  const cleaned = val
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*inch\b/gi, '"')
    .split(/[,;]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function formatWarrantyRibbon(val?: string, condition?: string): string {
  const defaultMonths = defaultWarrantyMonthsForCondition(condition);
  if (!val || !val.trim()) return `Bảo Hành ${defaultMonths} Tháng`;
  const raw = val.trim();
  const isBrand = /hãng|manufacturer|brand/i.test(raw);
  const monthsMatch = raw.match(/(\d+)\s*(?:tháng|th|t\b)/i);
  if (monthsMatch) {
    return isBrand ? `BH Hãng ${monthsMatch[1]} Tháng` : `Bảo Hành ${monthsMatch[1]} Tháng`;
  }
  const yearMatch = raw.match(/(\d+)\s*năm/i);
  if (yearMatch) {
    const m = parseInt(yearMatch[1], 10) * 12;
    return isBrand ? `BH Hãng ${m} Tháng` : `Bảo Hành ${m} Tháng`;
  }
  if (/^BH\s+hãng$/i.test(raw)) return `BH Hãng ${defaultMonths} Tháng`;
  return `Bảo Hành ${defaultMonths} Tháng`;
}

function formatProductTitle(name: string): string {
  if (!name) return "";
  return name.trim();
}

function formatVnd(val?: string | number | null): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") return `${val.toLocaleString("vi-VN")}₫`;
  const digits = String(val).replace(/\D/g, "");
  const parsed = parseInt(digits, 10);
  if (!isNaN(parsed)) return `${parsed.toLocaleString("vi-VN")}₫`;
  return String(val);
}

export default function ProductCard({
  product,
  rank,
  footerAction,
  showSpecs = true,
  className = "",
  imageLoading = "lazy",
}: ProductCardProps) {
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
  const isOutOfStock = product.availability ? product.availability === 'UNAVAILABLE' : product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const inferredCondition =
    product.condition ||
    (/like\s*new|99%|cũ/i.test(product.name) ? "LIKE_NEW" : "NEW");
  const warrantyRibbonText = formatWarrantyRibbon(
    product.warranty,
    inferredCondition
  );

  const detectedBrand = detectBrandName(product);
  const brandTheme = getBrandCardTheme(detectedBrand);
  const effectiveOldPrice = product.originalPrice ?? product.oldPrice;
  const displayName = formatProductTitle(product.name);

  // Derive discount percent number
  const discountPercentNum = (() => {
    if (product.discount) {
      const m = String(product.discount).match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    if (effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price) && Number(product.price) > 0) {
      return Math.round((1 - Number(product.price) / Number(effectiveOldPrice)) * 100);
    }
    return 0;
  })();

  // Format key specs for vertical full-detail readability (only for laptops)
  const isAccessory =
    Boolean(product.template && product.template !== "LAPTOP") ||
    Boolean(product.href && product.href.startsWith("/phu-kien/"));
  const cpu = isAccessory ? "" : formatCpuSpec(product.specs?.cpu);
  const ram = isAccessory ? "" : formatRamSpec(product.specs?.ram);
  const ssd = isAccessory ? "" : formatStorageSpec(product.specs?.ssd);
  const gpu = isAccessory ? "" : formatGpuSpec(product.specs?.gpu);
  const display = isAccessory ? "" : formatDisplaySpec(product.specs?.display);
  const specRows = [
    { label: "CPU", value: cpu },
    { label: "RAM", value: ram },
    { label: "SSD", value: ssd },
    { label: "GPU", value: gpu },
    { label: "Màn hình", value: display },
  ].filter((row) => Boolean(row.value));
  const hasSpecs = specRows.length > 0;

  return (
    <article
      className={`group/product relative flex flex-col h-full rounded-2xl border bg-white ${brandTheme.cardBorder} ${brandTheme.hoverBorder} shadow-xs hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600/40 transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden ${className}`}
    >
      {/* Top Badges Bar: Discount + Condition (Left) & Warranty Ribbon (Right) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-1 p-1.5 sm:p-2 pointer-events-none">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            {rank !== undefined && (
              <Badge variant={rank <= 3 ? "rank-top" : "rank-other"} size="xs" className="text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                #{rank}
              </Badge>
            )}
            {discountPercentNum > 0 && (
              <span className="inline-flex items-center bg-[#e11d48] text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full leading-tight shadow-2xs select-none">
                Giảm {discountPercentNum}%
              </span>
            )}
          </div>
          <ConditionBadge
            condition={inferredCondition}
            fallbackName={product.name}
            size="xs"
            className="text-[9.5px] sm:text-[10.5px] px-2 py-0.5 rounded-full font-bold leading-tight shadow-2xs"
          />
        </div>

        {/* Top-Right Warranty Ribbon (Thế Giới Số style) */}
        <div
          className="inline-flex items-center gap-1 bg-[#001a9c] text-[#fde047] text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-1 rounded-lg shadow-xs shrink-0 leading-none"
          title={product.warranty || warrantyRibbonText}
        >
          <ShieldCheck className="w-3 h-3 text-[#fde047] shrink-0 hidden min-[380px]:inline" />
          <span>{warrantyRibbonText}</span>
        </div>
      </div>

      {/* Product Image Container */}
      <div className="relative aspect-[4/3] w-full bg-white border-b border-slate-100 p-2.5 pt-11 pb-2 sm:p-3.5 sm:pt-12 sm:pb-2.5 flex items-center justify-center overflow-hidden">
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
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                onError={() => setImageError(true)}
                className={`object-contain transition-transform duration-300 scale-[0.92] group-hover/product:scale-[0.97] motion-reduce:transform-none ${
                  isOutOfStock ? "grayscale opacity-60" : ""
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Laptop className="w-12 h-12 stroke-1" />
                <span className="text-[11px] font-medium text-text-muted mt-1">Ảnh đang cập nhật</span>
              </div>
            );
          })()}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] rounded-control z-10">
              <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1 rounded-control shadow-xs">
                Tạm hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Floating Quick Actions (Compare & Wishlist) at bottom-right of image */}
        <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={toggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare ? `Bỏ ${product.name} khỏi so sánh` : `Thêm ${product.name} vào so sánh`
            }
            title={inCompare ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-95 shadow-xs border transition-colors ${
              inCompare
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white/95 text-slate-500 hover:text-blue-600 border-slate-200 hover:bg-blue-50"
            }`}
          >
            <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={liked}
            aria-label={
              liked ? `Bỏ lưu ${product.name}` : `Lưu ${product.name} vào danh sách yêu thích`
            }
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-95 shadow-xs border transition-colors ${
              liked
                ? "bg-red-50 text-error border-red-200"
                : "bg-white/95 text-slate-500 hover:text-error border-slate-200 hover:bg-red-50"
            }`}
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 2.5 : 2} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5 pt-2.5">
        {/* Title */}
        <h3 className="min-h-[36px] sm:min-h-[40px] text-[13px] sm:text-[14.5px] font-bold text-slate-900 leading-[1.38] line-clamp-2 overflow-hidden group-hover/product:text-blue-700 transition-colors">
          <Link
            href={productHref}
            title={product.name}
            className="after:absolute after:inset-0 after:z-10 focus:outline-hidden focus-visible:underline"
          >
            {displayName}
          </Link>
        </h3>

        {/* Inline Price Row: Red Sale Price + Gray Strikethrough Price */}
        <div className="mt-1.5 flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-[15px] sm:text-[17px] font-black text-[#d70018] tabular-nums tracking-tight">
            {product.availability === "CONTACT" ? "Liên hệ" : formatVnd(product.price)}
          </span>
          {effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price) && (
            <span className="text-[11.5px] sm:text-[13px] text-slate-400 line-through tabular-nums font-medium">
              {formatVnd(effectiveOldPrice)}
            </span>
          )}
        </div>

        {/* Stock Status Pill */}
        <div className="mt-1.5">
          {(() => {
            const avail = product.availability || (isOutOfStock ? "UNAVAILABLE" : "AVAILABLE");
            if (avail === "AVAILABLE" && !isOutOfStock) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-bold leading-tight">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  Còn hàng
                </span>
              );
            }
            if (avail === "PREORDER") {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-bold leading-tight">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-hidden="true" />
                  Đặt trước
                </span>
              );
            }
            if (avail === "CONTACT") {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 text-[11px] font-bold leading-tight">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  Liên hệ
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold leading-tight">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                Tạm hết hàng
              </span>
            );
          })()}
        </div>

        {/* Flash Sale Progress Pill (when product is in Flash Sale) */}
        {product.isFlashSale && (
          <div className="mt-2 relative h-5 w-full rounded-full bg-rose-200/90 overflow-hidden flex items-center justify-center shadow-inner">
            <div
              className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#e11d48] via-[#f97316] to-[#facc15] rounded-full"
              aria-hidden="true"
            />
            <span className="relative z-10 text-[10.5px] font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
              🔥 Giá Sốc Giờ Vàng
            </span>
          </div>
        )}

        {/* Detailed Specs List (Thế Giới Số Vertical Format) */}
        {showSpecs && hasSpecs && (
          <dl className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[11.5px] sm:text-[12.5px] leading-snug text-slate-700">
            {specRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-1 min-w-0">
                <dt className="font-bold text-slate-900 shrink-0">{row.label}:</dt>
                <dd className="text-slate-700 font-medium break-words min-w-0 line-clamp-1" title={row.value}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Optional Custom Action Slot (e.g. Wishlist Add To Cart) */}
        {footerAction && (
          <div className="mt-auto pt-2.5 border-t border-slate-100 relative z-20">
            {footerAction}
          </div>
        )}
      </div>
    </article>
  );
}
