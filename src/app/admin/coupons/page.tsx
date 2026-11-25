'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Package,
  Sparkles,
  Copy,
  Check,
  Filter,
  X,
} from 'lucide-react';
import type { CouponRecord } from '@/contracts/coupon';

interface PickerProduct {
  id: string;
  name: string;
  brand: string | null;
  condition: string;
  price: number;
  categoryName?: string | null;
  categoryId?: string | null;
  thumbnail?: string | null;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  quantityLimit: string;
  remainingCount: string;
  startAt: string;
  endAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  applyScope: 'ALL' | 'CONDITION_LIKE_NEW' | 'PRODUCTS';
  productIds: string[];
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultForm(): FormState {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    code: '',
    name: '',
    description: '',
    discountType: 'FIXED',
    discountValue: '399000',
    maxDiscountAmount: '',
    minOrderAmount: '0',
    quantityLimit: '50',
    remainingCount: '',
    startAt: toDatetimeLocal(start.toISOString()),
    endAt: toDatetimeLocal(end.toISOString()),
    status: 'ACTIVE',
    applyScope: 'CONDITION_LIKE_NEW',
    productIds: [],
  };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchCoupon, setSearchCoupon] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUsedCount, setEditingUsedCount] = useState(0);
  const [baselineUsedCount, setBaselineUsedCount] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Product picker state (search + brand + condition filters)
  const [pickerProducts, setPickerProducts] = useState<PickerProduct[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerBrand, setPickerBrand] = useState('ALL');
  const [pickerCondition, setPickerCondition] = useState<'ALL' | 'LIKE_NEW' | 'NEW'>('ALL');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể tải danh sách mã giảm giá.');
      setCoupons(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPickerProducts = useCallback(async (q: string, brand: string) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', publicationStatus: 'PUBLISHED' });
      if (q.trim()) params.set('q', q.trim());
      if (brand !== 'ALL') params.set('brand', brand);
      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      const rows = (data?.data?.items || data?.items || []) as Array<Record<string, unknown>>;
      setPickerProducts(
        rows.map((r) => ({
          id: String(r.id || ''),
          name: String(r.name || ''),
          brand: r.brand ? String(r.brand) : null,
          condition: String(r.condition || 'NEW'),
          price: Number(r.price || 0),
          categoryName: r.categoryName ? String(r.categoryName) : null,
          categoryId: r.categoryId ? String(r.categoryId) : null,
          thumbnail: r.thumbnail ? String(r.thumbnail) : null,
        }))
      );
    } catch {
      setPickerProducts([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    if (!modalOpen || form.applyScope !== 'PRODUCTS') return;
    const t = setTimeout(() => {
      fetchPickerProducts(pickerQuery, pickerBrand);
    }, 220);
    return () => clearTimeout(t);
  }, [modalOpen, form.applyScope, pickerQuery, pickerBrand, fetchPickerProducts]);

  const filteredPickerProducts = useMemo(() => {
    return pickerProducts.filter((p) => {
      if (pickerCondition !== 'ALL' && p.condition !== pickerCondition) return false;
      return true;
    });
  }, [pickerProducts, pickerCondition]);

  const filteredCoupons = useMemo(() => {
    const q = searchCoupon.trim().toLowerCase();
    return coupons.filter((c) => {
      if (q && !c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
      const exhausted = c.quantityLimit != null && c.usedCount >= c.quantityLimit;
      if (statusFilter === 'ACTIVE' && (c.status !== 'ACTIVE' || exhausted)) return false;
      if (statusFilter === 'INACTIVE' && c.status !== 'INACTIVE') return false;
      if (statusFilter === 'EXHAUSTED' && !exhausted) return false;
      return true;
    });
  }, [coupons, searchCoupon, statusFilter]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.status === 'ACTIVE' && (c.quantityLimit == null || c.usedCount < c.quantityLimit)).length;
    const totalUsed = coupons.reduce((s, c) => s + c.usedCount, 0);
    const totalRemaining = coupons.reduce((s, c) => s + (c.quantityLimit != null ? Math.max(0, c.quantityLimit - c.usedCount) : 0), 0);
    return { total, active, totalUsed, totalRemaining };
  }, [coupons]);

  const openCreate = () => {
    setEditingId(null);
    setEditingUsedCount(0);
    setBaselineUsedCount(0);
    setForm(defaultForm());
    setFormError('');
    setPickerQuery('');
    setPickerBrand('ALL');
    setPickerCondition('ALL');
    setModalOpen(true);
  };

  const openEdit = (c: CouponRecord) => {
    setEditingId(c.id);
    setEditingUsedCount(c.usedCount);
    setBaselineUsedCount(c.usedCount);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      maxDiscountAmount: c.maxDiscountAmount != null ? String(c.maxDiscountAmount) : '',
      minOrderAmount: String(c.minOrderAmount || 0),
      quantityLimit: c.quantityLimit != null ? String(c.quantityLimit) : '',
      remainingCount: c.quantityLimit != null ? String(Math.max(0, c.quantityLimit - c.usedCount)) : '',
      startAt: toDatetimeLocal(c.startAt),
      endAt: toDatetimeLocal(c.endAt),
      status: c.status,
      applyScope: c.applyScope,
      productIds: c.productIds || [],
    });
    setFormError('');
    setPickerQuery('');
    setPickerBrand('ALL');
    setPickerCondition('ALL');
    setModalOpen(true);
  };

  const handleQuantityLimitChange = (val: string) => {
    if (!editingId) {
      setForm((f) => ({ ...f, quantityLimit: val }));
      return;
    }
    if (!val.trim()) {
      setForm((f) => ({ ...f, quantityLimit: val, remainingCount: '' }));
      return;
    }
    const parsedLimit = Number(val);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      const nextRemaining = Math.max(0, Math.floor(parsedLimit) - baselineUsedCount);
      setForm((f) => ({ ...f, quantityLimit: val, remainingCount: String(nextRemaining) }));
    } else {
      setForm((f) => ({ ...f, quantityLimit: val }));
    }
  };

  const handleRemainingCountChange = (val: string) => {
    setForm((f) => ({ ...f, remainingCount: val }));
    if (editingId && form.quantityLimit.trim() && val.trim() !== '') {
      const parsedLimit = Number(form.quantityLimit);
      const parsedRemaining = Number(val);
      if (Number.isFinite(parsedLimit) && Number.isFinite(parsedRemaining) && parsedRemaining >= 0) {
        setBaselineUsedCount(Math.max(0, Math.floor(parsedLimit) - Math.floor(parsedRemaining)));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.discountType === 'PERCENT' && form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null,
        minOrderAmount: form.minOrderAmount.trim() ? Number(form.minOrderAmount) : 0,
        quantityLimit: form.quantityLimit.trim() ? Number(form.quantityLimit) : null,
        ...(editingId && form.quantityLimit.trim() && form.remainingCount.trim() !== ''
          ? { remainingCount: Number(form.remainingCount) }
          : {}),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: form.status,
        applyScope: form.applyScope,
        productIds: form.applyScope === 'PRODUCTS' ? form.productIds : [],
      };
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể lưu mã giảm giá.');
      setModalOpen(false);
      await fetchCoupons();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lỗi khi lưu mã giảm giá.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CouponRecord) => {
    if (!window.confirm(`Xóa mã giảm giá "${c.code}" (${c.name})?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể xóa.');
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa mã giảm giá.');
    }
  };

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((x) => x !== id)
        : [...prev.productIds, id],
    }));
  };

  const selectAllFiltered = () => {
    const ids = filteredPickerProducts.map((p) => p.id);
    setForm((prev) => ({ ...prev, productIds: [...new Set([...prev.productIds, ...ids])] }));
  };

  const clearSelectedProducts = () => {
    setForm((prev) => ({ ...prev, productIds: [] }));
  };

  const copyCode = (c: CouponRecord) => {
    navigator.clipboard?.writeText(c.code).catch(() => {});
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-red-600" />
            Quản lý Mã giảm giá &amp; Voucher
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo mã giảm giá theo số lượng, khung thời gian và phạm vi sản phẩm áp dụng (Online &amp; Showroom).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo mã giảm giá
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Tổng số mã</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Đang hoạt động</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Lượt đã sử dụng</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.totalUsed}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Suất còn lại</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.totalRemaining}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchCoupon}
            onChange={(e) => setSearchCoupon(e.target.value)}
            placeholder="Tìm theo mã (BF999...) hoặc tên chương trình..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'ACTIVE', 'INACTIVE', 'EXHAUSTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tất cả' : st === 'ACTIVE' ? 'Đang chạy' : st === 'INACTIVE' ? 'Tạm ngưng' : 'Hết mã'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">Mã / Chương trình</th>
                <th className="py-3 px-4">Mức giảm</th>
                <th className="py-3 px-4">Số lượng</th>
                <th className="py-3 px-4">Thời gian áp dụng</th>
                <th className="py-3 px-4">Phạm vi sản phẩm</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Đang tải danh sách mã giảm giá...
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Chưa có mã giảm giá nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const exhausted = c.quantityLimit != null && c.usedCount >= c.quantityLimit;
                  const pct = c.quantityLimit ? Math.min(100, Math.round((c.usedCount / c.quantityLimit) * 100)) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(c)}
                            title="Sao chép mã"
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="font-semibold text-slate-900 mt-1">{c.name}</div>
                        {c.description && <div className="text-xs text-slate-500 line-clamp-1">{c.description}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">
                          {c.discountType === 'PERCENT'
                            ? `${c.discountValue}%`
                            : `${c.discountValue.toLocaleString('vi-VN')}đ`}
                        </div>
                        {c.minOrderAmount > 0 && (
                          <div className="text-xs text-slate-500">
                            Đơn tối thiểu {c.minOrderAmount.toLocaleString('vi-VN')}đ
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                          <span>
                            {c.quantityLimit != null ? `${c.usedCount} / ${c.quantityLimit} lượt` : `${c.usedCount} / ∞`}
                          </span>
                          {c.quantityLimit != null && (
                            <span className={exhausted ? 'text-red-600' : 'text-amber-700'}>
                              Còn {Math.max(0, c.quantityLimit - c.usedCount)}
                            </span>
                          )}
                        </div>
                        {c.quantityLimit != null && (
                          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${exhausted ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateVi(c.startAt)}</span>
                        </div>
                        <div className="text-slate-400 pl-4">→ {formatDateVi(c.endAt)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {c.applyScope === 'ALL' && (
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            Toàn bộ sản phẩm
                          </span>
                        )}
                        {c.applyScope === 'CONDITION_LIKE_NEW' && (
                          <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            Tất cả LikeNew 99%
                          </span>
                        )}
                        {c.applyScope === 'PRODUCTS' && (
                          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            {c.productIds.length} sản phẩm chỉ định
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {exhausted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3.5 h-3.5" /> Đã hết mã
                          </span>
                        ) : c.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                            Tạm ngưng
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600" />
                {editingId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5 flex-1">
              {formError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã giảm giá *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}
                    placeholder="VD: BF999, SALE500K"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-bold uppercase focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên chương trình *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Black Friday Deal Giảm 999K"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Áp dụng trực tiếp vào giá bán cho khách hàng mua online và tại showroom"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại giảm giá</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'FIXED' | 'PERCENT' }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="FIXED">Số tiền cố định (VND)</option>
                    <option value="PERCENT">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mức giảm ({form.discountType === 'PERCENT' ? '%' : 'VND'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.discountType === 'PERCENT' ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số lượng mã (trống = ∞)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantityLimit}
                    onChange={(e) => handleQuantityLimitChange(e.target.value)}
                    placeholder="VD: 20"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đơn tối thiểu (VND)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {editingId && (() => {
                const limitNum = form.quantityLimit.trim() ? Number(form.quantityLimit) : null;
                const remNum = form.remainingCount.trim() !== '' ? Number(form.remainingCount) : null;
                const hasLimit = limitNum != null && Number.isFinite(limitNum) && limitNum > 0;
                const hasValidRem = remNum != null && Number.isFinite(remNum) && remNum >= 0;
                const willRaiseLimit = hasLimit && hasValidRem && remNum > limitNum;
                const previewLimit = willRaiseLimit ? remNum : limitNum;
                const previewUsed =
                  hasLimit && hasValidRem
                    ? willRaiseLimit
                      ? 0
                      : Math.max(0, limitNum - remNum)
                    : editingUsedCount;

                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                        Số lượng mã còn lại
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        disabled={!hasLimit}
                        value={hasLimit ? form.remainingCount : ''}
                        onChange={(e) => handleRemainingCountChange(e.target.value)}
                        placeholder={hasLimit ? 'VD: 10' : 'Không giới hạn (∞)'}
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-black text-amber-950 focus:border-red-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                    <div className="col-span-8 text-xs text-amber-950 space-y-1">
                      <div className="font-bold">
                        Điều chỉnh số mã thực tế còn lại (bao gồm cả khách dùng trực tiếp tại cửa hàng)
                      </div>
                      {hasLimit ? (
                        <div className="text-amber-900/90 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Đã ghi nhận trên web: <strong>{editingUsedCount} lượt</strong>
                          </span>
                          <span>
                            Sau khi lưu:{' '}
                            <strong>
                              {previewUsed} / {previewLimit} lượt đã dùng
                            </strong>
                            {hasValidRem && (
                              <>
                                {' '}
                                (còn <strong>{remNum}</strong> mã)
                              </>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-900/80">
                          Mã đang không giới hạn số lượng (∞). Nhập &ldquo;Số lượng mã&rdquo; phía trên nếu muốn giới hạn và điều chỉnh số mã còn lại.
                        </div>
                      )}
                      {willRaiseLimit && (
                        <div className="text-red-700 font-semibold">
                          Số mã còn lại ({remNum}) lớn hơn tổng số lượng ({limitNum}) → hệ thống sẽ tự động nâng tổng số lượng lên {remNum} (đã dùng: 0).
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thời gian bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thời gian kết thúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              {/* Scope & Product Filter Picker */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-red-600" />
                    Phạm vi sản phẩm áp dụng
                  </label>
                  {form.applyScope === 'PRODUCTS' && (
                    <span className="text-xs font-bold text-blue-700">
                      Đã chọn {form.productIds.length} sản phẩm
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { value: 'ALL', label: 'Toàn bộ sản phẩm' },
                    { value: 'CONDITION_LIKE_NEW', label: 'Tất cả Laptop LikeNew 99%' },
                    { value: 'PRODUCTS', label: 'Chọn sản phẩm cụ thể' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, applyScope: opt.value as FormState['applyScope'] }))}
                      className={`px-3 py-2.5 rounded-lg border text-xs font-bold text-left transition cursor-pointer ${
                        form.applyScope === opt.value
                          ? 'border-red-600 bg-red-50 text-red-800 ring-1 ring-red-500/20'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.applyScope === 'PRODUCTS' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {/* Product Search & Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={pickerQuery}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          placeholder="Tìm kiếm sản phẩm theo tên, mã CPU, GPU..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <select
                          value={pickerBrand}
                          onChange={(e) => setPickerBrand(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                        >
                          <option value="ALL">Tất cả hãng</option>
                          <option value="Lenovo">Lenovo</option>
                          <option value="Asus">Asus</option>
                          <option value="Acer">Acer</option>
                          <option value="Dell">Dell</option>
                          <option value="Honor">Honor</option>
                          <option value="Huawei">Huawei</option>
                          <option value="HP">HP</option>
                          <option value="MSI">MSI</option>
                          <option value="Apple">Apple</option>
                        </select>
                        <select
                          value={pickerCondition}
                          onChange={(e) => setPickerCondition(e.target.value as 'ALL' | 'LIKE_NEW' | 'NEW')}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                        >
                          <option value="ALL">Mọi tình trạng</option>
                          <option value="LIKE_NEW">LikeNew 99%</option>
                          <option value="NEW">New 100%</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        Chọn tất cả ({filteredPickerProducts.length})
                      </button>
                      {form.productIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSelectedProducts}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          Bỏ chọn hết
                        </button>
                      )}
                    </div>

                    {/* Product List */}
                    <div className="bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {pickerLoading ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> Đang tìm sản phẩm...
                        </div>
                      ) : filteredPickerProducts.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Không tìm thấy sản phẩm phù hợp với bộ lọc.
                        </div>
                      ) : (
                        filteredPickerProducts.map((p) => {
                          const checked = form.productIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 px-3 py-2 text-xs cursor-pointer transition ${
                                checked ? 'bg-red-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(p.id)}
                                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{p.brand || 'Khác'}</span>
                                  <span>•</span>
                                  <span className={p.condition === 'LIKE_NEW' ? 'text-amber-700 font-bold' : ''}>
                                    {p.condition === 'LIKE_NEW' ? 'LikeNew 99%' : p.condition}
                                  </span>
                                </div>
                              </div>
                              <div className="font-bold text-red-600 shrink-0">
                                {p.price.toLocaleString('vi-VN')}đ
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Lưu thay đổi' : 'Tạo mã giảm giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
