"use client";

import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { inputCls, labelCls, type SettingsTabProps } from "./settings-helpers";

export function FeaturesTestimonialsSettingsTab({ settings, update }: SettingsTabProps) {
  return (
    <div className="space-y-3.5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
        <div>
          <p className="font-bold text-slate-900">Đồng bộ với khối Giới thiệu &amp; Cam kết trên Trang chủ</p>
          <p className="text-slate-600 mt-0.5">
            Các cam kết và đánh giá khách hàng bên dưới là cấu hình chuẩn toàn hệ thống. Nếu Trang chủ đang dùng khối tùy chỉnh riêng, bạn có thể sửa trực tiếp tại Bố cục Trang chủ.
          </p>
        </div>
        <Link
          href="/admin/builder/home"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shrink-0 shadow-2xs transition"
        >
          Mở Bố cục Trang chủ →
        </Link>
      </div>
      <h2 className="text-xs font-bold text-slate-800">Cam kết dịch vụ trang chủ (4 mục)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {([1, 2, 3, 4] as const).map((num) => {
          const titleKey = `feature${num}Title` as const;
          const descKey = `feature${num}Desc` as const;
          return (
            <div key={num} className="p-3.5 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50/50">
              <div className="font-bold text-xs text-slate-800">Cam kết #{num}</div>
              <div>
                <label className={labelCls}>Tiêu đề</label>
                <input
                  type="text"
                  value={settings[titleKey]}
                  onChange={(e) => update(titleKey, e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Mô tả ngắn</label>
                <input
                  type="text"
                  value={settings[descKey]}
                  onChange={(e) => update(descKey, e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          );
        })}
      </div>

      <section className="border-t border-slate-200 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Đánh giá khách hàng trang chủ (tối đa 6)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chỉ nhập đánh giá thật của khách. Mục này bị ẩn trên trang chủ khi danh sách trống.
            </p>
          </div>
          <button
            type="button"
            disabled={(settings.testimonials || []).length >= 6}
            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
            onClick={() =>
              update("testimonials", [
                ...(settings.testimonials || []),
                { name: "", role: "", product: "", text: "", rating: 5 },
              ])
            }
          >
            + Thêm đánh giá
          </button>
        </div>
        <div>
          <label className={labelCls}>Link xem tất cả đánh giá (Google Maps / Facebook, tùy chọn)</label>
          <input
            type="text"
            value={settings.testimonialsSourceUrl}
            onChange={(e) => update("testimonialsSourceUrl", e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(settings.testimonials || []).map((item, index) => {
            const patch = (value: Partial<typeof item>) =>
              update(
                "testimonials",
                settings.testimonials.map((t, i) => (i === index ? { ...t, ...value } : t))
              );
            return (
              <div key={index} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Tên khách *
                    <input
                      value={item.name}
                      maxLength={80}
                      onChange={(e) => patch({ name: e.target.value })}
                      className={`mt-1 font-normal ${inputCls}`}
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Nghề nghiệp / Khu vực
                    <input
                      value={item.role}
                      maxLength={120}
                      onChange={(e) => patch({ role: e.target.value })}
                      className={`mt-1 font-normal ${inputCls}`}
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Sản phẩm đã mua
                    <input
                      value={item.product}
                      maxLength={160}
                      onChange={(e) => patch({ product: e.target.value })}
                      className={`mt-1 font-normal ${inputCls}`}
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Số sao
                    <select
                      value={item.rating}
                      onChange={(e) => patch({ rating: Number(e.target.value) })}
                      className={`mt-1 font-normal ${inputCls}`}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} sao
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Nội dung *
                  <textarea
                    value={item.text}
                    maxLength={800}
                    rows={3}
                    onChange={(e) => patch({ text: e.target.value })}
                    className={`mt-1 font-normal ${inputCls}`}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                    onClick={() =>
                      update(
                        "testimonials",
                        settings.testimonials.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Xóa đánh giá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
