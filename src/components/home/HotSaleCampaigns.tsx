'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { ProductCarousel } from './ProductTabs';
import FlashSaleCountdown from '@/components/product/FlashSaleCountdown';
import type { ProductCardProduct } from '@/components/product/ProductCard';

type Campaign = { id: string; name: string; startAt: string; endAt: string; products: ProductCardProduct[] };
const dayKey = (value: string) => new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 10);
const dateLabel = (value: string) => { const [, month, day] = dayKey(value).split('-'); return `${day}/${month}`; };
const timeLabel = (value: string) => {
  const time = new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(11, 16);
  return time.endsWith(':00') ? `${Number(time.slice(0, 2))}` : time;
};

export default function HotSaleCampaigns({
  campaigns,
  bannerImage,
  bannerLink,
  bannerAlt,
}: {
  campaigns: Campaign[];
  bannerImage?: string;
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
  const pill = (active: boolean) => `shrink-0 rounded-full border-[3px] border-white px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 ${active ? 'bg-white text-red-700' : 'bg-transparent text-white hover:bg-white/10'}`;
  function selectGroup(index: number, now: number) {
    const items = groups[index].slots;
    setSelected((items.find(c => Date.parse(c.startAt) <= now && Date.parse(c.endAt) > now) || items[0]).id);
    document.getElementById(`${prefix}-tab-${index}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  return <section aria-label="HOT SALE" className="pb-10">
    <div className="container mx-auto max-w-[1370px] px-4">
      {bannerImage && (
        <div className="mb-4 overflow-hidden rounded-2xl shadow-sm">
          {bannerLink ? (
            <a href={bannerLink} className="block hover:opacity-95 transition">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerImage} alt={bannerAlt || 'HOT SALE'} className="w-full h-auto max-h-[180px] object-cover" />
            </a>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={bannerImage} alt={bannerAlt || 'HOT SALE'} className="w-full h-auto max-h-[180px] object-cover" />
          )}
        </div>
      )}
      {!single && <div className="relative isolate before:absolute before:inset-x-3 before:bottom-0 before:top-5 before:-z-10 before:bg-gradient-to-r before:from-[#ef3b20] before:via-[#f46a49] before:to-[#ef3b20] before:[clip-path:polygon(4%_0,96%_0,100%_100%,0_100%)]">
        <div role="tablist" aria-label="Chiến dịch HOT SALE" className="flex gap-5 overflow-x-auto px-7 pb-2 pt-1 hide-scrollbar sm:gap-8 sm:px-20">
          {groups.map((g, index) => <button key={g.key} id={`${prefix}-tab-${index}`} type="button" role="tab" aria-selected={index === groupIndex} aria-controls={`${prefix}-panel`} tabIndex={index === groupIndex ? 0 : -1}
            onClick={() => selectGroup(index, Date.now())} onKeyDown={e => {
              const next = e.key === 'ArrowRight' ? (index + 1) % groups.length : e.key === 'ArrowLeft' ? (index - 1 + groups.length) % groups.length : e.key === 'Home' ? 0 : e.key === 'End' ? groups.length - 1 : -1;
              if (next >= 0) { e.preventDefault(); selectGroup(next, Date.now()); document.getElementById(`${prefix}-tab-${next}`)?.focus(); }
            }}
            className={`relative isolate min-h-16 min-w-44 flex-1 cursor-pointer rounded-t-[24px] px-4 py-4 text-sm font-black uppercase italic before:absolute before:-inset-x-3 before:-bottom-1 before:-z-10 before:h-4 before:rounded-t-full before:bg-[#8f0813] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:text-xl ${index === groupIndex ? 'bg-gradient-to-b from-[#df2639] to-[#cc2031] text-white shadow-[inset_0_-6px_5px_-4px_#810914]' : 'bg-gradient-to-b from-[#ac1022] to-[#870812] text-[#f8b4bd] hover:from-[#bd1729] hover:to-[#980d1a]'}`}>{g.slots[0].name}</button>)}
        </div>
      </div>}
      <div role={single ? 'region' : 'tabpanel'} id={`${prefix}-panel`} aria-label={single ? campaign.name : undefined} aria-labelledby={single ? undefined : `${prefix}-tab-${groupIndex}`} tabIndex={0} className={`rounded-[24px] p-2 sm:p-5 focus-visible:outline-2 focus-visible:outline-red-900 ${single ? 'bg-gradient-to-b from-[#fc3561] to-[#ff4d46]' : 'border-[3px] border-[#e8c57e] bg-[#d60900] shadow-[inset_0_0_0_2px_#ffedbb]'}`}>
        {single && <h2 className="flex items-center justify-center gap-2 px-2 py-3 text-center text-xl font-black uppercase text-white sm:py-4 sm:text-3xl"><Flame aria-hidden="true" className="h-8 w-8 shrink-0" /><span>{campaign.name} <span className="text-yellow-200">NỔI BẬT</span></span></h2>}
        <div role="group" aria-label="Ngày sale (GMT+7)" className="mb-3 flex justify-center gap-2 overflow-x-auto py-1 hide-scrollbar">
          {days.map(day => { const slot = slots.find(c => dayKey(c.startAt) === day)!; return <button key={day} type="button" aria-pressed={day === dayKey(campaign.startAt)} onClick={() => setSelected(slot.id)} className={pill(day === dayKey(campaign.startAt))}><time dateTime={day}>{dateLabel(slot.startAt)}</time></button>; })}
        </div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-2 py-2">
          <div role="group" aria-label="Khung giờ sale (GMT+7)" className="flex max-w-full gap-2 overflow-x-auto py-1 hide-scrollbar">
            {slots.filter(c => dayKey(c.startAt) === dayKey(campaign.startAt)).map(c => <button key={c.id} type="button" aria-pressed={c.id === campaign.id} onClick={() => setSelected(c.id)} className={pill(c.id === campaign.id)}>{timeLabel(c.startAt)}–{timeLabel(c.endAt)}h {dateLabel(c.startAt)}{dayKey(c.endAt) !== dayKey(c.startAt) && ` – ${dateLabel(c.endAt)}`}</button>)}
          </div>
          <FlashSaleCountdown key={campaign.id} startAt={campaign.startAt} endAt={campaign.endAt} saleStyle />
        </div>
        <ProductCarousel key={campaign.id} products={campaign.products} label={campaign.name} oneAtATime />
        <p className="px-2 pb-1 pt-3 text-center text-xs font-semibold text-white sm:text-sm">Giá ưu đãi áp dụng đúng cấu hình trong khung giờ đã chọn · Giờ Việt Nam (GMT+7)</p>
      </div>
    </div>
  </section>;
}
