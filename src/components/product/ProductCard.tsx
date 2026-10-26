"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Laptop, Cpu, Scale } from "lucide-react";
import { useOptionalWishlist } from "@/context/WishlistContext";
import { useOptionalCompare } from "@/context/CompareContext";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import { SpecChip } from "@/components/ui/SpecChip";
import { ConditionBadge } from "@/components/ui/ConditionBadge";
import { StockBadge } from "@/components/ui/StockBadge";
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

function formatWarranty(val?: string, fallback = "BH 12T"): string {
  if (!val) return fallback;
  return val
    .replace(/^Bảo hành\s*/i, "BH ")
    .replace(/\s*tháng/i, "T")
    .replace(/\s*chính\s*hãng/i, " hãng")
    .replace(/\s*(1\s*đổi\s*1|tại|toàn\s*diện).*$/i, "")
    .trim();
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
      const res = compareCtx.addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug || product.id,
        price: Number(product.price) || 0,
        image: product.image,
        template: product.template,
      });
      if (!res.success && res.message) {
        alert(res.message);
      }
    }
  };

  const variantQuery = product.sku ? `?sku=${encodeURIComponent(product.sku)}` : (product.variantId ? `?variant=${encodeURIComponent(product.variantId)}` : "");
  const productHref = getProductHref(product) + variantQuery;
  const isOutOfStock = product.availability ? product.availability === 'UNAVAILABLE' : product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const warrantyText = formatWarranty(
    product.warranty,
    "BH hãng"
  );

  // Format key specs for density & clarity
  const cpu = formatCpuSpec(product.specs?.cpu);
  const gpu = formatGpuSpec(product.specs?.gpu);
  const ram = formatRamSpec(product.specs?.ram);
  const ssd = formatStorageSpec(product.specs?.ssd);
  const display = formatDisplaySpec(product.specs?.display);
  const hasSpecs = Boolean(cpu || gpu || ram || ssd || display);

  return (
    <article
      className={`group/product relative flex flex-col h-full bg-white rounded-2xl border border-slate-300 shadow-xs hover:border-blue-500 hover:shadow-[0_6px_18px_-8px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600/40 transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden ${className}`}
    >
      {/* Top Badges Bar: Rank, Condition, Discount & Wishlist */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex flex-wrap items-center gap-1 max-w-[80%]">
          {/* Rank Badge */}
          {rank !== undefined && (
            <Badge variant={rank <= 3 ? "rank-top" : "rank-other"} size="xs">
              #{rank}
            </Badge>
          )}

          {/* Condition Badge (Standardized Citilap Core) */}
          <ConditionBadge condition={product.condition} fallbackName={product.name} size="xs" />

          {/* Discount Badge */}
          {(product.discount || (product.isOnSale && product.originalPrice && Number(product.originalPrice) > Number(product.price))) && (
            <Badge
              variant="sale"
              size="xs"
              className={badgeColor ? badgeColor : undefined}
            >
              {product.discount
                ? (product.discount.startsWith("-") ? product.discount : `-${product.discount}`)
                : `-${Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100)}%`}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Compare Button */}
          <button
            type="button"
            onClick={toggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare ? `Bỏ ${product.name} khỏi so sánh` : `Thêm ${product.name} vào so sánh`
            }
            title={inCompare ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
            className={`w-8 h-8 rounded-pill flex items-center justify-center transition-[background-color,border-color,transform] duration-150 shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${
              inCompare
                ? "bg-blue-600 text-white border border-blue-600"
                : "bg-white/90 backdrop-blur-xs text-text-muted hover:text-blue-600 hover:bg-blue-50/80 border border-border-default"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
          </button>

          {/* Wishlist Button (Accessible, not nested inside Link) */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={liked}
            aria-label={
              liked ? `Bỏ lưu ${product.name}` : `Lưu ${product.name} vào danh sách yêu thích`
            }
            className={`w-8 h-8 rounded-pill flex items-center justify-center transition-[background-color,border-color,transform] duration-150 shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden ${
              liked
                ? "bg-red-50 text-error border border-red-200"
                : "bg-white/90 backdrop-blur-xs text-text-muted hover:text-error hover:bg-red-50/80 border border-border-default"
            }`}
          >
            <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 2.5 : 2} />
          </button>
        </div>
      </div>

      {/* Product Image Container */}
      <div className="relative aspect-[4/3] w-full border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3 pt-11 sm:p-4 sm:pt-10 flex items-center justify-center overflow-hidden">
        <div className="relative block w-full h-full">
          {product.image && !imageError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImageError(true)}
              className={`object-contain transition-transform duration-300 group-hover/product:scale-105 motion-reduce:transform-none ${
                isOutOfStock ? "grayscale opacity-60" : ""
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <Laptop className="w-14 h-14 stroke-1" />
              <span className="text-caption font-medium text-text-muted mt-1">Ảnh đang cập nhật</span>
            </div>
          )}

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
      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5">
        {/* Brand or Series line if present */}
        {(product.brand || product.series) && (
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 truncate">
            {[product.brand, product.series].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Title */}
        <h3 className="text-[13px] sm:text-sm font-semibold text-slate-900 leading-5 line-clamp-2 min-h-10 group-hover/product:text-blue-700 transition-colors">
          <Link
            href={productHref}
            title={product.name}
            className="after:absolute after:inset-0 after:z-10 focus:outline-hidden focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>

        {/* Price Row */}
        <PriceTag
          price={product.availability === 'CONTACT' ? 'Liên hệ' : product.price}
          originalPrice={product.originalPrice ?? product.oldPrice}
          size="md"
          className="mt-2 mb-3"
          priceClassName="tabular-nums"
        />

        {/* Specs Matrix - High Density & Easy to Scan */}
        {showSpecs && hasSpecs && (
          <div className="mt-2.5 pt-2 border-t border-border-default grid grid-cols-2 gap-1 text-caption text-text-secondary">
            {cpu && (
              <SpecChip
                icon={<Cpu className="w-3 h-3 text-text-muted shrink-0" />}
                value={cpu}
                title={`CPU: ${product.specs?.cpu || cpu}`}
              />
            )}
            {gpu && (
              <SpecChip
                highlight
                value={gpu}
                title={`GPU: ${product.specs?.gpu || gpu}`}
              />
            )}
            {(ram || ssd) && (
              <SpecChip
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
                value={display}
                title={`Màn hình: ${product.specs?.display || display}`}
              />
            )}
          </div>
        )}

        {/* Footer Meta: Warranty & Stock Status */}
        <div className="mt-auto pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 text-caption">
          {/* Warranty tag */}
          <div
            className="flex items-center gap-1 text-text-secondary font-medium truncate min-w-0"
            title={product.warranty || warrantyText}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="truncate">{warrantyText}</span>
          </div>

          {/* Standardized Stock Indicator */}
          {product.availability ? (
            <span className="text-[10px] sm:text-[11px] font-medium text-text-secondary">
              {({AVAILABLE:'Nhận yêu cầu mua',PREORDER:'Nhận đặt trước',CONTACT:'Liên hệ tư vấn',UNAVAILABLE:'Tạm ngừng nhận đơn'} as Record<string,string>)[product.availability] || 'Chưa cập nhật'}
            </span>
          ) : (
            <StockBadge stock={product.stock} variant="indicator" />
          )}
        </div>

        {/* Optional Custom Action Slot (e.g. Wishlist Add To Cart) */}
        {footerAction && (
          <div className="mt-2.5 pt-2 border-t border-border-default relative z-20">
            {footerAction}
          </div>
        )}
      </div>
    </article>
  );
}
