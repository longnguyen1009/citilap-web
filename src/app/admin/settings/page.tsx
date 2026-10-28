"use client";

import { useEffect, useState, useCallback } from "react";
import Link from 'next/link';
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
  AlertCircle,
  Image as ImageIcon,
  Share2,
  Scale,
  Star,
  QrCode,
} from "lucide-react";
import { VIETQR_BANKS, findVietQrBank } from "@/lib/vietqr";
import { PageHeader, InlineAlert, AdminCard } from "@/components/admin/ui";
import type { AdminSettingsDocument as StorefrontSettings } from "@/contracts/cms/settings";
import { DEFAULT_ADMIN_SETTINGS as DEFAULT_SETTINGS } from "@/contracts/cms/settings";

const STORAGE_KEY = "citilap_admin_settings_v2_draft";

type TabId = "store" | "flashsale" | "banners" | "features" | "shipping" | "product";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none";
const labelCls = "block text-[11px] font-semibold text-slate-600 mb-1";

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

    if (settings.flashSaleEnabled && settings.flashSaleStartAt && settings.flashSaleEndAt) {
      const start = new Date(settings.flashSaleStartAt).getTime();
      const end = new Date(settings.flashSaleEndAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
        setMessage({
          type: "error",
          text: "Thời điểm bắt đầu Flash Sale phải trước thời điểm kết thúc.",
        });
        return;
      }
    }

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
            "Xung đột phiên bản (409): Cài đặt đã được người khác chỉnh sửa. Giữ nguyên nội dung bạn đang sửa.",
        });
        return;
      }

      if (res.status === 401) {
        setMessage({
          type: "error",
          text: "Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại ở tab khác rồi thử Lưu lại.",
        });
        return;
      }

      if (res.status === 403) {
        setMessage({
          type: "error",
          text: "Lỗi kiểm tra bảo mật CSRF (403).",
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

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setLocalDraftStatus("Bản chưa đồng bộ với máy chủ (đã lưu tạm trên trình duyệt).");
      } catch {
        // ignore
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] text-slate-500 gap-2 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span>Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-red-900 mb-1">Không thể tải cấu hình</h2>
        <p className="text-xs text-red-700 mb-4">{loadError}</p>
        <button
          type="button"
          onClick={() => void fetchSettings()}
          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Thử lại
        </button>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "store", label: "Cửa hàng", icon: Store },
    { id: "flashsale", label: "Flash Sale", icon: Flame },
    { id: "banners", label: "Banners", icon: LayoutTemplate },
    { id: "features", label: "Cam kết & Đánh giá", icon: ShieldCheck },
    { id: "shipping", label: "Vận chuyển & TT", icon: Truck },
    { id: "product", label: "Trang SP", icon: CreditCard },
  ];

  const handleReloadLatest = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Tải phiên bản mới từ máy chủ sẽ ghi đè các nội dung bạn đang chỉnh sửa chưa lưu. Tiếp tục?"
      )
    ) {
      void fetchSettings();
    }
  };

  return (
    <div className="admin-settings max-w-6xl mx-auto pb-16 space-y-3">
      {/* Page Header */}
      <PageHeader
        title="Cài đặt hệ thống"
        badge={
          <span
            className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-mono"
            title={`Phiên bản lưu trữ: #${revision}`}
          >
            #v{revision}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {conflict && (
              <button
                type="button"
                onClick={handleReloadLatest}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold py-1.5 px-3 rounded-lg border border-amber-300 transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Tải bản mới
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || Boolean(loadError)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-1.5 px-4 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0 text-xs"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Lưu cấu hình
                </>
              )}
            </button>
          </div>
        }
      />

      {localDraftStatus && (
        <InlineAlert variant="warning">{localDraftStatus}</InlineAlert>
      )}

      {message && (
        <InlineAlert
          variant={message.type === "error" ? "error" : message.type === "warning" ? "warning" : "success"}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </InlineAlert>
      )}

      {!settings.codEnabled && !settings.bankTransferEnabled && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
          Cả hai phương thức thanh toán đang tắt. Lưu cấu hình sẽ tạm ngưng nhận đơn mới.
        </p>
      )}
      {settings.bankTransferEnabled && !settings.bankAccountInfo.trim() && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
          Thiếu hướng dẫn ngân hàng: khách chưa thể chọn chuyển khoản.
        </p>
      )}

      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Tab Bar inside Card */}
        <div className="admin-settings-tabs flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50/70">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="p-5 space-y-5 text-xs">
          {/* TAB 1: CỬA HÀNG & HOTLINE */}
          {activeTab === "store" && (
            <div className="space-y-5">
              <h2 className="text-xs font-bold text-slate-800">Thông tin cửa hàng & Liên hệ</h2>
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
                      placeholder="/brand/brand-logo-original.jpg"
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
                  <Share2 className="w-3.5 h-3.5 text-blue-600" /> Mạng xã hội
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className={labelCls}>Facebook</label>
                    <input
                      type="text"
                      value={settings.facebookUrl}
                      onChange={(e) => update("facebookUrl", e.target.value)}
                      placeholder="https://facebook.com/..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>TikTok</label>
                    <input
                      type="text"
                      value={settings.tiktokUrl}
                      onChange={(e) => update("tiktokUrl", e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>YouTube</label>
                    <input
                      type="text"
                      value={settings.youtubeUrl}
                      onChange={(e) => update("youtubeUrl", e.target.value)}
                      placeholder="https://youtube.com/@..."
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
          )}

          {/* TAB 2: FLASH SALE & GIỜ VÀNG */}
          {activeTab === "flashsale" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-red-900 text-xs">Banner HOT SALE & Chiến dịch</h2>
                  <Link href="/admin/campaigns" className="text-xs font-bold text-red-700 hover:underline">
                    Mở quản lý Chiến dịch →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Ảnh banner ngang (1600×160)
                    <input
                      value={settings.hotSaleBannerImage}
                      onChange={e => update('hotSaleBannerImage', e.target.value)}
                      placeholder="/api/library/... hoặc https://..."
                      className={`mt-1 font-normal ${inputCls}`}
                    />
                  </label>
                  <label className={labelCls}>
                    Liên kết banner
                    <input
                      value={settings.hotSaleBannerLink}
                      onChange={e => update('hotSaleBannerLink', e.target.value)}
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
                    <div className="font-bold text-slate-900 text-xs">Bật chương trình Flash Sale toàn trang</div>
                    <div className="text-[11px] text-slate-500">Áp dụng cho sản phẩm gắn cờ isFlashSale.</div>
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
                    <label className={labelCls}>Bắt đầu (ISO / YYYY-MM-DDTHH:MM)</label>
                    <input
                      type="text"
                      value={settings.flashSaleStartAt}
                      onChange={(e) => update("flashSaleStartAt", e.target.value)}
                      placeholder="2026-10-01T00:00:00Z"
                      className={`${inputCls} font-mono`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Kết thúc (ISO / YYYY-MM-DDTHH:MM)</label>
                    <input
                      type="text"
                      value={settings.flashSaleEndAt}
                      onChange={(e) => update("flashSaleEndAt", e.target.value)}
                      placeholder="2026-12-31T23:59:59Z"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANNERS & TRANG CHỦ */}
          {activeTab === "banners" && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-800">Hero Banner chính</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className={labelCls}>Badge nhãn nhỏ</label>
                    <input
                      type="text"
                      value={settings.heroBadge}
                      onChange={(e) => update("heroBadge", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Tiêu đề chính</label>
                    <input
                      type="text"
                      value={settings.heroTitle}
                      onChange={(e) => update("heroTitle", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Từ khóa Highlight</label>
                    <input
                      type="text"
                      value={settings.heroHighlight}
                      onChange={(e) => update("heroHighlight", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className={labelCls}>Slogan phụ</label>
                    <input
                      type="text"
                      value={settings.heroSlogan}
                      onChange={(e) => update("heroSlogan", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Ảnh nền Hero (URL)</label>
                    <input
                      type="text"
                      value={settings.heroBgImage}
                      onChange={(e) => update("heroBgImage", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Nút CTA - Tên</label>
                    <input
                      type="text"
                      value={settings.heroCtaPrimaryText}
                      onChange={(e) => update("heroCtaPrimaryText", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Nút CTA - Liên kết</label>
                    <input
                      type="text"
                      value={settings.heroCtaPrimaryLink}
                      onChange={(e) => update("heroCtaPrimaryLink", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
                  <h3 className="font-bold text-xs text-slate-800">Banner phụ 1 (Trái)</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>Tiêu đề</label>
                      <input
                        type="text"
                        value={settings.subBanner1Title}
                        onChange={(e) => update("subBanner1Title", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Phụ đề</label>
                      <input
                        type="text"
                        value={settings.subBanner1Subtitle}
                        onChange={(e) => update("subBanner1Subtitle", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Link đích</label>
                      <input
                        type="text"
                        value={settings.subBanner1Link}
                        onChange={(e) => update("subBanner1Link", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Link ảnh</label>
                      <input
                        type="text"
                        value={settings.subBanner1Image}
                        onChange={(e) => update("subBanner1Image", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
                  <h3 className="font-bold text-xs text-slate-800">Banner phụ 2 (Phải)</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>Tiêu đề</label>
                      <input
                        type="text"
                        value={settings.subBanner2Title}
                        onChange={(e) => update("subBanner2Title", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Phụ đề</label>
                      <input
                        type="text"
                        value={settings.subBanner2Subtitle}
                        onChange={(e) => update("subBanner2Subtitle", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Link đích</label>
                      <input
                        type="text"
                        value={settings.subBanner2Link}
                        onChange={(e) => update("subBanner2Link", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Link ảnh</label>
                      <input
                        type="text"
                        value={settings.subBanner2Image}
                        onChange={(e) => update("subBanner2Image", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CAM KẾT DỊCH VỤ */}
          {activeTab === "features" && (
            <div className="space-y-3.5">
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
                    onClick={() => update("testimonials", [...(settings.testimonials || []), { name: "", role: "", product: "", text: "", rating: 5 }])}
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
                      update("testimonials", settings.testimonials.map((t, i) => (i === index ? { ...t, ...value } : t)));
                    return (
                      <div key={index} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Tên khách *
                            <input value={item.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} className={`mt-1 font-normal ${inputCls}`} />
                          </label>
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Nghề nghiệp / Khu vực
                            <input value={item.role} maxLength={120} onChange={(e) => patch({ role: e.target.value })} className={`mt-1 font-normal ${inputCls}`} />
                          </label>
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Sản phẩm đã mua
                            <input value={item.product} maxLength={160} onChange={(e) => patch({ product: e.target.value })} className={`mt-1 font-normal ${inputCls}`} />
                          </label>
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Số sao
                            <select value={item.rating} onChange={(e) => patch({ rating: Number(e.target.value) })} className={`mt-1 font-normal ${inputCls}`}>
                              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                            </select>
                          </label>
                        </div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Nội dung *
                          <textarea value={item.text} maxLength={800} rows={3} onChange={(e) => patch({ text: e.target.value })} className={`mt-1 font-normal ${inputCls}`} />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="text-xs text-rose-600 hover:underline cursor-pointer"
                            onClick={() => update("testimonials", settings.testimonials.filter((_, i) => i !== index))}
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
          )}

          {/* TAB 5: VẬN CHUYỂN & THANH TOÁN */}
          {activeTab === "shipping" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800">Phí vận chuyển & Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelCls}>Phí giao hàng mặc định (VNĐ)</label>
                  <input
                    type="number"
                    value={settings.shippingFee}
                    onChange={(e) => update("shippingFee", Number(e.target.value))}
                    min="0"
                    className={`${inputCls} tabular-nums`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Miễn phí giao hàng từ mức (VNĐ, 0 = tắt)</label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) => update("freeShippingThreshold", Number(e.target.value))}
                    min="0"
                    className={`${inputCls} tabular-nums`}
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
                  <label className={labelCls}>Thông tin tài khoản ngân hàng (hiển thị dạng văn bản & dùng để bật phương thức chuyển khoản)</label>
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
          )}

          {/* TAB 6: TRANG SẢN PHẨM */}
          {activeTab === 'product' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(['productTrustItems', 'productShippingItems'] as const).map(key => (
                  <section key={key} className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold text-slate-800">
                        {key === 'productTrustItems' ? 'Đặc quyền an tâm' : 'Chính sách vận chuyển & cam kết'}
                      </h2>
                      <button
                        type="button"
                        disabled={(settings[key] || []).length >= 8}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
                        onClick={() => update(key, [...(settings[key] || []), ''])}
                      >
                        + Thêm dòng
                      </button>
                    </div>
                    {(settings[key] || []).map((value, index) => (
                      <div key={index} className="flex gap-1.5 items-center">
                        <input
                          aria-label={(key === 'productTrustItems' ? 'Đặc quyền ' : 'Cam kết ') + (index + 1)}
                          value={value}
                          maxLength={key === 'productTrustItems' ? 300 : 500}
                          onChange={e => update(key, settings[key].map((item, i) => i === index ? e.target.value : item))}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
                          onClick={() => update(key, settings[key].filter((_, i) => i !== index))}
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </section>
                ))}
              </div>

              <section className="space-y-2.5 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">Banner ưu đãi cạnh thông số (tối đa 2)</h3>
                  <button
                    type="button"
                    disabled={(settings.productBanners || []).length >= 2}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
                    onClick={() => update('productBanners', [...(settings.productBanners || []), { title: '', description: '', href: '/lien-he' }])}
                  >
                    + Thêm banner
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(settings.productBanners || []).map((banner, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                      {(['title', 'description', 'href'] as const).map(field => (
                        <label key={field} className="block text-[11px] font-semibold text-slate-600">
                          {field === 'title' ? 'Tiêu đề' : field === 'description' ? 'Nội dung' : 'Liên kết'}
                          <input
                            value={banner[field]}
                            maxLength={field === 'title' ? 120 : field === 'description' ? 500 : 1000}
                            onChange={e => update('productBanners', settings.productBanners.map((item, i) => i === index ? { ...item, [field]: e.target.value } : item))}
                            className={`mt-1 font-normal ${inputCls}`}
                          />
                        </label>
                      ))}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                          onClick={() => update('productBanners', settings.productBanners.filter((_, i) => i !== index))}
                        >
                          Xóa banner
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="admin-settings-save pt-3 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer text-xs"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
