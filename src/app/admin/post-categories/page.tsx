'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  FolderTree,
  Sparkles,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  InlineAlert,
  AdminLoadingState,
  AdminErrorState,
} from '@/components/admin/ui';
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import type { PostCategoryDocument } from '@/contracts/cms/post';

interface CategoryItem extends PostCategoryDocument {
  id: string;
  revision: number;
}

export default function PostCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRev, setEditingRev] = useState(0);
  const [formDoc, setFormDoc] = useState<PostCategoryDocument>({
    name: '',
    slug: '',
    sortOrder: 0,
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setError(null);
      try {
        const data = await mediaRequest<CategoryItem[]>('/api/admin/post-categories?status=ALL');
        if (!ignore) {
          setCategories(data || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách chuyên mục.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => { ignore = true; };
  }, [refreshTrigger]);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [categories, statusFilter, searchQuery]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEditingRev(0);
    setFormDoc({ name: '', slug: '', sortOrder: categories.length * 10, status: 'ACTIVE' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: CategoryItem) => {
    setEditingId(item.id);
    setEditingRev(item.revision);
    setFormDoc({
      name: item.name,
      slug: item.slug,
      sortOrder: item.sortOrder,
      status: item.status,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSlugify = () => {
    if (!formDoc.name) return;
    const generated = formDoc.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    setFormDoc(prev => ({ ...prev, slug: generated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setSuccess(null);

    try {
      const url = editingId ? `/api/admin/post-categories/${editingId}` : '/api/admin/post-categories';
      const method = editingId ? 'PUT' : 'POST';

      await mediaRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: editingRev,
          document: formDoc,
        }),
      });

      setSuccess(editingId ? 'Đã cập nhật chuyên mục.' : 'Đã thêm chuyên mục mới.');
      setFormOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa chuyên mục "${item.name}"?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    try {
      await mediaRequest(`/api/admin/post-categories/${item.id}`, {
        method: 'DELETE',
      });
      setSuccess(`Đã xóa chuyên mục "${item.name}".`);
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa chuyên mục.');
    }
  };

  return (
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Chuyên mục bài viết"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            {categories.length}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/posts">
              <AdminButton variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
                Bài viết
              </AdminButton>
            </Link>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={fetchCategories}
              aria-label="Làm mới"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            />
            <AdminButton variant="primary" size="sm" icon={<Plus size={15} />} onClick={handleOpenCreate}>
              Thêm chuyên mục
            </AdminButton>
          </div>
        }
      />

      {success && (
        <InlineAlert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Tabs + Search */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1" role="tablist" aria-label="Trạng thái chuyên mục">
            {([
              { key: 'ALL', label: 'Tất cả' },
              { key: 'ACTIVE', label: 'Hoạt động' },
              { key: 'INACTIVE', label: 'Tạm ẩn' },
            ] as const).map((t) => {
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, slug..."
              className="w-full text-xs pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8">
            <AdminLoadingState message="Đang tải chuyên mục..." />
          </div>
        ) : error && categories.length === 0 ? (
          <div className="p-6">
            <AdminErrorState message={error} onRetry={fetchCategories} />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree size={32} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Chưa có chuyên mục phù hợp</h3>
            <AdminButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleOpenCreate}>
              Thêm chuyên mục
            </AdminButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Tên chuyên mục</th>
                  <th className="py-2.5 px-4">Đường dẫn (Slug)</th>
                  <th className="py-2.5 px-4 text-center">Thứ tự</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {c.name}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      /news/category/{c.slug}
                    </td>

                    <td className="py-2.5 px-4 text-center text-slate-500 tabular-nums">
                      {c.sortOrder}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge
                        status={c.status}
                        customLabel={c.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ẩn'}
                      />
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit size={13} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs">
                  {editingId ? 'Sửa chuyên mục' : 'Thêm chuyên mục mới'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                {formError && (
                  <InlineAlert variant="error">{formError}</InlineAlert>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tên chuyên mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDoc.name}
                    onChange={(e) => setFormDoc(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Đánh giá Laptop, Mẹo công nghệ..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Đường dẫn (Slug) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSlugify}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} /> Tự tạo
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formDoc.slug}
                    onChange={(e) => setFormDoc(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="danh-gia-laptop"
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      value={formDoc.sortOrder}
                      onChange={(e) => setFormDoc(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formDoc.status}
                      onChange={(e) => setFormDoc(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Tạm ẩn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <AdminButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setFormOpen(false)}
                >
                  Hủy
                </AdminButton>
                <AdminButton
                  type="submit"
                  size="sm"
                  variant="primary"
                  loading={submitting}
                >
                  {editingId ? 'Cập nhật' : 'Tạo mới'}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
