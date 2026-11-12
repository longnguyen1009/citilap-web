"use client";

import React from "react";
import { QrCode } from "lucide-react";
import { VIETQR_BANKS, findVietQrBank } from "@/lib/vietqr";
import {
  formatDots,
  parseDots,
  inputCls,
  labelCls,
  type SettingsTabProps,
} from "./settings-helpers";

export function ShippingPaymentSettingsTab({ settings, update }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold text-slate-800">Phí vận chuyển &amp; Phương thức thanh toán</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className={labelCls}>Phí giao hàng mặc định (VNĐ)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatDots(settings.shippingFee)}
            onChange={(e) => update("shippingFee", parseDots(e.target.value))}
            className={`${inputCls} tabular-nums font-semibold`}
          />
        </div>

        <div>
          <label className={labelCls}>Miễn phí giao hàng từ mức (VNĐ, 0 = tắt)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatDots(settings.freeShippingThreshold)}
            onChange={(e) => update("freeShippingThreshold", parseDots(e.target.value))}
            className={`${inputCls} tabular-nums font-semibold`}
          />
        </div>

        <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
          <div>
            <div className="font-bold text-slate-900 text-xs">Thanh toán khi nhận hàng (COD)</div>
            <div className="text-[11px] text-slate-500">Trả tiền mặt khi kiểm tra máy</div>
          </div>
          <input
            type="checkbox"
            checked={settings.codEnabled}
            onChange={(e) => update("codEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
          <div>
            <div className="font-bold text-slate-900 text-xs">Chuyển khoản ngân hàng</div>
            <div className="text-[11px] text-slate-500">Hiển thị thông tin tài khoản tại Checkout</div>
          </div>
          <input
            type="checkbox"
            checked={settings.bankTransferEnabled}
            onChange={(e) => update("bankTransferEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>

        <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-blue-600" /> Cấu hình mã QR chuyển khoản tự động (VietQR Napas 247)
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Khi điền Ngân hàng + Số tài khoản, trang Checkout và trang Đặt hàng thành công sẽ tự sinh mã QR kèm sẵn số tiền và nội dung đơn hàng.
              </p>
            </div>
            <button
              type="button"
              disabled={!settings.bankBin.trim() || !settings.bankAccountNumber.trim()}
              onClick={() => {
                const bank = findVietQrBank(settings.bankBin);
                const bankLabel = bank ? `${bank.shortName} (${bank.code})` : settings.bankBin;
                const summary = [
                  `Ngân hàng: ${bankLabel}`,
                  `Số tài khoản: ${settings.bankAccountNumber.trim()}`,
                  settings.bankAccountName.trim() ? `Chủ tài khoản: ${settings.bankAccountName.trim()}` : null,
                  "Nội dung chuyển khoản: Mã đơn hàng + Số điện thoại đặt hàng",
                ]
                  .filter(Boolean)
                  .join("\n");
                update("bankAccountInfo", summary);
              }}
              className="text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition disabled:opacity-40 cursor-pointer shrink-0"
            >
              Điền nhanh vào ô hướng dẫn bên dưới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Ngân hàng thụ hưởng</label>
              <select
                value={settings.bankBin}
                onChange={(e) => update("bankBin", e.target.value)}
                className={inputCls}
              >
                <option value="">-- Chọn ngân hàng (hoặc tắt QR) --</option>
                {VIETQR_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.shortName} ({bank.code}) - {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Số tài khoản</label>
              <input
                type="text"
                value={settings.bankAccountNumber}
                onChange={(e) => update("bankAccountNumber", e.target.value)}
                placeholder="Ví dụ: 1903..."
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className={labelCls}>Tên chủ tài khoản (in hoa không dấu)</label>
              <input
                type="text"
                value={settings.bankAccountName}
                onChange={(e) => update("bankAccountName", e.target.value)}
                placeholder="HO KINH DOANH CITI LAP"
                className={`${inputCls} uppercase`}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            Thông tin tài khoản ngân hàng (hiển thị dạng văn bản &amp; dùng để bật phương thức chuyển khoản)
          </label>
          <textarea
            value={settings.bankAccountInfo}
            onChange={(e) => update("bankAccountInfo", e.target.value)}
            rows={3}
            placeholder="Ngân hàng: ... - STK: ... - Chủ TK: ..."
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
