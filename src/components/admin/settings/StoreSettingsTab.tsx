"use client";

import React from "react";
import { Image as ImageIcon, Scale } from "lucide-react";
import { inputCls, labelCls, type SettingsTabProps } from "./settings-helpers";

export function StoreSettingsTab({ settings, update }: SettingsTabProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xs font-bold text-slate-800">Thông tin cửa hàng &amp; Liên hệ</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div>
          <label className={labelCls}>Tên thương hiệu</label>
          <input
            type="text"
            value={settings.storeName}
            onChange={(e) => update("storeName", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Email hỗ trợ</label>
          <input
            type="email"
            value={settings.storeEmail}
            onChange={(e) => update("storeEmail", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Giờ làm việc</label>
          <input
            type="text"
            value={settings.openingHours}
            onChange={(e) => update("openingHours", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Hotline chính (Hà Nội)</label>
          <input
            type="text"
            value={settings.storePhone}
            onChange={(e) => update("storePhone", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Hotline Bắc Ninh</label>
          <input
            type="text"
            value={settings.storePhoneBacNinh}
            onChange={(e) => update("storePhoneBacNinh", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Link Zalo</label>
          <input
            type="text"
            value={settings.zaloUrl}
            onChange={(e) => update("zaloUrl", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Link Messenger (m.me/...)</label>
          <input
            type="text"
            value={settings.messengerUrl}
            onChange={(e) => update("messengerUrl", e.target.value)}
            placeholder="https://m.me/citilapvn"
            className={inputCls}
          />
        </div>

        <label className="md:col-span-2 flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer self-end">
          <input
            type="checkbox"
            checked={settings.floatingContactEnabled}
            onChange={(e) => update("floatingContactEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <div className="font-bold text-slate-800 text-xs">
              Hiện cụm nút liên hệ nổi (Zalo, Messenger, Yêu cầu gọi lại, Hotline)
            </div>
            <div className="text-[11px] text-slate-500">
              Hiển thị ở góc phải màn hình trên Storefront để khách hàng nhắn tin hoặc yêu cầu gọi lại ngay
            </div>
          </div>
        </label>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className={labelCls}>Showroom Hà Nội</label>
            <input
              type="text"
              value={settings.addressHanoi}
              onChange={(e) => update("addressHanoi", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Showroom Bắc Ninh</label>
            <input
              type="text"
              value={settings.addressBacNinh}
              onChange={(e) => update("addressBacNinh", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3.5">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Nhận diện thương hiệu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className={labelCls}>URL Logo</label>
            <input
              type="text"
              value={settings.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="/brand/citilap-logo.svg"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>URL Favicon</label>
            <input
              type="text"
              value={settings.faviconUrl}
              onChange={(e) => update("faviconUrl", e.target.value)}
              placeholder="/favicon.ico"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Khẩu hiệu (Motto)</label>
            <input
              type="text"
              value={settings.motto}
              onChange={(e) => update("motto", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Bản quyền Footer</label>
            <input
              type="text"
              value={settings.copyrightText}
              onChange={(e) => update("copyrightText", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3.5">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-blue-600" /> Thông tin pháp lý (hiển thị ở chân trang)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className={labelCls}>Tên hộ kinh doanh / doanh nghiệp</label>
            <input
              type="text"
              value={settings.legalBusinessName}
              onChange={(e) => update("legalBusinessName", e.target.value)}
              placeholder="HỘ KINH DOANH CITI LAP"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mã số đăng ký hộ kinh doanh / MST</label>
            <input
              type="text"
              value={settings.businessRegistrationNumber}
              onChange={(e) => update("businessRegistrationNumber", e.target.value)}
              placeholder="01D8053589"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Chủ hộ / Người đại diện (tùy chọn)</label>
            <input
              type="text"
              value={settings.legalRepresentative}
              onChange={(e) => update("legalRepresentative", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nơi cấp (tùy chọn)</label>
            <input
              type="text"
              value={settings.businessRegistrationIssuer}
              onChange={(e) => update("businessRegistrationIssuer", e.target.value)}
              placeholder="UBND phường ..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ngày cấp (tùy chọn)</label>
            <input
              type="text"
              value={settings.businessRegistrationDate}
              onChange={(e) => update("businessRegistrationDate", e.target.value)}
              placeholder="dd/mm/yyyy"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Địa chỉ đăng ký kinh doanh (tùy chọn)</label>
            <input
              type="text"
              value={settings.legalAddress}
              onChange={(e) => update("legalAddress", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-3.5 items-end p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pb-1.5">
            <input
              type="checkbox"
              checked={settings.moitBadgeEnabled}
              onChange={(e) => update("moitBadgeEnabled", e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Hiện logo &quot;Đã thông báo Bộ Công Thương&quot;
          </label>
          <div>
            <label className={labelCls}>Link xác thực (online.gov.vn), tạm để # nếu chưa có</label>
            <input
              type="text"
              value={settings.moitBadgeUrl}
              onChange={(e) => update("moitBadgeUrl", e.target.value)}
              placeholder="http://online.gov.vn/Home/WebDetails/..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ảnh logo</label>
            <input
              type="text"
              value={settings.moitBadgeImage}
              onChange={(e) => update("moitBadgeImage", e.target.value)}
              placeholder="https://bizweb.dktcdn.net/thumb/medium/100/372/934/themes/892516/assets/logo_bct.png"
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
