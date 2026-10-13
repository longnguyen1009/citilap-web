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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load initial brand list and on filter/refresh change
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
    if (!formData.name.trim()) errors.name = 'Vui lòng nhập tên thương hiệu.';
    if (!formData.slug.trim()) errors.slug = 'Vui lòng nhập slug URL.';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      errors.slug = 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
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
          ? `Đã cập nhật thương hiệu "${formData.name}". Thay đổi có hiệu lực ngay trên website.`
          : `Đã tạo mới thương hiệu "${formData.name}" thành công.`,
      });

      setModalOpen(false);
      setRefreshTrigger(n => n + 1);
    } catch (err) {
      setStatusAlert({
        type: 'error',
        message: (err as Error).message || 'Có lỗi xảy ra khi lưu thương hiệu.',
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
        message: `Đã lưu trữ / gỡ bỏ thương hiệu "${deletingBrand.name}".`,
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
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Thương hiệu"
        description="Nguồn dữ liệu thương hiệu chuẩn của hệ thống. Tích hợp trực tiếp logo từ Thư viện Media Cloudflare R2, thông số SEO và liên kết đến các sản phẩm trong Catalog."
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => setRefreshTrigger(n => n + 1)}
              disabled={loading}
            >
              Làm mới
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Thêm thương hiệu mới
            </AdminButton>
          </div>
        }
      />

      {/* Status banner */}
      {statusAlert && (
        <InlineAlert
          variant={statusAlert.type}
          onClose={() => setStatusAlert(null)}
        >
          {statusAlert.message}
        </InlineAlert>
      )}

      {/* Search & Filter Toolbar */}
      <AdminCard>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên thương hiệu hoặc slug URL..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (Hiển thị web)</option>
              <option value="INACTIVE">Tạm ẩn</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Brands List Table */}
      <AdminCard
        title="Danh sách Hãng sản xuất"
        subtitle={`Tổng số: ${brands.length} thương hiệu.`}
      >
        {loading ? (
          <div className="py-12">
            <AdminLoadingState message="Đang tải danh sách thương hiệu..." />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-rose-500 text-sm">
            {error}
          </div>
        ) : brands.length === 0 ? (
          <AdminEmptyState
            title="Chưa có thương hiệu nào"
            description="Hãy bấm 'Thêm thương hiệu mới' để khởi tạo thương hiệu đầu tiên."
            action={
              <AdminButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Tạo thương hiệu
              </AdminButton>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-16">Logo</th>
                  <th className="py-3 px-4">Tên thương hiệu</th>
                  <th className="py-3 px-4">Đường dẫn Web</th>
                  <th className="py-3 px-4 text-center">Sản phẩm</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
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
                          <Tag className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{b.name}</div>
                      {b.description && (
                        <div className="text-slate-500 line-clamp-1 max-w-xs text-[11px] mt-0.5">
                          {b.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      <a
                        href={`/brand/${b.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-blue-600 transition"
                      >
                        <span>/brand/{b.slug}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {b.productCount} sản phẩm
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={b.status === 'ACTIVE' ? 'PUBLISHED' : 'DRAFT'}
                        customLabel={b.status === 'ACTIVE' ? 'Hiển thị' : 'Tạm ẩn'}
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          title="Chỉnh sửa thương hiệu"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingBrand(b);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Lưu trữ / Gỡ bỏ"
                        >
                          <Trash2 className="w-4 h-4" />
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
          title={editingId ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSaveBrand} className="space-y-4 max-w-xl mx-auto py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="Ví dụ: Lenovo, Dell, Asus..."
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {formErrors.name && (
                  <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn (Slug URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))}
                  placeholder="lenovo"
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {formErrors.slug && (
                  <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.slug}</span>
                )}
              </div>
            </div>

            {/* Logo from Media Library */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logo thương hiệu (Cloudflare R2 / URL)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {formData.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.logo} alt="Logo preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={formData.logo}
                    onChange={e => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://... hoặc chọn từ Thư viện Media"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoPickerOpen(true)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Chọn từ Thư viện Media</span>
                    </button>
                    {formData.logo && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                        className="text-xs px-2 py-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      >
                        Xóa logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng thái hiển thị
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                <option value="ACTIVE">Hoạt động (Hiển thị trên website và cho phép chọn trong Catalog)</option>
                <option value="INACTIVE">Tạm ẩn (Ẩn trang thương hiệu)</option>
              </select>
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả giới thiệu thương hiệu
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Giới thiệu về nguồn gốc xuất xứ, các dòng sản phẩm nổi bật của hãng..."
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* SEO */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Tối ưu hóa SEO trang thương hiệu</span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Tiêu đề SEO</label>
                <input
                  type="text"
                  value={formData.seoTitle}
                  onChange={e => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="Laptop Lenovo Chính Hãng - Giá Rẻ Nhất | CitiLap"
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Mô tả SEO</label>
                <input
                  type="text"
                  value={formData.seoDescription}
                  onChange={e => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="Mua ngay laptop Lenovo Legion, ThinkPad, Yoga chính hãng tại CitiLap..."
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Hủy
              </AdminButton>
              <AdminButton
                type="submit"
                variant="primary"
                loading={submitting}
              >
                {editingId ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
              </AdminButton>
            </div>
          </form>
        </MediaDialog>
      )}

      {/* LOGO PICKER DIALOG */}
      {logoPickerOpen && (
        <MediaDialog title="Chọn Logo từ Thư viện Media" onClose={() => setLogoPickerOpen(false)}>
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
        <MediaDialog title="Xác nhận lưu trữ thương hiệu" onClose={() => setDeleteModalOpen(false)}>
          <div className="p-4 space-y-4 max-w-md mx-auto">
            {deletingBrand.productCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Cảnh báo bảo vệ dữ liệu sản phẩm</span>
                </div>
                <p>
                  Thương hiệu <strong>{deletingBrand.name}</strong> hiện đang được liên kết với <strong>{deletingBrand.productCount}</strong> sản phẩm trong Catalog.
                </p>
                <p>
                  Hệ thống không cho phép xóa hẳn thương hiệu đang có sản phẩm tham chiếu. Nếu muốn ẩn khỏi website, hãy bấm nút <strong>Chỉnh sửa</strong> và chuyển trạng thái sang <strong>Tạm ẩn (INACTIVE)</strong>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Bạn có chắc chắn muốn lưu trữ / gỡ bỏ thương hiệu <strong>{deletingBrand.name}</strong> không?
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Đóng
              </AdminButton>
              {deletingBrand.productCount === 0 && (
                <AdminButton
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteBrand}
                  loading={deleting}
                >
                  Xác nhận gỡ bỏ
                </AdminButton>
              )}
            </div>
          </div>
        </MediaDialog>
      )}
    </div>
  );
}
