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
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Search,
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
import { blankPost, type PostDocument } from '@/contracts/cms/post';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import RichContentEditor from '@/components/admin/products/RichContentEditor';
import type { MediaAssetDto } from '@/contracts/cms/media';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ProductPickerOption {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  isPublished: boolean;
  productStatus: string;
}

interface PostRevisionItem {
  revision: number;
  action: string;
  actor: string;
  createdAt: string;
  summary: string;
  isCurrent: boolean;
  isPublished: boolean;
}

export default function PostEditor({ id }: { id: string | null }) {
  const router = useRouter();

  const [doc, setDoc] = useState<PostDocument>(blankPost());
  const [revision, setRevision] = useState(0);
  const latestDoc = useRef(doc), saveLock = useRef(false);
  useEffect(() => { latestDoc.current = doc; }, [doc]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [mediaDialogTarget, setMediaDialogTarget] = useState<'cover' | 'og' | 'body' | null>(null);

  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductPickerOption[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [relatedProductDetails, setRelatedProductDetails] = useState<Record<string, ProductPickerOption>>({});

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PostRevisionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    mediaRequest<{ id: string; name: string; slug: string; status: 'ACTIVE' | 'INACTIVE' }[]>('/api/admin/post-categories?status=ALL')
      .then((cats) => setCategories(cats || []))
      .catch(() => {});
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    async function fetchPost() {
      setError(null);
      try {
        const data = await mediaRequest<{ id: string; revision: number; document: PostDocument; published: boolean }>(`/api/admin/posts/${id}`);
        if (!ignore) {
          setDoc(data.document);
          setRevision(data.revision);
          setIsPublished(data.published);
          setHasUnsavedChanges(false);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải bài viết.');
          setLoading(false);
        }
      }
    }
    void fetchPost();
    return () => { ignore = true; };
  }, [id, refreshTrigger]);

  const loadPost = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!doc.relatedProductIds?.length) return;
    const missingIds = doc.relatedProductIds.filter(pid => !relatedProductDetails[pid]);
    if (!missingIds.length) return;

    mediaRequest<{ items: ProductPickerOption[] }>(`/api/admin/products?limit=50`)
      .then((data) => {
        const map: Record<string, ProductPickerOption> = {};
        for (const p of data.items || []) {
          map[p.id] = p;
        }
        setRelatedProductDetails(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [doc.relatedProductIds, relatedProductDetails]);

  const updateDoc = <K extends keyof PostDocument>(field: K, value: PostDocument[K]) => {
    setDoc(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveSuccess(null);
    setConflictError(null);
  };

  const updateSeo = (field: keyof PostDocument['seo'], value: unknown) => {
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

  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (saveLock.current) return false;
    saveLock.current = true;
    const submitted = JSON.stringify(doc);
    setSaving(true);
    setConflictError(null);
    setSaveSuccess(null);
    setError(null);

    try {
      const url = id ? `/api/admin/posts/${id}` : '/api/admin/posts';
      const method = id ? 'PUT' : 'POST';

      const payload = {
        expectedRevision: revision,
        action,
        document: doc,
      };

      const result = await mediaRequest<{ id: string; revision: number; document: PostDocument; published: boolean }>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRevision(result.revision);
      setIsPublished(result.published);
      if (JSON.stringify(latestDoc.current) === submitted) setDoc(result.document);
      setHasUnsavedChanges(JSON.stringify(latestDoc.current) !== submitted);

      if (action === 'publish') {
        setSaveSuccess('Đã xuất bản bài viết lên website.');
      } else if (action === 'unpublish') {
        setSaveSuccess('Đã ẩn bài viết khỏi website.');
      } else {
        setSaveSuccess(`Đã lưu nháp (#v${result.revision}).`);
      }

      if (!id && result.id) {
        router.replace(`/admin/posts/${result.id}`);
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
      const data = await mediaRequest<{ revisions: PostRevisionItem[] }>(`/api/admin/posts/${id}/revisions`);
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
      const result = await mediaRequest<{ success: boolean; newRevision: number; document: PostDocument }>(`/api/admin/posts/${id}/revisions/${targetRev}/restore`, {
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

  const handleSearchProducts = async (q: string) => {
    setProductSearching(true);
    try {
      const data = await mediaRequest<{ items: ProductPickerOption[] }>(`/api/admin/products?q=${encodeURIComponent(q)}&limit=12`);
      setProductResults(data.items || []);
    } catch {
      setProductResults([]);
    } finally {
      setProductSearching(false);
    }
  };

  const addRelatedProduct = (product: ProductPickerOption) => {
    if (doc.relatedProductIds.includes(product.id)) return;
    if (doc.relatedProductIds.length >= 10) {
      alert('Tối đa 10 sản phẩm liên quan.');
      return;
    }
    setRelatedProductDetails(prev => ({ ...prev, [product.id]: product }));
    updateDoc('relatedProductIds', [...doc.relatedProductIds, product.id]);
  };

  const removeRelatedProduct = (productId: string) => {
    updateDoc('relatedProductIds', doc.relatedProductIds.filter(pid => pid !== productId));
  };

  const moveRelatedProduct = (index: number, direction: 'up' | 'down') => {
    const list = [...doc.relatedProductIds];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    updateDoc('relatedProductIds', list);
  };

  const handleMediaSelect = (asset: MediaAssetDto) => {
    if (mediaDialogTarget === 'cover') {
      updateDoc('coverImage', { assetId: asset.id, alt: asset.alt || asset.name || doc.title });
    } else if (mediaDialogTarget === 'og') {
      updateSeo('ogImageAssetId', asset.id);
    }
    setMediaDialogTarget(null);
  };

  if (loading) return <AdminLoadingState message="Đang tải bài viết..." />;
  if (error && !doc.title) return <AdminErrorState message={error} onRetry={loadPost} />;

  return (
    <div className="admin-content-editor space-y-3 pb-12">
      {/* Compact 1-Line Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href="/admin/posts"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0"
            title="Quay lại danh sách bài viết"
          >
            <ArrowLeft size={15} />
          </Link>
          <h1 className="text-sm font-bold text-slate-900 truncate">
            {id ? (doc.title || 'Biên tập bài viết') : 'Viết bài mới'}
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
              href={`/news/${doc.slug}`}
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
          {conflictError} Bản sửa hiện tại vẫn được giữ trên màn hình.
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {/* Main Grid: Left Editor (8 cols) + Right Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-3">
          <AdminCard>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tiêu đề bài viết <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-title"
                    name="title"
                    type="text"
                    value={doc.title}
                    onChange={(e) => updateDoc('title', e.target.value)}
                    placeholder="VD: Đánh giá chi tiết ThinkPad T14 Gen 4..."
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
                      /news/
                    </span>
                    <input
                      id="input-slug"
                      name="slug"
                      type="text"
                      value={doc.slug}
                      onChange={(e) => updateDoc('slug', e.target.value)}
                      placeholder="danh-gia-thinkpad-t14"
                      className="flex-1 min-w-0 text-xs px-2.5 py-1.5 border border-slate-200 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tóm tắt ngắn (Excerpt)
                </label>
                <textarea
                  rows={2}
                  value={doc.excerpt}
                  onChange={(e) => updateDoc('excerpt', e.target.value)}
                  placeholder="Mô tả ngắn hiển thị ở danh sách tin tức..."
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nội dung bài viết <span className="text-red-500">*</span>
                </label>
                <RichContentEditor
                  value={doc.contentHtml}
                  onChange={(html) => updateDoc('contentHtml', html)}
                  onInsertMediaClick={() => setMediaDialogTarget('body')}
                />
              </div>
            </div>
          </AdminCard>

          {/* Collapsible Related Products */}
          <details
            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden group"
            open={doc.relatedProductIds.length > 0}
          >
            <summary className="px-4 py-2.5 bg-slate-50/70 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-800 select-none">
              <span>Sản phẩm liên quan ({doc.relatedProductIds.length}/10)</span>
              <AdminButton
                type="button"
                size="sm"
                variant="secondary"
                icon={<Plus size={13} />}
                onClick={(e) => {
                  e.preventDefault();
                  setProductSearchOpen(true);
                  handleSearchProducts('');
                }}
              >
                Chọn SP
              </AdminButton>
            </summary>

            <div className="p-3.5 border-t border-slate-100">
              {doc.relatedProductIds.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Chưa gán sản phẩm liên quan.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {doc.relatedProductIds.map((pid, idx) => {
                    const p = relatedProductDetails[pid];
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                          {p?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="w-8 h-8 object-cover rounded border border-slate-200 bg-white shrink-0" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{p?.name || `SP #${pid}`}</div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {p?.price ? `${p.price.toLocaleString('vi-VN')}₫` : pid}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {p && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                              {p.isPublished ? 'Hiện' : 'Nháp'}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveRelatedProduct(idx, 'up')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                            title="Lên"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === doc.relatedProductIds.length - 1}
                            onClick={() => moveRelatedProduct(idx, 'down')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                            title="Xuống"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRelatedProduct(pid)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </details>

          {/* Collapsible SEO Metadata */}
          <details className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <summary className="px-4 py-2.5 bg-slate-50/70 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-800 select-none">
              <span>Cấu hình SEO & Chia sẻ mạng xã hội</span>
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
                    placeholder={doc.title || 'Mặc định dùng tiêu đề bài viết'}
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
                  placeholder={doc.excerpt || 'Mặc định dùng tóm tắt bài viết'}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </details>
        </div>

        {/* RIGHT COLUMN: Sticky Publication + Unified Classification & Cover */}
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
                <SchedulePanel entityType="post" entityId={id} revision={revision} dirty={hasUnsavedChanges || saving} />
                {hasUnsavedChanges && id && <DraftRecovery draft={doc} endpoint={`/api/admin/posts/${id}`} />}
              </div>
            </div>
          </AdminCard>

          {/* Unified Classification + Cover Image Card */}
          <AdminCard title="Phân loại & Ảnh bìa">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chuyên mục
                </label>
                <select
                  value={doc.categoryId || ''}
                  onChange={(e) => updateDoc('categoryId', e.target.value || null)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Chưa gán chuyên mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.status === 'INACTIVE' ? '(Tạm ẩn)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={doc.authorName}
                  onChange={(e) => updateDoc('authorName', e.target.value)}
                  placeholder="VD: Ban biên tập CitiLap"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={doc.isFeatured}
                  onChange={(e) => updateDoc('isFeatured', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Bài viết nổi bật (Featured)</span>
              </label>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Ảnh đại diện</span>
                  {doc.coverImage?.assetId && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setMediaDialogTarget('cover')}
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDoc('coverImage', null)}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                {doc.coverImage?.assetId ? (
                  <div className="space-y-2">
                    <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center h-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/library/${doc.coverImage.assetId}`}
                        alt={doc.coverImage.alt || 'Ảnh đại diện'}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={doc.coverImage.alt}
                      onChange={(e) => updateDoc('coverImage', { ...doc.coverImage!, alt: e.target.value })}
                      placeholder="Mô tả ảnh (ALT) *"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMediaDialogTarget('cover')}
                    className="w-full py-4 border border-dashed border-slate-300 hover:border-blue-400 rounded-lg text-xs text-slate-500 hover:text-blue-600 flex flex-col items-center gap-1 transition cursor-pointer bg-slate-50/50"
                  >
                    <ImageIcon size={20} className="text-slate-400" />
                    <span>+ Chọn ảnh đại diện</span>
                  </button>
                )}
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Media Library Dialog */}
      {mediaDialogTarget && (
        <MediaDialog
          title={mediaDialogTarget === 'cover' ? 'Chọn ảnh đại diện' : mediaDialogTarget === 'og' ? 'Chọn ảnh OG mạng xã hội' : 'Chèn ảnh vào nội dung bài viết'}
          onClose={() => setMediaDialogTarget(null)}
        >
          <MediaBrowser
            picker
            onSelect={(asset: MediaAssetDto) => {
              if (mediaDialogTarget === 'body') {
                const imgTag = `<p><img src="/api/library/${asset.id}" alt="${asset.alt || asset.name}" class="rounded-lg shadow my-4 max-w-full" /></p>`;
                updateDoc('contentHtml', doc.contentHtml + imgTag);
                setMediaDialogTarget(null);
              } else {
                handleMediaSelect(asset);
              }
            }}
          />
        </MediaDialog>
      )}

      {/* Product Search Modal */}
      {productSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs">Chọn sản phẩm liên quan</h3>
              <button
                type="button"
                onClick={() => setProductSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    handleSearchProducts(e.target.value);
                  }}
                  placeholder="Tìm kiếm sản phẩm theo tên, model..."
                  className="w-full text-xs pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {productSearching ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tìm kiếm...</div>
              ) : productResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Không tìm thấy sản phẩm phù hợp.</div>
              ) : (
                productResults.map((p) => {
                  const isSelected = doc.relatedProductIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 border border-slate-100 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="w-9 h-9 object-cover rounded border border-slate-200 bg-white" />
                        ) : (
                          <div className="w-9 h-9 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                            <ImageIcon size={14} />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.price ? `${p.price.toLocaleString('vi-VN')}₫` : 'Liên hệ'} • {p.isPublished ? 'Công khai' : 'Nháp'}
                          </div>
                        </div>
                      </div>

                      <AdminButton
                        type="button"
                        size="sm"
                        variant={isSelected ? 'ghost' : 'secondary'}
                        disabled={isSelected}
                        onClick={() => addRelatedProduct(p)}
                      >
                        {isSelected ? 'Đã thêm' : 'Chọn'}
                      </AdminButton>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <AdminButton size="sm" variant="primary" onClick={() => setProductSearchOpen(false)}>
                Hoàn tất
              </AdminButton>
            </div>
          </div>
        </div>
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
              {doc.coverImage?.assetId && (
                <div className="max-h-72 overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/library/${doc.coverImage.assetId}`}
                    alt={doc.coverImage.alt || doc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1.5">{doc.title || '(Chưa có tiêu đề)'}</h1>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{doc.authorName || 'Ban biên tập CitiLap'}</span>
                  <span>•</span>
                  <span>{new Date().toLocaleDateString('vi-VN')}</span>
                  {doc.categoryId && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-blue-600">
                        {categories.find(c => c.id === doc.categoryId)?.name || 'Chuyên mục'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {doc.excerpt && (
                <p className="text-xs italic text-slate-600 p-3 bg-slate-50 border-l-4 border-blue-500 rounded">
                  {doc.excerpt}
                </p>
              )}

              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: doc.contentHtml || '<p class="text-slate-400">Chưa có nội dung bài viết.</p>' }}
              />
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => setPreviewOpen(false)}>
                Đóng
              </AdminButton>
              <AdminButton size="sm" variant="primary" onClick={() => { setPreviewOpen(false); handleSave('publish'); }}>
                Xuất bản bài viết
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
