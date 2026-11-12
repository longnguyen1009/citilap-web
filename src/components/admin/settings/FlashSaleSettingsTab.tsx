"use client";

import React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import {
  inputCls,
  labelCls,
  toDatetimeLocalGmt7,
  fromDatetimeLocalGmt7,
  type SettingsTabProps,
} from "./settings-helpers";

export function FlashSaleSettingsTab({ settings, update }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row items-start justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-start gap-2.5">
          <Flame className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-slate-900">Quản lý Flash Sale &amp; Giờ Vàng</p>
            <p className="text-slate-600 leading-relaxed">
              CitiLap quản lý các đợt Flash Sale chi tiết theo từng máy, biến thể và hẹn giờ tại mục{" "}
              <Link href="/admin/campaigns" className="font-bold text-blue-700 hover:underline">
                Quản lý Chiến dịch (/admin/campaigns)
              </Link>
              . Hệ thống tự động kiểm tra chống trùng giờ và cập nhật theo thời gian thực ngoài Storefront.
            </p>
            <p className="text-[11px] text-slate-500">
              Cấu hình bên dưới dành cho Banner ngang hiển thị đầu trang chủ và chế độ Flash Sale toàn trang dự phòng.
            </p>
          </div>
        </div>
        <Link
          href="/admin/campaigns"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shrink-0 shadow-2xs transition"
        >
          Mở Quản lý Chiến dịch →
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
        <h2 className="font-bold text-slate-900 text-xs">Banner HOT SALE ngang trên Storefront</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className={labelCls}>
            Ảnh banner ngang trên PC (1600×160)
            <input
              value={settings.hotSaleBannerImage}
              onChange={(e) => update("hotSaleBannerImage", e.target.value)}
              placeholder="/api/library/... hoặc https://..."
              className={`mt-1 font-normal ${inputCls}`}
            />
          </label>
          <label className={labelCls}>
            Ảnh banner riêng trên Smartphone SP (Tùy chọn)
            <input
              value={settings.hotSaleMobileBannerImage || ""}
              onChange={(e) => update("hotSaleMobileBannerImage", e.target.value)}
              placeholder="Để trống nếu dùng chung ảnh PC"
              className={`mt-1 font-normal ${inputCls}`}
            />
          </label>
          <label className={labelCls}>
            Liên kết banner khi khách bấm vào
            <input
              value={settings.hotSaleBannerLink}
              onChange={(e) => update("hotSaleBannerLink", e.target.value)}
              placeholder="/admin/campaigns hoặc /laptop"
              className={`mt-1 font-normal ${inputCls}`}
            />
          </label>
        </div>
      </div>

      <div className="space-y-3.5">
        <label className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={settings.flashSaleEnabled}
            onChange={(e) => update("flashSaleEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <div>
            <div className="font-bold text-slate-900 text-xs">Bật chương trình Flash Sale dự phòng toàn trang</div>
            <div className="text-[11px] text-slate-500">
              Áp dụng cho sản phẩm gắn cờ isFlashSale khi không có chiến dịch nâng cao nào hoạt động.
            </div>
          </div>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className={labelCls}>Tiêu đề chương trình</label>
            <input
              type="text"
              value={settings.flashSaleTitle}
              onChange={(e) => update("flashSaleTitle", e.target.value)}
              placeholder="Giá Sốc Giờ Vàng"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Thời gian bắt đầu (GMT+7)</label>
            <input
              type="datetime-local"
              value={toDatetimeLocalGmt7(settings.flashSaleStartAt)}
              onChange={(e) => update("flashSaleStartAt", fromDatetimeLocalGmt7(e.target.value))}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className={labelCls}>Thời gian kết thúc (GMT+7)</label>
            <input
              type="datetime-local"
              value={toDatetimeLocalGmt7(settings.flashSaleEndAt)}
              onChange={(e) => update("flashSaleEndAt", fromDatetimeLocalGmt7(e.target.value))}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
