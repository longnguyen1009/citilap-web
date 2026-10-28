'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Database,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Tag,
  Layers,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  InlineAlert,
} from '@/components/admin/ui';

interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityId: string;
  summary: string;
  occurredAt: string;
  requestId: string | null;
  beforeRevision: number | null;
  afterRevision: number | null;
  entityType: string | null;
}

function entityLink(r: AuditEvent): string | null {
  const routes: Record<string, string> = {
    product: 'products',
    post: 'posts',
    page: 'pages',
    landing: 'builder',
    order: 'orders',
  };
  const type = r.entityType || r.action.split('.')[0];
  const route = routes[type];
  if (['brand', 'campaign', 'contact', 'account'].includes(type)) {
    const map: Record<string, string> = {
      brand: 'brands',
      campaign: 'campaigns',
      contact: 'contacts',
      account: 'users',
    };
    return `/admin/${map[type]}`;
  }
  return route ? `/admin/${route}/${encodeURIComponent(r.entityId)}` : null;
}

function formatAuditDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getActionColor(action: string): string {
  if (action.includes('delete') || action.includes('destroy') || action.includes('archive')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (action.includes('create') || action.includes('publish') || action.includes('add')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (action.includes('update') || action.includes('edit') || action.includes('save')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (action.includes('login') || action.includes('auth') || action.includes('session')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionQuery, setActionQuery] = useState('');
  const [filterStr, setFilterStr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [filterFields, setFilterFields] = useState({
    actor: '',
    entity: '',
    from: '',
    to: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/admin/audit?page=${page}&${filterStr}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Lỗi khi tải nhật ký');
        setError('');
        setRows(Array.isArray(j.data) ? j.data : []);
        setTotal(Number(j.total) || 0);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError('Không thể đọc nhật ký. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, filterStr]);

  useEffect(() => {
    const abort = load();
    return () => abort();
  }, [load]);

  function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    const p = new URLSearchParams();
    if (actionQuery.trim()) p.set('action', actionQuery.trim());
    if (filterFields.actor.trim()) p.set('actor', filterFields.actor.trim());
    if (filterFields.entity.trim()) p.set('entity', filterFields.entity.trim());
    if (filterFields.from.trim()) p.set('from', filterFields.from.trim());
    if (filterFields.to.trim()) p.set('to', filterFields.to.trim());
    setFilterStr(p.toString());
  }

  function handleResetFilters() {
    setActionQuery('');
    setFilterFields({ actor: '', entity: '', from: '', to: '' });
    setPage(1);
    setFilterStr('');
  }

  function handleQuickActionFilter(prefix: string) {
    setActionQuery(prefix);
    setPage(1);
    const p = new URLSearchParams();
    if (prefix) p.set('action', prefix);
    if (filterFields.actor.trim()) p.set('actor', filterFields.actor.trim());
    if (filterFields.entity.trim()) p.set('entity', filterFields.entity.trim());
    if (filterFields.from.trim()) p.set('from', filterFields.from.trim());
    if (filterFields.to.trim()) p.set('to', filterFields.to.trim());
    setFilterStr(p.toString());
  }

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const limit = 50;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="Nhật ký hệ thống"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {total.toLocaleString('vi-VN')} sự kiện
          </span>
        }
        actions={
          <AdminButton
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => load()}
            loading={loading}
          >
            Làm mới
          </AdminButton>
        }
      />

      {/* Alert */}
      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi tải nhật ký"
          onClose={() => setError('')}
        >
          {error}
        </InlineAlert>
      )}

      {/* Unified Single-Card Workspace */}
      <AdminCard bodyClassName="p-0">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 space-y-2.5">
          {/* Row 1: Quick preset tabs + Inline Filter Form */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { label: 'Tất cả', value: '' },
                { label: 'Sản phẩm', value: 'product' },
                { label: 'Bài viết', value: 'post' },
                { label: 'Đơn hàng', value: 'order' },
                { label: 'Thành viên', value: 'account' },
                { label: 'Redirect 301', value: 'redirect' },
              ].map((btn) => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => handleQuickActionFilter(btn.value)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                    actionQuery === btn.value
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleApplyFilters} className="flex items-center gap-1.5 flex-wrap">
              <input
                type="text"
                placeholder="Thao tác (vd: product.update)..."
                value={actionQuery}
                onChange={(e) => setActionQuery(e.target.value)}
                className="w-40 text-xs px-2.5 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Actor ID..."
                value={filterFields.actor}
                onChange={(e) => setFilterFields({ ...filterFields, actor: e.target.value })}
                className="w-28 text-xs px-2.5 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Entity ID..."
                value={filterFields.entity}
                onChange={(e) => setFilterFields({ ...filterFields, entity: e.target.value })}
                className="w-28 text-xs px-2.5 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                title="Từ ngày"
                value={filterFields.from}
                onChange={(e) => setFilterFields({ ...filterFields, from: e.target.value })}
                className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                title="Đến ngày"
                value={filterFields.to}
                onChange={(e) => setFilterFields({ ...filterFields, to: e.target.value })}
                className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
              />
              <AdminButton type="submit" variant="primary" size="sm">
                Lọc
              </AdminButton>
              {(actionQuery || filterFields.actor || filterFields.entity || filterFields.from || filterFields.to) && (
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                  title="Đặt lại bộ lọc"
                >
                  ×
                </AdminButton>
              )}
            </form>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div className="py-12">
            <AdminLoadingState message="Đang tải nhật ký kiểm toán..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <AdminEmptyState
              title="Không có sự kiện kiểm toán"
              description="Không tìm thấy bản ghi nào khớp với điều kiện lọc hiện tại."
              action={
                <AdminButton variant="secondary" size="sm" onClick={handleResetFilters}>
                  Xóa bộ lọc
                </AdminButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Thời gian (GMT+7)</th>
                  <th className="py-2.5 px-3.5">Actor</th>
                  <th className="py-2.5 px-3.5">Hành động</th>
                  <th className="py-2.5 px-3.5">Đối tượng</th>
                  <th className="py-2.5 px-3 text-center">Rev</th>
                  <th className="py-2.5 px-3.5">Tóm tắt</th>
                  <th className="py-2.5 px-3.5 text-right">Req ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const targetHref = entityLink(r);
                  const actionColor = getActionColor(r.action);

                  return (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition">
                      {/* Time */}
                      <td className="py-2 px-3.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                        {formatAuditDate(r.occurredAt)}
                      </td>

                      {/* Actor */}
                      <td className="py-2 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                          <User className="w-3 h-3 text-slate-400" />
                          {r.actorId || 'system'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${actionColor}`}
                        >
                          {r.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-2 px-3.5 font-mono text-[11px] max-w-[140px] truncate">
                        {targetHref ? (
                          <Link
                            href={targetHref}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            <span>{r.entityId}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-600">{r.entityId}</span>
                        )}
                      </td>

                      {/* Revision */}
                      <td className="py-2 px-3 text-center whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {r.beforeRevision != null || r.afterRevision != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-400">{r.beforeRevision ?? 0}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                            <span className="font-bold text-slate-700">{r.afterRevision ?? '—'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Summary */}
                      <td className="py-2 px-3.5 text-slate-700 max-w-xs break-words">
                        {r.summary || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Request ID */}
                      <td className="py-2 px-3.5 text-right whitespace-nowrap font-mono text-[10px] text-slate-400">
                        {r.requestId ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(r.requestId!, r.id)}
                            title={`Sao chép Request ID: ${r.requestId}`}
                            className="inline-flex items-center gap-1 hover:text-slate-700 transition"
                          >
                            <span>{r.requestId.substring(0, 8)}…</span>
                            {copiedId === r.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Hiển thị <span className="font-bold text-slate-900">{rows.length}</span> /{' '}
            <span className="font-bold text-slate-900">{total}</span> sự kiện
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <span className="font-semibold text-slate-700 px-2">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
