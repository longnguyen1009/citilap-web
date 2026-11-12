'use client';

import Link from 'next/link';
import { Clock, ExternalLink, Zap, Calendar, Archive } from 'lucide-react';
import { AdminCard, AdminButton } from '@/components/admin/ui';
import {
  type CampaignData,
  type BannerSettingsState,
  formatGmt7,
  isoToDatetimeLocalGmt7,
  datetimeLocalGmt7ToIso,
} from './types';

interface CampaignStatsCardsProps {
  campaigns: CampaignData[];
  nowMs: number;
  counts: {
    ALL: number;
    ACTIVE: number;
    UPCOMING: number;
    INACTIVE: number;
  };
  bannerSettingsOpen: boolean;
  bannerSettings: BannerSettingsState | null;
  savingBannerSettings: boolean;
  onChangeBannerSettings: (next: BannerSettingsState) => void;
  onCloseBannerSettings: () => void;
  onSaveBannerSettings: () => void;
}

export default function CampaignStatsCards({
  campaigns,
  nowMs,
  counts,
  bannerSettingsOpen,
  bannerSettings,
  savingBannerSettings,
  onChangeBannerSettings,
  onCloseBannerSettings,
  onSaveBannerSettings,
}: CampaignStatsCardsProps) {
  const activeCampaign = campaigns.find(
    (c) =>
      c.status === 'PUBLISHED' &&
      nowMs >= new Date(c.startAt).getTime() &&
      nowMs < new Date(c.endAt).getTime()
  );

  return (
    <div className="space-y-3">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tổng chiến dịch</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{counts.ALL}</p>
          </div>
          <div className="size-9 rounded-lg bg-slate-100 text-slate-700 grid place-items-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Đang diễn ra</p>
            <p className="mt-1 text-xl font-bold text-emerald-900 tabular-nums">{counts.ACTIVE}</p>
          </div>
          <div className="size-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Sắp chạy</p>
            <p className="mt-1 text-xl font-bold text-blue-900 tabular-nums">{counts.UPCOMING}</p>
          </div>
          <div className="size-9 rounded-lg bg-blue-100 text-blue-700 grid place-items-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Đã tắt / Lưu trữ</p>
            <p className="mt-1 text-xl font-bold text-slate-700 tabular-nums">{counts.INACTIVE}</p>
          </div>
          <div className="size-9 rounded-lg bg-slate-200/70 text-slate-600 grid place-items-center">
            <Archive className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Fallback Banner Settings Panel */}
      {bannerSettingsOpen && bannerSettings && (
        <AdminCard title="Cấu hình Banner HOT SALE & Chế độ Flash Sale dự phòng">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block font-semibold text-slate-700">
                Ảnh Banner HOT SALE ngang (1600×160)
                <input
                  type="text"
                  value={bannerSettings.hotSaleBannerImage}
                  onChange={(e) =>
                    onChangeBannerSettings({ ...bannerSettings, hotSaleBannerImage: e.target.value })
                  }
                  placeholder="/api/library/... hoặc https://..."
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 font-normal"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Liên kết khi bấm vào Banner
                <input
                  type="text"
                  value={bannerSettings.hotSaleBannerLink}
                  onChange={(e) =>
                    onChangeBannerSettings({ ...bannerSettings, hotSaleBannerLink: e.target.value })
                  }
                  placeholder="/laptop-gaming"
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 font-normal"
                />
              </label>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannerSettings.flashSaleEnabled}
                  onChange={(e) =>
                    onChangeBannerSettings({ ...bannerSettings, flashSaleEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-red-600"
                />
                <span>
                  Bật chế độ Flash Sale dự phòng toàn trang (áp dụng cho SP gắn cờ Flash Sale khi không có chiến dịch riêng)
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block font-semibold text-slate-600">
                  Tiêu đề khối Flash Sale
                  <input
                    type="text"
                    value={bannerSettings.flashSaleTitle}
                    onChange={(e) =>
                      onChangeBannerSettings({ ...bannerSettings, flashSaleTitle: e.target.value })
                    }
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-normal"
                  />
                </label>
                <label className="block font-semibold text-slate-600">
                  Bắt đầu dự phòng (GMT+7)
                  <input
                    type="datetime-local"
                    value={isoToDatetimeLocalGmt7(bannerSettings.flashSaleStartAt)}
                    onChange={(e) =>
                      onChangeBannerSettings({
                        ...bannerSettings,
                        flashSaleStartAt: datetimeLocalGmt7ToIso(e.target.value),
                      })
                    }
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-mono font-normal"
                  />
                </label>
                <label className="block font-semibold text-slate-600">
                  Kết thúc dự phòng (GMT+7)
                  <input
                    type="datetime-local"
                    value={isoToDatetimeLocalGmt7(bannerSettings.flashSaleEndAt)}
                    onChange={(e) =>
                      onChangeBannerSettings({
                        ...bannerSettings,
                        flashSaleEndAt: datetimeLocalGmt7ToIso(e.target.value),
                      })
                    }
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-mono font-normal"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <AdminButton variant="secondary" size="sm" onClick={onCloseBannerSettings}>
                Đóng
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                loading={savingBannerSettings}
                onClick={onSaveBannerSettings}
              >
                Lưu cấu hình Banner
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Live Storefront Status Banner */}
      {activeCampaign ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="text-xs">
              <strong>Đang chạy Flash Sale trên Storefront:</strong> &quot;{activeCampaign.name}&quot; (
              {activeCampaign.itemCount} sản phẩm).
              <span className="ml-1.5 text-emerald-700">
                Kết thúc lúc {formatGmt7(activeCampaign.endAt)}
              </span>
            </div>
          </div>
          <Link
            href="/"
            target="_blank"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 shrink-0"
          >
            Xem ngoài Storefront <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Hiện không có Flash Sale nào đang trực tiếp trên Storefront. Bạn có thể bật một chiến dịch hoặc tạo khung giờ mới.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
