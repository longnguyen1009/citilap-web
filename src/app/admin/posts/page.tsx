'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  FileText,
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
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Quản lý Bài viết & Tin tức"
        description="Đăng bài đánh giá laptop, mẹo công nghệ, tin khuyến mãi và tin tức CitiLap."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/post-categories">
              <AdminButton variant="secondary" size="sm">
                Quản lý chuyên mục
              </AdminButton>
            </Link>
            <Link href="/admin/posts/new">
              <AdminButton variant="primary" size="sm" icon={<Plus size={16} />}>
                Viết bài mới
              </AdminButton>
            </Link>
          </div>
        }
      />

      {/* Filter Bar */}
      <AdminCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tiêu đề, slug, ID bài viết..."
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Tất cả chuyên mục --</option>
              {data?.categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as 'ALL' | 'PUBLISHED' | 'DRAFT');
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đang hiển thị (Published)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Main Table */}
      {loading ? (
        <AdminLoadingState message="Đang tải danh sách bài viết..." />
      ) : error ? (
        <AdminErrorState message={error} onRetry={handleRefresh} />
      ) : data?.items?.length === 0 ? (
        <AdminCard>
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Không có bài viết nào</h3>
            <p className="text-xs text-slate-500 mb-4">
              Chưa có bài viết nào phù hợp với bộ lọc hiện tại.
            </p>
            <Link href="/admin/posts/new">
              <AdminButton size="sm" variant="primary" icon={<Plus size={14} />}>
                Viết bài đầu tiên
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
                  <th className="py-3 px-4">Tiêu đề bài viết</th>
                  <th className="py-3 px-4">Chuyên mục</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Phiên bản</th>
                  <th className="py-3 px-4">Cập nhật</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
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
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        /news/{item.slug}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {item.category ? (
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán</span>
                      )}
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
                            href={`/news/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Xem trên website"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Link
                          href={`/admin/posts/${item.id}`}
                          className="p-1 text-blue-600 hover:text-blue-800 rounded font-medium"
                          title="Biên tập"
                        >
                          <Edit size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Trang {data.page} / {data.totalPages} ({data.total} bài viết)
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
