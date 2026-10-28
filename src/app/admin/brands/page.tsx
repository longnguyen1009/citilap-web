'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  InlineAlert,
  AdminLoadingState,
  AdminEmptyState,
} from '@/components/admin/ui';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import MediaUpload from '@/components/admin/media/MediaUpload';
import type { BrandDto } from '@/server/services/brand.service';

interface BrandFormData {
  name: string;
  slug: string;
  logo: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const emptyForm: BrandFormData = {
  name: '',
  slug: '',
  logo: '',
  description: '',
  seoTitle: '',
  seoDescription: '',
  status: 'ACTIVE',
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Edit/Create Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Logo picker modal state
  const [logoPickerOpen, setLogoPickerOpen] = useState<boolean>(false);
  const [mediaRefresh, setMediaRefresh] = useState<number>(0);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deletingBrand, setDeletingBrand] = useState<BrandDto | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Status feedback alert
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await mediaRequest<{ items: BrandDto[]; total: number }>(`/api/admin/brands?${params.toString()}`);
      setBrands(res.items || []);
    } catch (err) {
      setError((err as Error).message || 'Không thể tải danh sách thương hiệu.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands, refreshTrigger]);

  const handleSlugify = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (brand: BrandDto) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo || '',
      description: brand.description || '',
      seoTitle: brand.seoTitle || '',
      seoDescription: brand.seoDescription || '',
      status: brand.status,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nhập tên thương hiệu.';
    if (!formData.slug.trim()) errors.slug = 'Nhập slug URL.';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      errors.slug = 'Chỉ dùng chữ thường, số và gạch ngang.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setStatusAlert(null);
    try {
      const endpoint = editingId ? `/api/admin/brands/${editingId}` : '/api/admin/brands';
      const method = editingId ? 'PUT' : 'POST';

      await mediaRequest(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setStatusAlert({
        type: 'success',
        message: editingId
          ? `Đã cập nhật "${formData.name}".`
          : `Đã tạo "${formData.name}".`,
      });

      setModalOpen(false);
      setRefreshTrigger(n => n + 1);
    } catch (err) {
      setStatusAlert({
        type: 'error',
        message: (err as Error).message || 'Có lỗi xảy ra khi lưu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    setDeleting(true);
    setStatusAlert(null);
    try {
      await mediaRequest(`/api/admin/brands/${deletingBrand.id}`, {
        method: 'DELETE',
      });

      setStatusAlert({
        type: 'success',
        message: `Đã gỡ "${deletingBrand.name}".`,
      });
      setDeleteModalOpen(false);
      setDeletingBrand(null);
      setRefreshTrigger(n => n + 1);
    } catch (err) {
      setStatusAlert({
        type: 'error',
        message: (err as Error).message || 'Không thể xóa thương hiệu.',
      });
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 pb-12">
      {/* 1. Compact Header */}
      <PageHeader
        title="Thương hiệu"
        badge={
          <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-semibold tabular-nums">
            {brands.length}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRefreshTrigger(n => n + 1)}
              title="Làm mới"
              aria-label="Làm mới"
              className="inline-grid place-items-center size-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <AdminButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={openCreateModal}
            >
              Thêm thương hiệu
            </AdminButton>
          </div>
        }
      />

      {statusAlert && (
        <InlineAlert variant={statusAlert.type} onClose={() => setStatusAlert(null)}>
          {statusAlert.message}
        </InlineAlert>
      )}

      {/* 2. Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Status Tabs + Search */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'ACTIVE', label: 'Hiển thị' },
              { key: 'INACTIVE', label: 'Tạm ẩn' },
            ].map(t => {
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tên hãng, slug..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12">
            <AdminLoadingState message="Đang tải..." />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-500 text-xs">{error}</div>
        ) : brands.length === 0 ? (
          <div className="py-12">
            <AdminEmptyState
              title="Chưa có thương hiệu"
              action={
                <AdminButton variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openCreateModal}>
                  Thêm thương hiệu
                </AdminButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-14">Logo</th>
                  <th>Thương hiệu</th>
                  <th>Đường dẫn</th>
                  <th className="text-center">Sản phẩm</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td>
                      <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {b.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logo}
                            alt={b.name}
                            className="w-full h-full object-contain p-1"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="font-semibold text-slate-900 hover:text-blue-600 text-[13px] text-left cursor-pointer"
                      >
                        {b.name}
                      </button>
                      {b.description && (
                        <div className="text-slate-500 line-clamp-1 max-w-xs text-[11px]">{b.description}</div>
                      )}
                    </td>

                    <td className="font-mono text-slate-500">
                      <a
                        href={`/brand/${b.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-blue-600"
                      >
                        <span>/brand/{b.slug}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>

                    <td className="text-center tabular-nums">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {b.productCount}
                      </span>
                    </td>

                    <td className="text-center">
                      <StatusBadge
                        status={b.status === 'ACTIVE' ? 'PUBLISHED' : 'DRAFT'}
                        customLabel={b.status === 'ACTIVE' ? 'Hiển thị' : 'Tạm ẩn'}
                      />
                    </td>

                    <td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingBrand(b);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Gỡ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL CREATE / EDIT BRAND */}
      {modalOpen && (
        <MediaDialog
          title={editingId ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSaveBrand} className="space-y-3.5 max-w-xl mx-auto py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên thương hiệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name,
                      slug: !editingId ? handleSlugify(name) : prev.slug,
                    }));
                  }}
                  placeholder="Lenovo, Dell, Asus..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
                {formErrors.name && (
                  <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))}
                  placeholder="lenovo"
                  className="w-full text-xs font-mono border border-slate-300 rounded-md px-3 py-2"
                />
                {formErrors.slug && (
                  <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.slug}</span>
                )}
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {formData.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.logo}
                    onChange={e => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                    placeholder="URL logo hoặc chọn từ Media"
                    className="flex-1 text-xs border border-slate-300 rounded-md px-2.5 py-1.5 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoPickerOpen(true)}
                    className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Chọn ảnh
                  </button>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                      className="text-xs px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white cursor-pointer"
                >
                  <option value="ACTIVE">Hiển thị</option>
                  <option value="INACTIVE">Tạm ẩn</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Giới thiệu ngắn về hãng..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <summary className="font-semibold text-slate-700 cursor-pointer">Tùy chọn SEO</summary>
              <div className="space-y-2.5 pt-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Tiêu đề SEO</label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={e => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder={`Laptop ${formData.name || 'Chính Hãng'} | CitiLap`}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Mô tả SEO</label>
                  <input
                    type="text"
                    value={formData.seoDescription}
                    onChange={e => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="Mô tả hiển thị trên Google..."
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                  />
                </div>
              </div>
            </details>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Hủy
              </AdminButton>
              <AdminButton type="submit" variant="primary" size="sm" loading={submitting}>
                {editingId ? 'Lưu' : 'Tạo'}
              </AdminButton>
            </div>
          </form>
        </MediaDialog>
      )}

      {/* LOGO PICKER DIALOG */}
      {logoPickerOpen && (
        <MediaDialog title="Chọn Logo" onClose={() => setLogoPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload onUploaded={() => setMediaRefresh(n => n + 1)} />
            <MediaBrowser
              refresh={mediaRefresh}
              picker
              allowVideo={false}
              onSelect={asset => {
                setFormData(prev => ({ ...prev, logo: asset.url || '' }));
                setLogoPickerOpen(false);
              }}
            />
          </div>
        </MediaDialog>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && deletingBrand && (
        <MediaDialog title="Gỡ thương hiệu" onClose={() => setDeleteModalOpen(false)}>
          <div className="p-3 space-y-3 max-w-md mx-auto">
            {deletingBrand.productCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Đang có {deletingBrand.productCount} sản phẩm</span>
                </div>
                <p>
                  Không thể xóa thương hiệu đang có sản phẩm. Hãy sửa trạng thái sang <strong>Tạm ẩn</strong>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Xác nhận gỡ thương hiệu <strong>{deletingBrand.name}</strong>?
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Đóng
              </AdminButton>
              {deletingBrand.productCount === 0 && (
                <AdminButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBrand}
                  loading={deleting}
                >
                  Xác nhận gỡ
                </AdminButton>
              )}
            </div>
          </div>
        </MediaDialog>
      )}
    </div>
  );
}
