"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Laptop, Cpu, Scale, Gpu, MemoryStick, Monitor } from "lucide-react";
import { useOptionalWishlist } from "@/context/WishlistContext";
import { useOptionalCompare } from "@/context/CompareContext";
import { Badge } from "@/components/ui/Badge";
import { SpecChip } from "@/components/ui/SpecChip";
import { ConditionBadge } from "@/components/ui/ConditionBadge";
import { StockBadge } from "@/components/ui/StockBadge";
import { BrandLogo, detectBrandName, getBrandCardTheme } from "@/components/ui/BrandLogo";
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
  warranty?: string; // e.g. "BH 12 tháng"
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
}

/**
 * Smart spec formatters to keep cards dense, legible, and unclipped on mobile & desktop grids
 */
function formatCpuSpec(val?: string): string {
  if (!val) return "";
  let s = val.split(/[\/,;]/)[0].trim();
  s = s
    .replace(/^Intel\s+/i, "")
    .replace(/^AMD\s+/i, "")
    .replace(/^Core\s+/i, "")
    .replace(/Ryzen\s*(?:AI\s*)?(\d)\s*[-–—]?\s*/i, "R$1-")
    .replace(/Ultra\s*(\d)\s*[-–—]?\s*/i, "U$1-")
    .replace(/i(\d)\s*[-–—]?\s*(\d)/i, "i$1-$2")
    .replace(/--+/g, "-")
    .replace(/-+$/, "")
    .trim();
  return s;
}

function formatGpuSpec(val?: string): string {
  if (!val) return "";
  return val
    .replace(/^NVIDIA\s+/i, "")
    .replace(/^GeForce\s+/i, "")
    .replace(/^Intel\s+/i, "")
    .replace(/\s+Graphics/i, "")
    .replace(/\s+\d+GB(\s+GDDR\d+)?/i, "") // strip trailing "8GB" or "8GB GDDR6"
    .replace(/\s+Laptop\s+GPU/i, "")
    .trim();
}

function formatRamSpec(val?: string): string {
  if (!val) return "";
  const match = val.match(/(\d+)\s*GB/i);
  return match ? `${match[1]}GB` : val.split(" ")[0] || val;
}

function formatStorageSpec(val?: string): string {
  if (!val) return "";
  const matchTb = val.match(/(\d+)\s*TB/i);
  if (matchTb) return `${matchTb[1]}TB`;
  const matchGb = val.match(/(\d+)\s*GB/i);
  if (matchGb) return `${matchGb[1]}GB`;
  return val.replace(/SSD|NVMe|PCIe/gi, "").trim();
}

function formatDisplaySpec(val?: string): string {
  if (!val) return "";
  const sizeMatch = val.match(/^(\d+(?:\.\d+)?)\s*(?:inch|"|\s)/i) || val.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
  const size = sizeMatch ? `${sizeMatch[1].replace(/\.0$/, "")}"` : "";

  let res = "";
  if (/4K|UHD/i.test(val)) res = "4K";
  else if (/2\.5K/i.test(val)) res = "2.5K";
  else if (/2K|QHD\+?/i.test(val)) res = "2K";
  else if (/FHD\+?/i.test(val)) res = "FHD";
  else if (/Retina/i.test(val)) res = "Retina";
  else if (/OLED/i.test(val)) res = "OLED";

  if (size && res) return `${size} ${res}`;
  if (size) return size;
  return val.replace(/\s*inch\b/gi, '"').trim();
}

function formatWarranty(val?: string, fallback = "BH 12 tháng"): string {
  if (!val || !val.trim()) return fallback;
  const raw = val.trim();
  const isBrand = /hãng|manufacturer|brand/i.test(raw);
  const monthsMatch = raw.match(/(\d+)\s*(?:tháng|t\b)/i);
  if (monthsMatch) {
    return isBrand ? `BH Hãng ${monthsMatch[1]} tháng` : `BH ${monthsMatch[1]} tháng`;
  }
  if (/^BH\s+hãng$/i.test(raw)) return "BH Hãng 12 tháng";
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
  badgeColor,
  rank,
  footerAction,
  showSpecs = true,
  className = "",
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
  const warrantyText = formatWarranty(
    product.warranty,
    "BH 12 tháng"
  );

  // Intelligent brand detection & delicate pastel styling
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

  // Format key specs for density & clarity (only for laptops)
  const isAccessory =
    Boolean(product.template && product.template !== "LAPTOP") ||
    Boolean(product.href && product.href.startsWith("/phu-kien/"));
  const cpu = isAccessory ? "" : formatCpuSpec(product.specs?.cpu);
  const gpu = isAccessory ? "" : formatGpuSpec(product.specs?.gpu);
  const ram = isAccessory ? "" : formatRamSpec(product.specs?.ram);
  const ssd = isAccessory ? "" : formatStorageSpec(product.specs?.ssd);
  const display = isAccessory ? "" : formatDisplaySpec(product.specs?.display);
  const hasSpecs = Boolean(cpu || gpu || ram || ssd || display);

  return (
    <article
      className={`group/product relative flex flex-col h-full rounded-2xl border-2 ${brandTheme.cardBg} ${brandTheme.cardBorder} ${brandTheme.hoverBorder} shadow-xs hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600/40 transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden ${className}`}
    >
      {/* Top Badges Bar: Rank, Condition & Compare, Wishlist (compact, no overlap) */}
      <div className="absolute top-1.5 left-1.5 right-1.5 sm:left-2 sm:right-2 z-20 flex items-center justify-between gap-1 pointer-events-none">
        <div className="flex items-center gap-1 min-w-0 shrink">
          {/* Rank Badge */}
          {rank !== undefined && (
            <Badge variant={rank <= 3 ? "rank-top" : "rank-other"} size="xs" className="text-[9px] px-1 py-0.5 rounded-[2px] font-bold shrink-0">
              #{rank}
            </Badge>
          )}

          {/* Condition Badge (Standardized Citilap Core: Mới 100%, LikeNew 99%) */}
          <ConditionBadge condition={product.condition} fallbackName={product.name} size="xs" className="text-[8.5px] sm:text-[9.5px] px-1 sm:px-1.5 py-0.5 rounded-[2px] font-bold leading-tight truncate max-w-full" />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pointer-events-auto">
          {/* Compare Button */}
          <button
            type="button"
            onClick={toggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare ? `Bỏ ${product.name} khỏi so sánh` : `Thêm ${product.name} vào so sánh`
            }
            title={inCompare ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 -m-1 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 sm:before:w-8 sm:before:h-8 before:rounded-full before:shadow-xs before:transition-[background-color,border-color,transform] before:duration-150 ${
              inCompare
                ? "text-white before:bg-blue-600 before:border before:border-blue-600"
                : "text-text-muted hover:text-blue-600 before:bg-white/95 before:backdrop-blur-xs hover:before:bg-blue-50/80 before:border before:border-border-default"
            }`}
          >
            <Scale className="relative z-10 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={liked}
            aria-label={
              liked ? `Bỏ lưu ${product.name}` : `Lưu ${product.name} vào danh sách yêu thích`
            }
            className={`relative w-9 h-9 sm:w-10 sm:h-10 -m-1 rounded-full flex items-center justify-center cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden before:content-[''] before:absolute before:w-7 before:h-7 sm:before:w-8 sm:before:h-8 before:rounded-full before:shadow-xs before:transition-[background-color,border-color,transform] before:duration-150 ${
              liked
                ? "text-error before:bg-red-50 before:border before:border-red-200"
                : "text-text-muted hover:text-error before:bg-white/95 before:backdrop-blur-xs hover:before:bg-red-50/80 before:border before:border-border-default"
            }`}
          >
            <Heart className="relative z-10 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 2.5 : 2} />
          </button>
        </div>
      </div>

      {/* Product Image Container */}
      <div className={`relative aspect-[4/3] w-full border-b border-black/[0.04] ${brandTheme.imageBg} p-2.5 pt-7 pb-1.5 sm:p-3.5 sm:pt-7 sm:pb-2 flex items-center justify-center overflow-hidden`}>
        <div className="relative block w-full h-full">
          {(() => {
            const rawImage = product.thumbnailUrl || product.image || (product as { primaryImage?: string }).primaryImage || null;
            const cardImage = product.thumbnailUrl || (rawImage && rawImage.startsWith('/api/library/') && !rawImage.includes('?') ? `${rawImage}?size=thumb&v=2` : rawImage);
            return cardImage && !imageError ? (
              <Image
                src={cardImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                onError={() => setImageError(true)}
                className={`object-contain transition-transform duration-300 scale-[0.88] group-hover/product:scale-[0.94] motion-reduce:transform-none ${
                  isOutOfStock ? "grayscale opacity-60" : ""
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Laptop className="w-14 h-14 stroke-1" />
                <span className="text-caption font-medium text-text-muted mt-1">Ảnh đang cập nhật</span>
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
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 pt-2">
        {/* Top Content: Brand Card (Left) & Old Struck Price + Discount % (Right) */}
        <div className="flex flex-col">
          {/* Row directly under image: Brand Card on left, Struck Old Price + Red Discount % on right */}
          <div className="flex items-center justify-between gap-1.5 h-6 mb-1">
            <div className="flex items-center min-w-0 truncate">
              <BrandLogo brand={detectedBrand} series={product.series} />
            </div>

            {/* Struck Old Price + Red Discount % tag side-by-side */}
            {effectiveOldPrice && Number(effectiveOldPrice) > Number(product.price) && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[12.5px] sm:text-[14px] text-slate-500 line-through tabular-nums font-bold">
                  {formatVnd(effectiveOldPrice)}
                </span>
                {discountPercent && (
                  <span className="bg-[#D71920] text-white font-black text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-[3px] leading-none select-none tracking-tight shadow-xs">
                    {discountPercent}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Title - fixed 2-line height (h-10 sm:h-11) so 1-line and 2-line titles occupy exact same space */}
          <h3 className="h-10 sm:h-11 text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 overflow-hidden group-hover/product:text-blue-700 transition-colors">
            <Link
              href={productHref}
              title={product.name}
              className="after:absolute after:inset-0 after:z-10 focus:outline-hidden focus-visible:underline"
            >
              {displayName}
            </Link>
          </h3>

          {/* Red Price Card: Directly below title, horizontally centered */}
          <div className="mt-2 mb-2 sm:mb-2.5">
            <div className="w-full bg-[#D71920] hover:bg-[#c0141a] text-white font-extrabold py-1.5 sm:py-2 px-3 rounded-lg sm:rounded-xl shadow-xs flex items-center justify-center text-sm sm:text-base tracking-tight select-none transition-colors">
              <span className="tabular-nums">
                {product.availability === 'CONTACT' ? 'Liên hệ' : formatVnd(product.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Pinned Section: Cấu hình (Specs) & Bảo hành (Warranty) ALWAYS pinned to bottom */}
        <div className="mt-auto flex flex-col justify-end pt-2">
          {/* Specs Matrix - High Density & Easy to Scan */}
          {showSpecs && hasSpecs && (
            <div className="grid grid-cols-2 gap-1 text-caption text-text-secondary mb-2 pt-2 border-t border-black/[0.06] min-h-[52px]">
              {cpu && (
                <SpecChip
                  icon={<Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  value={cpu}
                  title={`CPU: ${product.specs?.cpu || cpu}`}
                />
              )}
              {gpu && (
                <SpecChip
                  icon={<Gpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  highlight
                  value={gpu}
                  title={`GPU: ${product.specs?.gpu || gpu}`}
                />
              )}
              {(ram || ssd) && (
                <SpecChip
                  icon={<MemoryStick className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
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
                  icon={<Monitor className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  value={display}
                  title={`Màn hình: ${product.specs?.display || display}`}
                />
              )}
            </div>
          )}

          {/* Footer Meta: Warranty & Stock Status */}
          <div className="pt-2 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 text-caption">
            {/* Warranty tag */}
            <div
              className="flex items-center gap-1 text-slate-700 font-medium truncate min-w-0"
              title={product.warranty || warrantyText}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{warrantyText}</span>
            </div>

            {/* Standardized Stock Indicator */}
            {product.availability ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold ${
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
                  ? (product.stock !== undefined && product.stock !== null && product.stock <= 0 ? 'Tạm hết hàng' : 'Sẵn hàng')
                  : ({
                      PREORDER: 'Đặt trước',
                      CONTACT: 'Liên hệ',
                      UNAVAILABLE: 'Tạm hết hàng',
                    } as Record<string, string>)[product.availability] || 'Sẵn hàng'}
              </span>
            ) : (
              <StockBadge stock={product.stock} variant="indicator" />
            )}
          </div>

          {/* Optional Custom Action Slot (e.g. Wishlist Add To Cart) */}
          {footerAction && (
            <div className="mt-2.5 pt-2 border-t border-black/[0.06] relative z-20">
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
