'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  FolderTree,
  Sparkles,
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

      setSuccess(editingId ? 'Đã cập nhật chuyên mục thành công.' : 'Đã thêm chuyên mục mới.');
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
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Chuyên mục Bài viết & Tin tức"
        description="Phân loại các bài viết đánh giá, tin tức và hướng dẫn. Chuyên mục bài viết hoàn toàn độc lập với danh mục sản phẩm."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/posts">
              <AdminButton variant="secondary" size="sm" icon={<ArrowLeft size={16} />}>
                Quay lại bài viết
              </AdminButton>
            </Link>
            <AdminButton variant="primary" size="sm" icon={<Plus size={16} />} onClick={handleOpenCreate}>
              Thêm chuyên mục
            </AdminButton>
          </div>
        }
      />

      {success && (
        <InlineAlert variant="success" title="Thành công" onClose={() => setSuccess(null)}>
          {success}
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" title="Lỗi" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {loading ? (
        <AdminLoadingState message="Đang tải danh sách chuyên mục..." />
      ) : error && categories.length === 0 ? (
        <AdminErrorState message={error} onRetry={fetchCategories} />
      ) : categories.length === 0 ? (
        <AdminCard>
          <div className="text-center py-12">
            <FolderTree size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Chưa có chuyên mục nào</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tạo chuyên mục đầu tiên để phân loại các bài viết tin tức và đánh giá.
            </p>
            <AdminButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleOpenCreate}>
              Tạo chuyên mục đầu tiên
            </AdminButton>
          </div>
        </AdminCard>
      ) : (
        <AdminCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên chuyên mục</th>
                  <th className="py-3 px-4">Đường dẫn (Slug)</th>
                  <th className="py-3 px-4">Thứ tự</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.name}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      /news/category/{c.slug}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {c.sortOrder}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={c.status}
                        customLabel={c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ẩn'}
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-blue-600 hover:text-blue-800 rounded font-medium"
                          title="Chỉnh sửa"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1 text-red-500 hover:text-red-700 rounded font-medium"
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
        </AdminCard>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">
                  {editingId ? 'Chỉnh sửa chuyên mục' : 'Thêm chuyên mục mới'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                {formError && (
                  <InlineAlert variant="error" title="Lỗi">{formError}</InlineAlert>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chuyên mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDoc.name}
                    onChange={(e) => setFormDoc(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: Đánh giá Laptop, Mẹo công nghệ..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Đường dẫn (Slug) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSlugify}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      value={formDoc.sortOrder}
                      onChange={(e) => setFormDoc(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formDoc.status}
                      onChange={(e) => setFormDoc(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Tạm ẩn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
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
