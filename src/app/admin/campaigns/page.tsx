"use client";

import { useState, useEffect, useCallback } from "react";
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

// Format UTC ISO to GMT+7 display string
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
    }).format(d) + " (GMT+7)";
  } catch {
    return isoString;
  }
}

// Convert UTC ISO to datetime-local value (YYYY-MM-DDTHH:mm) in GMT+7
function isoToDatetimeLocalGmt7(isoString: string): string {
  try {
    const d = new Date(isoString);
    // Add 7 hours offset for GMT+7 display in datetime-local
    const gmt7Date = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return gmt7Date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

// Convert datetime-local value (YYYY-MM-DDTHH:mm) entered in GMT+7 to UTC ISO string
function datetimeLocalGmt7ToIso(localStr: string): string {
  try {
    const [datePart, timePart] = localStr.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    // Create Date as UTC subtracting 7 hours
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0));
    return utcDate.toISOString();
  } catch {
    return "";
  }
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

    // Fetch full campaign with items
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-gray-900">Chiến dịch Khuyến mại & Giá</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            HOT SALE tập hợp nhiều chiến dịch: FLASH SALE, SALE 10/10, Sale mừng nhập học… Đặt lịch GMT+7 và chọn sản phẩm cho từng chiến dịch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openNewEditor}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Tạo chiến dịch mới
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between">
          <span>Danh sách chiến dịch ({campaigns.length})</span>
          <span className="text-gray-400 font-normal">Tất cả mốc giờ hiển thị ở múi giờ Asia/Ho_Chi_Minh (GMT+7)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Đang tải dữ liệu chiến dịch...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">Chưa có chiến dịch khuyến mại nào</p>
            <p className="text-xs text-gray-400 mt-1">Bấm &quot;Tạo chiến dịch mới&quot; để thiết lập chương trình ưu đãi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Tên chiến dịch</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian hiệu lực (GMT+7)</th>
                  <th className="py-3 px-4">Hiển thị homepage</th>
                  <th className="py-3 px-4 text-center">Sản phẩm</th>
                  <th className="py-3 px-4 text-center">Revision</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const startMs = new Date(c.startAt).getTime();
                  const endMs = new Date(c.endAt).getTime();
                  const isCurrentlyActive = c.status === "PUBLISHED" && nowMs >= startMs && nowMs < endMs;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        {c.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{c.description}</div>
                        )}
                        <div className="text-xs text-gray-300 font-mono mt-0.5">{c.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        {c.status === "PUBLISHED" ? (
                          isCurrentlyActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Đang diễn ra
                            </span>
                          ) : nowMs < startMs ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Clock className="w-3 h-3" />
                              Sắp diễn ra
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              Đã kết thúc
                            </span>
                          )
                        ) : c.status === "DRAFT" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Đã tắt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Đã lưu trữ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <div>{formatGmt7(c.startAt)}</div>
                        <div className="text-gray-400 mt-0.5">đến {formatGmt7(c.endAt)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button type="button" role="switch" aria-label={`Hiển thị ${c.name} trên homepage`} aria-checked={c.status === 'PUBLISHED' && nowMs < endMs}
                          disabled={togglingId !== null || nowMs >= endMs || c.status === 'ARCHIVED'}
                          onClick={() => handleToggle(c, c.status !== 'PUBLISHED')}
                          title={nowMs >= endMs ? 'Đã kết thúc. Sửa thời gian để bật lại.' : 'Bật để hiển thị, tắt để ẩn và dừng giá ưu đãi.'}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
                          <span aria-hidden="true" className={`flex h-6 w-11 rounded-full p-0.5 ${c.status === 'PUBLISHED' && nowMs < endMs ? 'justify-end bg-blue-600' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></span>
                          {c.status === 'PUBLISHED' && nowMs < endMs ? 'Bật' : 'Tắt'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-xs">
                          <Layers className="w-3 h-3 text-gray-400" />
                          {c.itemCount} mục
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-gray-400">
                        rev #{c.revision}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button type="button" onClick={() => addTimeSlot(c)} aria-label={`Thêm khung giờ ${c.name}`} title="Thêm khung giờ, giữ tên và danh sách sản phẩm" className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4" /></button>
                        <button
                          onClick={() => openEditEditor(c)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Sửa chiến dịch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {c.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchive(c)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition"
                            title="Lưu trữ chiến dịch"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="campaign-editor" role="dialog" aria-modal="true" aria-labelledby="campaign-editor-title" tabIndex={-1} className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 id="campaign-editor-title" className="font-bold text-gray-900 text-base">
                  {editingCampaign ? `Sửa chiến dịch: ${editingCampaign.name}` : "Tạo chiến dịch khuyến mại mới"}
                </h2>
                {editingCampaign && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">
                    rev #{formRevision}
                  </span>
                )}
              </div>
              <button
                aria-label="Đóng trình sửa chiến dịch"
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
                <input type="checkbox" checked={formEnabled} onChange={e => setFormEnabled(e.target.checked)} className="h-5 w-5" />
                <span>Bật chiến dịch trên homepage<span className="mt-1 block text-xs font-normal">Chiến dịch sắp chạy vẫn hiển thị khi bật. Hết thời hạn tự tắt; giá sale chỉ áp dụng trong lịch chạy.</span></span>
              </label>
              <p className="text-xs text-slate-600">Các lịch cùng tên được gom thành một chương trình trên homepage. Mỗi lịch có ngày, khung giờ và sản phẩm riêng; giá không chồng lấn cho cùng cấu hình.</p>
              <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
                <legend className="px-1 text-xs font-bold text-slate-700">Lịch sale theo ngày (GMT+7)</legend>
                <label className="text-xs font-semibold">Ngày sale<input type="date" value={formStartLocal.slice(0, 10)} onChange={e => { if (e.target.value) { setFormStartLocal(`${e.target.value}T${formStartLocal.slice(11) || '10:00'}`); setFormEndLocal(`${e.target.value}T${formEndLocal.slice(11) || '12:00'}`); setDurationHours(''); } }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" /></label>
                <label className="text-xs font-semibold">Bắt đầu<input type="time" value={formStartLocal.slice(11)} onChange={e => { setFormStartLocal(`${formStartLocal.slice(0, 10)}T${e.target.value}`); setDurationHours(''); }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" /></label>
                <label className="text-xs font-semibold">Kết thúc<input type="time" value={formEndLocal.slice(11)} onChange={e => { setFormEndLocal(`${formStartLocal.slice(0, 10)}T${e.target.value}`); setDurationHours(''); }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" /></label>
              </fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tên chiến dịch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Black Friday Siêu Giảm Giá"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mô tả chiến dịch
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="VD: Áp dụng từ 15/10 đến 31/10 cho các mẫu laptop gaming chọn lọc"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Thời điểm bắt đầu (GMT+7) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartLocal}
                    onChange={(e) => {
                      setFormStartLocal(e.target.value);
                      const hours = Number(durationHours);
                      if (e.target.value && durationHours && Number.isFinite(hours) && hours >= 0.25 && hours <= 8760) setFormEndLocal(isoToDatetimeLocalGmt7(new Date(new Date(datetimeLocalGmt7ToIso(e.target.value)).getTime() + hours * 3600000).toISOString()));
                    }}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Thời điểm kết thúc (GMT+7) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndLocal}
                    onChange={(e) => { setDurationHours(''); setFormEndLocal(e.target.value); }}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Giá ưu đãi ngừng áp dụng đúng thời điểm kết thúc.</p>
                </div>
                <label className="sm:col-span-2 block text-xs font-semibold text-gray-700">Hoặc chạy trong số giờ kể từ lúc bắt đầu
                  <input type="number" min="0.25" max="8760" step="0.25" value={durationHours} placeholder="Ví dụ: 2, 6, 24" onChange={e => {
                    const value = e.target.value; setDurationHours(value);
                    const hours = Number(value);
                    if (formStartLocal && Number.isFinite(hours) && hours > 0 && hours <= 8760) setFormEndLocal(isoToDatetimeLocalGmt7(new Date(new Date(datetimeLocalGmt7ToIso(formStartLocal)).getTime() + hours * 3600000).toISOString()));
                  }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal" />
                </label>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Mục khuyến mại áp dụng ({formItems.length})</h3>
                    <p className="text-xs text-gray-400">
                      Quy tắc an toàn: Mỗi cấu hình biến thể cần khai báo mục riêng để tránh áp nhầm giá base vào mọi option.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm mục
                  </button>
                </div>

                <CampaignProductPicker onAdd={items => setFormItems(prev => [...prev, ...items.filter(item => !prev.some(p => p.productId === item.productId && (p.variantId || null) === item.variantId))])} />
                {formItems.length === 0 ? (
                  <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                    Chưa có sản phẩm nào. Bấm &quot;Thêm mục&quot; để gán giá khuyến mại.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        <div className="sm:col-span-4">
                          {it.displayName && <p className="mb-1 text-xs font-semibold text-slate-800">{it.displayName}</p>}
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Product ID</label>
                          <input
                            type="text"
                            value={it.productId}
                            onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                            placeholder="Mã sản phẩm (cuid)"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Variant ID (tuỳ chọn)
                          </label>
                          <input
                            type="text"
                            value={it.variantId || ""}
                            onChange={(e) => handleItemChange(idx, "variantId", e.target.value)}
                            placeholder="Để trống nếu là base"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Giá sale (₫)</label>
                          <input
                            type="number"
                            value={it.salePrice}
                            onChange={(e) => handleItemChange(idx, "salePrice", e.target.value)}
                            placeholder="VD: 15000000"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Giá gốc (₫)</label>
                          <input
                            type="number"
                            value={it.regularPrice || ""}
                            onChange={(e) => handleItemChange(idx, "regularPrice", e.target.value)}
                            placeholder="VD: 18000000"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Xóa mục"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition"
              >
                Hủy
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition"
                >
                  {saving ? "Đang lưu..." : "Lưu & Tắt"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
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
