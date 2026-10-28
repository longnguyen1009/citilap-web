'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Compass,
  FileQuestion,
  HelpCircle,
  Copy,
  Check,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  InlineAlert,
} from '@/components/admin/ui';

interface RedirectRule {
  id?: string;
  source: string;
  target: string;
  enabled: boolean;
  note: string;
  revision: number;
}

const blankRule: RedirectRule = {
  source: '',
  target: '',
  enabled: true,
  note: '',
  revision: 0,
};

export default function AdminRedirectsPage() {
  const [rows, setRows] = useState<RedirectRule[]>([]);
  const [form, setForm] = useState<RedirectRule>(blankRule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/redirects', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tải danh sách chuyển hướng');
      }
      const list = Array.isArray(data.data) ? data.data : [];
      setRows(
        list.map((x: Record<string, unknown>) => ({
          id: String(x.id || ''),
          source: String(x.source || ''),
          target: String(x.target || ''),
          enabled: Boolean(x.enabled),
          note: String(x.note || ''),
          revision: Number(x.revision || 0),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu redirect');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleStartEdit(rule: RedirectRule) {
    setEditingId(rule.id || null);
    setForm({
      id: rule.id,
      source: rule.source,
      target: rule.target,
      enabled: rule.enabled,
      note: rule.note,
      revision: rule.revision,
    });
    setError('');
    setSuccess('');
    const el = document.getElementById('redirect-form-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(blankRule);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    // Basic frontend checks
    if (!form.source.startsWith('/') || !form.target.startsWith('/')) {
      setError('Đường dẫn nguồn và đích phải bắt đầu bằng ký tự "/" (ví dụ: /laptop-cu).');
      return;
    }

    if (form.source.trim() === form.target.trim()) {
      setError('Đường dẫn nguồn và đích không được giống nhau.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        source: form.source.trim(),
        target: form.target.trim(),
        enabled: form.enabled,
        note: form.note.trim(),
        expectedRevision: form.revision,
      };

      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Không thể lưu quy tắc chuyển hướng');
      }

      setSuccess(editingId ? 'Đã cập nhật quy tắc 301.' : 'Đã thêm quy tắc chuyển hướng 301 mới.');
      setEditingId(null);
      setForm(blankRule);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu redirect');
    } finally {
      setBusy(false);
    }
  }

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRules = useMemo(() => {
    return rows.filter((r) => {
      if (filterTab === 'ENABLED' && !r.enabled) return false;
      if (filterTab === 'DISABLED' && r.enabled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSource = r.source.toLowerCase().includes(q);
        const matchTarget = r.target.toLowerCase().includes(q);
        const matchNote = r.note.toLowerCase().includes(q);
        if (!matchSource && !matchTarget && !matchNote) return false;
      }

      return true;
    });
  }, [rows, filterTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      enabled: rows.filter((r) => r.enabled).length,
      disabled: rows.filter((r) => !r.enabled).length,
    };
  }, [rows]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="Chuyển hướng 301"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {counts.all} / 500 quy tắc
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void load()}
              loading={loading}
            >
              Làm mới
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditingId(null);
                setForm(blankRule);
                const el = document.getElementById('redirect-form-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Thêm 301
            </AdminButton>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <InlineAlert
          variant="error"
          title="Không thể thực hiện"
          onClose={() => setError('')}
        >
          {error}
        </InlineAlert>
      )}
      {success && (
        <InlineAlert
          variant="success"
          title="Thành công"
          onClose={() => setSuccess('')}
        >
          {success}
        </InlineAlert>
      )}

      {/* Layout Grid: 8 Cols Table + 4 Cols Sticky Form */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left: Table (8 cols) */}
        <div className="col-span-8">
          <AdminCard bodyClassName="p-0">
            {/* Status tabs + Search */}
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    filterTab === 'ALL'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Tất cả <span className="opacity-75">({counts.all})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('ENABLED')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    filterTab === 'ENABLED'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Đang bật <span className="opacity-75">({counts.enabled})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('DISABLED')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    filterTab === 'DISABLED'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Đã tắt <span className="opacity-75">({counts.disabled})</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nguồn, đích, ghi chú..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Table content */}
            {loading ? (
              <div className="py-12">
                <AdminLoadingState message="Đang tải danh sách redirect..." />
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="py-12">
                <AdminEmptyState
                  title="Chưa có quy tắc chuyển hướng"
                  description={
                    searchQuery
                      ? `Không tìm thấy quy tắc nào khớp với "${searchQuery}".`
                      : 'Thêm quy tắc 301 để tự động chuyển khách hàng từ link cũ sang link mới.'
                  }
                  action={
                    searchQuery ? (
                      <AdminButton variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                        Xóa tìm kiếm
                      </AdminButton>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Nguồn (Source)</th>
                      <th className="py-2.5 px-1 text-center w-6"></th>
                      <th className="py-2.5 px-3.5">Đích (Target)</th>
                      <th className="py-2.5 px-3.5">Ghi chú</th>
                      <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRules.map((r, idx) => {
                      const isSelected = editingId === r.id;
                      const copyKey = r.id || String(idx);

                      return (
                        <tr
                          key={r.id || idx}
                          className={`hover:bg-blue-50/40 transition group ${
                            isSelected ? 'bg-blue-50/70 font-medium' : ''
                          }`}
                        >
                          {/* Source */}
                          <td className="py-2 px-3.5 font-mono text-[11px] text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                {r.source}
                              </span>
                              <button
                                type="button"
                                title="Sao chép link nguồn"
                                onClick={() => handleCopy(r.source, `${copyKey}-src`)}
                                className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-slate-600"
                              >
                                {copiedId === `${copyKey}-src` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Arrow */}
                          <td className="py-2 px-1 text-center text-slate-400">
                            <ArrowRight className="w-3.5 h-3.5 inline text-slate-400" />
                          </td>

                          {/* Target */}
                          <td className="py-2 px-3.5 font-mono text-[11px] text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                {r.target}
                              </span>
                              <button
                                type="button"
                                title="Sao chép link đích"
                                onClick={() => handleCopy(r.target, `${copyKey}-tgt`)}
                                className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-slate-600"
                              >
                                {copiedId === `${copyKey}-tgt` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Note */}
                          <td className="py-2 px-3.5 text-slate-600 max-w-[180px] truncate">
                            {r.note ? (
                              <span>{r.note}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3.5 text-center">
                            {r.enabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Bật
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Tắt
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(r)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Sửa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Chuyển hướng 301 tự động lược bỏ access token & query nhạy cảm</span>
              <span>Hiển thị {filteredRules.length} / {rows.length}</span>
            </div>
          </AdminCard>
        </div>

        {/* Right: Form Card (4 cols) */}
        <div className="col-span-4 sticky top-16" id="redirect-form-card">
          <AdminCard
            title={editingId ? `Sửa quy tắc #v${form.revision}` : 'Thêm quy tắc 301'}
          >
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đường dẫn nguồn (Source) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="/san-pham-cu-2024"
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đường dẫn đích (Target) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  placeholder="/laptop-cu-gia-re"
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ví dụ: Đổi slug danh mục"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">Kích hoạt chuyển hướng 301 ngay</span>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <AdminButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={busy}
                  disabled={busy}
                  className="flex-1 justify-center"
                >
                  {busy ? 'Đang lưu...' : editingId ? 'Cập nhật 301' : 'Lưu quy tắc 301'}
                </AdminButton>

                {editingId && (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Hủy
                  </AdminButton>
                )}
              </div>
            </form>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
