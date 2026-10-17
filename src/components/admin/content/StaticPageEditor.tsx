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
import { blankPage, PAGE_TYPES, type PageDocument, type PageType } from '@/contracts/cms/page';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import RichContentEditor from '@/components/admin/products/RichContentEditor';
import type { MediaAssetDto } from '@/contracts/cms/media';

const pageTypeLabels: Record<PageType, { label: string; desc: string; defaultSlug: string }> = {
  WARRANTY: { label: 'Chính sách bảo hành', desc: 'Được liên kết tự động vào tab Bảo hành trên trang chi tiết sản phẩm (PDP)', defaultSlug: 'chinh-sach-bao-hanh' },
  RETURNS: { label: 'Chính sách đổi trả', desc: 'Được liên kết tự động vào khối Đổi trả trên PDP và chân trang', defaultSlug: 'chinh-sach-doi-tra' },
  SHIPPING: { label: 'Chính sách vận chuyển', desc: 'Hiển thị chính sách giao hàng toàn quốc và phí ship', defaultSlug: 'chinh-sach-van-chuyen' },
  ABOUT: { label: 'Giới thiệu công ty', desc: 'Trang giới thiệu về thương hiệu CitiLap', defaultSlug: 'gioi-thieu' },
  STORES: { label: 'Hệ thống cửa hàng / Showroom', desc: 'Trang giới thiệu hệ thống chi nhánh và showroom bán hàng', defaultSlug: 'he-thong-cua-hang' },
  CUSTOM: { label: 'Trang tùy chỉnh tự do', desc: 'Trang thông tin chung với đường dẫn slug tự định nghĩa', defaultSlug: '' },
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

  // Document state
  const [doc, setDoc] = useState<PageDocument>(blankPage());
  const [revision, setRevision] = useState(0);
  const latestDoc=useRef(doc), saveLock=useRef(false);
  useEffect(()=>{latestDoc.current=doc;},[doc]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dialogs
  const [mediaDialogTarget, setMediaDialogTarget] = useState<'og' | 'body' | null>(null);

  // Revisions history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PageRevisionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Preview modal
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
    if(saveLock.current)return false;
    saveLock.current=true;
    const submitted=JSON.stringify(doc);
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
      if(JSON.stringify(latestDoc.current)===submitted)setDoc(result.document);
      setHasUnsavedChanges(JSON.stringify(latestDoc.current)!==submitted);

      if (action === 'publish') {
        setSaveSuccess('Trang tĩnh đã được xuất bản lên website thành công!');
      } else if (action === 'unpublish') {
        setSaveSuccess('Trang tĩnh đã được chuyển về trạng thái ẩn.');
      } else {
        setSaveSuccess(`Đã lưu bản nháp thành công (phiên bản #${result.revision}).`);
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
      saveLock.current=false;
      setSaving(false);
    }
  };

  const autosaveStatus=useDraftAutosave(doc,revision,!!id && !loading,hasUnsavedChanges,saving,()=>handleSave('save'));

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
    const confirmed = window.confirm(`Bạn có chắc muốn khôi phục phiên bản #${targetRev} thành bản nháp mới? Website vẫn giữ nguyên nội dung công cộng cho đến khi bạn xuất bản lại.`);
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
      setSaveSuccess(`Đã khôi phục phiên bản #${targetRev} thành bản nháp mới (rev #${result.newRevision}). Hãy kiểm tra và xuất bản khi sẵn sàng.`);
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <p role="status" aria-live="polite">{autosaveStatus}</p>
      {hasUnsavedChanges && id && <DraftRecovery draft={doc} endpoint={`/api/admin/pages/${id}`}/>}
      <SchedulePanel entityType="page" entityId={id} revision={revision} dirty={hasUnsavedChanges || saving}/>
      <PageHeader
        title={id ? (doc.title || 'Biên tập trang thông tin') : 'Tạo trang thông tin mới'}
        description="Quản lý chính sách bảo hành, đổi trả, vận chuyển, giới thiệu và hệ thống showroom."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/pages">
              <AdminButton variant="secondary" size="sm" icon={<ArrowLeft size={16} />}>
                Quay lại
              </AdminButton>
            </Link>
            {id && (
              <AdminButton
                variant="secondary"
                size="sm"
                icon={<History size={16} />}
                onClick={() => {
                  setHistoryOpen(true);
                  loadHistory();
                }}
              >
                Lịch sử ({revision})
              </AdminButton>
            )}
            <AdminButton
              variant="secondary"
              size="sm"
              icon={<Eye size={16} />}
              onClick={() => setPreviewOpen(true)}
            >
              Xem trước
            </AdminButton>
          </div>
        }
      />

      {/* Alerts */}
      {saveSuccess && (
        <InlineAlert variant="success" title="Thành công" onClose={() => setSaveSuccess(null)}>
          {saveSuccess}
        </InlineAlert>
      )}
      {conflictError && (
        <InlineAlert variant="error" title="Xung đột phiên bản (409)">
          {conflictError} Bản sửa hiện tại của bạn vẫn được giữ trên màn hình.
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" title="Lỗi" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>Có thay đổi chưa lưu trên trang này.</span>
          <span className="font-semibold text-amber-900">Phiên bản hiện tại: #{revision}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main content */}
        <div className="lg:col-span-8 space-y-6">
          <AdminCard title="Nội dung trang thông tin">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề trang <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-page-title"
                  name="title"
                  type="text"
                  value={doc.title}
                  onChange={(e) => updateDoc('title', e.target.value)}
                  placeholder="Ví dụ: Chính sách bảo hành & Đổi mới sản phẩm..."
                  className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSlugify}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Tự động tạo slug
                  </button>
                </div>
                <div className="flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-xs">
                    /
                  </span>
                  <input
                    id="input-page-slug"
                    name="slug"
                    type="text"
                    value={doc.slug}
                    onChange={(e) => updateDoc('slug', e.target.value)}
                    placeholder="chinh-sach-bao-hanh"
                    className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rich Content Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung chi tiết trang <span className="text-red-500">*</span>
                </label>
                <RichContentEditor
                  value={doc.contentHtml}
                  onChange={(html) => updateDoc('contentHtml', html)}
                  onInsertMediaClick={() => setMediaDialogTarget('body')}
                />
              </div>
            </div>
          </AdminCard>

          {/* SEO Metadata Card */}
          <AdminCard title="Cấu hình SEO & Thẻ chia sẻ">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề SEO (Title Tag)
                </label>
                <input
                  type="text"
                  value={doc.seo.title}
                  onChange={(e) => updateSeo('title', e.target.value)}
                  placeholder={doc.title || 'Mặc định dùng tiêu đề trang'}
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả SEO (Meta Description)
                </label>
                <textarea
                  rows={2}
                  value={doc.seo.description}
                  onChange={(e) => updateSeo('description', e.target.value)}
                  placeholder="Mô tả tóm tắt trang hiển thị trên kết quả tìm kiếm Google..."
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh chia sẻ mạng xã hội (OG Image)
                </label>
                <div className="flex items-center gap-3">
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<ImageIcon size={14} />}
                    onClick={() => setMediaDialogTarget('og')}
                  >
                    {doc.seo.ogImageAssetId ? 'Đổi ảnh OG' : 'Chọn ảnh OG'}
                  </AdminButton>
                  {doc.seo.ogImageAssetId && (
                    <button
                      type="button"
                      onClick={() => updateSeo('ogImageAssetId', null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Xóa ảnh OG
                    </button>
                  )}
                </div>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* RIGHT COLUMN: Sidebar Publication & Settings */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action / Publication Card */}
          <AdminCard title="Xuất bản & Trạng thái">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs text-slate-500">Trạng thái:</span>
                <StatusBadge
                  status={isPublished ? 'PUBLISHED' : 'DRAFT'}
                  customLabel={isPublished ? 'Đang hiển thị' : 'Bản nháp'}
                />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Phiên bản hiện tại:</span>
                <span className="font-mono font-semibold text-slate-800">#{revision}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <AdminButton
                  className="w-full"
                  variant="primary"
                  icon={<Globe size={16} />}
                  loading={saving}
                  onClick={() => handleSave('publish')}
                >
                  {isPublished ? 'Cập nhật website' : 'Xuất bản website'}
                </AdminButton>

                <AdminButton
                  className="w-full"
                  variant="secondary"
                  icon={<Save size={16} />}
                  loading={saving}
                  onClick={() => handleSave('save')}
                >
                  Lưu bản nháp
                </AdminButton>

                {isPublished && (
                  <AdminButton
                    className="w-full"
                    variant="ghost"
                    icon={<EyeOff size={16} />}
                    loading={saving}
                    onClick={() => handleSave('unpublish')}
                  >
                    Ẩn khỏi website (Unpublish)
                  </AdminButton>
                )}
              </div>
            </div>
          </AdminCard>

          {/* System Page Type Card */}
          <AdminCard title="Vị trí & Loại trang hệ thống">
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Chọn loại trang hệ thống để các thành phần Storefront (như khối Chính sách bảo hành trên PDP) tự động kết nối nội dung này.
              </p>

              <div className="space-y-2">
                {PAGE_TYPES.map((t) => {
                  const info = pageTypeLabels[t];
                  const selected = doc.pageType === t;
                  return (
                    <label
                      key={t}
                      className={`block p-3 rounded-lg border cursor-pointer transition-colors text-xs ${selected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2.5">
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
                          <div className="text-[11px] text-slate-500 mt-0.5">{info.desc}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Lịch sử phiên bản trang tĩnh</h3>
                <p className="text-xs text-slate-500">Khôi phục sẽ đưa nội dung về bản nháp mới mà không làm thay đổi trang public.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Chưa có lịch sử phiên bản.</div>
              ) : (
                historyList.map((rev) => (
                  <div
                    key={rev.revision}
                    className={`p-3.5 border rounded-lg text-xs flex items-center justify-between ${rev.isCurrent ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-800">#{rev.revision}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rev.action === 'publish' ? 'bg-emerald-100 text-emerald-800' : rev.action === 'restore' ? 'bg-purple-100 text-purple-800' : rev.action === 'unpublish' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                          {rev.action === 'publish' ? 'Xuất bản' : rev.action === 'restore' ? 'Khôi phục' : rev.action === 'unpublish' ? 'Ẩn' : 'Lưu nháp'}
                        </span>
                        {rev.isCurrent && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Bản nháp hiện tại
                          </span>
                        )}
                        {rev.isPublished && (
                          <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Bản đang công khai trên website
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 text-xs mb-0.5">{rev.summary}</div>
                      <div className="text-[11px] text-slate-400">
                        Bởi {rev.actor} • {new Date(rev.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {!rev.isCurrent && (
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestore(rev.revision)}
                      >
                        Khôi phục thành nháp
                      </AdminButton>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <AdminButton size="sm" variant="secondary" onClick={() => setHistoryOpen(false)}>
                Đóng
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  CHẾ ĐỘ XEM TRƯỚC (DRAFT PREVIEW)
                </span>
                <span className="text-xs text-slate-500">Website công cộng chưa thay đổi</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{doc.title || '(Chưa có tiêu đề)'}</h1>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-mono">URL: /{doc.slug || 'slug'}</span>
                  <span>•</span>
                  <span>Loại: {pageTypeLabels[doc.pageType].label}</span>
                </div>
              </div>

              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: doc.contentHtml || '<p class="text-slate-400">Chưa có nội dung trang.</p>' }}
              />
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => setPreviewOpen(false)}>
                Đóng xem trước
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
