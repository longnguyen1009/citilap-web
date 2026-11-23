'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Zap,
  Ticket,
  Copy,
  Check,
  Clock,
  Store,
  ShoppingBag,
  Search,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { PublicCouponDto } from '@/contracts/coupon';
import { useCart } from '@/context/CartContext';
import './black-friday.css';

export interface BlackFridayProduct {
  id: string;
  variantId: string | null;
  sku: string | null;
  name: string;
  slug: string;
  brand: string;
  price: number; // Base selling price
  flashSalePrice: number; // Default -399k flash sale price
  originalPrice: number | null;
  image: string | null;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  storage: string | null;
  display: string | null;
  warranty: string | null;
}

interface BlackFridayClientProps {
  products: BlackFridayProduct[];
  coupons: PublicCouponDto[];
  eventStartIso: string;
  eventEndIso: string;
}

const DEFAULT_FLASH_DISCOUNT = 399_000;

function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

function getCountdownParts(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export default function BlackFridayClient({
  products,
  coupons,
  eventStartIso,
  eventEndIso,
}: BlackFridayClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<'ALL' | 'UNDER_20' | '20_30' | '30_40' | 'OVER_40'>('ALL');
  const [sortBy, setSortBy] = useState<'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC'>('FEATURED');

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startMs = Date.parse(eventStartIso);
  const endMs = Date.parse(eventEndIso);
  const eventPhase: 'UPCOMING' | 'LIVE' | 'ENDED' =
    nowMs < startMs ? 'UPCOMING' : nowMs <= endMs ? 'LIVE' : 'ENDED';
  const countdown = getCountdownParts(eventPhase === 'UPCOMING' ? startMs : endMs, nowMs);

  const brandTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const b = p.brand || 'Khác';
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    const ordered = ['Lenovo', 'Honor', 'Acer', 'Asus', 'Dell', 'Huawei'].filter((b) => counts.has(b));
    return [
      { id: 'ALL', label: `Tất cả LikeNew (${products.length})` },
      ...ordered.map((b) => ({ id: b, label: `${b} (${counts.get(b)})` })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (activeBrand !== 'ALL' && p.brand !== activeBrand) return false;
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.cpu || ''} ${p.gpu || ''} ${p.ram || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priceRange === 'UNDER_20' && p.flashSalePrice >= 20_000_000) return false;
      if (priceRange === '20_30' && (p.flashSalePrice < 20_000_000 || p.flashSalePrice >= 30_000_000)) return false;
      if (priceRange === '30_40' && (p.flashSalePrice < 30_000_000 || p.flashSalePrice >= 40_000_000)) return false;
      if (priceRange === 'OVER_40' && p.flashSalePrice < 40_000_000) return false;
      return true;
    });
    if (sortBy === 'PRICE_ASC') return [...list].sort((a, b) => a.flashSalePrice - b.flashSalePrice);
    if (sortBy === 'PRICE_DESC') return [...list].sort((a, b) => b.flashSalePrice - a.flashSalePrice);
    return list;
  }, [products, activeBrand, searchQuery, priceRange, sortBy]);

  const handleSaveVoucher = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    try {
      sessionStorage.setItem('citilap-saved-coupon-v1', code);
    } catch {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleBuyNow = (p: BlackFridayProduct) => {
    addToCart({
      id: p.variantId ? `${p.id}-${p.variantId}` : p.id,
      productId: p.id,
      variantId: p.variantId || undefined,
      name: p.name,
      price: p.flashSalePrice,
      displayPrice: formatVnd(p.flashSalePrice),
      image: p.image || '',
      quantity: 1,
    });
    router.push('/checkout');
  };

  // Fallback display coupons if DB hasn't been seeded yet
  const displayCoupons: PublicCouponDto[] = coupons.length
    ? coupons
    : [
        {
          id: 'bf999',
          code: 'BF999',
          name: 'Siêu Deal Black Friday Giảm 999K',
          description: 'Áp dụng trực tiếp vào giá bán cho tất cả Laptop LikeNew 99%',
          discountType: 'FIXED',
          discountValue: 999_000,
          maxDiscountAmount: null,
          minOrderAmount: 0,
          quantityLimit: 20,
          usedCount: 0,
          remaining: 20,
          startAt: eventStartIso,
          endAt: eventEndIso,
          applyScope: 'CONDITION_LIKE_NEW',
          isExhausted: false,
        },
        {
          id: 'bf599',
          code: 'BF599',
          name: 'Deal Hot Black Friday Giảm 599K',
          description: 'Áp dụng trực tiếp vào giá bán cho tất cả Laptop LikeNew 99%',
          discountType: 'FIXED',
          discountValue: 599_000,
          maxDiscountAmount: null,
          minOrderAmount: 0,
          quantityLimit: 50,
          usedCount: 0,
          remaining: 50,
          startAt: eventStartIso,
          endAt: eventEndIso,
          applyScope: 'CONDITION_LIKE_NEW',
          isExhausted: false,
        },
        {
          id: 'bf399',
          code: 'BF399',
          name: 'Deal Black Friday Giảm 399K',
          description: 'Áp dụng trực tiếp vào giá bán cho tất cả Laptop LikeNew 99%',
          discountType: 'FIXED',
          discountValue: 399_000,
          maxDiscountAmount: null,
          minOrderAmount: 0,
          quantityLimit: 100,
          usedCount: 0,
          remaining: 100,
          startAt: eventStartIso,
          endAt: eventEndIso,
          applyScope: 'CONDITION_LIKE_NEW',
          isExhausted: false,
        },
      ];

  return (
    <div className="min-h-screen bg-[#0b0b10] text-slate-100 pb-20">
      {/* 1. HERO BANNER — CellphoneS Black Fire-Day inspired */}
      <section className="relative overflow-hidden border-b border-red-900/40 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.38)_0%,_rgba(15,10,16,0.96)_60%,_#0b0b10_100%)]">
        <div className="container mx-auto max-w-[1370px] px-4 py-10 md:py-14 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600/30 to-amber-500/20 border border-red-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Black Fire-Day 2026 • Lớn Nhất Năm Tại CitiLap</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.12] text-white">
                BLACK FRIDAY{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                  LIKENEW 99%
                </span>
                <br />
                SĂN DEAL GIẢM TỚI 999K
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Diễn ra duy nhất từ <strong className="text-amber-300">Thứ 4 đến Chủ Nhật (25/11 – 29/11/2026)</strong>.
                Áp dụng toàn bộ <strong className="text-white">{products.length} mẫu Laptop LikeNew 99%</strong> có sẵn tại showroom và website:
                <strong className="text-amber-300"> 20 deal giảm 999K • 50 deal giảm 599K • 100 deal giảm 399K</strong> trực tiếp vào giá bán!
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <a
                  href="#voucher-vault"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-sm shadow-lg shadow-red-900/40 transition"
                >
                  <Ticket className="w-4 h-4" />
                  Săn Mã Giảm 999K Ngay
                </a>
                <a
                  href="#flash-sale-deals"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Xem {products.length} Máy Flash Sale
                </a>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-black/55 backdrop-blur-md p-6 shadow-2xl shadow-red-950/50">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-300 mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-red-500" />
                  {eventPhase === 'UPCOMING'
                    ? 'Chương trình mở bán sau'
                    : eventPhase === 'LIVE'
                      ? 'Đang diễn ra • Kết thúc sau'
                      : 'Chương trình đã kết thúc'}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px]">25/11 – 29/11</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 text-center">
                {[
                  { val: countdown.days, label: 'Ngày' },
                  { val: countdown.hours, label: 'Giờ' },
                  { val: countdown.minutes, label: 'Phút' },
                  { val: countdown.seconds, label: 'Giây' },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="rounded-xl bg-gradient-to-b from-red-950/90 to-black border border-red-500/30 py-3 px-2"
                  >
                    <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{unit.val}</div>
                    <div className="text-[11px] font-semibold text-amber-300/90 uppercase mt-0.5">{unit.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="font-black text-amber-300">20 SUẤT</div>
                  <div className="text-slate-400 text-[11px]">Giảm 999K</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="font-black text-orange-300">50 SUẤT</div>
                  <div className="text-slate-400 text-[11px]">Giảm 599K</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="font-black text-red-300">100 SUẤT</div>
                  <div className="text-slate-400 text-[11px]">Giảm 399K</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VOUCHER VAULT — Kho Mã Giảm Giá Black Friday */}
      <section id="voucher-vault" className="container mx-auto max-w-[1370px] px-4 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Kho Mã Giảm Giá Trực Tiếp • Hết Mã Ngừng Áp Dụng</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              SĂN VOUCHER BLACK FRIDAY ĐẾN 999.000Đ
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Áp dụng cả <strong className="text-white">mua Online</strong> (nhập mã lúc thanh toán) &amp;{' '}
            <strong className="text-white">tại Showroom</strong> (đọc mã cho nhân viên)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayCoupons.slice(0, 3).map((c, idx) => {
            const isTop = idx === 0;
            const total = c.quantityLimit ?? 100;
            const remaining = c.remaining ?? total;
            const usedPct = total > 0 ? Math.min(100, Math.round((c.usedCount / total) * 100)) : 0;
            const isCopied = copiedCode === c.code;
            return (
              <div
                key={c.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between gap-4 transition ${
                  isTop
                    ? 'bg-gradient-to-br from-red-950/90 via-[#1a0d12] to-[#120b14] border-amber-400/50 shadow-xl shadow-red-950/40'
                    : 'bg-gradient-to-br from-slate-900/95 to-[#12121a] border-white/12 hover:border-red-500/40'
                }`}
              >
                {isTop && (
                  <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[11px] font-black uppercase shadow">
                    HOT NHẤT • SỐ LƯỢNG CÓ HẠN
                  </span>
                )}

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        {c.quantityLimit ? `${c.quantityLimit} DEAL DUY NHẤT` : 'ƯU ĐÃI ĐẶC BIỆT'}
                      </div>
                      <div className="text-3xl font-black text-white mt-1">
                        GIẢM{' '}
                        <span className="text-amber-400">
                          {c.discountType === 'PERCENT' ? `${c.discountValue}%` : `${Math.round(c.discountValue / 1000)}K`}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-dashed border-amber-400/60 font-mono font-black text-amber-300 text-sm">
                      {c.code}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {c.description || 'Trừ trực tiếp vào giá bán cho tất cả các mã Laptop LikeNew 99% có sẵn.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className={c.isExhausted ? 'text-red-400' : 'text-amber-300'}>
                        {c.isExhausted ? 'Đã hết suất áp dụng' : `Còn ${remaining} / ${total} suất`}
                      </span>
                      <span className="text-slate-400">Đã dùng {usedPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isTop
                            ? 'bg-gradient-to-r from-amber-400 to-red-500'
                            : 'bg-gradient-to-r from-orange-500 to-red-600'
                        }`}
                        style={{ width: `${Math.max(8, usedPct)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={c.isExhausted}
                    onClick={() => handleSaveVoucher(c.code)}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                      c.isExhausted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isCopied
                          ? 'bg-emerald-600 text-white'
                          : isTop
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {c.isExhausted ? (
                      'Đã hết mã'
                    ) : isCopied ? (
                      <>
                        <Check className="w-4 h-4" /> Đã lưu &amp; Sao chép ({c.code})
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Lưu &amp; Sao chép mã {c.code}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FLASH SALE LIKENEW 99% GRID */}
      <section id="flash-sale-deals" className="container mx-auto max-w-[1370px] px-4 pt-12">
        <div className="rounded-3xl border border-red-500/25 bg-gradient-to-b from-[#170c12] via-[#111118] to-[#0e0e14] p-4 sm:p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-red-400 text-xs font-black uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Flash Sale Black Friday • Mặc Định Giảm 399K</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                TOÀN BỘ LAPTOP LIKENEW 99% ĐANG SALE SỐC
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Giá hiển thị đã giảm mặc định <strong className="text-amber-300">399.000đ</strong>. Nhập thêm mã{' '}
                <strong className="text-white">BF999 / BF599 / BF399</strong> ở bước thanh toán để nhận mức giá ưu đãi thực tế!
              </p>
            </div>
          </div>

          {/* Accessible Single-Row Scrollable Brand Tabs */}
          <div className="mt-5">
            <div role="tablist" aria-label="Lọc laptop Black Friday theo thương hiệu" className="bf-tablist border-b border-white/10">
              {brandTabs.map((tab) => {
                const selected = activeBrand === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`bf-tab-${tab.id}`}
                    aria-selected={selected}
                    onClick={() => setActiveBrand(tab.id)}
                    className="bf-tab"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Price Filter, Sort */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh theo tên máy, CPU (i9, R7, Ultra 5...), GPU (4060, 5060)..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Lọc:
              </span>
              <select
                aria-label="Lọc theo khoảng giá"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as typeof priceRange)}
                className="rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="ALL">Mọi tầm giá</option>
                <option value="UNDER_20">Dưới 20 triệu</option>
                <option value="20_30">20 – 30 triệu</option>
                <option value="30_40">30 – 40 triệu</option>
                <option value="OVER_40">Trên 40 triệu</option>
              </select>

              <select
                aria-label="Sắp xếp sản phẩm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="FEATURED">Nổi bật</option>
                <option value="PRICE_ASC">Giá tăng dần</option>
                <option value="PRICE_DESC">Giá giảm dần</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div
            role="tabpanel"
            aria-labelledby={`bf-tab-${activeBrand}`}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                Không tìm thấy mẫu laptop nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const withBf999 = Math.max(0, p.price - 999_000);
                return (
                  <article
                    key={p.id}
                    className="group rounded-2xl bg-white text-slate-900 overflow-hidden border border-white/10 shadow-md hover:shadow-xl hover:shadow-red-900/30 transition flex flex-col"
                  >
                    <Link
                      href={`/san-pham/${p.slug}`}
                      className="relative aspect-[4/3] bg-slate-50 block overflow-hidden p-3"
                    >
                      <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-orange-600 text-white text-[10px] font-black uppercase shadow-sm">
                          -399K FLASH SALE
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-300 text-[10px] font-bold uppercase">
                          LikeNew 99%
                        </span>
                      </div>
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-contain p-3 group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          CitiLap LikeNew
                        </div>
                      )}
                    </Link>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-red-600 tracking-wide">{p.brand}</div>
                        <Link
                          href={`/san-pham/${p.slug}`}
                          className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-red-600 transition mt-0.5"
                        >
                          {p.name}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-600">
                          {p.ram && <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">{p.ram.split(' ')[0]}</span>}
                          {p.storage && <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">{p.storage.split(' ')[0]}</span>}
                          {p.warranty && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{p.warranty}</span>}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-lg font-black text-red-600">{formatVnd(p.flashSalePrice)}</span>
                          <span className="text-xs text-slate-400 line-through">{formatVnd(p.price)}</span>
                        </div>
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-900 font-semibold">
                          Áp mã <strong className="font-black text-red-700">BF999</strong> chỉ còn{' '}
                          <strong className="font-black text-red-700">{formatVnd(withBf999)}</strong>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Link
                            href={`/san-pham/${p.slug}`}
                            className="py-2 px-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold text-center transition"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleBuyNow(p)}
                            className="py-2 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black text-center transition cursor-pointer"
                          >
                            Mua ngay
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 4. HƯỚNG DẪN ÁP MÃ ONLINE & SHOWROOM */}
      <section id="huong-dan-san-deal" className="container mx-auto max-w-[1370px] px-4 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900 to-[#111118] p-6 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white">Mua Online Trên Website CitiLap.vn</h3>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Bấm <strong className="text-amber-300">Lưu &amp; Sao chép mã</strong> (<code className="text-amber-300">BF999</code>, <code className="text-amber-300">BF599</code> hoặc <code className="text-amber-300">BF399</code>) ở khu vực Kho Voucher.</li>
              <li>Chọn mẫu Laptop LikeNew 99% yêu thích và bấm <strong>Mua ngay</strong>.</li>
              <li>Tại trang Thanh toán, nhập mã giảm giá vào ô <strong>Mã giảm giá / Voucher</strong> để trừ tiền trực tiếp và giữ suất ưu đãi ngay lập tức.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900 to-[#111118] p-6 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white">Mua Trực Tiếp Tại Showroom CitiLap</h3>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Ghé trực tiếp showroom CitiLap trong khung thời gian <strong className="text-amber-300">25/11 – 29/11/2026</strong>.</li>
              <li>Kiểm tra ngoại hình, test máy thoải mái cùng đội ngũ kỹ thuật viên.</li>
              <li>Đọc trực tiếp mã giảm giá (<code className="text-amber-300">BF999</code> / <code className="text-amber-300">BF599</code> / <code className="text-amber-300">BF399</code>) cho nhân viên bán hàng để trừ thẳng vào hóa đơn (áp dụng đến khi hết lượt).</li>
            </ol>
            <div className="pt-1 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>23/40 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội • Hotline: 0899.188.186</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THỂ LỆ & FAQ ACCORDION (native <details>, modern-web-guidance) */}
      <section id="the-le-faq" aria-labelledby="bf-faq-heading" className="container mx-auto max-w-[1370px] px-4 pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 id="bf-faq-heading" className="text-2xl sm:text-3xl font-black text-white">
              THỂ LỆ CHƯƠNG TRÌNH &amp; CÂU HỎI THƯỜNG GẶP
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Thông tin chi tiết về thời gian, cách áp mã và chính sách bảo hành dịp Black Friday CitiLap
            </p>
          </div>

          <div className="bf-accordion space-y-3">
            <details open>
              <summary>Thời gian diễn ra Black Friday CitiLap 2026 là khi nào?</summary>
              <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
                Chương trình Black Friday lớn nhất trong năm của CitiLap diễn ra liên tục 5 ngày từ{' '}
                <strong className="text-white">Thứ 4 (25/11/2026) đến hết Chủ Nhật (29/11/2026)</strong>, áp dụng song song tại showroom và đặt hàng online trên website{' '}
                <strong className="text-amber-300">citilap.vn</strong>.
              </div>
            </details>

            <details>
              <summary>Những sản phẩm nào được áp dụng ưu đãi Black Friday?</summary>
              <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
                Chương trình áp dụng cho <strong className="text-white">tất cả các mã Laptop LikeNew 99% có sẵn</strong> tại showroom và trên website CitiLap (bao gồm Lenovo Legion, LOQ, ThinkBook, Xiaoxin, ASUS ROG/TUF, Acer Predator/Nitro, Honor MagicBook, Dell, Huawei).
              </div>
            </details>

            <details>
              <summary>Cơ cấu mã giảm giá 999K / 599K / 399K hoạt động như thế nào?</summary>
              <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
                Toàn bộ sản phẩm trong chương trình có giá Flash Sale mặc định giảm {formatVnd(DEFAULT_FLASH_DISCOUNT)}. Ngoài ra, CitiLap tung ra{' '}
                <strong className="text-amber-300">20 deal giảm 999K (BF999)</strong>,{' '}
                <strong className="text-amber-300">50 deal giảm 599K (BF599)</strong> và{' '}
                <strong className="text-amber-300">100 deal giảm 399K (BF399)</strong> trừ trực tiếp vào giá bán. Hệ thống tự động đếm ngược số lượt và ngừng áp dụng khi hết mã.
              </div>
            </details>

            <details>
              <summary>Mua máy LikeNew dịp Black Friday có giữ nguyên chế độ bảo hành không?</summary>
              <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
                Có! Mọi máy LikeNew mua trong dịp Black Friday đều được giữ nguyên toàn bộ quyền lợi chuẩn CitiLap:{' '}
                <strong className="text-white">bao test lỗi 1 đổi 1 trong 7 ngày</strong>, bảo hành 3 tháng (hoặc theo bảo hành chính hãng còn lại của máy), tặng túi chống sốc + chuột không dây và hỗ trợ vệ sinh, cài đặt phần mềm trọn đời.
              </div>
            </details>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/hot-sale"
              className="inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 transition"
            >
              <span>Xem thêm các chương trình HOT SALE khác tại CitiLap</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
