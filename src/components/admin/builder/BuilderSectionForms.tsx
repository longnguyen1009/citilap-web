'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Grid,
  Smartphone,
  Flame,
  RefreshCw,
  ExternalLink,
  Settings,
  Sparkles,
  Info,
} from 'lucide-react';
import { youtubeId, tiktokVideoId } from '@/contracts/cms/media';
import { categoryHref } from '@/lib/category-paths';
import type { SectionItem, ProductRuleCriteria } from '@/contracts/cms/site-builder';
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import { useConfirm } from '@/components/admin/ui';
import { useCatalogOptions } from './BuilderPickers';
import type { CategoryOption } from './builder-defaults';

export type BannerData = Extract<SectionItem['data'], { type: 'banner' }>;
export type SliderData = Extract<SectionItem['data'], { type: 'slider' }>;
export type ProductGridData = Extract<SectionItem['data'], { type: 'product_grid' }>;
export type FeaturedCategoriesData = Extract<SectionItem['data'], { type: 'featured_categories' }>;
export type FeaturedBrandsData = Extract<SectionItem['data'], { type: 'featured_brands' }>;
export type FeaturedCollectionData = Extract<SectionItem['data'], { type: 'featured_collection' }>;
export type NewsReviewsData = Extract<SectionItem['data'], { type: 'news_reviews' }>;
export type IntroData = Extract<SectionItem['data'], { type: 'intro' }>;
export type CtaData = Extract<SectionItem['data'], { type: 'cta' }>;
export type VideoReviewsData = Extract<SectionItem['data'], { type: 'video_reviews' }>;
export type CustomerGalleryData = Extract<SectionItem['data'], { type: 'customer_gallery' }>;

export function BannerForm({
  data,
  update,
  onPickMedia,
  onPickMobileMedia,
}: {
  data: BannerData;
  update: (p: Partial<BannerData>) => void;
  onPickMedia: () => void;
  onPickMobileMedia: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề banner (PC / Mặc định)</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Tiêu đề chính..."
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Huy hiệu (Badge)</label>
          <input
            type="text"
            value={data.badge || ''}
            onChange={(e) => update({ badge: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Giảm giá sốc"
          />
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ (Subtitle)</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Mô tả ngắn gọn"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Bố cục (Layout)</label>
          <select
            value={data.layout || 'hero'}
            onChange={(e) => update({ layout: e.target.value as 'hero' | 'split' | 'fullwidth' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          >
            <option value="hero">Hero (Toàn cảnh nổi bật)</option>
            <option value="split">Split (Chia 2 cột)</option>
            <option value="fullwidth">Full Width (Rộng toàn màn)</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Ảnh Banner trên PC (URL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.imageUrl || ''}
              onChange={(e) => update({ imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="/brand/citilap-hero.webp hoặc https://..."
            />
            <button
              type="button"
              onClick={onPickMedia}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              Chọn ảnh
            </button>
          </div>
        </div>
      </div>

      {data.imageUrl && (
        <div className="h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Smartphone (SP) Custom Content & Image */}
      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>Tùy chỉnh riêng cho Smartphone (SP)</span>
          </div>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(data.hideOverlayOnMobile)}
              onChange={(e) => update({ hideOverlayOnMobile: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span>Ẩn chữ đè lên ảnh trên SP</span>
          </label>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
            Ảnh Banner riêng cho Smartphone (SP) — để trống sẽ tự dùng ảnh tối ưu cho SP
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.mobileImageUrl || ''}
              onChange={(e) => update({ mobileImageUrl: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              placeholder="/brand/citilap-hero-mobile.webp hoặc chọn ảnh từ thư viện..."
            />
            <button
              type="button"
              onClick={onPickMobileMedia}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              Chọn ảnh SP
            </button>
          </div>
          {data.mobileImageUrl && (
            <div className="mt-2 h-28 w-44 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.mobileImageUrl} alt="Mobile Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
              Tiêu đề ngắn gọn trên SP (tùy chọn)
            </label>
            <input
              type="text"
              value={data.mobileTitle || ''}
              onChange={(e) => update({ mobileTitle: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              placeholder="Để trống nếu dùng chung tiêu đề PC"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
              Mô tả ngắn trên SP (tùy chọn)
            </label>
            <input
              type="text"
              value={data.mobileSubtitle || ''}
              onChange={(e) => update({ mobileSubtitle: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              placeholder="Để trống nếu dùng chung mô tả PC"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chữ nút chính (Primary CTA)</label>
          <input
            type="text"
            value={data.buttonText || ''}
            onChange={(e) => update({ buttonText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Khám phá ngay"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút chính</label>
          <input
            type="text"
            value={data.link || ''}
            onChange={(e) => update({ link: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-gaming"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chữ nút phụ (Secondary CTA)</label>
          <input
            type="text"
            value={data.secondaryButtonText || ''}
            onChange={(e) => update({ secondaryButtonText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Xem thêm"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút phụ</label>
          <input
            type="text"
            value={data.secondaryLink || ''}
            onChange={(e) => update({ secondaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-van-phong"
          />
        </div>
      </div>
    </div>
  );
}

export function SliderForm({
  data,
  update,
  onPickMedia,
  onPickMobileMedia,
}: {
  data: SliderData;
  update: (p: Partial<SliderData>) => void;
  onPickMedia: (slideIdx: number) => void;
  onPickMobileMedia: (slideIdx: number) => void;
}) {
  const confirm = useConfirm();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={data.autoplay ?? true}
            onChange={(e) => update({ autoplay: e.target.checked })}
            className="rounded text-blue-600"
          />
          <span className="font-bold text-slate-700">Tự động chuyển slide (Autoplay)</span>
        </label>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Thời gian mỗi slide (Giây)</label>
          <input
            type="number"
            min={2}
            max={20}
            value={data.intervalSec ?? 5}
            onChange={(e) =>
              update({ intervalSec: Math.max(2, Math.min(20, parseInt(e.target.value) || 5)) })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Danh sách Slide ({data.slides?.length || 0})</span>
          <button
            type="button"
            onClick={() => {
              const currentSlides = data.slides || [];
              const newSlide = {
                id: `slide_${Date.now()}_${currentSlides.length + 1}`,
                title: `Slide ${currentSlides.length + 1}`,
                subtitle: 'Mô tả ngắn gọn ưu đãi hoặc cấu hình',
                badge: 'Hot Deal',
                imageUrl: '/brand/marketing-banner.webp',
                imageAssetId: null,
                link: '/laptop-gaming',
                buttonText: 'Khám phá ngay',
              };
              update({ slides: [...currentSlides, newSlide] });
            }}
            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            + Thêm slide
          </button>
        </div>

        {data.slides?.map((slide, sIdx) => (
          <div key={slide.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 text-xs">Slide #{sIdx + 1}</span>
              <div className="flex items-center gap-2">
                {sIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...data.slides];
                      const [moved] = next.splice(sIdx, 1);
                      next.splice(sIdx - 1, 0, moved);
                      update({ slides: next });
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded text-xs"
                    title="Di chuyển lên"
                  >
                    ↑
                  </button>
                )}
                {sIdx < data.slides.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...data.slides];
                      const [moved] = next.splice(sIdx, 1);
                      next.splice(sIdx + 1, 0, moved);
                      update({ slides: next });
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded text-xs"
                    title="Di chuyển xuống"
                  >
                    ↓
                  </button>
                )}
                {data.slides.length > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Xóa slide #${sIdx + 1}?`,
                        message: `Bạn có chắc chắn muốn xóa slide "${slide.title || `#${sIdx + 1}`}" khỏi slider?`,
                        confirmLabel: 'Xóa slide',
                        cancelLabel: 'Hủy',
                        variant: 'destructive',
                      });
                      if (!ok) return;
                      const next = data.slides.filter((_, idx) => idx !== sIdx);
                      update({ slides: next });
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
                  >
                    Xóa slide
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tiêu đề slide</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], title: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Tiêu đề chính"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Huy hiệu (Badge)</label>
                <input
                  type="text"
                  value={slide.badge || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], badge: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Ví dụ: Hot Deal"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Mô tả phụ (Subtitle)</label>
              <input
                type="text"
                value={slide.subtitle || ''}
                onChange={(e) => {
                  const next = [...data.slides];
                  next[sIdx] = { ...next[sIdx], subtitle: e.target.value };
                  update({ slides: next });
                }}
                placeholder="Mô tả phụ của slide"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Ảnh nền / banner trên PC (URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slide.imageUrl}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], imageUrl: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="URL hình ảnh PC"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => onPickMedia(sIdx)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Chọn ảnh
                </button>
              </div>
              {slide.imageUrl && (
                <div className="mt-2 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.imageUrl} alt={slide.title || 'Slide preview'} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-blue-700 block mb-0.5">
                Ảnh riêng trên Smartphone SP (Tùy chọn)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slide.mobileImageUrl || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], mobileImageUrl: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Để trống nếu dùng chung ảnh PC"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => onPickMobileMedia(sIdx)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Chọn ảnh SP
                </button>
              </div>
              {slide.mobileImageUrl && (
                <div className="mt-2 h-20 w-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.mobileImageUrl} alt={slide.title || 'Slide SP preview'} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Liên kết nút (Link)</label>
                <input
                  type="text"
                  value={slide.link || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], link: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="/laptop-gaming"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Chữ nút bấm (Button Text)</label>
                <input
                  type="text"
                  value={slide.buttonText || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], buttonText: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Khám phá ngay"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductGridForm({
  sectionId,
  data,
  update,
  onPickProduct,
}: {
  sectionId?: string;
  data: ProductGridData;
  update: (p: Partial<ProductGridData>) => void;
  onPickProduct: (target?: string) => void;
}) {
  const confirm = useConfirm();
  const { categories, brands } = useCatalogOptions();
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [newQuickLabel, setNewQuickLabel] = useState('');
  const [newQuickHref, setNewQuickHref] = useState('');

  const allReferencedIds = useMemo(
    () => [
      ...(data.manualProductIds || []),
      ...(data.tabs || []).flatMap((t) => t.productIds || []),
    ],
    [data.manualProductIds, data.tabs]
  );

  useEffect(() => {
    let ignore = false;
    const missingIds = [...new Set(allReferencedIds)].filter((id) => !productNames[id]);
    if (missingIds.length === 0) return;

    async function fetchMissingNames() {
      try {
        const res = await mediaRequest<{ items: Array<{ id: string; name: string }> }>(
          `/api/admin/products?ids=${encodeURIComponent(missingIds.join(','))}&limit=${Math.min(100, Math.max(50, missingIds.length))}`
        );
        if (!ignore && res?.items) {
          const map: Record<string, string> = {};
          for (const it of res.items) {
            map[it.id] = it.name;
          }
          setProductNames((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // fail-soft
      }
    }
    void fetchMissingNames();
    return () => {
      ignore = true;
    };
  }, [allReferencedIds, productNames]);

  const isHotSaleSection = sectionId === 'sec-hot-sale';

  if (isHotSaleSection) {
    return (
      <div className="space-y-4">
        {/* Banner header */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 border border-red-200 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-600 text-white shadow-xs">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Khối HOT SALE / Flash Sale (Tự động)
              </h3>
              <p className="text-[11px] text-slate-600">
                Khối hệ thống đặc biệt hiển thị các đợt giảm giá Flash Sale trực tiếp trên trang chủ.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            Nội dung khối này được hệ thống nạp tự động từ <strong>Chiến dịch Khuyến mãi</strong> và <strong>Cài đặt Cửa hàng</strong>. Các trường chọn sản phẩm thủ công hay bộ lọc thông thường được ẩn để tránh gây nhầm lẫn.
          </p>
        </div>

        {/* 2 cards explaining what is configured where */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Card 1: Campaigns */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Sparkles className="w-4 h-4 text-red-500" />
                <span>1. Đợt giảm giá &amp; Sản phẩm</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tạo đợt Flash Sale, chọn danh sách laptop giảm giá sốc, tỷ lệ % giảm và thiết lập thời gian đếm ngược.
              </p>
            </div>
            <Link
              href="/admin/campaigns"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition border border-red-200/80"
            >
              <span>Mở Quản lý Chiến dịch</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Settings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>2. Banner &amp; Tiêu đề hiển thị</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cấu hình ảnh banner Hot Sale PC &amp; Mobile, tiêu đề khối và đường dẫn tùy chỉnh trong Cài đặt chung.
              </p>
            </div>
            <Link
              href="/admin/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200/80"
            >
              <span>Mở Cài đặt Cửa hàng</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Info Box: what is controlled here */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Thao tác cho khối này tại màn hình Bố cục:</span>
          </div>
          <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-5">
            <li><strong>Thứ tự hiển thị:</strong> Dùng nút <strong>Di chuyển lên / xuống (↑ / ↓)</strong> ở danh sách bên trái để đổi vị trí khối trên trang chủ.</li>
            <li><strong>Bật / Tắt khối:</strong> Dùng công tắc ở góc trên bên phải hoặc ở danh sách để tạm ẩn hoặc cho hiển thị khối.</li>
            <li><strong>Hiển thị theo thiết bị:</strong> Chọn chỉ hiển thị trên PC hoặc chỉ trên Mobile ở tùy chọn phía trên.</li>
          </ul>
        </div>
      </div>
    );
  }

  const hasTabs = Boolean(data.tabs && data.tabs.length > 0);

  const addQuickLink = () => {
    if (!newQuickLabel.trim() || !newQuickHref.trim()) return;
    const current = data.links || [];
    update({ links: [...current, { label: newQuickLabel.trim(), href: newQuickHref.trim() }] });
    setNewQuickLabel('');
    setNewQuickHref('');
  };

  return (
    <div className="space-y-5">
      {/* 2. TAB MANAGER (E.G. KHÁM PHÁ LAPTOP) */}
      {(hasTabs || sectionId === 'sec-discover') && (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Grid className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Cấu hình các Tab sản phẩm ({data.tabs?.length || 0} Tab)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Hiển thị dạng thanh Tab chuyển đổi linh hoạt trên trang chủ (Khám phá laptop)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = data.tabs || [];
                const newTabId = `tab-${Date.now()}`;
                update({
                  tabs: [
                    ...current,
                    {
                      id: newTabId,
                      label: `Tab #${current.length + 1}`,
                      href: '/search?category=laptop',
                      limit: 15,
                      productIds: [],
                      enabled: true,
                      sourceMode: 'manual',
                    },
                  ],
                });
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Tab mới
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {data.tabs?.map((tab, tIdx) => (
              <div key={tab.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {tIdx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-800 truncate">{tab.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({tab.id})</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                      <input
                        type="checkbox"
                        checked={tab.enabled !== false}
                        onChange={(e) => {
                          const next = [...(data.tabs || [])];
                          next[tIdx] = { ...next[tIdx], enabled: e.target.checked };
                          update({ tabs: next });
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>Bật</span>
                    </label>
                    <button
                      type="button"
                      disabled={tIdx === 0}
                      onClick={() => {
                        const next = [...(data.tabs || [])];
                        [next[tIdx], next[tIdx - 1]] = [next[tIdx - 1], next[tIdx]];
                        update({ tabs: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={tIdx === (data.tabs?.length || 0) - 1}
                      onClick={() => {
                        const next = [...(data.tabs || [])];
                        [next[tIdx], next[tIdx + 1]] = [next[tIdx + 1], next[tIdx]];
                        update({ tabs: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Xóa tab "${tab.label}"?`,
                          message: `Bạn có chắc chắn muốn xóa tab "${tab.label}" khỏi khối sản phẩm?`,
                          confirmLabel: 'Xóa tab',
                          cancelLabel: 'Hủy',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        update({ tabs: data.tabs?.filter((_, idx) => idx !== tIdx) });
                      }}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                      title="Xóa tab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên tab hiển thị *</label>
                    <input
                      type="text"
                      value={tab.label}
                      onChange={(e) => {
                        const next = [...(data.tabs || [])];
                        next[tIdx] = { ...next[tIdx], label: e.target.value };
                        update({ tabs: next });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="Ví dụ: Laptop Mới"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã định danh (ID) *</label>
                    <input
                      type="text"
                      value={tab.id}
                      onChange={(e) => {
                        const next = [...(data.tabs || [])];
                        next[tIdx] = { ...next[tIdx], id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') };
                        update({ tabs: next });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="new-arrivals"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Liên kết &quot;Xem tất cả&quot;</label>
                    <input
                      type="text"
                      value={tab.href || ''}
                      onChange={(e) => {
                        const next = [...(data.tabs || [])];
                        next[tIdx] = { ...next[tIdx], href: e.target.value };
                        update({ tabs: next });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="/search?category=laptop-moi"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-700">Nguồn sản phẩm tab:</span>
                    <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={`tab_src_${tab.id}`}
                        checked={tab.sourceMode !== 'rule'}
                        onChange={() => {
                          const next = [...(data.tabs || [])];
                          next[tIdx] = { ...next[tIdx], sourceMode: 'manual' };
                          update({ tabs: next });
                        }}
                      />
                      <span>Thủ công ({tab.productIds?.length || 0} SP)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name={`tab_src_${tab.id}`}
                        checked={tab.sourceMode === 'rule'}
                        onChange={() => {
                          const next = [...(data.tabs || [])];
                          next[tIdx] = {
                            ...next[tIdx],
                            sourceMode: 'rule',
                            ruleCriteria: next[tIdx].ruleCriteria || {
                              productType: 'laptop',
                              categoryId: null,
                              brandId: null,
                              condition: tab.id === 'new' ? 'NEW' : tab.id === 'like-new' ? 'LIKE_NEW' : tab.id === 'clearance' ? 'ON_SALE' : 'all',
                              tag: 'all',
                              availability: 'all',
                              sort: 'newest',
                              limit: 15,
                            },
                          };
                          update({ tabs: next });
                        }}
                      />
                      <span>Theo điều kiện tự động</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                      Số lượng hiển thị (Limit):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={tab.limit || 15}
                      onChange={(e) => {
                        const next = [...(data.tabs || [])];
                        next[tIdx] = { ...next[tIdx], limit: Math.min(48, Math.max(1, parseInt(e.target.value) || 15)) };
                        update({ tabs: next });
                      }}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center"
                    />
                  </div>
                </div>

                {tab.sourceMode === 'rule' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tình trạng máy</label>
                      <select
                        value={tab.ruleCriteria?.condition || 'all'}
                        onChange={(e) => {
                          const next = [...(data.tabs || [])];
                          const base = next[tIdx].ruleCriteria || {
                            productType: 'laptop' as const,
                            categoryId: null,
                            brandId: null,
                            condition: 'all' as const,
                            tag: 'all' as const,
                            availability: 'all' as const,
                            sort: 'newest' as const,
                            limit: tab.limit || 15,
                          };
                          next[tIdx] = {
                            ...next[tIdx],
                            ruleCriteria: {
                              ...base,
                              condition: e.target.value as ProductRuleCriteria['condition'],
                            },
                          };
                          update({ tabs: next });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="all">Tất cả tình trạng</option>
                        <option value="NEW">Chỉ máy Mới 100%</option>
                        <option value="LIKE_NEW">Chỉ máy Like-New 99%</option>
                        <option value="USED">Hàng cũ tuyển chọn</option>
                        <option value="ON_SALE">Đang giảm giá sốc (Flash Sale)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sắp xếp</label>
                      <select
                        value={tab.ruleCriteria?.sort || 'newest'}
                        onChange={(e) => {
                          const next = [...(data.tabs || [])];
                          const base = next[tIdx].ruleCriteria || {
                            productType: 'laptop' as const,
                            categoryId: null,
                            brandId: null,
                            condition: 'all' as const,
                            tag: 'all' as const,
                            availability: 'all' as const,
                            sort: 'newest' as const,
                            limit: tab.limit || 15,
                          };
                          next[tIdx] = {
                            ...next[tIdx],
                            ruleCriteria: {
                              ...base,
                              sort: e.target.value as ProductRuleCriteria['sort'],
                            },
                          };
                          update({ tabs: next });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="newest">Mới nhất cập nhật</option>
                        <option value="best-selling">Bán chạy nhất</option>
                        <option value="price-asc">Giá thấp đến cao</option>
                        <option value="price-desc">Giá cao xuống thấp</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loại sản phẩm</label>
                      <select
                        value={tab.ruleCriteria?.productType || 'laptop'}
                        onChange={(e) => {
                          const next = [...(data.tabs || [])];
                          const base = next[tIdx].ruleCriteria || {
                            productType: 'laptop' as const,
                            categoryId: null,
                            brandId: null,
                            condition: 'all' as const,
                            tag: 'all' as const,
                            availability: 'all' as const,
                            sort: 'newest' as const,
                            limit: tab.limit || 15,
                          };
                          next[tIdx] = {
                            ...next[tIdx],
                            ruleCriteria: {
                              ...base,
                              productType: e.target.value as ProductRuleCriteria['productType'],
                            },
                          };
                          update({ tabs: next });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="laptop">Chỉ Laptop</option>
                        <option value="accessory">Phụ kiện & Đồ chơi</option>
                        <option value="all">Tất cả sản phẩm</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Sản phẩm đã chọn: {tab.productIds?.length || 0} máy
                      </span>
                      <button
                        type="button"
                        onClick={() => onPickProduct(`product_tab:${tIdx}`)}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        + Chọn sản phẩm vào tab
                      </button>
                    </div>

                    {tab.productIds && tab.productIds.length > 0 ? (
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {tab.productIds.map((pId, pIdx) => (
                          <div
                            key={pId}
                            className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {pIdx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {productNames[pId] || `Sản phẩm ${pId}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={pIdx === 0}
                                onClick={() => {
                                  const nextTabs = [...(data.tabs || [])];
                                  const pList = [...nextTabs[tIdx].productIds];
                                  [pList[pIdx], pList[pIdx - 1]] = [pList[pIdx - 1], pList[pIdx]];
                                  nextTabs[tIdx] = { ...nextTabs[tIdx], productIds: pList };
                                  update({ tabs: nextTabs });
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                title="Lên"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={pIdx === tab.productIds.length - 1}
                                onClick={() => {
                                  const nextTabs = [...(data.tabs || [])];
                                  const pList = [...nextTabs[tIdx].productIds];
                                  [pList[pIdx], pList[pIdx + 1]] = [pList[pIdx + 1], pList[pIdx]];
                                  nextTabs[tIdx] = { ...nextTabs[tIdx], productIds: pList };
                                  update({ tabs: nextTabs });
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                title="Xuống"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextTabs = [...(data.tabs || [])];
                                  nextTabs[tIdx] = {
                                    ...nextTabs[tIdx],
                                    productIds: nextTabs[tIdx].productIds.filter((x) => x !== pId),
                                  };
                                  update({ tabs: nextTabs });
                                }}
                                className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[11px] italic py-1">
                        Tab chưa có sản phẩm. Bấm &quot;+ Chọn sản phẩm vào tab&quot; phía trên.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasTabs && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              update({
                tabs: [
                  {
                    id: `tab-${Date.now()}`,
                    label: 'Tab 1',
                    href: data.viewAllLink || '/search',
                    limit: data.ruleCriteria?.limit || 10,
                    productIds: data.manualProductIds || [],
                    enabled: true,
                    sourceMode: data.sourceMode || 'manual',
                    ruleCriteria: data.ruleCriteria,
                  },
                ],
              });
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Chuyển kệ này sang dạng nhiều Tab
          </button>
        </div>
      )}

      {/* 3. HEADER & APPEARANCE SETTINGS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề kệ sản phẩm *</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Laptop Gaming, Laptop Văn Phòng..."
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ (dòng nhỏ dưới tiêu đề)</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Trang bị GPU RTX 4000 series mạnh mẽ..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Huy hiệu (Badge)</label>
          <input
            type="text"
            value={data.badge || ''}
            onChange={(e) => update({ badge: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Hot Deal / Best Seller"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Màu chủ đề (Header Gradient)</label>
          <select
            value={data.colorTheme || 'blue'}
            onChange={(e) => update({ colorTheme: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          >
            <option value="blue">Xanh dương (Văn phòng / Doanh nhân)</option>
            <option value="red">Đỏ Gaming (Chiến thần đồ họa)</option>
            <option value="indigo">Chàm / Apple (MacBook)</option>
            <option value="gray">Xám đậm (Workstation Máy trạm)</option>
            <option value="emerald">Xanh lục (Phụ kiện & Setup)</option>
            <option value="orange">Cam (Bán chạy nhất)</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Biểu tượng tiêu đề (Icon)</label>
          <select
            value={data.icon || 'auto'}
            onChange={(e) => update({ icon: e.target.value === 'auto' ? undefined : e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          >
            <option value="auto">Tự động theo chủ đề kệ</option>
            <option value="zap">⚡ Tia sét (Gaming)</option>
            <option value="briefcase">💼 Cặp xách (Ultrabook/Văn phòng)</option>
            <option value="server">🖥️ Máy trạm (Workstation)</option>
            <option value="headphones">🎧 Tai nghe (Phụ kiện)</option>
            <option value="sparkles">✨ Ngôi sao lấp lánh (Mới nhất)</option>
            <option value="trending">📈 Biểu đồ xu hướng (Bán chạy)</option>
            <option value="star">⭐ Ngôi sao (Đánh giá cao)</option>
          </select>
        </div>
      </div>

      {/* 4. HEADER QUICK LINKS MANAGER */}
      <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 text-xs block">
              Liên kết nhanh đầu kệ (Header Quick Links)
            </span>
            <span className="text-[11px] text-slate-500">
              Các link ngắn hiển thị ngang trên thanh tiêu đề (Ví dụ: RTX 4060, RTX 4070, Legion, ROG Strix...)
            </span>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {data.links?.length || 0} link
          </span>
        </div>

        {data.links && data.links.length > 0 ? (
          <div className="space-y-2">
            {data.links.map((link, lIdx) => (
              <div key={lIdx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {lIdx + 1}
                </span>
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...(data.links || [])];
                    next[lIdx] = { ...next[lIdx], label: e.target.value };
                    update({ links: next });
                  }}
                  className="w-1/3 px-2 py-1 border border-slate-300 rounded text-xs"
                  placeholder="Tên link (Ví dụ: Legion)"
                />
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => {
                    const next = [...(data.links || [])];
                    next[lIdx] = { ...next[lIdx], href: e.target.value };
                    update({ links: next });
                  }}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                  placeholder="/laptop-gaming?brand=lenovo"
                />
                <button
                  type="button"
                  disabled={lIdx === 0}
                  onClick={() => {
                    const next = [...(data.links || [])];
                    [next[lIdx], next[lIdx - 1]] = [next[lIdx - 1], next[lIdx]];
                    update({ links: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={lIdx === (data.links?.length || 0) - 1}
                  onClick={() => {
                    const next = [...(data.links || [])];
                    [next[lIdx], next[lIdx + 1]] = [next[lIdx + 1], next[lIdx]];
                    update({ links: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update({ links: data.links?.filter((_, i) => i !== lIdx) });
                  }}
                  className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                  title="Xóa link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-xs italic">Chưa có liên kết nhanh nào trên thanh tiêu đề.</p>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200">
          <input
            type="text"
            value={newQuickLabel}
            onChange={(e) => setNewQuickLabel(e.target.value)}
            className="w-full sm:w-1/3 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            placeholder="Tên link mới (e.g. RTX 4060)"
          />
          <input
            type="text"
            value={newQuickHref}
            onChange={(e) => setNewQuickHref(e.target.value)}
            className="w-full sm:flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
            placeholder="Đường dẫn (e.g. /laptop-gaming?gpu=RTX+4060)"
          />
          <button
            type="button"
            onClick={addQuickLink}
            disabled={!newQuickLabel.trim() || !newQuickHref.trim()}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            + Thêm link
          </button>
        </div>
      </div>

      {/* 5. PRODUCT DISPLAY CONDITIONS & LIMIT */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <label className="font-bold text-slate-800 text-xs block">Nguồn &amp; Số lượng sản phẩm hiển thị</label>
            <span className="text-[11px] text-slate-500">
              Chọn tự động theo tiêu chí hoặc tự tay chọn từng sản phẩm
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700">Tối đa (PC):</span>
              <input
                type="number"
                min={1}
                max={48}
                value={data.ruleCriteria?.limit || 10}
                onChange={(e) => {
                  const limitVal = Math.min(48, Math.max(1, parseInt(e.target.value) || 10));
                  update({
                    ruleCriteria: {
                      ...(data.ruleCriteria || {}),
                      limit: limitVal,
                    },
                  });
                }}
                className="w-14 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center bg-white"
              />
              <span className="text-xs text-slate-500">SP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">Trên SP:</span>
              <input
                type="number"
                min={1}
                max={48}
                value={data.mobileLimit ?? ''}
                placeholder="Tất cả"
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  update({
                    mobileLimit: raw ? Math.min(48, Math.max(1, parseInt(raw) || 4)) : null,
                  });
                }}
                className="w-16 px-2 py-1 border border-blue-200 rounded-lg text-xs font-bold text-center bg-white"
              />
              <span className="text-xs text-slate-500">SP</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="radio"
              name={`sourceMode_${sectionId || 'grid'}`}
              value="rule"
              checked={data.sourceMode === 'rule'}
              onChange={() => update({ sourceMode: 'rule' })}
            />
            <span className="font-bold text-slate-800">Theo điều kiện tự động (Rule-based)</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="radio"
              name={`sourceMode_${sectionId || 'grid'}`}
              value="manual"
              checked={data.sourceMode === 'manual'}
              onChange={() => update({ sourceMode: 'manual' })}
            />
            <span className="font-bold text-slate-800">
              Chọn thủ công từng sản phẩm ({data.manualProductIds?.length || 0} đã chọn)
            </span>
          </label>
        </div>

        {data.sourceMode === 'rule' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 border border-slate-200 rounded-xl bg-white text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Loại sản phẩm</label>
              <select
                value={data.ruleCriteria?.productType || 'all'}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      productType: e.target.value as ProductRuleCriteria['productType'],
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Tất cả sản phẩm</option>
                <option value="laptop">Chỉ Laptop</option>
                <option value="accessory">Chỉ Phụ kiện &amp; Đồ chơi</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Danh mục máy</label>
              <select
                value={data.ruleCriteria?.categoryId || ''}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      categoryId: e.target.value ? e.target.value : null,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `↳ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Thương hiệu</label>
              <select
                value={data.ruleCriteria?.brandId || ''}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      brandId: e.target.value ? e.target.value : null,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Tất cả thương hiệu</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tình trạng máy</label>
              <select
                value={data.ruleCriteria?.condition || 'all'}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      condition: e.target.value as ProductRuleCriteria['condition'],
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="NEW">Chỉ máy Mới 100%</option>
                <option value="LIKE_NEW">Chỉ máy Like-New 99%</option>
                <option value="USED">Hàng cũ tuyển chọn</option>
                <option value="ON_SALE">Đang giảm giá sốc (Flash Sale)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Thẻ đánh dấu (Tag)</label>
              <select
                value={data.ruleCriteria?.tag || 'all'}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      tag: e.target.value as ProductRuleCriteria['tag'],
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Tất cả nhãn</option>
                <option value="isFeatured">Sản phẩm Nổi bật</option>
                <option value="isNewArrival">Hàng Mới Về</option>
                <option value="isBestSeller">Bán Chạy Nhất</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tình trạng kho</label>
              <select
                value={data.ruleCriteria?.availability || 'all'}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      availability: e.target.value as ProductRuleCriteria['availability'],
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="AVAILABLE">Còn hàng trong kho</option>
                <option value="PREORDER">Nhận đặt trước (Pre-order)</option>
                <option value="CONTACT">Liên hệ trực tiếp</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Sắp xếp theo</label>
              <select
                value={data.ruleCriteria?.sort || 'newest'}
                onChange={(e) =>
                  update({
                    ruleCriteria: {
                      ...data.ruleCriteria,
                      sort: e.target.value as ProductRuleCriteria['sort'],
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="newest">Mới nhất cập nhật</option>
                <option value="price-asc">Giá từ thấp đến cao</option>
                <option value="price-desc">Giá từ cao xuống thấp</option>
                <option value="name-asc">Tên sản phẩm (A-Z)</option>
                <option value="best-selling">Bán chạy nhất</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3.5 border border-slate-200 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs">
                Đã chọn: {data.manualProductIds?.length || 0} sản phẩm (Hiển thị tối đa{' '}
                {data.ruleCriteria?.limit || 10} SP theo thiết lập trên)
              </span>
              <button
                type="button"
                onClick={() => onPickProduct()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
              >
                + Chọn sản phẩm
              </button>
            </div>

            {data.manualProductIds && data.manualProductIds.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {data.manualProductIds.map((pId: string, idx: number) => (
                  <div
                    key={pId}
                    className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {productNames[pId] || `Sản phẩm ${pId}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">ID: {pId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const next = [...(data.manualProductIds || [])];
                          [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                          update({ manualProductIds: next });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (data.manualProductIds?.length || 0) - 1}
                        onClick={() => {
                          const next = [...(data.manualProductIds || [])];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          update({ manualProductIds: next });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          update({
                            manualProductIds: data.manualProductIds?.filter((x: string) => x !== pId),
                          });
                        }}
                        className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic py-2">
                Chưa có sản phẩm nào được chọn. Hãy bấm nút &quot;+ Chọn sản phẩm&quot; phía trên.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 6. FOOTER SETTINGS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Đường dẫn nút &quot;Xem tất cả&quot;</label>
          <input
            type="text"
            value={data.viewAllLink || ''}
            onChange={(e) => update({ viewAllLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-gaming"
          />
        </div>
        <div className="pt-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.rankNumbering || false}
              onChange={(e) => update({ rankNumbering: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span className="font-bold text-slate-700">Hiển thị huy hiệu xếp hạng TOP 1, 2, 3</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function FeaturedCategoriesForm({
  data,
  update,
  onPickMedia,
}: {
  data: FeaturedCategoriesData;
  update: (p: Partial<FeaturedCategoriesData>) => void;
  onPickMedia: (itemIdx: number) => void;
}) {
  const { categories } = useCatalogOptions();

  const resolveCatHref = (cat: CategoryOption) => {
    try {
      return categoryHref(
        { id: cat.id, slug: cat.slug, parentId: cat.parentId || null },
        categories.map((c) => ({ id: c.id, slug: c.slug, parentId: c.parentId || null }))
      );
    } catch {
      return `/${cat.slug}`;
    }
  };

  const handleSyncFromCatalog = () => {
    if (!categories.length) return;
    const synced = categories.slice(0, 10).map((c) => ({
      categoryId: c.id,
      customName: c.name,
      customImage: c.image || '',
      href: resolveCatHref(c),
      enabled: true,
    }));
    update({ items: synced, categoryIds: synced.map((x) => x.categoryId) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Bố cục hiển thị</label>
          <select
            value={data.layout || 'cards'}
            onChange={(e) => update({ layout: e.target.value as 'cards' | 'board' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
          >
            <option value="cards">Thẻ danh mục lớn (10 ô - Hệ sinh thái danh mục)</option>
            <option value="board">Bảng phân loại (Lưới ô vuông - Phụ kiện góc làm việc)</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Số lượng ô hiển thị tối đa</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.limit || 10}
            onChange={(e) => update({ limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 10)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối danh mục</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Khám Phá Hệ Sinh Thái Danh Mục"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Lựa chọn dòng máy phù hợp nhất theo nhu cầu..."
          />
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-700 block mb-1">Đường dẫn &quot;Xem tất cả&quot; (tùy chọn)</label>
        <input
          type="text"
          value={data.viewAllLink || ''}
          onChange={(e) => update({ viewAllLink: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="/phan-loai"
        />
      </div>

      {/* ITEMS LIST */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 text-xs block">
              Danh sách các ô danh mục ({data.items?.length || 0})
            </span>
            <span className="text-[11px] text-slate-500">
              Mỗi ô có thể gắn hình ảnh riêng, đổi tên hiển thị và gán liên kết khi bấm.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(!data.items || data.items.length === 0) && (
              <button
                type="button"
                onClick={handleSyncFromCatalog}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
              >
                Đồng bộ từ catalog
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const current = data.items || [];
                update({
                  items: [
                    ...current,
                    {
                      categoryId: '',
                      customName: `Mục #${current.length + 1}`,
                      customImage: '',
                      href: '/search',
                      enabled: true,
                    },
                  ],
                });
              }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm ô
            </button>
          </div>
        </div>

        {data.items?.map((item, index) => (
          <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="font-bold text-xs text-slate-800 truncate">
                  {item.customName || `Ô #${index + 1}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={item.enabled !== false}
                    onChange={(e) => {
                      const next = [...data.items];
                      next[index] = { ...next[index], enabled: e.target.checked };
                      update({ items: next });
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>Bật</span>
                </label>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...data.items];
                    [next[index], next[index - 1]] = [next[index - 1], next[index]];
                    update({ items: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === data.items.length - 1}
                  onClick={() => {
                    const next = [...data.items];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    update({ items: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update({ items: data.items.filter((_, i) => i !== index) });
                  }}
                  className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                  title="Xóa ô"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Tên hiển thị *</label>
                <input
                  type="text"
                  value={item.customName || ''}
                  onChange={(e) => {
                    const next = [...data.items];
                    next[index] = { ...next[index], customName: e.target.value };
                    update({ items: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  placeholder="Ví dụ: Laptop Gaming"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Liên kết khi bấm (URL) *</label>
                <input
                  type="text"
                  value={item.href || ''}
                  onChange={(e) => {
                    const next = [...data.items];
                    next[index] = { ...next[index], href: e.target.value };
                    update({ items: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                  placeholder="/category/laptop-gaming"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Danh mục hệ thống liên kết</label>
                <select
                  value={item.categoryId || ''}
                  onChange={(e) => {
                    const next = [...data.items];
                    const selectedCat = categories.find((c) => c.id === e.target.value);
                    next[index] = {
                      ...next[index],
                      categoryId: e.target.value,
                      customName: next[index].customName || selectedCat?.name || '',
                      href: selectedCat ? resolveCatHref(selectedCat) : next[index].href || '',
                    };
                    update({ items: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="">-- Tùy chỉnh (không gắn ID) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Ảnh đại diện icon / ô</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.customImage || ''}
                  onChange={(e) => {
                    const next = [...data.items];
                    next[index] = { ...next[index], customImage: e.target.value };
                    update({ items: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                  placeholder="URL ảnh hoặc chọn từ thư viện"
                />
                <button
                  type="button"
                  onClick={() => onPickMedia(index)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Chọn ảnh
                </button>
                {item.customImage && (
                  <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.customImage} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturedBrandsForm({
  data,
  update,
}: {
  data: FeaturedBrandsData;
  update: (p: Partial<FeaturedBrandsData>) => void;
  onPickMedia?: (bIdx: number) => void;
}) {
  const { brands } = useCatalogOptions();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối thương hiệu</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Khám Phá Theo Thương Hiệu"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Đối tác phân phối thiết bị công nghệ chính hãng..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số lượng thương hiệu hiển thị</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.limit || 8}
            onChange={(e) => update({ limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 8)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Đường dẫn Xem tất cả</label>
          <input
            type="text"
            value={data.viewAllLink || ''}
            onChange={(e) => update({ viewAllLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/phan-loai"
          />
        </div>
      </div>

      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
        <div className="font-bold flex items-center justify-between">
          <span>Tự động đồng bộ từ thương hiệu hệ thống:</span>
          <Link href="/admin/brands" target="_blank" className="text-blue-700 hover:underline font-bold">
            Quản lý thương hiệu ↗
          </Link>
        </div>
        <p>
          Các thương hiệu lớn đang hoạt động ({brands.map((b) => b.name).join(', ')}) sẽ được tự động hiển thị kèm logo và liên kết tương ứng theo giới hạn {data.limit || 8} hãng.
        </p>
      </div>
    </div>
  );
}

export function FeaturedCollectionForm({
  data,
  update,
}: {
  data: FeaturedCollectionData;
  update: (p: Partial<FeaturedCollectionData>) => void;
}) {
  const [collections, setCollections] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  useEffect(() => {
    let ignore = false;
    async function loadCollections() {
      try {
        const res = await mediaRequest<{ document?: { collections?: Array<{ id: string; name: string; slug: string }> } }>('/api/admin/navigation');
        if (!ignore && res?.document?.collections) {
          setCollections(res.document.collections);
        }
      } catch {
        // fail-soft
      }
    }
    void loadCollections();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      {collections.length > 0 && (
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chọn từ bộ sưu tập đã có</label>
          <select
            value={collections.some((c) => c.id === data.collectionId || c.slug === data.collectionId) ? data.collectionId : ''}
            onChange={(e) => {
              const sel = collections.find((c) => c.id === e.target.value || c.slug === e.target.value);
              if (sel) {
                update({
                  collectionId: sel.id,
                  title: data.title || sel.name,
                });
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
          >
            <option value="">-- Chọn bộ sưu tập sẵn có --</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} ({col.slug})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề bộ sưu tập (Tùy chọn ghi đè)</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Để trống sẽ lấy tên bộ sưu tập"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-700 block">Mã Bộ sưu tập (Collection ID / Slug)</label>
            <Link
              href="/admin/navigation?tab=collections"
              target="_blank"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
            >
              Quản lý Bộ sưu tập ↗
            </Link>
          </div>
          <input
            type="text"
            value={data.collectionId || ''}
            onChange={(e) => update({ collectionId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: col-gaming-deals"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Tuyển chọn các dòng máy bán chạy nhất"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số lượng hiển thị (Limit)</label>
          <input
            type="number"
            min={1}
            max={48}
            value={data.limit || 12}
            onChange={(e) => update({ limit: Math.min(48, Math.max(1, parseInt(e.target.value) || 12)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="12"
          />
        </div>
      </div>
    </div>
  );
}

export function NewsReviewsForm({
  data,
  update,
  onPickPost,
}: {
  data: NewsReviewsData;
  update: (p: Partial<NewsReviewsData>) => void;
  onPickPost?: () => void;
}) {
  const { postCategories } = useCatalogOptions();
  const [postTitles, setPostTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    const missingIds = (data.postIds || []).filter((id) => !postTitles[id]);
    if (missingIds.length === 0) return;

    async function loadPostTitles() {
      try {
        const res = await mediaRequest<{ items: Array<{ id: string; title: string }> }>(
          `/api/admin/posts?limit=50`
        );
        if (!ignore && res?.items) {
          const map: Record<string, string> = {};
          for (const item of res.items) {
            map[item.id] = item.title;
          }
          setPostTitles((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // fail-soft
      }
    }
    void loadPostTitles();
    return () => {
      ignore = true;
    };
  }, [data.postIds, postTitles]);

  const hasSpecificPosts = Boolean(data.postIds && data.postIds.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề tin tức *</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Góc CitiLap Media & Đánh Giá"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Cập nhật tin công nghệ và thủ thuật sử dụng..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số bài hiển thị (Limit)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.limit || 5}
            onChange={(e) => update({ limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 5)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Bố cục hiển thị</label>
          <select
            value={data.layout || 'grid'}
            onChange={(e) => update({ layout: e.target.value as 'grid' | 'featured' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
          >
            <option value="grid">Lưới bài viết có thanh cuộn ngang (Trang chủ)</option>
            <option value="featured">Bài nổi bật lớn + Danh sách bên cạnh</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Đường dẫn &quot;Xem tất cả&quot;</label>
          <input
            type="text"
            value={data.viewAllLink || ''}
            onChange={(e) => update({ viewAllLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            placeholder="/news"
          />
        </div>
      </div>

      {/* SOURCE MODE & SPECIFIC POSTS */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 text-xs block">Nguồn bài viết hiển thị:</label>
          <div className="flex gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="news_source"
                checked={!hasSpecificPosts}
                onChange={() => update({ postIds: [] })}
              />
              <span>Tự động theo chuyên mục</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="news_source"
                checked={hasSpecificPosts}
                onChange={() => {
                  if (!data.postIds?.length && onPickPost) onPickPost();
                }}
              />
              <span>Chọn bài viết cụ thể ({data.postIds?.length || 0})</span>
            </label>
          </div>
        </div>

        {!hasSpecificPosts ? (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Lọc theo chuyên mục bài viết (Để trống để lấy tất cả chuyên mục)
            </label>
            <select
              value={data.categoryId || ''}
              onChange={(e) => update({ categoryId: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Tất cả chuyên mục bài viết</option>
              {postCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">
                Đã chọn {data.postIds.length} bài viết (Hiển thị tối đa {data.limit || 5} bài)
              </span>
              {onPickPost && (
                <button
                  type="button"
                  onClick={onPickPost}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                >
                  + Chọn thêm bài viết
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {data.postIds.map((pId, idx) => (
                <div
                  key={pId}
                  className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {postTitles[pId] || `Bài viết ${pId}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">ID: {pId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...data.postIds];
                        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                        update({ postIds: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === data.postIds.length - 1}
                      onClick={() => {
                        const next = [...data.postIds];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        update({ postIds: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update({ postIds: data.postIds.filter((x) => x !== pId) });
                      }}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function IntroForm({
  data,
  update,
}: {
  data: IntroData;
  update: (p: Partial<IntroData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề cam kết dịch vụ</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Cam Kết Chất Lượng CitiLap"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="4 tiêu chuẩn dịch vụ vượt trội dành cho khách hàng"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">
            Danh sách các cam kết dịch vụ ({data.features?.length || 0}/8)
          </span>
          <button
            type="button"
            disabled={(data.features?.length || 0) >= 8}
            onClick={() => {
              const current = data.features || [];
              update({
                features: [
                  ...current,
                  {
                    id: `feat-${Date.now()}`,
                    icon: 'star',
                    title: `Cam kết #${current.length + 1}`,
                    description: 'Mô tả tiêu chuẩn dịch vụ',
                    href: '',
                    enabled: true,
                  },
                ],
              });
            }}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm cam kết
          </button>
        </div>

        {data.features?.map((feat, fIdx) => (
          <div key={feat.id || fIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {fIdx + 1}
                </span>
                <span className="font-bold text-xs text-slate-800 truncate">{feat.title}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={feat.enabled !== false}
                    onChange={(e) => {
                      const next = [...(data.features || [])];
                      next[fIdx] = { ...next[fIdx], enabled: e.target.checked };
                      update({ features: next });
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>Bật</span>
                </label>
                <button
                  type="button"
                  disabled={fIdx === 0}
                  onClick={() => {
                    const next = [...(data.features || [])];
                    [next[fIdx], next[fIdx - 1]] = [next[fIdx - 1], next[fIdx]];
                    update({ features: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={fIdx === (data.features?.length || 0) - 1}
                  onClick={() => {
                    const next = [...(data.features || [])];
                    [next[fIdx], next[fIdx + 1]] = [next[fIdx + 1], next[fIdx]];
                    update({ features: next });
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update({ features: data.features?.filter((_, i) => i !== fIdx) });
                  }}
                  className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                  title="Xóa cam kết"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Biểu tượng (Icon)</label>
                <select
                  value={feat.icon || 'star'}
                  onChange={(e) => {
                    const next = [...(data.features || [])];
                    next[fIdx] = { ...next[fIdx], icon: e.target.value };
                    update({ features: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="star">⭐ Ngôi sao (Máy lướt/chất)</option>
                  <option value="shield">🛡️ Khiên bảo vệ (Nguyên zin/Bảo hành)</option>
                  <option value="refresh">🔄 Mũi tên đổi mới (Đổi lỗi 7 ngày)</option>
                  <option value="truck">🚚 Xe tải (Giao hàng toàn quốc)</option>
                  <option value="store">🏬 Cửa hàng (Showroom)</option>
                  <option value="zap">⚡ Tia sét (Tốc độ)</option>
                  <option value="headphones">🎧 Tai nghe (Hỗ trợ 24/7)</option>
                  <option value="sparkles">✨ Lấp lánh (Ưu đãi đặc biệt)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Tiêu đề cam kết *</label>
                <input
                  type="text"
                  value={feat.title}
                  onChange={(e) => {
                    const next = [...(data.features || [])];
                    next[fIdx] = { ...next[fIdx], title: e.target.value };
                    update({ features: next });
                  }}
                  placeholder="Ví dụ: Theo đúng nhu cầu"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Chi tiết mô tả</label>
                <input
                  type="text"
                  value={feat.description}
                  onChange={(e) => {
                    const next = [...(data.features || [])];
                    next[fIdx] = { ...next[fIdx], description: e.target.value };
                    update({ features: next });
                  }}
                  placeholder="Ví dụ: Tư vấn cấu hình chuẩn xác"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Liên kết khi bấm (tùy chọn)</label>
                <input
                  type="text"
                  value={feat.href || ''}
                  onChange={(e) => {
                    const next = [...(data.features || [])];
                    next[fIdx] = { ...next[fIdx], href: e.target.value };
                    update({ features: next });
                  }}
                  placeholder="/chinh-sach-bao-hanh"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CtaForm({
  data,
  update,
  onPickMedia,
}: {
  data: CtaData;
  update: (p: Partial<CtaData>) => void;
  onPickMedia?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề kêu gọi</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?"
        />
      </div>
      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp 1-1 qua Zalo hoặc Hotline."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Nút bấm chính (Zalo)</label>
          <input
            type="text"
            value={data.primaryText || ''}
            onChange={(e) => update({ primaryText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Chat Zalo Ngay"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút chính</label>
          <input
            type="text"
            value={data.primaryLink || ''}
            onChange={(e) => update({ primaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            placeholder="https://zalo.me"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Nút bấm phụ (Hotline)</label>
          <input
            type="text"
            value={data.secondaryText || ''}
            onChange={(e) => update({ secondaryText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Gọi Hotline"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút phụ</label>
          <input
            type="text"
            value={data.secondaryLink || ''}
            onChange={(e) => update({ secondaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            placeholder="tel:0988123456"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số điện thoại hiển thị</label>
          <input
            type="text"
            value={data.phone || ''}
            onChange={(e) => update({ phone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="0988 123 456"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Ảnh nền (tùy chọn)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.bgImageUrl || ''}
              onChange={(e) => update({ bgImageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              placeholder="URL hình ảnh"
            />
            {onPickMedia && (
              <button
                type="button"
                onClick={onPickMedia}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              >
                Chọn ảnh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoReviewsForm({
  data,
  update,
  onPickMedia,
}: {
  data: VideoReviewsData;
  update: (p: Partial<VideoReviewsData>) => void;
  onPickMedia: (videoIdx: number) => void;
}) {
  const confirm = useConfirm();
  const [syncingYt, setSyncingYt] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [resolvingQuick, setResolvingQuick] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSyncYt = async () => {
    const channel = (data.youtubeUrl || '').trim();
    if (!channel || syncingYt) return;
    setSyncingYt(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/fetch-videos?channelUrl=${encodeURIComponent(channel)}&limit=${data.limit || 6}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        const existing = data.videos || [];
        const existingUrls = new Set(existing.map((v) => v.url));
        const newItems = json.data
          .filter((v: { url: string }) => !existingUrls.has(v.url))
          .map((v: { title: string; url: string; thumbnail: string }) => ({
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnail,
            href: '',
            enabled: true,
          }));
        update({ videos: [...newItems, ...existing].slice(0, 12) });
        setStatusMsg(`Đã lấy thành công ${newItems.length} video mới nhất từ YouTube.`);
      } else {
        setStatusMsg(json.error || 'Không thể lấy video từ kênh YouTube này.');
      }
    } catch {
      setStatusMsg('Lỗi kết nối khi đồng bộ video.');
    } finally {
      setSyncingYt(false);
    }
  };

  const handleAddQuickUrl = async () => {
    const raw = quickUrl.trim();
    if (!raw || resolvingQuick) return;
    setResolvingQuick(true);
    setStatusMsg(null);
    try {
      const urls = raw.split(/[\n,\s]+/).map((u) => u.trim()).filter(Boolean);
      let items: Array<{ title: string; url: string; thumbnail: string }> = [];
      if (urls.length > 1) {
        const res = await fetch('/api/admin/fetch-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.success && Array.isArray(json.data)) {
          items = json.data;
        }
      } else {
        const res = await fetch(`/api/admin/fetch-videos?videoUrl=${encodeURIComponent(raw)}`);
        const json = await res.json().catch(() => ({}));
        if (json.success && json.data) {
          items = [json.data];
        }
      }

      if (items.length > 0) {
        const existing = data.videos || [];
        const existingUrls = new Set(existing.map((v) => v.url));
        const newItems = items
          .filter((v) => !existingUrls.has(v.url))
          .map((v) => ({
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnail,
            href: '',
            enabled: true,
          }));
        update({ videos: [...newItems, ...existing].slice(0, 12) });
        setQuickUrl('');
        setStatusMsg(`Đã thêm ${items.length} video.`);
      } else {
        setStatusMsg('Không thể phân giải video từ URL đã nhập.');
      }
    } catch {
      setStatusMsg('Lỗi kết nối khi thêm video.');
    } finally {
      setResolvingQuick(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối video review *</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Video review sản phẩm"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Tổng hợp video đánh giá chuyên sâu và trải nghiệm thực tế..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số lượng video hiển thị tối đa</label>
          <input
            type="number"
            min={1}
            max={12}
            value={data.limit || 5}
            onChange={(e) => update({ limit: Math.min(12, Math.max(1, parseInt(e.target.value) || 5)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-700 text-xs">Link Kênh YouTube</label>
            {data.youtubeUrl && (
              <button
                type="button"
                disabled={syncingYt}
                onClick={() => void handleSyncYt()}
                className="text-[10px] text-rose-600 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
              >
                {syncingYt ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : null}
                Lấy video mới
              </button>
            )}
          </div>
          <input
            type="text"
            value={data.youtubeUrl || ''}
            onChange={(e) => update({ youtubeUrl: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            placeholder="https://www.youtube.com/@thinkview/videos"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Link Kênh TikTok</label>
          <input
            type="text"
            value={data.tiktokUrl || ''}
            onChange={(e) => update({ tiktokUrl: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            placeholder="https://www.tiktok.com/@citilapvn"
          />
        </div>
      </div>

      {/* Quick Video URL input */}
      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
        <label className="font-bold text-slate-700 text-xs block">
          Dán nhanh link YouTube hoặc TikTok (tự lấy tiêu đề &amp; ảnh thu nhỏ):
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Dán URL video YouTube hoặc TikTok (hỗ trợ nhiều link cách nhau bởi xuống dòng)"
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
          />
          <button
            type="button"
            disabled={!quickUrl.trim() || resolvingQuick}
            onClick={() => void handleAddQuickUrl()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            {resolvingQuick ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Thêm
          </button>
        </div>
        {statusMsg && <p className="text-[11px] text-blue-700 font-medium">{statusMsg}</p>}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">
            Danh sách video ({data.videos?.length || 0}) • Hiển thị tối đa {data.limit || 5} video
          </span>
          <button
            type="button"
            onClick={() => {
              const current = data.videos || [];
              update({
                videos: [
                  ...current,
                  {
                    title: `Video đánh giá #${current.length + 1}`,
                    url: '',
                    thumbnail: '',
                    href: '',
                    enabled: true,
                  },
                ],
              });
            }}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm video
          </button>
        </div>

        {data.videos?.map((v, index) => {
          const ytMatch = youtubeId(v.url || '');
          return (
            <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                      v.url?.includes('tiktok.com') || tiktokVideoId(v.url || '')
                        ? 'bg-slate-900 text-cyan-300'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {v.url?.includes('tiktok.com') || tiktokVideoId(v.url || '') ? 'TikTok' : 'YouTube'}
                  </span>
                  <span className="font-bold text-xs text-slate-800 truncate">{v.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                    <input
                      type="checkbox"
                      checked={v.enabled !== false}
                      onChange={(e) => {
                        const next = [...data.videos];
                        next[index] = { ...next[index], enabled: e.target.checked };
                        update({ videos: next });
                      }}
                      className="rounded text-blue-600"
                    />
                    <span>Bật</span>
                  </label>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...data.videos];
                      [next[index], next[index - 1]] = [next[index - 1], next[index]];
                      update({ videos: next });
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    title="Di chuyển lên"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === data.videos.length - 1}
                    onClick={() => {
                      const next = [...data.videos];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      update({ videos: next });
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    title="Di chuyển xuống"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer ml-1"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Xóa video #${index + 1}?`,
                        message: `Bạn có chắc chắn muốn xóa video "${v.title || `#${index + 1}`}" khỏi danh sách?`,
                        confirmLabel: 'Xóa video',
                        cancelLabel: 'Hủy',
                        variant: 'destructive',
                      });
                      if (!ok) return;
                      update({ videos: data.videos.filter((_, i) => i !== index) });
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Tiêu đề video *</label>
                  <input
                    type="text"
                    value={v.title}
                    onChange={(e) => {
                      const next = [...data.videos];
                      next[index] = { ...next[index], title: e.target.value };
                      update({ videos: next });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    placeholder="Ví dụ: Đánh giá chi tiết laptop Lenovo Legion 5"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    URL video (YouTube hoặc TikTok) *
                  </label>
                  <input
                    type="text"
                    value={v.url}
                    onChange={(e) => {
                      const next = [...data.videos];
                      const newUrl = e.target.value;
                      const yt = youtubeId(newUrl);
                      next[index] = {
                        ...next[index],
                        url: newUrl,
                        thumbnail: next[index].thumbnail || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : ''),
                      };
                      update({ videos: next });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Ảnh đại diện (Thumbnail)</label>
                    {ytMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...data.videos];
                          next[index] = { ...next[index], thumbnail: `https://i.ytimg.com/vi/${ytMatch}/hqdefault.jpg` };
                          update({ videos: next });
                        }}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Lấy từ YouTube ⚡
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={v.thumbnail || ''}
                      onChange={(e) => {
                        const next = [...data.videos];
                        next[index] = { ...next[index], thumbnail: e.target.value };
                        update({ videos: next });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                      placeholder="URL thumbnail"
                    />
                    <button
                      type="button"
                      onClick={() => onPickMedia(index)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Chọn ảnh
                    </button>
                    {v.thumbnail && (
                      <div className="w-12 h-8 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Liên kết sản phẩm liên quan (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={v.href || ''}
                    onChange={(e) => {
                      const next = [...data.videos];
                      next[index] = { ...next[index], href: e.target.value };
                      update({ videos: next });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                    placeholder="/laptop/lenovo-legion-5-pro"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerGalleryForm({
  data,
  update,
  onPickMedia,
  onAddMedia,
}: {
  data: CustomerGalleryData;
  update: (p: Partial<CustomerGalleryData>) => void;
  onPickMedia: (imgIdx: number) => void;
  onAddMedia: () => void;
}) {
  const confirm = useConfirm();
  const images = data.images || [];
  const uniqueUrlCount = new Set(images.map((img) => img.url.trim())).size;
  const hasDuplicates = images.length > uniqueUrlCount;

  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const deduplicated = images.filter((img) => {
      const url = img.url.trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    update({ images: deduplicated });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối ảnh khách hàng *</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Hình ảnh khách hàng tại CitiLap"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Hình ảnh khách hàng tin tưởng mua sắm và nhận máy..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số lượng ảnh hiển thị tối đa</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.limit || 10}
            onChange={(e) => update({ limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 10)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        {hasDuplicates && (
          <div className="pt-5">
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              <span>Phát hiện ảnh trùng lặp: Bấm để dọn dẹp</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">
            Danh sách ảnh ({images.length}) • Hiển thị tối đa {data.limit || 10} ảnh
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddMedia}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
            >
              + Chọn từ thư viện
            </button>
            <button
              type="button"
              onClick={() => {
                update({
                  images: [
                    ...images,
                    {
                      url: '',
                      alt: `Khách hàng trải nghiệm laptop tại CitiLap #${images.length + 1}`,
                      href: '',
                      enabled: true,
                    },
                  ],
                });
              }}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              + Nhập URL
            </button>
          </div>
        </div>

        {images.map((img, index) => {
          const isDuplicate = images.findIndex((other) => other.url.trim() === img.url.trim()) !== index;
          return (
            <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 items-start">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt || 'Gallery image'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                    Chưa có ảnh
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-xs">Ảnh #{index + 1}</span>
                    {isDuplicate && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Trùng lặp URL
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer mr-1">
                      <input
                        type="checkbox"
                        checked={img.enabled !== false}
                        onChange={(e) => {
                          const next = [...images];
                          next[index] = { ...next[index], enabled: e.target.checked };
                          update({ images: next });
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>Bật</span>
                    </label>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...images];
                        [next[index], next[index - 1]] = [next[index - 1], next[index]];
                        update({ images: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={() => {
                        const next = [...images];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        update({ images: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer ml-1"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Xóa ảnh #${index + 1}?`,
                          message: `Bạn có chắc chắn muốn xóa ảnh #${index + 1} khỏi danh sách ảnh khách hàng?`,
                          confirmLabel: 'Xóa ảnh',
                          cancelLabel: 'Hủy',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        update({ images: images.filter((_, i) => i !== index) });
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">URL ảnh *</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={img.url}
                      onChange={(e) => {
                        const next = [...images];
                        next[index] = { ...next[index], url: e.target.value };
                        update({ images: next });
                      }}
                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white font-mono"
                      placeholder="https://... hoặc /brand/store-photo-02.webp"
                    />
                    <button
                      type="button"
                      onClick={() => onPickMedia(index)}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Chọn ảnh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Mô tả ảnh (Alt)</label>
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => {
                        const next = [...images];
                        next[index] = { ...next[index], alt: e.target.value };
                        update({ images: next });
                      }}
                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
                      placeholder="Ví dụ: Khách hàng mua laptop tại CitiLap"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Liên kết khi click (tùy chọn)</label>
                    <input
                      type="text"
                      value={img.href || ''}
                      onChange={(e) => {
                        const next = [...images];
                        next[index] = { ...next[index], href: e.target.value };
                        update({ images: next });
                      }}
                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white font-mono"
                      placeholder="/laptop-gaming"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
