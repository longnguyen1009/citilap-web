'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  FileText,
  ShieldCheck,
  RotateCcw,
  Truck,
  Building,
  Store,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminLoadingState,
  AdminErrorState,
} from '@/components/admin/ui';
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import type { PageListItem } from '@/server/services/page.service';

interface PageListResponse {
  items: PageListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const pageTypeBadgeMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  WARRANTY: { label: 'Bảo hành', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RETURNS: { label: 'Đổi trả', icon: RotateCcw, color: 'bg-blue-50 text-blue-800 border-blue-200' },
  SHIPPING: { label: 'Vận chuyển', icon: Truck, color: 'bg-amber-50 text-amber-800 border-amber-200' },
  ABOUT: { label: 'Giới thiệu', icon: Building, color: 'bg-purple-50 text-purple-800 border-purple-200' },
  STORES: { label: 'Showroom', icon: Store, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  CUSTOM: { label: 'Tùy chỉnh', icon: FileText, color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function AdminPagesPage() {
  const [data, setData] = useState<PageListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchPages() {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        params.set('page', String(page));
        params.set('limit', '20');

        const res = await mediaRequest<PageListResponse>(`/api/admin/pages?${params.toString()}`);
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách trang.');
          setLoading(false);
        }
      }
    }
    void fetchPages();
    return () => { ignore = true; };
  }, [query, page, refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Trang & Chính sách"
        badge={
          data ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
              {data.total}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              aria-label="Làm mới"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            />
            <Link href="/admin/pages/new">
              <AdminButton variant="primary" size="sm" icon={<Plus size={15} />}>
                Tạo trang
              </AdminButton>
            </Link>
          </div>
        }
      />

      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Search */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm tiêu đề, slug..."
              className="w-full text-xs pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-8">
            <AdminLoadingState message="Đang tải danh sách trang..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <AdminErrorState message={error} onRetry={handleRefresh} />
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Chưa có trang nào</h3>
            <Link href="/admin/pages/new">
              <AdminButton size="sm" variant="primary" icon={<Plus size={14} />}>
                Tạo trang mới
              </AdminButton>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/90 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Tiêu đề trang</th>
                    <th className="py-2.5 px-4">Loại</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4">Cập nhật</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items?.map((item) => {
                    const typeInfo = pageTypeBadgeMap[item.pageType] || pageTypeBadgeMap.CUSTOM;
                    const Icon = typeInfo.icon;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            <Link href={`/admin/pages/${item.id}`} className="hover:text-blue-600">
                              {item.title}
                            </Link>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            /{item.slug} <span className="text-slate-300">·</span> #v{item.revision}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${typeInfo.color}`}>
                            <Icon size={11} />
                            {typeInfo.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge
                              status={item.isPublished ? 'PUBLISHED' : 'DRAFT'}
                              customLabel={item.isPublished ? 'Hiển thị' : 'Nháp'}
                            />
                            {item.hasUnpublishedDraft && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                                Có nháp mới
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                        </td>

                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.isPublished && (
                              <a
                                href={`/${item.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                title="Xem trên web"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <Link
                              href={`/admin/pages/${item.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                              title="Sửa trang"
                            >
                              <Edit size={13} />
                              <span>Sửa</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <div className="tabular-nums">
                  Trang {data.page}/{data.totalPages} ({data.total} trang)
                </div>
                <div className="flex gap-1.5">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    disabled={data.page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </AdminButton>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
}
