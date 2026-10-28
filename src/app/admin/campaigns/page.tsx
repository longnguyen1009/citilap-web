"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, AdminButton, AdminCard } from '@/components/admin/ui';
import CampaignProductPicker from '@/components/admin/products/CampaignProductPicker';
import {
  Zap,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle,
  Archive,
  AlertCircle,
  Layers,
  X,
  Trash2,
  Clock,
  Search,
} from "lucide-react";

interface CampaignItemForm {
  displayName?: string;
  id?: string;
  productId: string;
  variantId?: string | null;
  salePrice: number | string;
  regularPrice?: number | string | null;
}

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  revision: number;
  startAt: string;
  endAt: string;
  itemCount: number;
  items?: Array<{
    product?: { name: string };
    variant?: { name: string } | null;
    id: string;
    productId: string;
    variantId: string | null;
    salePrice: number;
    regularPrice: number | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

function formatGmt7(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

function isoToDatetimeLocalGmt7(isoString: string): string {
  try {
    const d = new Date(isoString);
    const gmt7Date = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return gmt7Date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function datetimeLocalGmt7ToIso(localStr: string): string {
  try {
    const [datePart, timePart] = localStr.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0));
    return utcDate.toISOString();
  } catch {
    return "";
  }
}

type FilterTab = "ALL" | "ACTIVE" | "UPCOMING" | "INACTIVE";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formStartLocal, setFormStartLocal] = useState("");
  const [formEndLocal, setFormEndLocal] = useState("");
  const [durationHours, setDurationHours] = useState('');
  const [formItems, setFormItems] = useState<CampaignItemForm[]>([]);
  const [formRevision, setFormRevision] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditorOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById('campaign-editor');
    dialog?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsEditorOpen(false); }
      if (event.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [isEditorOpen]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      const json = (await res.json()) as { success: boolean; data?: CampaignData[]; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải danh sách chiến dịch");
      }
      setCampaigns(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tải chiến dịch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setNowMs(Date.now()); void fetchCampaigns(); }, 0);
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    return () => { clearTimeout(timer); clearInterval(clock); };
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      const startMs = new Date(c.startAt).getTime();
      const endMs = new Date(c.endAt).getTime();
      const isActive = c.status === "PUBLISHED" && nowMs >= startMs && nowMs < endMs;
      const isUpcoming = c.status === "PUBLISHED" && nowMs < startMs;
      if (filterTab === "ACTIVE") return isActive;
      if (filterTab === "UPCOMING") return isUpcoming;
      if (filterTab === "INACTIVE") return !isActive && !isUpcoming;
      return true;
    });
  }, [campaigns, searchQuery, filterTab, nowMs]);

  const openNewEditor = () => {
    setFormEnabled(true);
    setDurationHours('');
    setEditingCampaign(null);
    setFormName("");
    setFormDescription("");
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setFormStartLocal(isoToDatetimeLocalGmt7(now.toISOString()));
    setFormEndLocal(isoToDatetimeLocalGmt7(tomorrow.toISOString()));
    setFormItems([]);
    setFormRevision(0);
    setFormError(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = async (c: CampaignData) => {
    setFormEnabled(c.status === 'PUBLISHED' && new Date(c.endAt).getTime() > Date.now());
    setDurationHours('');
    setEditingCampaign(c);
    setFormName(c.name);
    setFormDescription(c.description || "");
    setFormStartLocal(isoToDatetimeLocalGmt7(c.startAt));
    setFormEndLocal(isoToDatetimeLocalGmt7(c.endAt));
    setFormRevision(c.revision);
    setFormError(null);

    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`);
      const json = (await res.json()) as { success: boolean; data?: CampaignData };
      if (res.ok && json.data?.items) {
        setFormItems(
          json.data.items.map((it) => ({
            displayName: [it.product?.name, it.variant?.name].filter(Boolean).join(' · '),
            id: it.id,
            productId: it.productId,
            variantId: it.variantId || "",
            salePrice: it.salePrice,
            regularPrice: it.regularPrice || "",
          }))
        );
        setFormRevision(json.data.revision);
      } else {
        throw new Error('Không tải được sản phẩm chiến dịch. Thử lại để tránh mất danh sách.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được chiến dịch');
      return false;
    }

    setIsEditorOpen(true);
    return true;
  };

  const addTimeSlot = async (campaign: CampaignData) => {
    if (!await openEditEditor(campaign)) return;
    setEditingCampaign(null);
    setFormRevision(0);
    setFormEnabled(true);
    setFormItems(items => items.map(item => ({ ...item, id: undefined })));
    setFormStartLocal(isoToDatetimeLocalGmt7(campaign.endAt));
    setFormEndLocal(isoToDatetimeLocalGmt7(new Date(Date.parse(campaign.endAt) + 2 * 3600000).toISOString()));
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      { productId: "", variantId: "", salePrice: "", regularPrice: "" },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CampaignItemForm, value: string) => {
    setFormItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const handleSave = async (enabled = formEnabled) => {
    setFormError(null);
    setSaving(true);

    try {
      if (!formName.trim()) {
        throw new Error("Vui lòng nhập tên chiến dịch");
      }
      if (!formStartLocal || !formEndLocal) {
        throw new Error("Vui lòng nhập thời gian bắt đầu và kết thúc");
      }
      if (durationHours && (!Number.isFinite(Number(durationHours)) || Number(durationHours) < 0.25 || Number(durationHours) > 8760)) {
        throw new Error('Thời lượng phải từ 0,25 đến 8760 giờ.');
      }

      const startUtc = datetimeLocalGmt7ToIso(formStartLocal);
      const endUtc = datetimeLocalGmt7ToIso(formEndLocal);

      if (new Date(startUtc).getTime() >= new Date(endUtc).getTime()) {
        throw new Error("Thời điểm bắt đầu phải trước thời điểm kết thúc.");
      }

      const parsedItems = formItems.map((it, idx) => {
        if (!it.productId.trim()) {
          throw new Error(`Dòng ${idx + 1}: Vui lòng nhập Product ID.`);
        }
        const salePrice = Number(it.salePrice);
        if (!Number.isFinite(salePrice) || salePrice <= 0) {
          throw new Error(`Dòng ${idx + 1}: Giá khuyến mại phải là số nguyên dương.`);
        }
        const regularPrice =
          it.regularPrice !== undefined && it.regularPrice !== "" && it.regularPrice !== null
            ? Number(it.regularPrice)
            : null;
        if (regularPrice !== null && salePrice >= regularPrice) {
          throw new Error(`Dòng ${idx + 1}: Giá sale (${salePrice.toLocaleString()}₫) phải nhỏ hơn giá thường (${regularPrice.toLocaleString()}₫).`);
        }
        return {
          id: it.id,
          productId: it.productId.trim(),
          variantId: it.variantId && it.variantId.trim() ? it.variantId.trim() : null,
          salePrice: Math.round(salePrice),
          regularPrice: regularPrice !== null ? Math.round(regularPrice) : null,
        };
      });

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        status: enabled && new Date(endUtc).getTime() > Date.now() ? "PUBLISHED" : "DRAFT",
        startAt: startUtc,
        endAt: endUtc,
        items: parsedItems,
        revision: formRevision,
        expectedRevision: formRevision,
      };

      const url = editingCampaign
        ? `/api/admin/campaigns/${editingCampaign.id}`
        : `/api/admin/campaigns`;
      const method = editingCampaign ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        code?: string;
        conflictingCampaignName?: string;
      };

      if (!res.ok || !json.success) {
        if (json.code === "CAMPAIGN_OVERLAP_CONFLICT") {
          throw new Error(`Xung đột khung giờ: ${json.error}`);
        }
        if (json.code === "CAMPAIGN_REVISION_CONFLICT") {
          throw new Error(`Xung đột phiên bản (CAS): ${json.error}`);
        }
        throw new Error(json.error || "Lỗi khi lưu chiến dịch.");
      }

      setSuccessMsg(
        editingCampaign
          ? `Đã cập nhật chiến dịch "${formName}" thành công.`
          : `Đã tạo chiến dịch "${formName}" thành công.`
      );
      setIsEditorOpen(false);
      fetchCampaigns();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Lỗi khi lưu chiến dịch");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: CampaignData, enabled: boolean) => {
    setTogglingId(c.id);
    setError(null);
    try {
      const detail = await fetch(`/api/admin/campaigns/${c.id}`);
      const current = await detail.json();
      if (!detail.ok || !current.success) throw new Error(current.error || 'Không tải được chiến dịch.');
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current.data, status: enabled ? 'PUBLISHED' : 'DRAFT', expectedRevision: c.revision }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể xuất bản chiến dịch.");
      }
      setSuccessMsg(`Đã ${enabled ? 'bật' : 'tắt'} chiến dịch "${c.name}".`);
      await fetchCampaigns();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đổi được trạng thái chiến dịch.');
    } finally { setTogglingId(null); }
  };

  const handleArchive = async (c: CampaignData) => {
    if (!confirm(`Bạn có chắc muốn lưu trữ chiến dịch "${c.name}"? Giá sẽ không còn áp dụng.`)) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: c.revision }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể lưu trữ chiến dịch.");
      }
      setSuccessMsg(`Đã lưu trữ chiến dịch "${c.name}".`);
      fetchCampaigns();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi khi lưu trữ");
    }
  };

  return (
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Flash Sale & Chiến dịch"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            {campaigns.length}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={fetchCampaigns}
              disabled={loading}
              aria-label="Làm mới"
              icon={<RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />}
            />
            <AdminButton size="sm" onClick={openNewEditor} icon={<Plus className="w-4 h-4" />}>
              Tạo chiến dịch
            </AdminButton>
          </div>
        }
      />

      {/* Alerts */}
      {successMsg && (
        <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unified Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Tabs + Search */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1" role="tablist" aria-label="Lọc trạng thái chiến dịch">
            {([
              { key: "ALL", label: "Tất cả" },
              { key: "ACTIVE", label: "Đang diễn ra" },
              { key: "UPCOMING", label: "Sắp chạy" },
              { key: "INACTIVE", label: "Đã tắt / Kết thúc" },
            ] as const).map((t) => {
              const active = filterTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên chiến dịch…"
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
            Đang tải chiến dịch...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-700">Chưa có chiến dịch khuyến mại nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Chiến dịch</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4">Khung giờ (GMT+7)</th>
                  <th className="py-2.5 px-4">Homepage</th>
                  <th className="py-2.5 px-4 text-center">Sản phẩm</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map((c) => {
                  const startMs = new Date(c.startAt).getTime();
                  const endMs = new Date(c.endAt).getTime();
                  const isCurrentlyActive = c.status === "PUBLISHED" && nowMs >= startMs && nowMs < endMs;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.description}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">rev #{c.revision}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {c.status === "PUBLISHED" ? (
                          isCurrentlyActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Đang diễn ra
                            </span>
                          ) : nowMs < startMs ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                              <Clock className="w-3 h-3" />
                              Sắp diễn ra
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Đã kết thúc
                            </span>
                          )
                        ) : c.status === "DRAFT" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            Đã tắt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            Lưu trữ
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono tabular-nums whitespace-nowrap">
                        <div>{formatGmt7(c.startAt)}</div>
                        <div className="text-slate-400 text-[11px]">→ {formatGmt7(c.endAt)}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-label={`Hiển thị ${c.name} trên homepage`}
                          aria-checked={c.status === 'PUBLISHED' && nowMs < endMs}
                          disabled={togglingId !== null || nowMs >= endMs || c.status === 'ARCHIVED'}
                          onClick={() => handleToggle(c, c.status !== 'PUBLISHED')}
                          title={nowMs >= endMs ? 'Đã kết thúc. Sửa thời gian để bật lại.' : 'Bật/tắt hiển thị'}
                          className="inline-flex items-center gap-1.5 rounded-lg py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 cursor-pointer"
                        >
                          <span aria-hidden="true" className={`flex h-5 w-9 rounded-full p-0.5 transition ${c.status === 'PUBLISHED' && nowMs < endMs ? 'justify-end bg-blue-600' : 'justify-start bg-slate-300'}`}>
                            <span className="h-4 w-4 rounded-full bg-white shadow-2xs" />
                          </span>
                          <span>{c.status === 'PUBLISHED' && nowMs < endMs ? 'Bật' : 'Tắt'}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs tabular-nums">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {c.itemCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => addTimeSlot(c)}
                            aria-label={`Thêm khung giờ ${c.name}`}
                            title="Nhân bản sang khung giờ tiếp theo"
                            className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditEditor(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                            title="Sửa chiến dịch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {c.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              onClick={() => handleArchive(c)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Lưu trữ chiến dịch"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            id="campaign-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-editor-title"
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 id="campaign-editor-title" className="font-bold text-slate-900 text-sm">
                  {editingCampaign ? `Sửa chiến dịch: ${editingCampaign.name}` : "Tạo chiến dịch mới"}
                </h2>
                {editingCampaign && (
                  <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                    rev #{formRevision}
                  </span>
                )}
              </div>
              <button
                aria-label="Đóng trình sửa chiến dịch"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-grow text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chiến dịch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Flash Sale Cuối Tuần"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-4 pt-5">
                  <label className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEnabled}
                      onChange={e => setFormEnabled(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span>Bật trên homepage</span>
                  </label>
                </div>

                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả ngắn
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ghi chú hoặc mô tả ngắn cho chương trình (tuỳ chọn)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Date/Time & Full Datetime-local */}
              <fieldset className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 p-3 sm:grid-cols-4 bg-slate-50/50">
                <legend className="px-1.5 text-[11px] font-bold text-slate-700">Chọn nhanh khung giờ trong ngày (GMT+7)</legend>
                <label className="text-[11px] font-semibold text-slate-600">
                  Ngày sale
                  <input
                    type="date"
                    value={formStartLocal.slice(0, 10)}
                    onChange={e => {
                      if (e.target.value) {
                        setFormStartLocal(`${e.target.value}T${formStartLocal.slice(11) || '10:00'}`);
                        setFormEndLocal(`${e.target.value}T${formEndLocal.slice(11) || '12:00'}`);
                        setDurationHours('');
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600">
                  Bắt đầu
                  <input
                    type="time"
                    value={formStartLocal.slice(11)}
                    onChange={e => {
                      setFormStartLocal(`${formStartLocal.slice(0, 10)}T${e.target.value}`);
                      setDurationHours('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600">
                  Kết thúc
                  <input
                    type="time"
                    value={formEndLocal.slice(11)}
                    onChange={e => {
                      setFormEndLocal(`${formStartLocal.slice(0, 10)}T${e.target.value}`);
                      setDurationHours('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600">
                  Số giờ chạy
                  <input
                    type="number"
                    min="0.25"
                    max="8760"
                    step="0.25"
                    value={durationHours}
                    placeholder="VD: 2, 6, 24"
                    onChange={e => {
                      const value = e.target.value;
                      setDurationHours(value);
                      const hours = Number(value);
                      if (formStartLocal && Number.isFinite(hours) && hours > 0 && hours <= 8760) {
                        setFormEndLocal(isoToDatetimeLocalGmt7(new Date(new Date(datetimeLocalGmt7ToIso(formStartLocal)).getTime() + hours * 3600000).toISOString()));
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-normal"
                  />
                </label>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thời điểm bắt đầu (GMT+7) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartLocal}
                    onChange={(e) => {
                      setFormStartLocal(e.target.value);
                      const hours = Number(durationHours);
                      if (e.target.value && durationHours && Number.isFinite(hours) && hours >= 0.25 && hours <= 8760) {
                        setFormEndLocal(isoToDatetimeLocalGmt7(new Date(new Date(datetimeLocalGmt7ToIso(e.target.value)).getTime() + hours * 3600000).toISOString()));
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thời điểm kết thúc (GMT+7) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndLocal}
                    onChange={(e) => { setDurationHours(''); setFormEndLocal(e.target.value); }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Sản phẩm khuyến mại ({formItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>

                <CampaignProductPicker
                  onAdd={items =>
                    setFormItems(prev => [
                      ...prev,
                      ...items.filter(item => !prev.some(p => p.productId === item.productId && (p.variantId || null) === item.variantId)),
                    ])
                  }
                />

                {formItems.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    Tìm chọn sản phẩm phía trên hoặc bấm &quot;Thêm dòng&quot;.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <div className="sm:col-span-4">
                          {it.displayName && <p className="mb-0.5 text-[11px] font-semibold text-slate-800 truncate">{it.displayName}</p>}
                          <input
                            type="text"
                            value={it.productId}
                            onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                            placeholder="Product ID"
                            aria-label="Product ID"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={it.variantId || ""}
                            onChange={(e) => handleItemChange(idx, "variantId", e.target.value)}
                            placeholder="Variant ID (trống = base)"
                            aria-label="Variant ID"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            value={it.salePrice}
                            onChange={(e) => handleItemChange(idx, "salePrice", e.target.value)}
                            placeholder="Giá sale (₫)"
                            aria-label="Giá sale"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            value={it.regularPrice || ""}
                            onChange={(e) => handleItemChange(idx, "regularPrice", e.target.value)}
                            placeholder="Giá gốc (₫)"
                            aria-label="Giá gốc"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Xóa mục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition cursor-pointer"
              >
                Hủy
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  {saving ? "Đang lưu..." : "Lưu & Tắt"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  {saving ? "Đang xử lý..." : "Lưu chiến dịch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
