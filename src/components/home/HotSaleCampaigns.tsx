'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { ProductCarousel } from './ProductTabs';
import FlashSaleCountdown from '@/components/product/FlashSaleCountdown';
import type { ProductCardProduct } from '@/components/product/ProductCard';

type Campaign = { id: string; name: string; startAt: string; endAt: string; products: ProductCardProduct[] };
const safeTime = (value?: string) => { const ms = Date.parse(value || ''); return Number.isFinite(ms) ? ms : 0; };
const dayKey = (value?: string) => new Date(safeTime(value) + 7 * 3600000).toISOString().slice(0, 10);
const dateLabel = (value?: string) => { const [, month, day] = dayKey(value).split('-'); return `${day}/${month}`; };
const timeLabel = (value?: string) => {
  const time = new Date(safeTime(value) + 7 * 3600000).toISOString().slice(11, 16);
  return time.endsWith(':00') ? `${Number(time.slice(0, 2))}` : time;
};

export default function HotSaleCampaigns({
  campaigns,
  bannerImage,
  mobileBannerImage,
  bannerLink,
  bannerAlt,
}: {
  campaigns: Campaign[];
  bannerImage?: string;
  mobileBannerImage?: string;
  bannerLink?: string;
  bannerAlt?: string;
}) {
  const [selected, setSelected] = useState('');
  const prefix = useId();
  const router = useRouter();
  useEffect(() => {
    const now = Date.now();
    const next = Math.min(...campaigns.flatMap(c => [Date.parse(c.startAt), Date.parse(c.endAt)]).filter(time => time > now));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => router.refresh(), Math.min(next - now + 100, 2147483647));
    return () => clearTimeout(timer);
  }, [campaigns, router]);
  const campaign = campaigns.find(c => c.id === selected) || campaigns[0];
  if (!campaign) return null;
  // ponytail: group existing records by name; add campaignGroupId if slots need independent names.
  const groups = [...new Set(campaigns.map(c => c.name.trim().toLocaleLowerCase('vi-VN')))].map(key => ({ key, slots: campaigns.filter(c => c.name.trim().toLocaleLowerCase('vi-VN') === key).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)) }));
  const groupIndex = groups.findIndex(g => g.slots.some(c => c.id === campaign.id));
  const slots = groups[groupIndex].slots;
  const days = [...new Set(slots.map(c => dayKey(c.startAt)))];
  const single = groups.length === 1;
  const pill = (active: boolean) => `shrink-0 min-h-11 inline-flex items-center justify-center rounded-full border-2 md:border-[3px] border-white px-3 md:px-5 py-1.5 text-[11px] md:text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? 'bg-white text-red-700' : 'bg-transparent text-white hover:bg-white/10'}`;
  function selectGroup(index: number, now: number) {
    const items = groups[index].slots;
    setSelected((items.find(c => Date.parse(c.startAt) <= now && Date.parse(c.endAt) > now) || items[0]).id);
    document.getElementById(`${prefix}-tab-${index}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  const hasSeparateMobileBanner = Boolean(mobileBannerImage && bannerImage && mobileBannerImage !== bannerImage);
  const bannerNode = (
    <picture className="contents">
      {hasSeparateMobileBanner && (
        <source media="(max-width: 767px)" srcSet={mobileBannerImage} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        loading="lazy"
        decoding="async"
        src={bannerImage || mobileBannerImage}
        alt={bannerAlt || 'HOT SALE'}
        className="w-full h-auto max-h-[140px] md:max-h-[180px] object-cover"
      />
    </picture>
  );
  return <section aria-label="HOT SALE" className="pb-4 md:pb-8 lg:pb-10">
    <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
      {(bannerImage || mobileBannerImage) && (
        <div className="mb-2.5 md:mb-4 overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl shadow-sm">
          {bannerLink ? (
            <a href={bannerLink} className="block hover:opacity-95 transition">
              {bannerNode}
            </a>
          ) : (
            bannerNode
          )}
        </div>
      )}
      {!single && (
        <div
          role="tablist"
          aria-label="Chiến dịch HOT SALE"
          className="relative z-10 -mb-[2px] md:-mb-[3px] flex gap-1.5 overflow-x-auto overscroll-x-contain overflow-y-hidden px-1.5 pt-1 hide-scrollbar md:gap-3 lg:gap-4 md:px-6 lg:px-10"
        >
          {groups.map((g, index) => {
            const isActive = index === groupIndex;
            return (
              <button
                key={g.key}
                id={`${prefix}-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${prefix}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectGroup(index, Date.now())}
                onKeyDown={e => {
                  const next = e.key === 'ArrowRight' ? (index + 1) % groups.length : e.key === 'ArrowLeft' ? (index - 1 + groups.length) % groups.length : e.key === 'Home' ? 0 : e.key === 'End' ? groups.length - 1 : -1;
                  if (next >= 0) { e.preventDefault(); selectGroup(next, Date.now()); document.getElementById(`${prefix}-tab-${next}`)?.focus(); }
                }}
                className={`relative min-h-11 md:min-h-14 lg:min-h-16 min-w-0 md:min-w-44 flex-1 inline-flex items-center justify-center cursor-pointer rounded-t-[14px] md:rounded-t-[20px] px-2 py-1.5 md:px-3.5 md:py-2.5 text-[11px] leading-tight font-black uppercase transition focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white md:text-base lg:text-lg ${
                  isActive
                    ? 'border-2 md:border-[3px] border-[#e8c57e] border-b-[#d60900] bg-[#d60900] text-white'
                    : 'border-2 md:border-[3px] border-transparent border-b-[#e8c57e] bg-[#a30b18] text-white/90 hover:bg-[#b80e1d] hover:text-white'
                }`}
              >
                {isActive ? (
                  <span className="inline-flex items-center justify-center gap-1 md:gap-2 rounded-lg md:rounded-xl border border-yellow-300/90 bg-gradient-to-b from-[#ff5e3a] via-[#e6192e] to-[#b30718] px-2.5 md:px-4 py-1 md:py-1.5 text-white shadow-[0_3px_10px_rgba(0,0,0,0.28),inset_0_1px_1px_rgba(255,255,255,0.55)]">
                    <Flame aria-hidden="true" className="h-3.5 w-3.5 md:h-5 md:w-5 shrink-0 fill-yellow-300 text-yellow-200 drop-shadow-xs" />
                    <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{g.slots[0].name}</span>
                  </span>
                ) : (
                  <span>{g.slots[0].name}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div role={single ? 'region' : 'tabpanel'} id={`${prefix}-panel`} aria-label={single ? campaign.name : undefined} aria-labelledby={single ? undefined : `${prefix}-tab-${groupIndex}`} tabIndex={0} className={`rounded-xl md:rounded-[24px] p-2 md:p-5 focus-visible:outline-2 focus-visible:outline-red-900 ${single ? 'bg-gradient-to-b from-[#fc3561] to-[#ff4d46]' : 'border-2 md:border-[3px] border-[#e8c57e] bg-[#d60900] shadow-[inset_0_0_0_2px_#ffedbb]'}`}>
        {single && <h2 className="flex items-center justify-center gap-1.5 md:gap-2 px-2 py-1.5 md:py-4 text-center text-base md:text-2xl lg:text-3xl font-black uppercase text-white"><Flame aria-hidden="true" className="h-5 w-5 md:h-7 md:w-7 lg:h-8 lg:w-8 shrink-0 text-yellow-200" /><span>{campaign.name} <span className="text-yellow-200">NỔI BẬT</span></span></h2>}
        {days.length > 1 && (
          <div role="group" aria-label="Ngày sale (GMT+7)" className="mb-1.5 md:mb-3 flex justify-center gap-1.5 md:gap-2 overflow-x-auto overscroll-x-contain py-0.5 md:py-1 hide-scrollbar">
            {days.map(day => { const slot = slots.find(c => dayKey(c.startAt) === day)!; return <button key={day} type="button" aria-pressed={day === dayKey(campaign.startAt)} onClick={() => setSelected(slot.id)} className={pill(day === dayKey(campaign.startAt))}><time dateTime={day}>{dateLabel(slot.startAt)}</time></button>; })}
          </div>
        )}
        <div className="mb-1.5 md:mb-2 flex flex-wrap items-center justify-between gap-1.5 md:gap-3 px-1 md:px-2 py-1 md:py-2">
          {slots.filter(c => dayKey(c.startAt) === dayKey(campaign.startAt)).length > 1 && (
            <div role="group" aria-label="Khung giờ sale (GMT+7)" className="flex max-w-full gap-1.5 md:gap-2 overflow-x-auto overscroll-x-contain py-0.5 md:py-1 hide-scrollbar">
              {slots.filter(c => dayKey(c.startAt) === dayKey(campaign.startAt)).map(c => <button key={c.id} type="button" aria-pressed={c.id === campaign.id} onClick={() => setSelected(c.id)} className={pill(c.id === campaign.id)}>{timeLabel(c.startAt)}–{timeLabel(c.endAt)}h {dateLabel(c.startAt)}{dayKey(c.endAt) !== dayKey(c.startAt) && ` – ${dateLabel(c.endAt)}`}</button>)}
            </div>
          )}
          <FlashSaleCountdown key={campaign.id} startAt={campaign.startAt} endAt={campaign.endAt} saleStyle />
        </div>
        <ProductCarousel key={campaign.id} products={campaign.products} label={campaign.name} oneAtATime cardVariant="flash" eagerImages />
        <p className="px-2 pb-0.5 pt-2 md:pt-3 text-center text-[11px] font-semibold text-white/95 md:text-sm">Giá ưu đãi áp dụng đúng cấu hình trong khung giờ đã chọn · Giờ Việt Nam (GMT+7)</p>
      </div>
    </div>
  </section>;
}
