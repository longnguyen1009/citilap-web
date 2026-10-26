'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutTemplate,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Home,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';
import {
  PageHeader,
  AdminButton,
} from '@/components/admin/ui';
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import type { LandingPageListItem } from '@/contracts/cms/site-builder';

interface LandingPageListResponse {
  items: LandingPageListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminBuilderListPage() {
  const router = useRouter();
  const [data, setData] = useState<LandingPageListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createModalRef = useRef<HTMLDivElement>(null);
  const createTriggerRef = useRef<HTMLElement | null>(null);

  const openCreateModal = () => {
    createTriggerRef.current = document.activeElement as HTMLElement;
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    createTriggerRef.current?.focus();
  };

  // Focus trap and Escape key listener for Create Modal
  useEffect(() => {
    if (!showCreateModal) return;

    // Auto-focus first required input
    const input = createModalRef.current?.querySelector<HTMLInputElement>('input[required]');
    input?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCreateModal();
        return;
      }
      if (e.key === 'Tab' && createModalRef.current) {
        const focusables = createModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const [reloadKey, setReloadKey] = useState(0);

  // Asynchronous data fetching without synchronous setState in effect body
  useEffect(() => {
    let ignore = false;
    const fetchPages = async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        params.set('page', String(page));
        params.set('limit', '20');

        const res = await mediaRequest<LandingPageListResponse>(`/api/admin/builder?${params.toString()}`);
        if (!ignore) {
          setData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách trang.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchPages();
    return () => {
      ignore = true;
    };
  }, [query, page, reloadKey]);

  // Separate homepage from landing pages
  const homepage = data?.items.find((p) => p.id === 'home');
  const landingPages = data?.items.filter((p) => p.id !== 'home') || [];

  const handleCreateLandingPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createSlug.trim()) {
      setCreateError('Vui lòng nhập đầy đủ tiêu đề và slug đường dẫn.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await mediaRequest<{ id: string }>(`/api/admin/builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalName: createName.trim() || createTitle.trim(),
          title: createTitle.trim(),
          slug: createSlug.trim().toLowerCase(),
        }),
      });

      closeCreateModal();
      router.push(`/admin/builder/${res.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo trang đích.');
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xoá trang "${name}"?`)) return;
    try {
      await mediaRequest(`/api/admin/builder/${id}`, { method: 'DELETE' });
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xoá trang.');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <PageHeader
        title="Trình dựng trang & Giao diện (Site Builder)"
        description="Quản lý bố cục trang chủ và các trang đích (Landing Pages). Thay đổi nội dung banner, danh mục, khối sản phẩm theo thời gian thực mà không cần sửa mã nguồn."
        actions={
          <AdminButton
            id="btn-create-landing"
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {
              setCreateName('');
              setCreateTitle('');
              setCreateSlug('');
              setCreateError(null);
              openCreateModal();
            }}
          >
            Tạo Landing Page mới
          </AdminButton>
        }
      />

      {/* 1. HOMEPAGE PINNED CARD */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Trang chủ cửa hàng (Homepage)
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  homepage?.status === 'PUBLISHED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {homepage?.status === 'PUBLISHED' ? 'Đang xuất bản' : 'Bản nháp'}
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-white">
              {homepage?.title || 'CitiLap - Cửa hàng Laptop & Phụ kiện cao cấp'}
            </h2>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Trang đại diện chính tại đường dẫn &quot;/&quot;. Chứa banner chính, các dải tính năng, lưới sản phẩm nổi bật và khối giới thiệu thương hiệu.
            </p>

            <div className="flex items-center gap-4 text-xs text-blue-300/70 pt-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {homepage?.sectionCount || 0} Sections
              </span>
              <span>•</span>
              <span>Bản r{homepage?.revision || 1}</span>
              {homepage?.publishedRevision && (
                <>
                  <span>•</span>
                  <span>Public r{homepage.publishedRevision}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 transition backdrop-blur-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Xem trang chủ</span>
            </Link>

            <Link
              href="/admin/builder/home"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-blue-50 shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
            >
              <Edit className="w-4 h-4 text-blue-600" />
              <span>Biên tập trang chủ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. LANDING PAGES SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Danh sách Landing Pages</h3>
            <span className="text-xs text-slate-400 font-medium">({landingPages.length})</span>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm landing page..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Đang tải danh sách trang...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 text-center">
            {error}
          </div>
        ) : landingPages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Chưa có landing page nào</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tạo landing page cho các chiến dịch quảng cáo, sự kiện khuyến mãi hoặc giới thiệu bộ sưu tập chuyên sâu.
            </p>
            <button
              onClick={() => {
                setCreateName('');
                setCreateTitle('');
                setCreateSlug('');
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo landing page đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {landingPages.map((lp) => (
              <div
                key={lp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        lp.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : lp.status === 'ARCHIVED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {lp.status === 'PUBLISHED' ? 'Đã xuất bản' : lp.status === 'ARCHIVED' ? 'Đã ẩn' : 'Bản nháp'}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {new Date(lp.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{lp.title}</h4>
                  <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block max-w-full truncate">
                    /landing/{lp.slug}
                  </div>
                  {lp.internalName !== lp.title && (
                    <p className="text-[11px] text-slate-500 truncate">Tên nội bộ: {lp.internalName}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{lp.sectionCount} Sections</span>

                  <div className="flex items-center gap-1">
                    {lp.status === 'PUBLISHED' && (
                      <Link
                        href={`/landing/${lp.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50"
                        title="Xem trang thực tế"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    <Link
                      href={`/admin/builder/${lp.id}`}
                      className="p-1.5 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-50 font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Sửa</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(lp.id, lp.title)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50"
                      title="Xoá trang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-landing-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCreateModal();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            ref={createModalRef}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 id="create-landing-modal-title" className="text-sm font-bold text-slate-900">
                Tạo Landing Page mới
              </h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLandingPage} className="p-5 space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
                  {createError}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề trang *</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => {
                    setCreateTitle(e.target.value);
                    if (!createSlug) {
                      setCreateSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                      );
                    }
                  }}
                  placeholder="Ví dụ: Lễ hội công nghệ Back to School"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên nội bộ (Admin)</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Để phân biệt trong quản trị (tùy chọn)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Đường dẫn tĩnh (Slug) *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500 font-mono">
                    /landing/
                  </span>
                  <input
                    type="text"
                    required
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="back-to-school-2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-r-lg text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chỉ gồm chữ thường không dấu, số và dấu gạch ngang (-).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Đang tạo...' : 'Tạo và mở biên tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
