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
  AdminCard,
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

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Separate homepage from landing pages
  const homepage = data?.items.find((p) => p.id === 'home');
  const landingPages = data?.items.filter((p) => p.id !== 'home') || [];
  const filteredLandingPages = landingPages.filter((lp) => {
    if (statusFilter === 'PUBLISHED') return lp.status === 'PUBLISHED';
    if (statusFilter === 'DRAFT') return lp.status !== 'PUBLISHED';
    return true;
  });

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
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Bố cục trang (Site Builder)"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            1 Trang chủ · {landingPages.length} Landing Pages
          </span>
        }
        actions={
          <AdminButton
            id="btn-create-landing"
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => {
              setCreateName('');
              setCreateTitle('');
              setCreateSlug('');
              setCreateError(null);
              openCreateModal();
            }}
          >
            Tạo Landing Page
          </AdminButton>
        }
      />

      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* 1. HOMEPAGE PINNED STRIP */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Home className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {homepage?.title || 'Trang chủ cửa hàng (Homepage)'}
                </span>
                <span className="font-mono text-[11px] text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">
                  /
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    homepage?.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {homepage?.status === 'PUBLISHED' ? 'Đang hiển thị' : 'Bản nháp'}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {homepage?.sectionCount || 0} sections · #v{homepage?.revision || 1}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xem web</span>
            </Link>

            <Link
              href="/admin/builder/home"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Sửa bố cục Trang chủ</span>
            </Link>
          </div>
        </div>

        {/* 2. LANDING PAGES TOOLBAR */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Tất cả Landing Page <span className="opacity-75">({landingPages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Đang hiển thị <span className="opacity-75">({landingPages.filter((p) => p.status === 'PUBLISHED').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Bản nháp / Ẩn <span className="opacity-75">({landingPages.filter((p) => p.status !== 'PUBLISHED').length})</span>
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm tiêu đề hoặc slug..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* 3. LANDING PAGES TABLE */}
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            Đang tải danh sách trang...
          </div>
        ) : error ? (
          <div className="p-6 text-red-700 text-xs text-center">
            {error}
          </div>
        ) : filteredLandingPages.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <LayoutTemplate className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">Chưa có Landing Page nào</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Tạo trang đích riêng cho chiến dịch khuyến mãi hoặc bộ sưu tập chuyên đề.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Tiêu đề Landing Page</th>
                  <th className="py-2.5 px-3.5">Đường dẫn (URL)</th>
                  <th className="py-2.5 px-3.5 text-center">Khối (Sections)</th>
                  <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3.5">Cập nhật</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLandingPages.map((lp) => (
                  <tr key={lp.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/admin/builder/${lp.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition block"
                      >
                        {lp.title}
                      </Link>
                      {lp.internalName && lp.internalName !== lp.title && (
                        <span className="text-[11px] text-slate-400">Nội bộ: {lp.internalName}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-blue-600">
                      /landing/{lp.slug}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-slate-700">
                      {lp.sectionCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          lp.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : lp.status === 'ARCHIVED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {lp.status === 'PUBLISHED' ? 'Đang hiển thị' : lp.status === 'ARCHIVED' ? 'Đã ẩn' : 'Bản nháp'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px] text-slate-500 font-mono">
                      {new Date(lp.updatedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {lp.status === 'PUBLISHED' && (
                          <Link
                            href={`/landing/${lp.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                            title="Xem trang thực tế"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/builder/${lp.id}`}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold inline-flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(lp.id, lp.title)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                          title="Xoá trang"
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
