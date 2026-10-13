"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save,
  Store,
  Flame,
  LayoutTemplate,
  Truck,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  Info,
  AlertCircle,
} from "lucide-react";
import { PageHeader, InlineAlert } from "@/components/admin/ui";
import type { AdminSettingsDocument as StorefrontSettings } from "@/contracts/cms/settings";
import { DEFAULT_ADMIN_SETTINGS as DEFAULT_SETTINGS } from "@/contracts/cms/settings";

const STORAGE_KEY = "citilap_admin_settings_v2_draft";

type TabId = "store" | "flashsale" | "banners" | "features" | "shipping";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("store");
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);
  const [revision, setRevision] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const loadSettingsData = useCallback(async (isMounted?: () => boolean) => {
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "same-origin",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Chưa đăng nhập quản trị hoặc phiên làm việc đã hết hạn (401).");
        if (res.status === 403) throw new Error("Không đủ quyền truy cập quản trị hoặc vi phạm CSRF (403).");
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi máy chủ khi tải cài đặt (${res.status}).`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Không nhận được dữ liệu cấu hình hợp lệ.");
      }

      if (!isMounted || isMounted()) {
        setSettings({ ...DEFAULT_SETTINGS, ...json.data.document });
        setRevision(json.data.revision ?? 0);
      }
    } catch (err) {
      if (!isMounted || isMounted()) {
        const errMsg = err instanceof Error ? err.message : "Mất kết nối tới máy chủ.";
        setLoadError(errMsg);
      }
    } finally {
      if (!isMounted || isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setConflict(false);
    setMessage(null);
    await loadSettingsData();
  }, [loadSettingsData]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadSettingsData() calls setState after async fetch, safe pattern
    void loadSettingsData(() => active);
    return () => {
      active = false;
    };
  }, [loadSettingsData]);

  const update = <K extends keyof StorefrontSettings>(key: K, value: StorefrontSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || loading || loadError) return;

    setSaving(true);
    setMessage(null);
    setConflict(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          expectedRevision: revision,
          document: settings,
        }),
      });

      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        setConflict(true);
        setMessage({
          type: "error",
          text:
            json.error ||
            "Xung đột phiên bản (409): Cài đặt đã được người khác chỉnh sửa. Giữ nguyên nội dung bạn đang sửa và không tự động ghi đè.",
        });
        return;
      }

      if (res.status === 401) {
        setMessage({
          type: "error",
          text: "Phiên đăng nhập đã hết hạn (401). Giữ nguyên nội dung đã nhập, vui lòng đăng nhập lại ở tab khác rồi thử Lưu lại.",
        });
        return;
      }

      if (res.status === 403) {
        setMessage({
          type: "error",
          text: "Lỗi kiểm tra bảo mật CSRF (403). Yêu cầu cùng Origin để bảo vệ hệ thống.",
        });
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Lỗi máy chủ (${res.status}) khi lưu cài đặt.`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Phản hồi máy chủ không hợp lệ.");
      }

      // Xác nhận thành công và cập nhật revision mới từ server
      setRevision(json.data.revision);
      setSettings({ ...DEFAULT_SETTINGS, ...json.data.document });
      setLocalDraftStatus(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }

      setMessage({
        type: "success",
        text: "Đã lưu cấu hình thành công.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mất kết nối mạng khi lưu.";
      setMessage({ type: "error", text: msg });

      // Lưu bản nháp cục bộ phục hồi tạm thời, hiển thị rõ "Bản chưa đồng bộ"
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setLocalDraftStatus("Bản chưa đồng bộ với máy chủ (đã lưu tạm trên trình duyệt khi xảy ra sự cố).");
      } catch {
        // ignore storage errors
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="font-medium text-slate-600">Đang tải cấu hình Storefront từ cơ sở dữ liệu D1...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-900 mb-2">Không thể tải cấu hình Storefront</h2>
        <p className="text-sm text-red-700 mb-6">{loadError}</p>
        <p className="text-xs text-red-600 mb-6 bg-red-100/60 p-3 rounded-lg text-left">
          Hệ thống bảo vệ dữ liệu đã khóa chức năng lưu cấu hình mặc định để ngăn việc vô tình ghi đè dữ liệu thật trên cơ sở dữ liệu D1.
        </p>
        <button
          type="button"
          onClick={() => void fetchSettings()}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "store", label: "Cửa hàng & Hotline", icon: Store },
    { id: "flashsale", label: "Flash Sale & Giờ Vàng", icon: Flame },
    { id: "banners", label: "Banners & Trang Chủ", icon: LayoutTemplate },
    { id: "features", label: "Cam kết dịch vụ", icon: ShieldCheck },
    { id: "shipping", label: "Vận chuyển & Thanh toán", icon: Truck },
  ];

  const handleReloadLatest = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Tải phiên bản mới từ máy chủ sẽ ghi đè các nội dung bạn đang chỉnh sửa chưa lưu. Bạn có chắc chắn muốn tải lại không?"
      )
    ) {
      void fetchSettings();
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý thông tin cửa hàng, chính sách bán hàng và nội dung website."
        breadcrumbs={[{ label: "Hệ thống" }, { label: "Cài đặt hệ thống" }]}
        badge={
          <span
            className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200"
            title={`Phiên bản lưu trữ: #${revision}`}
          >
            Bản ghi #{revision}
          </span>
        }
        actions={
          <>
            {conflict && (
              <button
                type="button"
                onClick={handleReloadLatest}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 px-3.5 rounded-lg border border-amber-300 transition flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" /> Tải bản mới từ server
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || Boolean(loadError)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2 px-5 rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0 text-xs sm:text-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Lưu cấu hình
                </>
              )}
            </button>
          </>
        }
      />

      {/* Local draft warning if present */}
      {localDraftStatus && (
        <div className="mb-4">
          <InlineAlert variant="warning">
            {localDraftStatus}
          </InlineAlert>
        </div>
      )}

      {/* Status feedback alert */}
      {message && (
        <div className="mb-6">
          <InlineAlert
            variant={message.type === "error" ? "error" : message.type === "warning" ? "warning" : "success"}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </InlineAlert>
        </div>
      )}


      {/* Tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar border-b border-slate-200 mb-8 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* TAB 1: CỬA HÀNG & HOTLINE */}
        {activeTab === "store" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" /> Thông tin liên hệ & Cơ sở kinh doanh
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Các thông tin này đồng bộ toàn bộ Header, Footer, Hộp thoại liên hệ và Thông tin thanh toán.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tên thương hiệu</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => update("storeName", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Email hỗ trợ</label>
                <input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => update("storeEmail", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Hotline chính (Hà Nội)</label>
                <input
                  type="text"
                  value={settings.storePhone}
                  onChange={(e) => update("storePhone", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Hotline chi nhánh Bắc Ninh</label>
                <input
                  type="text"
                  value={settings.storePhoneBacNinh}
                  onChange={(e) => update("storePhoneBacNinh", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Đường dẫn Chat Zalo</label>
                <input
                  type="text"
                  value={settings.zaloUrl}
                  onChange={(e) => update("zaloUrl", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Giờ làm việc</label>
                <input
                  type="text"
                  value={settings.openingHours}
                  onChange={(e) => update("openingHours", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Địa chỉ Showroom Hà Nội</label>
                <input
                  type="text"
                  value={settings.addressHanoi}
                  onChange={(e) => update("addressHanoi", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Địa chỉ Showroom Bắc Ninh</label>
                <input
                  type="text"
                  value={settings.addressBacNinh}
                  onChange={(e) => update("addressBacNinh", e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLASH SALE & GIỜ VÀNG */}
        {activeTab === "flashsale" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600" /> Cấu hình Giá Sốc Giờ Vàng (Flash Sale)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Điều chỉnh thời gian đồng hồ đếm ngược và trạng thái hiển thị trên Trang chủ và trang `/hot-sale`.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Cấu hình Flash Sale được lưu trữ an toàn tại hệ thống quản trị; tính năng hiển thị đếm ngược tự động trên Storefront sẽ được kết nối ở giai đoạn R07.</span>
            </div>

            <div className="space-y-5">
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={settings.flashSaleEnabled}
                  onChange={(e) => update("flashSaleEnabled", e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Bật khối Flash Sale trên trang chủ</div>
                  <div className="text-xs text-slate-500">Nếu tắt, khối Flash Sale trên Trang chủ sẽ tạm thời ẩn.</div>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tiêu đề chương trình</label>
                  <input
                    type="text"
                    value={settings.flashSaleTitle}
                    onChange={(e) => update("flashSaleTitle", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Thời điểm kết thúc đếm ngược (ISO hoặc YYYY-MM-DDTHH:MM)
                  </label>
                  <input
                    type="text"
                    value={settings.flashSaleEndAt}
                    onChange={(e) => update("flashSaleEndAt", e.target.value)}
                    placeholder="2026-10-31T23:59:59Z"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Ví dụ: <code className="text-blue-600">2026-12-31T23:59:59.000Z</code>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                <span className="font-bold">Mẹo quản trị:</span> Để đưa sản phẩm vào danh sách Flash Sale, bạn hãy vào mục{" "}
                <strong className="text-blue-700">Quản lý sản phẩm</strong>, bấm Sửa sản phẩm và tích chọn{" "}
                <strong>&quot;Giá sốc giờ vàng (isFlashSale)&quot;</strong>. Sản phẩm sẽ ngay lập tức xuất hiện tại đây!
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BANNERS & TRANG CHỦ */}
        {activeTab === "banners" && (
          <div className="space-y-8">
            {/* Hero Main Banner */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-blue-600" /> Hero Banner chính (Đầu trang)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Banner ấn tượng đầu tiên khi khách hàng bước vào website CitiLap.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Cấu hình Banner và Slogan được lưu trữ an toàn tại hệ thống quản trị; việc kết nối trực tiếp lên giao diện trang chủ Storefront sẽ được hoàn tất ở giai đoạn R07.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Badge nhãn nhỏ</label>
                  <input
                    type="text"
                    value={settings.heroBadge}
                    onChange={(e) => update("heroBadge", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Slogan phụ</label>
                  <input
                    type="text"
                    value={settings.heroSlogan}
                    onChange={(e) => update("heroSlogan", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tiêu đề chính 1</label>
                  <input
                    type="text"
                    value={settings.heroTitle}
                    onChange={(e) => update("heroTitle", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Từ khóa Highlight (Màu xanh)</label>
                  <input
                    type="text"
                    value={settings.heroHighlight}
                    onChange={(e) => update("heroHighlight", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Link ảnh nền Hero (URL hoặc R2)</label>
                  <input
                    type="text"
                    value={settings.heroBgImage}
                    onChange={(e) => update("heroBgImage", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Nút bấm 1 - Tên</label>
                  <input
                    type="text"
                    value={settings.heroCtaPrimaryText}
                    onChange={(e) => update("heroCtaPrimaryText", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Nút bấm 1 - Đường dẫn liên kết</label>
                  <input
                    type="text"
                    value={settings.heroCtaPrimaryLink}
                    onChange={(e) => update("heroCtaPrimaryLink", e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Banners */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-indigo-600" /> 2 Banner phụ (Sub-Banners)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  2 Banner nằm ngay dưới khối Hero để dẫn hướng khách vào danh mục chủ lực.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Banner phụ 1 */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-800">Banner phụ 1 (Trái)</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                    <input
                      type="text"
                      value={settings.subBanner1Title}
                      onChange={(e) => update("subBanner1Title", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phụ đề</label>
                    <input
                      type="text"
                      value={settings.subBanner1Subtitle}
                      onChange={(e) => update("subBanner1Subtitle", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Link đích</label>
                    <input
                      type="text"
                      value={settings.subBanner1Link}
                      onChange={(e) => update("subBanner1Link", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Link ảnh</label>
                    <input
                      type="text"
                      value={settings.subBanner1Image}
                      onChange={(e) => update("subBanner1Image", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Banner phụ 2 */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-800">Banner phụ 2 (Phải)</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                    <input
                      type="text"
                      value={settings.subBanner2Title}
                      onChange={(e) => update("subBanner2Title", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phụ đề</label>
                    <input
                      type="text"
                      value={settings.subBanner2Subtitle}
                      onChange={(e) => update("subBanner2Subtitle", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Link đích</label>
                    <input
                      type="text"
                      value={settings.subBanner2Link}
                      onChange={(e) => update("subBanner2Link", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Link ảnh</label>
                    <input
                      type="text"
                      value={settings.subBanner2Image}
                      onChange={(e) => update("subBanner2Image", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAM KẾT DỊCH VỤ (FEATURE STRIP) */}
        {activeTab === "features" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> 4 Cam kết dịch vụ (Feature Strip)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hiển thị nổi bật trên Trang chủ giúp tăng tỷ lệ chuyển đổi và niềm tin của khách hàng.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="font-bold text-xs uppercase text-blue-700">Cam kết 1</div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={settings.feature1Title}
                    onChange={(e) => update("feature1Title", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={settings.feature1Desc}
                    onChange={(e) => update("feature1Desc", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="font-bold text-xs uppercase text-emerald-700">Cam kết 2</div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={settings.feature2Title}
                    onChange={(e) => update("feature2Title", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={settings.feature2Desc}
                    onChange={(e) => update("feature2Desc", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="font-bold text-xs uppercase text-amber-700">Cam kết 3</div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={settings.feature3Title}
                    onChange={(e) => update("feature3Title", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={settings.feature3Desc}
                    onChange={(e) => update("feature3Desc", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
                <div className="font-bold text-xs uppercase text-indigo-700">Cam kết 4</div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={settings.feature4Title}
                    onChange={(e) => update("feature4Title", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={settings.feature4Desc}
                    onChange={(e) => update("feature4Desc", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VẬN CHUYỂN & THANH TOÁN */}
        {activeTab === "shipping" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Chính sách vận chuyển & Cổng thanh toán
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập phí giao hàng và hướng dẫn khách chuyển khoản khi đặt hàng tại bước Checkout.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Chính sách phí giao hàng mặc định được lưu để hỗ trợ quy trình tư vấn và tạo đơn; cơ chế tự động tính phí tại giỏ hàng Storefront sẽ được kết nối ở giai đoạn R08.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Phí giao hàng mặc định (VNĐ)
                </label>
                <input
                  type="number"
                  value={settings.shippingFee}
                  onChange={(e) => update("shippingFee", Number(e.target.value))}
                  min="0"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Miễn phí giao hàng từ mức (VNĐ)
                </label>
                <input
                  type="number"
                  value={settings.freeShippingThreshold}
                  onChange={(e) => update("freeShippingThreshold", Number(e.target.value))}
                  min="0"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1.5">Đặt bằng 0 nếu không áp dụng miễn phí vận chuyển.</p>
              </div>

              <div className="md:col-span-2 space-y-3 pt-2">
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Thanh toán khi nhận hàng (COD)</div>
                    <div className="text-xs text-slate-500 mt-0.5">Khách kiểm tra máy và trả tiền mặt cho shipper.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.codEnabled}
                    onChange={(e) => update("codEnabled", e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Chuyển khoản ngân hàng qua mã QR</div>
                    <div className="text-xs text-slate-500 mt-0.5">Khách hàng quét mã QR chuyển khoản trước.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bankTransferEnabled}
                    onChange={(e) => update("bankTransferEnabled", e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Thông tin tài khoản ngân hàng nhận tiền
                </label>
                <textarea
                  value={settings.bankAccountInfo}
                  onChange={(e) => update("bankAccountInfo", e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-8 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang lưu cấu hình...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Lưu tất cả thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
