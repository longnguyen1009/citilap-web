"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { PageHeader, InlineAlert, AdminCard, useConfirm, useToast } from "@/components/admin/ui";
import type { AdminSettingsDocument as StorefrontSettings } from "@/contracts/cms/settings";
import { DEFAULT_ADMIN_SETTINGS as DEFAULT_SETTINGS } from "@/contracts/cms/settings";
import type { TabId } from "@/components/admin/settings/settings-helpers";
import { StoreSettingsTab } from "@/components/admin/settings/StoreSettingsTab";
import { FlashSaleSettingsTab } from "@/components/admin/settings/FlashSaleSettingsTab";
import { BannersVideosSettingsTab } from "@/components/admin/settings/BannersVideosSettingsTab";
import { FeaturesTestimonialsSettingsTab } from "@/components/admin/settings/FeaturesTestimonialsSettingsTab";
import { ShippingPaymentSettingsTab } from "@/components/admin/settings/ShippingPaymentSettingsTab";
import { ProductPageSettingsTab } from "@/components/admin/settings/ProductPageSettingsTab";

const STORAGE_KEY = "citilap_admin_settings_v2_draft";

export default function SettingsPage() {
  const confirm = useConfirm();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("store");
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);
  const [revision, setRevision] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState<string | null>(null);
  const [localDraftError, setLocalDraftError] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [quickVideoUrl, setQuickVideoUrl] = useState("");
  const [fetchingVideos, setFetchingVideos] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; name: string; sku: string; price: number }>>([]);
  const [bundleProductSearch, setBundleProductSearch] = useState<Record<string, string>>({});

  const settingsRef = useRef<StorefrontSettings>(DEFAULT_SETTINGS);
  const editGenerationRef = useRef<number>(0);
  const requestLockRef = useRef<"load" | "reload" | "save" | null>(null);
  const fetchingVideosRef = useRef<boolean>(false);
  const lastBackupRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam && ["store", "flashsale", "banners", "features", "shipping", "product"].includes(tabParam)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial tab from URL query
        setActiveTab(tabParam as TabId);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "product" || catalogProducts.length > 0) return;
    fetch("/api/admin/products?limit=100", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data?.items)) {
          setCatalogProducts(json.data.items);
        }
      })
      .catch(() => {});
  }, [activeTab, catalogProducts.length]);

  const loadSettingsData = useCallback(async (isMounted?: () => boolean): Promise<boolean> => {
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
        const nextSettings = { ...DEFAULT_SETTINGS, ...json.data.document };
        settingsRef.current = nextSettings;
        editGenerationRef.current += 1;
        setSettings(nextSettings);
        setRevision(json.data.revision ?? 0);
        setLoadError(null);
        setIsDirty(false);
        return true;
      }
      return false;
    } catch (err) {
      if (!isMounted || isMounted()) {
        const errMsg = err instanceof Error ? err.message : "Mất kết nối tới máy chủ.";
        setLoadError(errMsg);
      }
      return false;
    } finally {
      if (!isMounted || isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  const fetchSettings = useCallback(async (): Promise<boolean> => {
    if (requestLockRef.current !== null) return false;
    requestLockRef.current = "load";
    setLoading(true);
    setLoadError(null);
    setConflict(false);
    setMessage(null);
    try {
      return await loadSettingsData();
    } finally {
      if (requestLockRef.current === "load") {
        requestLockRef.current = null;
      }
    }
  }, [loadSettingsData]);

  useEffect(() => {
    let active = true;
    requestLockRef.current = "load";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadSettingsData() calls setState after async fetch, safe pattern
    void loadSettingsData(() => active).finally(() => {
      if (active && requestLockRef.current === "load") {
        requestLockRef.current = null;
      }
    });
    return () => {
      active = false;
      requestLockRef.current = null;
    };
  }, [loadSettingsData]);

  const update = useCallback(<K extends keyof StorefrontSettings>(key: K, value: StorefrontSettings[K]) => {
    editGenerationRef.current += 1;
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setIsDirty(true);
    setSettings((current) => {
      const merged = { ...current, [key]: value };
      settingsRef.current = merged;
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleAddVideoByUrl = async () => {
    const raw = quickVideoUrl.trim();
    if (!raw || fetchingVideosRef.current || fetchingVideos) return;
    fetchingVideosRef.current = true;
    setFetchingVideos(true);
    setMessage(null);
    try {
      const urls = raw.split(/[\n,\s]+/).map((u) => u.trim()).filter(Boolean);
      if (urls.length > 1) {
        const res = await fetch("/api/admin/fetch-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
          credentials: "same-origin",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || "Không thể lấy thông tin danh sách video.");
        }
        const current = settingsRef.current.reviewVideos || [];
        const mergedMap = new Map<string, (typeof current)[number]>();
        for (const item of [...json.data, ...current]) {
          if (item?.url && !mergedMap.has(item.url)) {
            mergedMap.set(item.url, item);
          }
        }
        update("reviewVideos", Array.from(mergedMap.values()).slice(0, 12));
        setQuickVideoUrl("");
        setMessage({ type: "success", text: `Đã thêm thành công ${json.data.length} video mới.` });
        toast.success(`Đã thêm thành công ${json.data.length} video mới.`);
        return;
      }

      const res = await fetch(`/api/admin/fetch-videos?videoUrl=${encodeURIComponent(raw)}`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Không thể lấy thông tin video từ URL này.");
      }
      const current = settingsRef.current.reviewVideos || [];
      if (current.length >= 12) {
        setMessage({ type: "warning", text: "Danh sách tối đa 12 video. Vui lòng xóa bớt trước khi thêm mới." });
        toast.warning("Danh sách tối đa 12 video. Vui lòng xóa bớt trước khi thêm mới.");
        return;
      }
      update("reviewVideos", [json.data, ...current.filter((v) => v.url !== json.data.url)].slice(0, 12));
      setQuickVideoUrl("");
      setMessage({ type: "success", text: `Đã thêm video: ${json.data.title}` });
      toast.success(`Đã thêm video: ${json.data.title}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Lỗi khi thêm video.";
      setMessage({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      fetchingVideosRef.current = false;
      setFetchingVideos(false);
    }
  };

  const handleFetchChannelVideos = async (channelUrl: string) => {
    const raw = channelUrl.trim();
    if (!raw || fetchingVideosRef.current || fetchingVideos) return;
    fetchingVideosRef.current = true;
    setFetchingVideos(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/fetch-videos?channelUrl=${encodeURIComponent(raw)}`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || "Không thể lấy danh sách video từ kênh.");
      }
      const existing = settingsRef.current.reviewVideos || [];
      const mergedMap = new Map<string, (typeof existing)[number]>();
      for (const item of [...json.data, ...existing]) {
        if (item?.url && !mergedMap.has(item.url)) {
          mergedMap.set(item.url, item);
        }
      }
      update("reviewVideos", Array.from(mergedMap.values()).slice(0, 12));
      const msg = json.message || `Đã cập nhật ${json.data.length} video mới nhất từ kênh.`;
      setMessage({
        type: "success",
        text: msg,
      });
      toast.success(msg);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Lỗi khi tải video từ kênh.";
      setMessage({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      fetchingVideosRef.current = false;
      setFetchingVideos(false);
    }
  };

  const persistErrorBackup = (errMsg: string) => {
    setIsDirty(true);
    try {
      const latestSerialized = JSON.stringify(settingsRef.current);
      localStorage.setItem(STORAGE_KEY, latestSerialized);
      lastBackupRef.current = latestSerialized;
      setLocalDraftError(false);
      setLocalDraftStatus("Bản chưa đồng bộ với máy chủ (đã lưu tạm trên trình duyệt).");
      setMessage({ type: "error", text: errMsg });
      toast.error(errMsg);
    } catch {
      const storageErrText = "Không thể sao lưu tạm trên trình duyệt.";
      const combinedMsg = `${errMsg} ${storageErrText}`;
      setLocalDraftError(true);
      setLocalDraftStatus(storageErrText);
      setMessage({ type: "error", text: combinedMsg });
      toast.error(combinedMsg);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestLockRef.current !== null || saving || loading || reloading || loadError) return;

    const currentSettings = settingsRef.current;
    if (currentSettings.flashSaleEnabled && currentSettings.flashSaleStartAt && currentSettings.flashSaleEndAt) {
      const start = new Date(currentSettings.flashSaleStartAt).getTime();
      const end = new Date(currentSettings.flashSaleEndAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
        const errMsg = "Thời điểm bắt đầu Flash Sale phải trước thời điểm kết thúc.";
        setMessage({
          type: "error",
          text: errMsg,
        });
        toast.error(errMsg);
        return;
      }
    }

    const submittedSnapshot: StorefrontSettings = structuredClone(currentSettings);
    const submittedSerialized = JSON.stringify(submittedSnapshot);
    const submittedGeneration = editGenerationRef.current;

    requestLockRef.current = "save";
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
          document: submittedSnapshot,
        }),
      });

      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        setConflict(true);
        const errMsg =
          json.error ||
          "Xung đột phiên bản (409): Cài đặt đã được người khác chỉnh sửa. Giữ nguyên nội dung bạn đang sửa.";
        persistErrorBackup(errMsg);
        return;
      }

      if (res.status === 401) {
        const errMsg = "Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại ở tab khác rồi thử Lưu lại.";
        persistErrorBackup(errMsg);
        return;
      }

      if (res.status === 403) {
        const errMsg = "Lỗi kiểm tra bảo mật CSRF (403).";
        persistErrorBackup(errMsg);
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
      const hasNewerEdit =
        editGenerationRef.current !== submittedGeneration ||
        JSON.stringify(settingsRef.current) !== submittedSerialized;

      if (!hasNewerEdit) {
        const savedSettings = { ...DEFAULT_SETTINGS, ...json.data.document };
        settingsRef.current = savedSettings;
        setSettings(savedSettings);
        setIsDirty(false);
        setLocalDraftError(false);
        setLocalDraftStatus(null);
        try {
          const existingBackup = localStorage.getItem(STORAGE_KEY);
          if (
            existingBackup === null ||
            existingBackup === submittedSerialized ||
            existingBackup === JSON.stringify(savedSettings) ||
            existingBackup === lastBackupRef.current
          ) {
            localStorage.removeItem(STORAGE_KEY);
            lastBackupRef.current = null;
          }
        } catch {
          // ignore
        }
      }

      setMessage({
        type: "success",
        text: "Đã lưu cấu hình thành công.",
      });
      toast.success("Đã lưu cấu hình cửa hàng thành công.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mất kết nối mạng khi lưu.";
      persistErrorBackup(msg);
    } finally {
      requestLockRef.current = null;
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

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; description: string }> = [
    { id: "store", label: "Cửa hàng & Liên hệ", icon: Store, description: "Thông tin dùng chung cho cửa hàng, hotline và các điểm bán." },
    { id: "shipping", label: "Giao hàng & Thanh toán", icon: Truck, description: "Phí giao hàng và phương thức thanh toán khách có thể chọn khi đặt đơn." },
    { id: "product", label: "Trang sản phẩm", icon: CreditCard, description: "Nội dung dùng chung trên trang sản phẩm. Giá, cấu hình và tồn kho được quản lý riêng tại Sản phẩm và Kho & Kiểm định." },
    { id: "banners", label: "Banner & Kênh video", icon: LayoutTemplate, description: "Quản lý banner, kênh mạng xã hội và danh sách video. Chọn vị trí, thứ tự các khối tại Bố cục trang." },
    { id: "features", label: "Cam kết & Đánh giá", icon: ShieldCheck, description: "Nội dung cam kết dịch vụ và đánh giá khách hàng hiển thị trên website." },
    { id: "flashsale", label: "Flash Sale dự phòng", icon: Flame, description: "Cấu hình hiển thị dự phòng khi không có chiến dịch riêng. Quản lý lịch chạy và giá khuyến mãi tại Flash Sale." },
  ];

  const handleReloadLatest = async () => {
    if (requestLockRef.current !== null || saving || loading || reloading) return;
    requestLockRef.current = "reload";
    setReloading(true);
    try {
      const storeName = settingsRef.current.storeName || "CitiLap";
      const ok = await confirm({
        title: `Tải lại cấu hình "${storeName}" (từ #v${revision})?`,
        message: `Tải phiên bản mới nhất của cấu hình "${storeName}" từ máy chủ sẽ ghi đè các thay đổi chưa lưu của bản #v${revision}. Bạn có chắc chắn muốn tiếp tục?`,
        confirmLabel: "Tải bản mới",
        cancelLabel: "Giữ bản đang sửa",
        variant: "warning",
      });
      if (!ok) {
        return;
      }
      setLoading(true);
      setLoadError(null);
      setConflict(false);
      setMessage(null);
      const loaded = await loadSettingsData();
      if (loaded) {
        toast.info("Đã tải lại phiên bản cấu hình mới nhất từ máy chủ.");
      }
    } finally {
      requestLockRef.current = null;
      setReloading(false);
    }
  };

  return (
    <div className="admin-settings max-w-6xl mx-auto pb-16 space-y-3">
      {/* Page Header */}
      <PageHeader
        title="Cài đặt cửa hàng"
        description="Thiết lập thông tin dùng chung, giao hàng, thanh toán và nội dung website. Lưu cấu hình áp dụng thay đổi ở tất cả mục."
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
                onClick={() => void handleReloadLatest()}
                disabled={saving || loading || reloading}
                className="bg-amber-100 hover:bg-amber-200 disabled:opacity-60 text-amber-900 font-semibold py-1.5 px-3 rounded-lg border border-amber-300 transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Tải bản mới
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || reloading || Boolean(loadError)}
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
        <InlineAlert variant={localDraftError ? "error" : "warning"}>{localDraftStatus}</InlineAlert>
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
        <div
          role="group"
          aria-label="Nhóm cài đặt"
          className="admin-settings-tabs flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50/70"
        >
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
          <p className="text-slate-600 leading-relaxed">
            {tabs.find((tab) => tab.id === activeTab)?.description}
          </p>

          {activeTab === "store" && <StoreSettingsTab settings={settings} update={update} />}
          {activeTab === "flashsale" && <FlashSaleSettingsTab settings={settings} update={update} />}
          {activeTab === "banners" && (
            <BannersVideosSettingsTab
              settings={settings}
              update={update}
              quickVideoUrl={quickVideoUrl}
              setQuickVideoUrl={setQuickVideoUrl}
              fetchingVideos={fetchingVideos}
              handleAddVideoByUrl={handleAddVideoByUrl}
              handleFetchChannelVideos={handleFetchChannelVideos}
            />
          )}
          {activeTab === "features" && (
            <FeaturesTestimonialsSettingsTab settings={settings} update={update} />
          )}
          {activeTab === "shipping" && (
            <ShippingPaymentSettingsTab settings={settings} update={update} />
          )}
          {activeTab === "product" && (
            <ProductPageSettingsTab
              settings={settings}
              update={update}
              catalogProducts={catalogProducts}
              bundleProductSearch={bundleProductSearch}
              setBundleProductSearch={setBundleProductSearch}
            />
          )}

          <div className="admin-settings-save pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span role="status" className={isDirty ? "text-amber-800" : "text-slate-500"}>
              {saving
                ? "Đang lưu cấu hình…"
                : isDirty
                ? "Có thay đổi chưa lưu · Lưu áp dụng tất cả mục"
                : "Không có thay đổi chưa lưu"}
            </span>
            <button
              type="submit"
              disabled={saving || loading || reloading || Boolean(loadError)}
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
