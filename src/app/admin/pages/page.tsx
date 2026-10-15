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
  WARRANTY: { label: 'Bảo hành (PDP)', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RETURNS: { label: 'Đổi trả', icon: RotateCcw, color: 'bg-blue-50 text-blue-800 border-blue-200' },
  SHIPPING: { label: 'Vận chuyển', icon: Truck, color: 'bg-amber-50 text-amber-800 border-amber-200' },
  ABOUT: { label: 'Giới thiệu', icon: Building, color: 'bg-purple-50 text-purple-800 border-purple-200' },
  STORES: { label: 'Hệ thống Showroom', icon: Store, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
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
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Quản lý Trang thông tin & Chính sách"
        description="Nội dung chính sách bảo hành, đổi trả, vận chuyển, giới thiệu và cửa hàng. Nội dung này được kết nối trực tiếp vào Storefront và PDP."
        actions={
          <Link href="/admin/pages/new">
            <AdminButton variant="primary" size="sm" icon={<Plus size={16} />}>
              Tạo trang mới
            </AdminButton>
          </Link>
        }
      />

      {/* Filter Bar */}
      <AdminCard>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề, slug..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </AdminCard>

      {/* Main Table */}
      {loading ? (
        <AdminLoadingState message="Đang tải danh sách trang..." />
      ) : error ? (
        <AdminErrorState message={error} onRetry={handleRefresh} />
      ) : data?.items?.length === 0 ? (
        <AdminCard>
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Chưa có trang thông tin nào</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tạo trang chính sách đầu tiên (ví dụ Chính sách bảo hành).
            </p>
            <Link href="/admin/pages/new">
              <AdminButton size="sm" variant="primary" icon={<Plus size={14} />}>
                Tạo trang mới
              </AdminButton>
            </Link>
          </div>
        </AdminCard>
      ) : (
        <AdminCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tiêu đề trang</th>
                  <th className="py-3 px-4">Loại trang hệ thống</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Phiên bản</th>
                  <th className="py-3 px-4">Cập nhật</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items?.map((item) => {
                  const typeInfo = pageTypeBadgeMap[item.pageType] || pageTypeBadgeMap.CUSTOM;
                  const Icon = typeInfo.icon;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          <Link href={`/admin/pages/${item.id}`} className="hover:text-blue-600">
                            {item.title}
                          </Link>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          /{item.slug}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${typeInfo.color}`}>
                          <Icon size={12} />
                          {typeInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge
                            status={item.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            customLabel={item.isPublished ? 'Đang công khai' : 'Bản nháp'}
                          />
                          {item.hasUnpublishedDraft && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                              Có nháp mới
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        rev #{item.revision}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.isPublished && (
                            <a
                              href={`/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              title="Xem trên website"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <Link
                            href={`/admin/pages/${item.id}`}
                            className="p-1 text-blue-600 hover:text-blue-800 rounded font-medium"
                            title="Biên tập"
                          >
                            <Edit size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Trang {data.page} / {data.totalPages} ({data.total} trang)
              </div>
              <div className="flex gap-2">
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
        </AdminCard>
      )}
    </div>
  );
}
