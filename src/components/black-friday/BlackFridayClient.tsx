'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import ProductCard from '@/components/product/ProductCard';
import ProductQuickCheckoutModal, { type QuickCheckoutProductInfo } from '@/components/product/ProductQuickCheckoutModal';
import './black-friday.css';

export interface BlackFridayProduct {
  id: string;
  variantId: string | null;
  sku: string | null;
  name: string;
  slug: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  stock: number | null;
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
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<'ALL' | 'UNDER_20' | '20_30' | '30_40' | 'OVER_40'>('ALL');
  const [sortBy, setSortBy] = useState<'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC'>('FEATURED');
  const [quickBuyProduct, setQuickBuyProduct] = useState<QuickCheckoutProductInfo | null>(null);

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
      { id: 'ALL', label: `Tất cả (${products.length})` },
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
      if (priceRange === 'UNDER_20' && p.price >= 20_000_000) return false;
      if (priceRange === '20_30' && (p.price < 20_000_000 || p.price >= 30_000_000)) return false;
      if (priceRange === '30_40' && (p.price < 30_000_000 || p.price >= 40_000_000)) return false;
      if (priceRange === 'OVER_40' && p.price < 40_000_000) return false;
      return true;
    });
    if (sortBy === 'PRICE_ASC') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'PRICE_DESC') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, activeBrand, searchQuery, priceRange, sortBy]);

  const handleSaveVoucher = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => { });
    try {
      sessionStorage.setItem('citilap-saved-coupon-v1', code);
    } catch { }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleBuyNow = (p: BlackFridayProduct) => {
      setQuickBuyProduct({
        id: p.id,
      name: p.name,
      image: p.image || '',
      variantLabel: [p.ram?.split(' ')[0], p.storage?.split(' ')[0]].filter(Boolean).join(' / ') || undefined,
      warrantyLabel: p.warranty || 'BH 3 tháng',
      totalPrice: p.price,
      items: [
        {
          productId: p.id,
          variantId: p.variantId || null,
          warrantyName: null,
          quantity: 1,
        },
      ],
    });
  };

  const displayCoupons: PublicCouponDto[] = coupons.length
    ? coupons
    : [
      {
        id: 'cpn_bf2026_999',
        code: 'CITILAP999',
        name: 'Black Friday Siêu Deal Giảm 999K',
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
        id: 'cpn_bf2026_599',
        code: 'CITILAP599',
        name: 'Black Friday Hot Deal Giảm 599K',
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
        id: 'cpn_bf2026_399',
        code: 'CITILAP399',
        name: 'Black Friday Deal Giảm 399K',
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

  const topCoupon = displayCoupons.find((c) => !c.isExhausted) || displayCoupons[0];
  const topCouponCode = topCoupon?.code || 'CITILAP999';
  const topCouponLabel =
    topCoupon?.discountType === 'PERCENT'
      ? `${topCoupon.discountValue}%`
      : `${Math.round((topCoupon?.discountValue || 999_000) / 1000)}K`;

  return (
    <div className="min-h-screen bg-[#0b0b10] text-slate-100 pb-14 sm:pb-20">
      {/* 1. HERO BANNER — CellphoneS Black Fire-Day inspired */}
      <section className="relative overflow-hidden border-b border-red-900/40 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.38)_0%,_rgba(15,10,16,0.96)_60%,_#0b0b10_100%)]">
        <div className="container mx-auto max-w-[1370px] px-2.5 sm:px-4 py-5 sm:py-10 md:py-14 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-8">
            <div className="space-y-2.5 sm:space-y-4 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-red-600/30 to-amber-500/20 border border-red-500/40 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                <span className="sm:hidden">Black Friday 2026 • 25–29/11</span>
                <span className="hidden sm:inline">Black Fire-Day 2026 • Lớn Nhất Năm Tại CitiLap</span>
              </div>

              <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-[1.12] text-white">
                BLACK FRIDAY{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                  LIKENEW 99%
                </span>
                <br />
                SĂN DEAL GIẢM TỚI 999K
              </h1>

              <p className="sm:hidden text-xs text-slate-300">
                Giảm trực tiếp tới <strong className="text-amber-300">999K</strong> • Toàn bộ <strong className="text-white">{products.length} máy LikeNew 99%</strong>
              </p>

              <p className="hidden sm:block text-sm sm:text-base text-slate-300 leading-relaxed">
                Diễn ra duy nhất từ <strong className="text-amber-300">Thứ 4 đến Chủ Nhật (25/11 – 29/11/2026)</strong>.
                Áp dụng toàn bộ <strong className="text-white">{products.length} mẫu Laptop LikeNew 99%</strong> có sẵn tại showroom và website:
                <strong className="text-amber-300"> 20 deal giảm 999K • 50 deal giảm 599K • 100 deal giảm 399K</strong> trực tiếp vào giá bán!
              </p>

              <div className="hidden sm:flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <a
                  href="#voucher-vault"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-sm shadow-lg shadow-red-900/40 transition"
                >
                  <Ticket className="w-4 h-4" />
                  Săn Mã Giảm 999K Ngay
                </a>
                <a
                  href="#black-friday-deals"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Xem {products.length} Máy LikeNew 99%
                </a>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="w-full max-w-md rounded-xl sm:rounded-2xl border border-red-500/30 bg-black/55 backdrop-blur-md p-3 sm:p-6 shadow-2xl shadow-red-950/50">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 mb-2 sm:mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  {eventPhase === 'UPCOMING'
                    ? 'Mở bán sau'
                    : eventPhase === 'LIVE'
                      ? 'Kết thúc sau'
                      : 'Đã kết thúc'}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px]">25/11 – 29/11</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 text-center">
                {[
                  { val: countdown.days, label: 'Ngày' },
                  { val: countdown.hours, label: 'Giờ' },
                  { val: countdown.minutes, label: 'Phút' },
                  { val: countdown.seconds, label: 'Giây' },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="rounded-lg sm:rounded-xl bg-gradient-to-b from-red-950/90 to-black border border-red-500/30 py-2 sm:py-3 px-1 sm:px-2"
                  >
                    <div className="text-xl sm:text-3xl font-black text-white tabular-nums leading-none">{unit.val}</div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-amber-300/90 uppercase mt-1">{unit.label}</div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:grid mt-4 pt-3 border-t border-white/10 grid-cols-3 gap-2 text-center text-xs">
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
      <section id="voucher-vault" className="container mx-auto max-w-[1370px] px-2 sm:px-4 pt-5 sm:pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3 mb-3 sm:mb-6">
          <div>
            <div className="hidden sm:inline-flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Kho Mã Giảm Giá Trực Tiếp • Hết Mã Ngừng Áp Dụng</span>
            </div>
            <h2 className="text-base sm:text-3xl font-black text-white sm:mt-1 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-amber-400 sm:hidden" />
              <span className="sm:hidden">MÃ GIẢM GIÁ BLACK FRIDAY</span>
              <span className="hidden sm:inline">SĂN VOUCHER BLACK FRIDAY ĐẾN 999.000Đ</span>
            </h2>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-400">
            Áp dụng cả <strong className="text-white">mua Online</strong> (nhập mã lúc thanh toán) &amp;{' '}
            <strong className="text-white">tại Showroom</strong> (đọc mã cho nhân viên)
          </p>
        </div>

        {/* Mobile SP Compact Voucher Rows */}
        <div className="sm:hidden space-y-2">
          {displayCoupons.slice(0, 3).map((c, idx) => {
            const isTop = idx === 0;
            const total = c.quantityLimit ?? 100;
            const remaining = c.remaining ?? total;
            const isCopied = copiedCode === c.code;
            return (
              <div
                key={`sp-${c.id}`}
                className={`rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2 ${isTop
                    ? 'bg-gradient-to-r from-red-950/90 via-[#1a0d12] to-[#120b14] border-amber-400/50'
                    : 'bg-[#13131c] border-white/12'
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-amber-400 leading-none">
                      -{c.discountType === 'PERCENT' ? `${c.discountValue}%` : `${Math.round(c.discountValue / 1000)}K`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/60 border border-dashed border-amber-400/50 font-mono font-bold text-amber-200 text-[11px]">
                      {c.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {c.isExhausted ? 'Đã hết suất' : `Còn ${remaining}/${total} suất`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={c.isExhausted}
                  onClick={() => handleSaveVoucher(c.code)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1 transition cursor-pointer ${c.isExhausted
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isCopied
                        ? 'bg-emerald-600 text-white'
                        : isTop
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black'
                          : 'bg-red-600 text-white'
                    }`}
                >
                  {c.isExhausted ? (
                    'Hết mã'
                  ) : isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Đã lưu
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Lưu mã
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet Voucher Cards */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayCoupons.slice(0, 3).map((c, idx) => {
            const isTop = idx === 0;
            const total = c.quantityLimit ?? 100;
            const remaining = c.remaining ?? total;
            const usedPct = total > 0 ? Math.min(100, Math.round((c.usedCount / total) * 100)) : 0;
            const isCopied = copiedCode === c.code;
            return (
              <div
                key={c.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between gap-4 transition ${isTop
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
                        className={`h-full rounded-full ${isTop
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
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer ${c.isExhausted
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

      {/* 3. DANH SÁCH LAPTOP LIKENEW 99% ÁP DỤNG BLACK FRIDAY */}
      <section id="black-friday-deals" className="container mx-auto max-w-[1370px] px-1 sm:px-4 pt-5 sm:pt-12">
        <div className="rounded-xl sm:rounded-3xl border-0 sm:border border-red-500/25 bg-transparent sm:bg-gradient-to-b sm:from-[#170c12] sm:via-[#111118] sm:to-[#0e0e14] px-0.5 py-2 sm:p-6 md:p-8 shadow-none sm:shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4 px-1.5 sm:px-0 pb-3 sm:pb-5 border-b border-white/10">
            <div>
              <div className="hidden sm:inline-flex items-center gap-1.5 text-red-400 text-xs font-black uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Áp Dụng Toàn Bộ Sản Phẩm LikeNew 99% Có Sẵn</span>
              </div>
              <h2 className="text-base sm:text-3xl font-black text-white sm:mt-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400 sm:hidden" />
                <span className="sm:hidden">DEAL LIKENEW 99% ({filteredProducts.length})</span>
                <span className="hidden sm:inline">SĂN DEAL LAPTOP LIKENEW 99% BLACK FRIDAY</span>
              </h2>
              <p className="hidden sm:block text-xs sm:text-sm text-slate-400 mt-1">
                Chọn mẫu máy bạn yêu thích và nhập mã <strong className="text-amber-300">{topCouponCode}</strong> (hoặc{' '}
                <strong className="text-white">CITILAP599 / CITILAP399</strong>) tại bước thanh toán để được giảm trực tiếp vào giá bán!
              </p>
            </div>
          </div>

          {/* Accessible Single-Row Scrollable Brand Tabs */}
          <div className="mt-3 sm:mt-5 px-1 sm:px-0">
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
          <div className="mt-2.5 sm:mt-4 px-1 sm:px-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm máy, CPU, GPU..."
                className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline-flex text-xs text-slate-400 items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Lọc:
              </span>
              <select
                aria-label="Lọc theo khoảng giá"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as typeof priceRange)}
                className="rounded-xl bg-black/60 border border-white/15 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
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
                className="rounded-xl bg-black/60 border border-white/15 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="FEATURED">Nổi bật</option>
                <option value="PRICE_ASC">Giá tăng dần</option>
                <option value="PRICE_DESC">Giá giảm dần</option>
              </select>
            </div>
          </div>

          {/* Standard CitiLap ProductCard Grid — Full-width 2-col on SP */}
          <div
            role="tabpanel"
            aria-labelledby={`bf-tab-${activeBrand}`}
            className="mt-3 sm:mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-4"
          >
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 sm:py-16 text-center text-slate-400 text-sm">
                Không tìm thấy mẫu laptop nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const discountedPrice = Math.max(0, p.price - 1_000_000);
                return (
                  <ProductCard
                    key={p.id}
                    hideQuickActions
                    hideMetaRow
                    inlineOldPrice
                    compactMobile
                    topRightSticker={`-${topCouponLabel}`}
                    product={{
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      href: `/san-pham/${p.slug}`,
                      sku: p.sku || undefined,
                      variantId: p.variantId || undefined,
                      brand: p.brand,
                      price: discountedPrice,
                      originalPrice: p.price,
                      condition: 'LIKE_NEW',
                      stock: p.stock ?? 5,
                      image: p.image,
                      warranty: p.warranty || 'BH 3 tháng',
                      specs: {
                        cpu: p.cpu || undefined,
                        gpu: p.gpu || undefined,
                        ram: p.ram || undefined,
                        ssd: p.storage || undefined,
                        display: p.display || undefined,
                      },
                    }}
                    footerAction={
                      <div className="space-y-1.5 sm:space-y-2">
                        <button
                          type="button"
                          onClick={() => handleSaveVoucher(topCouponCode)}
                          className="w-full rounded-md sm:rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-amber-950 font-semibold text-left flex items-center justify-between gap-1 transition cursor-pointer"
                          title={`Bấm để lưu mã ${topCouponCode}`}
                        >
                          <span className="truncate sm:whitespace-normal">
                            <span className="sm:hidden">
                              Mã <strong className="font-black text-red-700">{topCouponCode}</strong> (-{topCouponLabel})
                            </span>
                            <span className="hidden sm:inline">
                              Áp mã <strong className="font-black text-red-700">{topCouponCode}</strong> để giảm ngay{' '}
                              <strong className="font-black text-red-700">{topCouponLabel}</strong>
                            </span>
                          </span>
                          {copiedCode === topCouponCode ? (
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-700 shrink-0" />
                          )}
                        </button>
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                          <Link
                            href={`/san-pham/${p.slug}`}
                            className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-md sm:rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] sm:text-xs font-bold text-center transition"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                if (!sessionStorage.getItem('citilap-saved-coupon-v1')) {
                                  sessionStorage.setItem('citilap-saved-coupon-v1', topCouponCode);
                                }
                              } catch { }
                              handleBuyNow(p);
                            }}
                            className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-md sm:rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] sm:text-xs font-black text-center transition cursor-pointer"
                          >
                            Mua ngay
                          </button>
                        </div>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 4. HƯỚNG DẪN ÁP MÃ ONLINE & SHOWROOM */}
      <section id="huong-dan-san-deal" className="container mx-auto max-w-[1370px] px-2 sm:px-4 pt-6 sm:pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          <div className="rounded-xl sm:rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900 to-[#111118] p-4 sm:p-6 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:block">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-sm sm:text-lg font-black text-white sm:mt-3">Mua Online Trên CitiLap.vn</h3>
            </div>
            <ol className="text-xs sm:text-sm text-slate-300 space-y-1.5 sm:space-y-2 list-decimal list-inside leading-relaxed">
              <li>Bấm <strong className="text-amber-300">Lưu mã</strong> (<code className="text-amber-300">CITILAP999</code> / <code className="text-amber-300">599</code> / <code className="text-amber-300">399</code>).</li>
              <li>Chọn máy LikeNew 99% và bấm <strong>Mua ngay</strong>.</li>
              <li>Nhập mã ở bước đặt hàng để giảm trực tiếp vào đơn.</li>
            </ol>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900 to-[#111118] p-4 sm:p-6 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:block">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-sm sm:text-lg font-black text-white sm:mt-3">Mua Tại Showroom CitiLap</h3>
            </div>
            <ol className="text-xs sm:text-sm text-slate-300 space-y-1.5 sm:space-y-2 list-decimal list-inside leading-relaxed">
              <li>Ghé showroom trong <strong className="text-amber-300">25/11 – 29/11/2026</strong> để test máy trực tiếp.</li>
              <li>Đọc mã <code className="text-amber-300">CITILAP999</code> / <code className="text-amber-300">CITILAP599</code> / <code className="text-amber-300">CITILAP399</code> cho nhân viên để trừ thẳng hóa đơn.</li>
            </ol>
            <div className="pt-1 text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span>23/40 Tạ Quang Bửu, Hà Nội • 0899.188.186</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THỂ LỆ & FAQ ACCORDION (native <details>, modern-web-guidance) */}
      <section id="the-le-faq" aria-labelledby="bf-faq-heading" className="container mx-auto max-w-[1370px] px-2 sm:px-4 pt-6 sm:pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4 sm:mb-6">
            <h2 id="bf-faq-heading" className="text-base sm:text-3xl font-black text-white">
              THỂ LỆ &amp; CÂU HỎI THƯỜNG GẶP
            </h2>
            <p className="hidden sm:block text-sm text-slate-400 mt-1">
              Thông tin chi tiết về thời gian, cách áp mã và chính sách bảo hành dịp Black Friday CitiLap
            </p>
          </div>

          <div className="bf-accordion space-y-2 sm:space-y-3">
            <details>
              <summary>Thời gian diễn ra Black Friday CitiLap 2026?</summary>
              <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Chương trình diễn ra 5 ngày từ{' '}
                <strong className="text-white">Thứ 4 (25/11/2026) đến hết Chủ Nhật (29/11/2026)</strong>, áp dụng song song tại showroom và online trên{' '}
                <strong className="text-amber-300">citilap.vn</strong>.
              </div>
            </details>

            <details>
              <summary>Sản phẩm nào được áp dụng ưu đãi Black Friday?</summary>
              <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Áp dụng cho <strong className="text-white">tất cả Laptop LikeNew 99% có sẵn</strong> tại showroom và trên website CitiLap.
              </div>
            </details>

            <details>
              <summary>Cơ cấu mã giảm giá 999K / 599K / 399K?</summary>
              <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-amber-300">20 suất giảm 999K (CITILAP999)</strong>,{' '}
                <strong className="text-amber-300">50 suất giảm 599K (CITILAP599)</strong> và{' '}
                <strong className="text-amber-300">100 suất giảm 399K (CITILAP399)</strong> trừ trực tiếp vào giá bán đến khi hết lượt.
              </div>
            </details>

            <details>
              <summary>Chính sách bảo hành máy LikeNew dịp Black Friday?</summary>
              <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Giữ nguyên toàn bộ quyền lợi chuẩn CitiLap:{' '}
                <strong className="text-white">bao test 1 đổi 1 trong 7 ngày</strong>, bảo hành mặc định 3 tháng (tùy chọn mở rộng 6 tháng +1 triệu), tặng túi chống sốc + chuột không dây và hỗ trợ phần mềm trọn đời.
              </div>
            </details>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <Link
              href="/hot-sale"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 transition"
            >
              <span>Xem thêm chương trình HOT SALE khác</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {quickBuyProduct && (
        <ProductQuickCheckoutModal
          isOpen={Boolean(quickBuyProduct)}
          onClose={() => setQuickBuyProduct(null)}
          productInfo={quickBuyProduct}
        />
      )}
    </div>
  );
}
