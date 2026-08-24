"use client";

import { useEffect, useState } from "react";
import { Save, Store, Truck, CreditCard, Info } from "lucide-react";

type AppSettings = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
};

const STORAGE_KEY = "citilap_admin_settings";

const DEFAULTS: AppSettings = {
  storeName: "CitiLap",
  storeEmail: "",
  storePhone: "",
  storeAddress: "",
  freeShippingThreshold: 0,
  shippingFee: 0,
  codEnabled: true,
  bankTransferEnabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // bỏ qua dữ liệu hỏng
    }
  }, []);

  const update = (key: keyof AppSettings, value: string | number | boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setMessage("Đã lưu cài đặt.");
    } catch {
      setMessage("Không thể lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt cửa hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Thông tin chung, vận chuyển và phương thức thanh toán.</p>
        </div>
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>Cài đặt hiện được lưu tạm trên trình duyệt này. Kết nối với máy chủ sẽ được bổ sung khi có bảng cấu hình trong cơ sở dữ liệu.</span>
      </div>

      <div className="space-y-8">
        {/* Store info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" /> Thông tin cửa hàng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tên cửa hàng</label>
              <input value={settings.storeName} onChange={(e) => update("storeName", e.target.value)} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email liên hệ</label>
              <input value={settings.storeEmail} onChange={(e) => update("storeEmail", e.target.value)} type="email" placeholder="contact@example.com" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
              <input value={settings.storePhone} onChange={(e) => update("storePhone", e.target.value)} type="tel" placeholder="0900 000 000" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Địa chỉ</label>
              <input value={settings.storeAddress} onChange={(e) => update("storeAddress", e.target.value)} type="text" placeholder="123 Đường ABC, Quận 1, TP.HCM" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" /> Vận chuyển
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phí vận chuyển mặc định (VNĐ)</label>
              <input value={settings.shippingFee} onChange={(e) => update("shippingFee", Number(e.target.value))} type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Miễn phí vận chuyển từ (VNĐ)</label>
              <input value={settings.freeShippingThreshold} onChange={(e) => update("freeShippingThreshold", Number(e.target.value))} type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-500 mt-2">Đơn hàng đạt giá trị này sẽ được miễn phí giao hàng. Đặt 0 để tắt.</p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Phương thức thanh toán
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div>
                <div className="font-bold text-gray-900 text-sm">Thanh toán khi nhận hàng (COD)</div>
                <div className="text-xs text-gray-500 mt-1">Khách hàng trả tiền mặt khi nhận hàng.</div>
              </div>
              <input type="checkbox" checked={settings.codEnabled} onChange={(e) => update("codEnabled", e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </label>
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div>
                <div className="font-bold text-gray-900 text-sm">Chuyển khoản ngân hàng</div>
                <div className="text-xs text-gray-500 mt-1">Khách hàng chuyển khoản trước khi giao hàng.</div>
              </div>
              <input type="checkbox" checked={settings.bankTransferEnabled} onChange={(e) => update("bankTransferEnabled", e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </label>
          </div>
        </div>
      </div>

      {message && <p className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</p>}
    </form>
  );
}
