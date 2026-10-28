'use client';
import { useRef } from 'react';
import { useDraftAutosave } from '@/components/admin/useDraftAutosave';
import DraftRecovery from '@/components/admin/DraftRecovery';
import SchedulePanel from '@/components/admin/SchedulePanel';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Save,
  Globe,
  Eye,
  EyeOff,
  ArrowLeft,
  Image as ImageIcon,
  History,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  AdminCard,
  AdminButton,
  StatusBadge,
  InlineAlert,
  AdminLoadingState,
  AdminErrorState,
} from '@/components/admin/ui';
import { blankPage, PAGE_TYPES, type PageDocument, type PageType } from '@/contracts/cms/page';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import RichContentEditor from '@/components/admin/products/RichContentEditor';
import type { MediaAssetDto } from '@/contracts/cms/media';

const pageTypeLabels: Record<PageType, { label: string; desc: string; defaultSlug: string }> = {
  WARRANTY: { label: 'Chính sách bảo hành', desc: 'Tự động gắn vào tab Bảo hành trên PDP', defaultSlug: 'chinh-sach-bao-hanh' },
  RETURNS: { label: 'Chính sách đổi trả', desc: 'Gắn vào khối Đổi trả trên PDP & Footer', defaultSlug: 'chinh-sach-doi-tra' },
  SHIPPING: { label: 'Chính sách vận chuyển', desc: 'Chính sách giao hàng & phí vận chuyển', defaultSlug: 'chinh-sach-van-chuyen' },
  ABOUT: { label: 'Giới thiệu công ty', desc: 'Trang giới thiệu thương hiệu CitiLap', defaultSlug: 'gioi-thieu' },
  STORES: { label: 'Hệ thống Showroom', desc: 'Danh sách chi nhánh & showroom', defaultSlug: 'he-thong-cua-hang' },
  CUSTOM: { label: 'Trang tùy chỉnh', desc: 'Trang thông tin chung với slug tự chọn', defaultSlug: '' },
};

interface PageRevisionItem {
  revision: number;
  action: string;
  actor: string;
  createdAt: string;
  summary: string;
  isCurrent: boolean;
  isPublished: boolean;
}

export default function StaticPageEditor({ id }: { id: string | null }) {
  const router = useRouter();

  const [doc, setDoc] = useState<PageDocument>(blankPage());
  const [revision, setRevision] = useState(0);
  const latestDoc = useRef(doc), saveLock = useRef(false);
  useEffect(() => { latestDoc.current = doc; }, [doc]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [mediaDialogTarget, setMediaDialogTarget] = useState<'og' | 'body' | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PageRevisionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    async function fetchPage() {
      setError(null);
      try {
        const data = await mediaRequest<{ id: string; revision: number; document: PageDocument; published: boolean }>(`/api/admin/pages/${id}`);
        if (!ignore) {
          setDoc(data.document);
          setRevision(data.revision);
          setIsPublished(data.published);
          setHasUnsavedChanges(false);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu trang.');
          setLoading(false);
        }
      }
    }
    void fetchPage();
    return () => { ignore = true; };
  }, [id, refreshTrigger]);

  const loadPage = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const updateDoc = <K extends keyof PageDocument>(field: K, value: PageDocument[K]) => {
    setDoc(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveSuccess(null);
    setConflictError(null);
  };

  const updateSeo = (field: keyof PageDocument['seo'], value: unknown) => {
    setDoc(prev => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
    setHasUnsavedChanges(true);
    setSaveSuccess(null);
    setConflictError(null);
  };

  const handleSlugify = () => {
    if (!doc.title) return;
    const generated = doc.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
    updateDoc('slug', generated);
  };

  const handlePageTypeChange = (newType: PageType) => {
    updateDoc('pageType', newType);
    if (!doc.slug && pageTypeLabels[newType].defaultSlug) {
      updateDoc('slug', pageTypeLabels[newType].defaultSlug);
    }
  };

  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (saveLock.current) return false;
    saveLock.current = true;
    const submitted = JSON.stringify(doc);
    setSaving(true);
    setConflictError(null);
    setSaveSuccess(null);
    setError(null);

    try {
      const url = id ? `/api/admin/pages/${id}` : '/api/admin/pages';
      const method = id ? 'PUT' : 'POST';

      const payload = {
        expectedRevision: revision,
        action,
        document: doc,
      };

      const result = await mediaRequest<{ id: string; revision: number; document: PageDocument; published: boolean }>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRevision(result.revision);
      setIsPublished(result.published);
      if (JSON.stringify(latestDoc.current) === submitted) setDoc(result.document);
      setHasUnsavedChanges(JSON.stringify(latestDoc.current) !== submitted);

      if (action === 'publish') {
        setSaveSuccess('Đã xuất bản trang lên website.');
      } else if (action === 'unpublish') {
        setSaveSuccess('Đã ẩn trang khỏi website.');
      } else {
        setSaveSuccess(`Đã lưu nháp (#v${result.revision}).`);
      }

      if (!id && result.id) {
        router.replace(`/admin/pages/${result.id}`);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu.';
      if (msg.includes('Xung đột') || msg.includes('409') || msg.includes('nơi khác')) {
        setConflictError(msg);
      } else {
        setError(msg);
      }
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const autosaveStatus = useDraftAutosave(doc, revision, !!id && !loading, hasUnsavedChanges, saving, () => handleSave('save'));

  const loadHistory = async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const data = await mediaRequest<{ revisions: PageRevisionItem[] }>(`/api/admin/pages/${id}/revisions`);
      setHistoryList(data.revisions || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestore = async (targetRev: number) => {
    if (!id || saveLock.current) return;
    const confirmed = window.confirm(`Khôi phục phiên bản #${targetRev} thành bản nháp mới?`);
    if (!confirmed) return;

    saveLock.current = true;
    const beforeRestore = JSON.stringify(latestDoc.current);
    setSaving(true);
    try {
      const result = await mediaRequest<{ success: boolean; newRevision: number; document: PageDocument }>(`/api/admin/pages/${id}/revisions/${targetRev}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      setRevision(result.newRevision);
      if (JSON.stringify(latestDoc.current) === beforeRestore) setDoc(result.document);
      setHasUnsavedChanges(JSON.stringify(latestDoc.current) !== beforeRestore);
      setSaveSuccess(`Đã khôi phục #${targetRev} thành nháp mới (rev #${result.newRevision}).`);
      setHistoryOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể khôi phục phiên bản.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  if (loading) return <AdminLoadingState message="Đang tải dữ liệu trang..." />;
  if (error && !doc.title) return <AdminErrorState message={error} onRetry={loadPage} />;

  return (
    <div className="admin-content-editor space-y-3 pb-12">
      {/* Compact 1-Line Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href="/admin/pages"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0"
            title="Quay lại danh sách trang"
          >
            <ArrowLeft size={15} />
          </Link>
          <h1 className="text-sm font-bold text-slate-900 truncate">
            {id ? (doc.title || 'Biên tập trang thông tin') : 'Tạo trang mới'}
          </h1>
          <StatusBadge
            status={isPublished ? 'PUBLISHED' : 'DRAFT'}
            customLabel={isPublished ? 'Hiển thị' : 'Nháp'}
          />
          {hasUnsavedChanges && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
              Chưa lưu
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-400 shrink-0">#v{revision}</span>
          <p role="status" aria-live="polite" className="text-[11px] text-slate-400 truncate">
            {autosaveStatus}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isPublished && doc.slug && (
            <a
              href={`/${doc.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg border border-slate-200"
            >
              <ExternalLink size={13} />
              <span>Xem web</span>
            </a>
          )}
          {id && (
            <AdminButton
              variant="secondary"
              size="sm"
              icon={<History size={14} />}
              onClick={() => {
                setHistoryOpen(true);
                loadHistory();
              }}
            >
              Lịch sử
            </AdminButton>
          )}
          <AdminButton
            variant="secondary"
            size="sm"
            icon={<Eye size={14} />}
            onClick={() => setPreviewOpen(true)}
          >
            Xem trước
          </AdminButton>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <InlineAlert variant="success" onClose={() => setSaveSuccess(null)}>
          {saveSuccess}
        </InlineAlert>
      )}
      {conflictError && (
        <InlineAlert variant="error" title="Xung đột phiên bản (409)">
          {conflictError} Bản sửa hiện tại của bạn vẫn được giữ trên màn hình.
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-3">
          <AdminCard>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tiêu đề trang <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-page-title"
                    name="title"
                    type="text"
                    value={doc.title}
                    onChange={(e) => updateDoc('title', e.target.value)}
                    placeholder="VD: Chính sách bảo hành & Đổi mới..."
                    className="w-full text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSlugify}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} /> Tự tạo
                    </button>
                  </div>
                  <div className="flex rounded-lg">
                    <span className="inline-flex items-center px-2 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-mono">
                      /
                    </span>
                    <input
                      id="input-page-slug"
                      name="slug"
                      type="text"
                      value={doc.slug}
                      onChange={(e) => updateDoc('slug', e.target.value)}
                      placeholder="chinh-sach-bao-hanh"
                      className="flex-1 min-w-0 text-xs px-2.5 py-1.5 border border-slate-200 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nội dung trang <span className="text-red-500">*</span>
                </label>
                <RichContentEditor
                  value={doc.contentHtml}
                  onChange={(html) => updateDoc('contentHtml', html)}
                  onInsertMediaClick={() => setMediaDialogTarget('body')}
                />
              </div>
            </div>
          </AdminCard>

          {/* Collapsible SEO Metadata */}
          <details className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <summary className="px-4 py-2.5 bg-slate-50/70 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-800 select-none">
              <span>Cấu hình SEO & Thẻ chia sẻ</span>
              <span className="text-[11px] font-normal text-slate-400">
                {doc.seo.title ? 'Đã tùy chỉnh' : 'Mặc định theo tiêu đề'}
              </span>
            </summary>
            <div className="p-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-8">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tiêu đề SEO (Title Tag)
                  </label>
                  <input
                    type="text"
                    value={doc.seo.title}
                    onChange={(e) => updateSeo('title', e.target.value)}
                    placeholder={doc.title || 'Mặc định dùng tiêu đề trang'}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ảnh OG
                  </label>
                  <div className="flex items-center gap-2">
                    <AdminButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<ImageIcon size={13} />}
                      onClick={() => setMediaDialogTarget('og')}
                    >
                      {doc.seo.ogImageAssetId ? 'Đổi ảnh OG' : 'Chọn ảnh OG'}
                    </AdminButton>
                    {doc.seo.ogImageAssetId && (
                      <button
                        type="button"
                        onClick={() => updateSeo('ogImageAssetId', null)}
                        className="text-xs text-red-600 hover:underline cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mô tả SEO (Meta Description)
                </label>
                <textarea
                  rows={2}
                  value={doc.seo.description}
                  onChange={(e) => updateSeo('description', e.target.value)}
                  placeholder="Mô tả tóm tắt hiển thị trên kết quả Google..."
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </details>
        </div>

        {/* RIGHT COLUMN: Sticky Publication & System Page Type */}
        <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-16">
          <AdminCard>
            <div className="space-y-2.5">
              <AdminButton
                className="w-full"
                variant="primary"
                icon={<Globe size={15} />}
                loading={saving}
                onClick={() => handleSave('publish')}
              >
                {isPublished ? 'Cập nhật website' : 'Xuất bản website'}
              </AdminButton>

              <div className="grid grid-cols-2 gap-2">
                <AdminButton
                  className="w-full"
                  variant="secondary"
                  size="sm"
                  icon={<Save size={14} />}
                  loading={saving}
                  onClick={() => handleSave('save')}
                >
                  Lưu bản nháp
                </AdminButton>

                {isPublished ? (
                  <AdminButton
                    className="w-full"
                    variant="ghost"
                    size="sm"
                    icon={<EyeOff size={14} />}
                    loading={saving}
                    onClick={() => handleSave('unpublish')}
                  >
                    Ẩn khỏi web
                  </AdminButton>
                ) : (
                  <AdminButton
                    className="w-full"
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => setPreviewOpen(true)}
                  >
                    Xem trước
                  </AdminButton>
                )}
              </div>

              <div className="pt-1 space-y-2 text-xs">
                <SchedulePanel entityType="page" entityId={id} revision={revision} dirty={hasUnsavedChanges || saving} />
                {hasUnsavedChanges && id && <DraftRecovery draft={doc} endpoint={`/api/admin/pages/${id}`} />}
              </div>
            </div>
          </AdminCard>

          {/* System Page Type Card */}
          <AdminCard title="Loại trang hệ thống">
            <div className="space-y-1.5">
              {PAGE_TYPES.map((t) => {
                const info = pageTypeLabels[t];
                const selected = doc.pageType === t;
                return (
                  <label
                    key={t}
                    className={`block px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                      selected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="pageType"
                        value={t}
                        checked={selected}
                        onChange={() => handlePageTypeChange(t)}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-800">{info.label}</div>
                        <div className="text-[11px] text-slate-500">{info.desc}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Media Library Dialog */}
      {mediaDialogTarget && (
        <MediaDialog
          title={mediaDialogTarget === 'og' ? 'Chọn ảnh OG mạng xã hội' : 'Chèn ảnh vào nội dung trang'}
          onClose={() => setMediaDialogTarget(null)}
        >
          <MediaBrowser
            picker
            onSelect={(asset: MediaAssetDto) => {
              if (mediaDialogTarget === 'body') {
                const imgTag = `<p><img src="/api/library/${asset.id}" alt="${asset.alt || asset.name}" class="rounded-lg shadow my-4 max-w-full" /></p>`;
                updateDoc('contentHtml', doc.contentHtml + imgTag);
                setMediaDialogTarget(null);
              } else if (mediaDialogTarget === 'og') {
                updateSeo('ogImageAssetId', asset.id);
                setMediaDialogTarget(null);
              }
            }}
          />
        </MediaDialog>
      )}

      {/* Revision History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs">Lịch sử phiên bản</h3>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Chưa có lịch sử phiên bản.</div>
              ) : (
                historyList.map((rev) => (
                  <div
                    key={rev.revision}
                    className={`p-3 border rounded-lg text-xs flex items-center justify-between ${rev.isCurrent ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'}`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono font-bold text-slate-800">#{rev.revision}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${rev.action === 'publish' ? 'bg-emerald-100 text-emerald-800' : rev.action === 'restore' ? 'bg-purple-100 text-purple-800' : rev.action === 'unpublish' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                          {rev.action === 'publish' ? 'Xuất bản' : rev.action === 'restore' ? 'Khôi phục' : rev.action === 'unpublish' ? 'Ẩn' : 'Lưu nháp'}
                        </span>
                        {rev.isCurrent && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            Hiện tại
                          </span>
                        )}
                        {rev.isPublished && (
                          <span className="bg-emerald-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            Đang hiển thị
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 text-xs">{rev.summary}</div>
                      <div className="text-[11px] text-slate-400">
                        {rev.actor} • {new Date(rev.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {!rev.isCurrent && (
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestore(rev.revision)}
                      >
                        Khôi phục
                      </AdminButton>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  XEM TRƯỚC BẢN NHÁP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1.5">{doc.title || '(Chưa có tiêu đề)'}</h1>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-mono">/{doc.slug || 'slug'}</span>
                  <span>•</span>
                  <span>{pageTypeLabels[doc.pageType].label}</span>
                </div>
              </div>

              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: doc.contentHtml || '<p class="text-slate-400">Chưa có nội dung trang.</p>' }}
              />
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => setPreviewOpen(false)}>
                Đóng
              </AdminButton>
              <AdminButton size="sm" variant="primary" onClick={() => { setPreviewOpen(false); handleSave('publish'); }}>
                Xuất bản trang
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
