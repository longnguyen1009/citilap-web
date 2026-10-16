"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Laptop, Cpu, Scale } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import { SpecChip } from "@/components/ui/SpecChip";
import { ConditionBadge, resolveConditionMeta } from "@/components/ui/ConditionBadge";
import { StockBadge } from "@/components/ui/StockBadge";

export type ProductCardProduct = {
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
  return val
    .replace(/^Intel\s+/i, "")
    .replace(/^AMD\s+/i, "")
    .replace(/^Core\s+/i, "")
    .replace(/Ryzen\s*(\d)\s*/i, "R$1-")
    .replace(/Ultra\s*(\d)\s*/i, "U$1-")
    .replace(/i(\d)\s+(\d)/i, "i$1-$2")
    .trim();
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
  const sizeMatch = val.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
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
    .replace(/\s*(1\s*đổi\s*1|tại|chính|hãng|toàn\s*diện).*$/i, "")
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
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const liked = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const [imageError, setImageError] = useState(false);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        productId: product.id,
        name: product.name,
        price: typeof product.price === "number" ? `${product.price.toLocaleString("vi-VN")}đ` : product.price,
        image: product.image || "/images/placeholder-laptop.svg",
      });
    }
  };

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.id);
    } else {
      const res = addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug || product.id,
        price: Number(product.price) || 0,
        image: product.image,
        kind: product.specs?.cpu ? "LAPTOP" : "ACCESSORY",
      });
      if (!res.success && res.message) {
        alert(res.message);
      }
    }
  };

  const variantQuery = product.sku ? `?sku=${encodeURIComponent(product.sku)}` : (product.variantId ? `?variant=${encodeURIComponent(product.variantId)}` : "");
  const productHref = product.slug ? `/product/${product.slug}${variantQuery}` : `/product/${product.id}${variantQuery}`;
  const conditionMeta = resolveConditionMeta(product.condition, product.name);
  const isLikeNew = conditionMeta.code === "LIKE_NEW" || conditionMeta.code === "USED";
  const isOutOfStock = product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const warrantyText = formatWarranty(
    product.warranty,
    isLikeNew ? "BH 06-12 tháng" : "BH 12-24 tháng"
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
      className={`group relative flex flex-col h-full bg-white rounded-card border border-border-default hover:border-border-strong hover:shadow-card-hover transition-all duration-200 overflow-hidden ${className}`}
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
            className={`w-8 h-8 rounded-pill flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
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
            className={`w-8 h-8 rounded-pill flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
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
      <div className="relative aspect-[4/3] w-full bg-surface-subtle p-4 pt-8 flex items-center justify-center overflow-hidden">
        <Link
          href={productHref}
          className="relative block w-full h-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          {product.image && !imageError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImageError(true)}
              className={`object-contain transition-transform duration-300 group-hover:scale-105 ${
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
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] rounded-control">
              <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1 rounded-control shadow-xs">
                Tạm hết hàng
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-3">
        {/* Brand or Series line if present */}
        {(product.brand || product.series) && (
          <p className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-0.5 truncate">
            {[product.brand, product.series].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Title */}
        <h3 className="text-body-sm font-medium text-text-primary leading-snug line-clamp-2 min-h-[38px] group-hover:text-brand-primary transition-colors">
          <Link href={productHref} title={product.name}>
            {product.name}
          </Link>
        </h3>

        {/* Price Row */}
        <PriceTag
          price={product.price}
          originalPrice={product.originalPrice ?? product.oldPrice}
          size="md"
          className="mt-2"
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
        <div className="mt-auto pt-2.5 border-t border-border-default flex items-center justify-between text-caption">
          {/* Warranty tag */}
          <div
            className="flex items-center gap-1 text-text-secondary font-medium truncate"
            title={product.warranty || warrantyText}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="truncate">{warrantyText}</span>
          </div>

          {/* Standardized Stock Indicator */}
          <StockBadge stock={product.stock} variant="indicator" />
        </div>

        {/* Optional Custom Action Slot (e.g. Wishlist Add To Cart) */}
        {footerAction && (
          <div className="mt-2.5 pt-2 border-t border-border-default">
            {footerAction}
          </div>
        )}
      </div>
    </article>
  );
}
