'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  FileText,
  RefreshCw,
  FolderTree,
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
import type { PostListItem } from '@/server/services/post.service';

interface PostListResponse {
  items: PostListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: { id: string; name: string }[];
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PUBLISHED', label: 'Đang hiển thị' },
  { key: 'DRAFT', label: 'Bản nháp' },
] as const;

export default function AdminPostsPage() {
  const [data, setData] = useState<PostListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchPosts() {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (categoryId) params.set('categoryId', categoryId);
        if (status !== 'ALL') params.set('status', status);
        params.set('page', String(page));
        params.set('limit', '20');

        const res = await mediaRequest<PostListResponse>(`/api/admin/posts?${params.toString()}`);
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách bài viết.');
          setLoading(false);
        }
      }
    }
    void fetchPosts();
    return () => { ignore = true; };
  }, [query, categoryId, status, page, refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Bài viết"
        description="Soạn bài, chọn chuyên mục rồi xuất bản. Khối Tin tức trên Trang chủ lấy bài đã xuất bản theo cấu hình trong Bố cục trang."
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
            <Link href="/admin/post-categories">
              <AdminButton variant="secondary" size="sm" icon={<FolderTree size={14} />}>
                Chuyên mục
              </AdminButton>
            </Link>
            <Link href="/admin/posts/new">
              <AdminButton variant="primary" size="sm" icon={<Plus size={15} />}>
                Viết bài
              </AdminButton>
            </Link>
          </div>
        }
      />

      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Status Tabs + Search + Category */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1" role="tablist" aria-label="Trạng thái bài viết">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStatus(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
            <div className="relative flex-1 max-w-xs">
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

            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc chuyên mục"
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả chuyên mục</option>
              {data?.categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-8">
            <AdminLoadingState message="Đang tải bài viết..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <AdminErrorState message={error} onRetry={handleRefresh} />
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Không có bài viết nào</h3>
            <Link href="/admin/posts/new">
              <AdminButton size="sm" variant="primary" icon={<Plus size={14} />}>
                Viết bài mới
              </AdminButton>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/90 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Bài viết</th>
                    <th className="py-2.5 px-4">Chuyên mục</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4">Cập nhật</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                          <Link href={`/admin/posts/${item.id}`} className="hover:text-blue-600">
                            {item.title}
                          </Link>
                          {item.isFeatured && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                              Nổi bật
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          /news/{item.slug} <span className="text-slate-300">·</span> #v{item.revision}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {item.category ? (
                          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.category.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
                              href={`/news/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              title="Xem trên web"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <Link
                            href={`/admin/posts/${item.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                            title="Sửa bài viết"
                          >
                            <Edit size={13} />
                            <span>Sửa</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <div className="tabular-nums">
                  Trang {data.page}/{data.totalPages} ({data.total} bài)
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
