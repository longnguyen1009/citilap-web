"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Plus,
  Trash2,
  RotateCcw,
  Flame,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  DEFAULT_HOMEPAGE_POPUP,
  type HomepagePopupConfig,
} from "@/contracts/cms/settings";
import { VnIsoPairField } from "../campaigns/VnScheduleFields";
import MediaBrowser from "../media/MediaBrowser";
import MediaDialog from "../media/MediaDialog";
import MediaUpload from "../media/MediaUpload";
import { inputCls, labelCls, type SettingsTabProps } from "./settings-helpers";

export function HomepagePopupSettingsSection({ settings, update }: SettingsTabProps) {
  const [mediaOpen, setMediaOpen] = useState(false);

  const popup: HomepagePopupConfig = {
    ...DEFAULT_HOMEPAGE_POPUP,
    ...(settings.homepagePopup ?? {}),
  };

  const patchPopup = (patch: Partial<HomepagePopupConfig>) => {
    update("homepagePopup", { ...popup, ...patch });
  };

  const tiers = Array.isArray(popup.tiers) ? popup.tiers : [];

  const updateTier = (idx: number, patch: { label?: string; value?: string }) => {
    const next = tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    patchPopup({ tiers: next });
  };

  const addTier = () => {
    if (tiers.length >= 3) return;
    patchPopup({ tiers: [...tiers, { label: "Ưu đãi mới", value: "-200K" }] });
  };

  const removeTier = (idx: number) => {
    patchPopup({ tiers: tiers.filter((_, i) => i !== idx) });
  };

  return (
    <div
      id="homepage-popup"
      className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/45 to-white p-4 space-y-4 shadow-2xs"
    >
      {/* Header + Master Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Popup Khuyến mãi Trang chủ
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  popup.enabled
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {popup.enabled ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hiển thị thông báo sự kiện (Black Friday, Tết, Flash Sale...) khi khách truy cập Trang chủ (`/`). Sau khi sửa, bấm <strong>Lưu cấu hình</strong> để áp dụng ngay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => update("homepagePopup", { ...DEFAULT_HOMEPAGE_POPUP })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Khôi phục nội dung mẫu Black Friday mặc định"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Mẫu mặc định
          </button>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={popup.enabled}
              onChange={(e) => patchPopup({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-xs font-bold text-slate-800">Bật Popup</span>
          </label>
        </div>
      </div>

      {/* Main 2-column layout: Form (left) + Live Preview (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT: Settings Form */}
        <div className="xl:col-span-7 space-y-4">
          {/* Mode, Frequency & Delay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Kiểu hiển thị</label>
              <select
                value={popup.displayMode}
                onChange={(e) =>
                  patchPopup({
                    displayMode: e.target.value as HomepagePopupConfig["displayMode"],
                  })
                }
                className={inputCls}
              >
                <option value="rich">Chi tiết (Ảnh + Chữ + Ưu đãi + Đếm ngược)</option>
                <option value="image_only">Chỉ ảnh Banner (Bấm ảnh mở link)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Tần suất hiển thị</label>
              <select
                value={popup.frequency}
                onChange={(e) =>
                  patchPopup({
                    frequency: e.target.value as HomepagePopupConfig["frequency"],
                  })
                }
                className={inputCls}
              >
                <option value="session">1 lần / phiên truy cập</option>
                <option value="daily">1 lần / ngày</option>
                <option value="always">Luôn hiện mỗi lần vào</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Độ trễ mở popup (ms)</label>
              <input
                type="number"
                min={0}
                max={15000}
                step={50}
                value={popup.delayMs}
                onChange={(e) =>
                  patchPopup({
                    delayMs: Math.max(0, Math.min(15000, parseInt(e.target.value, 10) || 0)),
                  })
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Schedule & Countdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-800">
                Lịch hiển thị &amp; Đồng hồ đếm ngược (GMT+7)
              </span>
              {popup.displayMode === "rich" ? (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={popup.showCountdown}
                    onChange={(e) => patchPopup({ showCountdown: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-red-600"
                  />
                  Hiện đồng hồ đếm ngược
                </label>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VnIsoPairField
                title="Bắt đầu sự kiện (để trống nếu không hẹn giờ)"
                isoValue={popup.startAt}
                defaultTime="00:00"
                onChangeIso={(nextIso) => patchPopup({ startAt: nextIso })}
              />
              <VnIsoPairField
                title="Kết thúc sự kiện (tự tắt popup sau giờ này)"
                isoValue={popup.endAt}
                defaultTime="23:59"
                onChangeIso={(nextIso) => patchPopup({ endAt: nextIso })}
              />
            </div>
          </div>

          {/* Banner Image URL + Media Picker */}
          <div className="space-y-1.5">
            <label className={labelCls}>
              Ảnh nền / Ảnh banner Popup (tỉ lệ khuyên dùng 16:9 cho kiểu chi tiết)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={popup.imageUrl}
                onChange={(e) => patchPopup({ imageUrl: e.target.value })}
                placeholder="/images/banners/black-friday-popup-bg.jpg hoặc /api/library/..."
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setMediaOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                Chọn / Tải ảnh
              </button>
            </div>
          </div>

          {/* Link + Alt / Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {popup.displayMode === "image_only"
                  ? "Tên sự kiện (mô tả ảnh Alt)"
                  : "Tiêu đề lớn (Headline)"}
              </label>
              <input
                type="text"
                value={popup.title}
                onChange={(e) => patchPopup({ title: e.target.value })}
                placeholder="BLACK FRIDAY"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Đường dẫn đích khi bấm vào Popup / CTA</label>
              <input
                type="text"
                value={popup.ctaLink}
                onChange={(e) => patchPopup({ ctaLink: e.target.value })}
                placeholder="/black-friday hoặc https://..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Rich Mode Content Fields */}
          {popup.displayMode === "rich" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nhãn thời gian / Badge nhỏ</label>
                  <input
                    type="text"
                    value={popup.badgeText}
                    onChange={(e) => patchPopup({ badgeText: e.target.value })}
                    placeholder="25/11 – 29/11/2026"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Nhãn giảm giá nổi bật (Highlight)</label>
                  <input
                    type="text"
                    value={popup.highlightText}
                    onChange={(e) => patchPopup({ highlightText: e.target.value })}
                    placeholder="GIẢM TỚI -999K"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Mô tả ngắn</label>
                <input
                  type="text"
                  value={popup.description}
                  onChange={(e) => patchPopup({ description: e.target.value })}
                  placeholder="Áp dụng toàn bộ Laptop LikeNew 99% tuyển chọn tại CitiLap."
                  className={inputCls}
                />
              </div>

              {/* 3 Offer Tier Cards */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">
                    Các mức ưu đãi nổi bật (tối đa 3 ô)
                  </span>
                  <button
                    type="button"
                    disabled={tiers.length >= 3}
                    onClick={addTier}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm ô
                  </button>
                </div>

                {tiers.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    Đang ẩn khối mức ưu đãi. Bấm &ldquo;Thêm ô&rdquo; để hiển thị.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tiers.map((tier, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => updateTier(idx, { label: e.target.value })}
                          placeholder="Nhãn (VD: 20 Deal Hot)"
                          className={`col-span-6 ${inputCls}`}
                        />
                        <input
                          type="text"
                          value={tier.value}
                          onChange={(e) => updateTier(idx, { value: e.target.value })}
                          placeholder="Giá trị (VD: -999K)"
                          className={`col-span-5 font-bold ${inputCls}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          aria-label={`Xóa ô ưu đãi ${idx + 1}`}
                          className="col-span-1 flex h-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trust notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Dòng cam kết 1 (để trống để ẩn)</label>
                  <input
                    type="text"
                    value={popup.trustNote1}
                    onChange={(e) => patchPopup({ trustNote1: e.target.value })}
                    placeholder="Giảm trực tiếp vào giá bán"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Dòng cam kết 2 (để trống để ẩn)</label>
                  <input
                    type="text"
                    value={popup.trustNote2}
                    onChange={(e) => patchPopup({ trustNote2: e.target.value })}
                    placeholder="Bao test 7 ngày · Bảo hành minh bạch"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* CTA & Dismiss Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Chữ nút CTA chính</label>
                  <input
                    type="text"
                    value={popup.ctaText}
                    onChange={(e) => patchPopup({ ctaText: e.target.value })}
                    placeholder="Săn Deal Black Friday Ngay"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Chữ nút đóng phụ (để trống để ẩn)</label>
                  <input
                    type="text"
                    value={popup.dismissText}
                    onChange={(e) => patchPopup({ dismissText: e.target.value })}
                    placeholder="Bữa khác nha!"
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* RIGHT: Live Preview */}
        <div className="xl:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-900/95 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-bold">Xem trước trực tiếp</span>
              <span className="text-slate-400">
                {popup.enabled ? "Khách vào / sẽ thấy" : "Đang tắt ngoài web"}
              </span>
            </div>

            <div
              className={`relative overflow-hidden rounded-xl border border-amber-400/35 bg-[#0b0b11] text-white shadow-xl transition ${
                popup.enabled ? "opacity-100" : "opacity-50 grayscale-[40%]"
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white/90"
              >
                <X className="h-3.5 w-3.5" />
              </span>

              {popup.displayMode === "image_only" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={popup.imageUrl || DEFAULT_HOMEPAGE_POPUP.imageUrl}
                  alt={popup.title || "Preview"}
                  className="block w-full max-h-[320px] object-contain bg-[#09090d]"
                />
              ) : (
                <>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#09090d]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={popup.imageUrl || DEFAULT_HOMEPAGE_POPUP.imageUrl}
                      alt={popup.title || "Preview"}
                      className="h-full w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b0b11] to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-center px-4 py-3 pr-10">
                      {popup.badgeText ? (
                        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-400/45 bg-red-600/25 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                          <Flame className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                          <span>{popup.badgeText}</span>
                        </div>
                      ) : null}
                      <div className="mt-1.5 text-xl font-black uppercase leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-red-500">
                        {popup.title || "BLACK FRIDAY"}
                      </div>
                      {popup.highlightText ? (
                        <div className="mt-1.5">
                          <span className="inline-block -skew-x-12 rounded bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-2 py-0.5 text-xs font-black text-slate-950">
                            <span className="inline-block skew-x-12">{popup.highlightText}</span>
                          </span>
                        </div>
                      ) : null}
                      {popup.description ? (
                        <p className="mt-1.5 max-w-[200px] text-[10px] leading-snug text-slate-200/95 line-clamp-2">
                          {popup.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 pt-1.5 space-y-2.5">
                    {tiers.length > 0 ? (
                      <div
                        className={`grid gap-1.5 ${
                          tiers.length === 1
                            ? "grid-cols-1"
                            : tiers.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-3"
                        }`}
                      >
                        {tiers.map((t, i) => (
                          <div
                            key={i}
                            className={
                              i === 0
                                ? "rounded-lg border border-amber-400/35 bg-gradient-to-b from-red-600/25 to-red-950/30 px-1.5 py-1.5 text-center"
                                : "rounded-lg border border-white/15 bg-white/[0.04] px-1.5 py-1.5 text-center"
                            }
                          >
                            <div className="text-[8px] font-bold uppercase text-amber-200/90 truncate">
                              {t.label}
                            </div>
                            <div className="text-xs font-black text-amber-300 truncate">
                              {t.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {popup.showCountdown && (popup.startAt || popup.endAt) ? (
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 text-slate-200 font-semibold">
                          <Clock className="h-3 w-3 text-amber-400" />
                          Đếm ngược:
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          00d : 07h : 30m : 00s
                        </span>
                      </div>
                    ) : null}

                    {popup.trustNote1 || popup.trustNote2 ? (
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[9px] text-slate-400">
                        {popup.trustNote1 ? (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                            {popup.trustNote1}
                          </span>
                        ) : null}
                        {popup.trustNote2 ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
                            {popup.trustNote2}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-3 py-2 text-[11px] font-extrabold text-white">
                        <span className="truncate">{popup.ctaText || "Xem ưu đãi ngay"}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </div>
                      {popup.dismissText ? (
                        <div className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-2 text-[10px] font-semibold text-slate-300 shrink-0">
                          {popup.dismissText}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Dialog */}
      {mediaOpen && (
        <MediaDialog title="Chọn ảnh Popup Trang chủ" onClose={() => setMediaOpen(false)}>
          <div className="space-y-4">
            <MediaUpload defaultFolder="banners" onUploaded={() => undefined} />
            <MediaBrowser
              picker
              onSelect={(asset) => {
                if (asset.url) {
                  patchPopup({ imageUrl: asset.url });
                  setMediaOpen(false);
                }
              }}
            />
          </div>
        </MediaDialog>
      )}
    </div>
  );
}
