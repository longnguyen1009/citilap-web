'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import FlashSaleCountdown from '@/components/product/FlashSaleCountdown';
import { type ProductCardProduct } from '@/components/product/ProductCard';
import { ProductCarousel } from './ProductTabs';
import {
  DEFAULT_FLASH_SALE_PRE_SHOW_HOURS,
  enumerateVnDayKeys,
  formatVnDayKeyLabel,
  formatVnTimeShort,
  getNextHotSaleBoundaryMs,
  isCampaignSlotInAutoShowWindow,
  selectNearestPresentOrFutureDays,
  toVnDateTimeParts,
} from '@/lib/flash-sale-schedule';

type Campaign = { id: string; name: string; startAt: string; endAt: string; products: ProductCardProduct[] };

const dayKey = (value?: string) => toVnDateTimeParts(value || '')?.dayKey ?? '1970-01-01';
const dateLabel = (value?: string) => formatVnDayKeyLabel(dayKey(value));

function pickPreferredSlot(slots: Campaign[], nowMs: number): Campaign {
  return (
    slots.find((c) => Date.parse(c.startAt) <= nowMs && Date.parse(c.endAt) > nowMs) ||
    slots[0]
  );
}

export default function HotSaleCampaigns({
  campaigns,
  bannerImage,
  mobileBannerImage,
  bannerLink,
  bannerAlt,
  preShowHours = DEFAULT_FLASH_SALE_PRE_SHOW_HOURS,
  autoHide = true,
  initialNowMs,
}: {
  campaigns: Campaign[];
  bannerImage?: string;
  mobileBannerImage?: string;
  bannerLink?: string;
  bannerAlt?: string;
  preShowHours?: number;
  autoHide?: boolean;
  initialNowMs?: number;
}) {
  const [selected, setSelected] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [nowMs, setNowMs] = useState(() => initialNowMs ?? Date.now());
  const prefix = useId();
  const router = useRouter();

  useEffect(() => {
    const syncTimer = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(syncTimer);
  }, [campaigns]);

  useEffect(() => {
    const current = Date.now();
    const next = getNextHotSaleBoundaryMs(campaigns, current, preShowHours);
    if (next === null) return;
    const timer = setTimeout(() => {
      setNowMs(Date.now());
      router.refresh();
    }, Math.min(next - current + 120, 2147483647));
    return () => clearTimeout(timer);
  }, [campaigns, preShowHours, nowMs, router]);

  const { groups, visibleCampaigns } = useMemo(() => {
    const activeOnly = campaigns.filter((c) => Date.parse(c.endAt) > nowMs);
    const hasExplicit = activeOnly.some((c) => c.id !== 'site-flash-sale');
    const clean = hasExplicit ? activeOnly.filter((c) => c.id !== 'site-flash-sale') : activeOnly;

    const map = new Map<string, Campaign[]>();
    for (const c of clean) {
      const key = c.name.trim().toLocaleLowerCase('vi-VN');
      const arr = map.get(key);
      if (arr) arr.push(c);
      else map.set(key, [c]);
    }

    const grouped = [...map.entries()]
      .map(([key, items]) => ({
        key,
        slots: items.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
      }))
      .filter((group) =>
        !autoHide ||
        group.slots.some((slot) =>
          isCampaignSlotInAutoShowWindow(slot.startAt, slot.endAt, nowMs, preShowHours)
        )
      )
      .sort((a, b) => {
        const aRunning = a.slots.some((s) => Date.parse(s.startAt) <= nowMs && Date.parse(s.endAt) > nowMs);
        const bRunning = b.slots.some((s) => Date.parse(s.startAt) <= nowMs && Date.parse(s.endAt) > nowMs);
        if (aRunning !== bRunning) return aRunning ? -1 : 1;
        return Date.parse(a.slots[0].startAt) - Date.parse(b.slots[0].startAt);
      });

    return {
      groups: grouped,
      visibleCampaigns: grouped.flatMap((g) => g.slots),
    };
  }, [campaigns, nowMs, preShowHours, autoHide]);

  if (!groups.length || !visibleCampaigns.length) return null;

  const matched = selected ? visibleCampaigns.find((c) => c.id === selected) : undefined;
  const groupIndex = matched
    ? groups.findIndex((g) => g.slots.some((c) => c.id === matched.id))
    : 0;
  const activeGroup = groups[groupIndex >= 0 ? groupIndex : 0];
  const slots = activeGroup.slots;
  const campaign = matched || pickPreferredSlot(slots, nowMs);

  // CellphoneS-style: take up to 2 nearest days in present or future across the group's slots.
  const allDayKeys = slots.flatMap((slot) => enumerateVnDayKeys(slot.startAt, slot.endAt));
  const days = selectNearestPresentOrFutureDays(allDayKeys, nowMs, 2);

  const campaignDays = enumerateVnDayKeys(campaign.startAt, campaign.endAt);
  const activeDay =
    (selectedDay && days.includes(selectedDay) && campaignDays.includes(selectedDay) ? selectedDay : null) ||
    days.find((d) => campaignDays.includes(d)) ||
    days[0] ||
    dayKey(campaign.startAt);

  const daySlots = slots.filter((slot) => enumerateVnDayKeys(slot.startAt, slot.endAt).includes(activeDay));
  const single = groups.length === 1;
  const pill = (active: boolean) =>
    `shrink-0 min-h-11 inline-flex items-center justify-center rounded-full border-2 md:border-[3px] border-white px-3 md:px-5 py-1.5 text-[11px] md:text-sm font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      active ? 'bg-white text-red-700' : 'bg-transparent text-white hover:bg-white/10'
    }`;

  function selectGroup(index: number) {
    const items = groups[index].slots;
    const preferred = pickPreferredSlot(items, nowMs);
    const preferredDays = selectNearestPresentOrFutureDays(
      items.flatMap((s) => enumerateVnDayKeys(s.startAt, s.endAt)),
      nowMs,
      2
    );
    setSelected(preferred.id);
    setSelectedDay(preferredDays[0] || dayKey(preferred.startAt));
    document.getElementById(`${prefix}-tab-${index}`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    });
  }

  function handleSelectDay(day: string) {
    setSelectedDay(day);
    const slotsForDay = slots.filter((slot) => enumerateVnDayKeys(slot.startAt, slot.endAt).includes(day));
    if (slotsForDay.length > 0) {
      const targetSlot = pickPreferredSlot(slotsForDay, nowMs);
      setSelected(targetSlot.id);
    }
  }

  const formatSlotLabel = (slot: Campaign) => {
    const startH = formatVnTimeShort(slot.startAt);
    const endH = formatVnTimeShort(slot.endAt);
    const startD = dateLabel(slot.startAt);
    const endD = dateLabel(slot.endAt);
    return startD === endD
      ? `${startH}–${endH} ${startD}`
      : `${startH} ${startD} – ${endH} ${endD}`;
  };

  const hasSeparateMobileBanner = Boolean(mobileBannerImage && bannerImage && mobileBannerImage !== bannerImage);
  const bannerNode = (
    <picture className="contents">
      {hasSeparateMobileBanner && (
        <source media="(max-width: 767px)" srcSet={mobileBannerImage} />
      )}
      <img
        loading="lazy"
        decoding="async"
        src={bannerImage || mobileBannerImage}
        alt={bannerAlt || 'HOT SALE'}
        className="w-full h-auto max-h-[140px] md:max-h-[180px] object-cover"
      />
    </picture>
  );

  return (
    <section aria-label="HOT SALE" className="pb-4 md:pb-8 lg:pb-10">
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
              const isActive = index === (groupIndex >= 0 ? groupIndex : 0);
              return (
                <button
                  key={g.key}
                  id={`${prefix}-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${prefix}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectGroup(index)}
                  onKeyDown={(e) => {
                    const next =
                      e.key === 'ArrowRight'
                        ? (index + 1) % groups.length
                        : e.key === 'ArrowLeft'
                          ? (index - 1 + groups.length) % groups.length
                          : e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? groups.length - 1
                              : -1;
                    if (next >= 0) {
                      e.preventDefault();
                      selectGroup(next);
                      document.getElementById(`${prefix}-tab-${next}`)?.focus();
                    }
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
        <div
          role={single ? 'region' : 'tabpanel'}
          id={`${prefix}-panel`}
          aria-label={single ? campaign.name : undefined}
          aria-labelledby={single ? undefined : `${prefix}-tab-${groupIndex >= 0 ? groupIndex : 0}`}
          tabIndex={0}
          className={`rounded-xl md:rounded-[24px] p-2 md:p-5 focus-visible:outline-2 focus-visible:outline-red-900 ${
            single
              ? 'bg-gradient-to-b from-[#fc3561] to-[#ff4d46]'
              : 'border-2 md:border-[3px] border-[#e8c57e] bg-[#d60900] shadow-[inset_0_0_0_2px_#ffedbb]'
          }`}
        >
          {single && (
            <h2 className="flex items-center justify-center gap-1.5 md:gap-2 px-2 py-1.5 md:py-4 text-center text-base md:text-2xl lg:text-3xl font-black uppercase text-white">
              <Flame aria-hidden="true" className="h-5 w-5 md:h-7 md:w-7 lg:h-8 lg:w-8 shrink-0 text-yellow-200" />
              <span>
                {campaign.name} <span className="text-yellow-200">NỔI BẬT</span>
              </span>
            </h2>
          )}
          {days.length > 1 && (
            <div
              role="group"
              aria-label="Ngày sale (GMT+7)"
              className="mb-1.5 md:mb-3 flex justify-center gap-1.5 md:gap-2 overflow-x-auto overscroll-x-contain py-0.5 md:py-1 hide-scrollbar"
            >
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={day === activeDay}
                  onClick={() => handleSelectDay(day)}
                  className={pill(day === activeDay)}
                >
                  <time dateTime={day}>{formatVnDayKeyLabel(day)}</time>
                </button>
              ))}
            </div>
          )}
          <div className="mb-1.5 md:mb-2 flex flex-wrap items-center justify-between gap-1.5 md:gap-3 px-1 md:px-2 py-1 md:py-2">
            {daySlots.length > 1 ? (
              <div
                role="group"
                aria-label="Khung giờ sale (GMT+7)"
                className="flex max-w-full gap-1.5 md:gap-2 overflow-x-auto overscroll-x-contain py-0.5 md:py-1 hide-scrollbar"
              >
                {daySlots.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={c.id === campaign.id}
                    onClick={() => setSelected(c.id)}
                    className={pill(c.id === campaign.id)}
                  >
                    {formatSlotLabel(c)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center rounded-full border border-white/50 bg-white/15 px-3 py-1 text-[11px] md:text-xs font-bold text-white">
                {formatSlotLabel(campaign)}
              </div>
            )}
            <FlashSaleCountdown
              key={`${campaign.id}:${campaign.startAt}:${campaign.endAt}`}
              startAt={campaign.startAt}
              endAt={campaign.endAt}
              saleStyle
            />
          </div>
          <ProductCarousel
            key={campaign.id}
            products={campaign.products}
            label={campaign.name}
            oneAtATime
            cardVariant="flash"
            deduplicate={false}
            eagerImages
          />
        </div>
      </div>
    </section>
  );
}
