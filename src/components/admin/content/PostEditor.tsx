'use client';

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

  // Document state
  const [doc, setDoc] = useState<PostDocument>(blankPost());
  const [revision, setRevision] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Categories & options
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dialogs
  const [mediaDialogTarget, setMediaDialogTarget] = useState<'cover' | 'og' | 'body' | null>(null);

  // Related products picker
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductPickerOption[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [relatedProductDetails, setRelatedProductDetails] = useState<Record<string, ProductPickerOption>>({});

  // Revisions history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PostRevisionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load categories
  useEffect(() => {
    mediaRequest<{ id: string; name: string; slug: string; status: 'ACTIVE' | 'INACTIVE' }[]>('/api/admin/post-categories?status=ALL')
      .then((cats) => setCategories(cats || []))
      .catch(() => {});
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load post details
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

  // Load related product details when relatedProductIds change
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
      setDoc(result.document);
      setHasUnsavedChanges(false);

      if (action === 'publish') {
        setSaveSuccess('Bài viết đã được xuất bản lên website thành công!');
      } else if (action === 'unpublish') {
        setSaveSuccess('Bài viết đã được chuyển về trạng thái ẩn.');
      } else {
        setSaveSuccess(`Đã lưu bản nháp thành công (phiên bản #${result.revision}).`);
      }

      if (!id && result.id) {
        router.replace(`/admin/posts/${result.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu.';
      if (msg.includes('Xung đột') || msg.includes('409') || msg.includes('nơi khác')) {
        setConflictError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

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
    if (!id) return;
    const confirmed = window.confirm(`Bạn có chắc muốn khôi phục phiên bản #${targetRev} thành bản nháp mới? Website vẫn giữ nguyên bài viết công cộng cho đến khi bạn xuất bản lại.`);
    if (!confirmed) return;

    setSaving(true);
    try {
      const result = await mediaRequest<{ success: boolean; newRevision: number; document: PostDocument }>(`/api/admin/posts/${id}/revisions/${targetRev}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      setRevision(result.newRevision);
      setDoc(result.document);
      setHasUnsavedChanges(false);
      setSaveSuccess(`Đã khôi phục phiên bản #${targetRev} thành bản nháp mới (rev #${result.newRevision}). Hãy kiểm tra và xuất bản khi sẵn sàng.`);
      setHistoryOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể khôi phục phiên bản.');
    } finally {
      setSaving(false);
    }
  };

  // Search products for picker
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
      alert('Tối đa 10 sản phẩm liên quan cho mỗi bài viết.');
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

  if (loading) return <AdminLoadingState message="Đang tải dữ liệu bài viết..." />;
  if (error && !doc.title) return <AdminErrorState message={error} onRetry={loadPost} />;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <PageHeader
        title={id ? (doc.title || 'Biên tập bài viết') : 'Viết bài viết mới'}
        description="Soạn thảo tin tức, đánh giá sản phẩm, quản lý phiên bản và xuất bản website."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/posts">
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
          {conflictError} Bản sửa hiện tại của bạn vẫn được giữ trên màn hình. Hãy sao chép nội dung hoặc tải lại để đồng bộ.
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="error" title="Lỗi" onClose={() => setError(null)}>
          {error}
        </InlineAlert>
      )}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>Có thay đổi chưa lưu. Hãy bấm &quot;Lưu nháp&quot; hoặc &quot;Xuất bản&quot; để lưu trữ.</span>
          <span className="font-semibold text-amber-900">Phiên bản hiện tại: #{revision}</span>
        </div>
      )}

      {/* Main Grid: Left Editor (8 cols) + Right Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main Editorial Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Basic Info Card */}
          <AdminCard title="Nội dung chính bài viết">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-title"
                  name="title"
                  type="text"
                  value={doc.title}
                  onChange={(e) => updateDoc('title', e.target.value)}
                  placeholder="Ví dụ: Đánh giá chi tiết Laptop ThinkPad T14 Gen 4..."
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
                    /news/
                  </span>
                  <input
                    id="input-slug"
                    name="slug"
                    type="text"
                    value={doc.slug}
                    onChange={(e) => updateDoc('slug', e.target.value)}
                    placeholder="danh-gia-thinkpad-t14-gen-4"
                    className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tóm tắt bài viết (Excerpt)
                </label>
                <textarea
                  rows={3}
                  value={doc.excerpt}
                  onChange={(e) => updateDoc('excerpt', e.target.value)}
                  placeholder="Mô tả ngắn gọn về nội dung bài viết hiển thị ở danh sách bài và thẻ xem trước..."
                  className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Rich Content Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung chi tiết bài viết <span className="text-red-500">*</span>
                </label>
                <RichContentEditor
                  value={doc.contentHtml}
                  onChange={(html) => updateDoc('contentHtml', html)}
                  onInsertMediaClick={() => setMediaDialogTarget('body')}
                />
              </div>
            </div>
          </AdminCard>

          {/* Related Products Card */}
          <AdminCard
            title={`Sản phẩm liên quan (${doc.relatedProductIds.length}/10)`}
            subtitle="Các sản phẩm Laptop hoặc Phụ kiện xuất hiện ở khối gợi ý chân bài viết. Thứ tự hiển thị theo sắp xếp bên dưới."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Chỉ các sản phẩm đang hiển thị công khai (Active & Published) mới xuất hiện trên Storefront.
                </p>
                <AdminButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setProductSearchOpen(true);
                    handleSearchProducts('');
                  }}
                >
                  Chọn sản phẩm
                </AdminButton>
              </div>

              {doc.relatedProductIds.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  Chưa gán sản phẩm liên quan nào cho bài viết này.
                </div>
              ) : (
                <div className="space-y-2">
                  {doc.relatedProductIds.map((pid, idx) => {
                    const p = relatedProductDetails[pid];
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-400 w-5">{idx + 1}.</span>
                          {p?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded border border-slate-200 bg-white" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-800">{p?.name || `Sản phẩm #${pid}`}</div>
                            <div className="text-slate-500 font-mono">
                              {p?.price ? `${p.price.toLocaleString('vi-VN')}₫` : 'ID: ' + pid}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                              {p.isPublished ? 'Công khai' : 'Nháp/Ẩn'}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveRelatedProduct(idx, 'up')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === doc.relatedProductIds.length - 1}
                            onClick={() => moveRelatedProduct(idx, 'down')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRelatedProduct(pid)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded ml-1"
                            title="Xóa khỏi danh sách"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </AdminCard>

          {/* SEO Metadata Card */}
          <AdminCard title="Cấu hình SEO & Mạng xã hội">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề SEO (Title Tag)
                </label>
                <input
                  type="text"
                  value={doc.seo.title}
                  onChange={(e) => updateSeo('title', e.target.value)}
                  placeholder={doc.title || 'Mặc định dùng tiêu đề bài viết'}
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
                  placeholder={doc.excerpt || 'Mặc định dùng tóm tắt bài viết'}
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

          {/* Classification & Settings */}
          <AdminCard title="Phân loại & Tác giả">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chuyên mục bài viết
                </label>
                <select
                  value={doc.categoryId || ''}
                  onChange={(e) => updateDoc('categoryId', e.target.value || null)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tác giả hiển thị
                </label>
                <input
                  type="text"
                  value={doc.authorName}
                  onChange={(e) => updateDoc('authorName', e.target.value)}
                  placeholder="Ví dụ: CitiLap Editorial, Nguyễn Văn A..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={doc.isFeatured}
                    onChange={(e) => updateDoc('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Đánh dấu là bài viết nổi bật (Featured)</span>
                </label>
              </div>
            </div>
          </AdminCard>

          {/* Cover Image Card */}
          <AdminCard title="Ảnh đại diện (Cover Image)">
            <div className="space-y-3">
              {doc.coverImage?.assetId ? (
                <div className="space-y-2">
                  <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center h-44">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/library/${doc.coverImage.assetId}`}
                      alt={doc.coverImage.alt || 'Ảnh đại diện'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mô tả ảnh (ALT Text) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={doc.coverImage.alt}
                      onChange={(e) => updateDoc('coverImage', { ...doc.coverImage!, alt: e.target.value })}
                      placeholder="Mô tả nội dung bức ảnh..."
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <AdminButton
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => setMediaDialogTarget('cover')}
                    >
                      Đổi ảnh
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => updateDoc('coverImage', null)}
                    >
                      Xóa
                    </AdminButton>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <ImageIcon size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs text-slate-500 mb-3">Chưa có ảnh đại diện</p>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} />}
                    onClick={() => setMediaDialogTarget('cover')}
                  >
                    Chọn từ thư viện
                  </AdminButton>
                </div>
              )}
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
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Chọn sản phẩm liên quan</h3>
              <button
                type="button"
                onClick={() => setProductSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    handleSearchProducts(e.target.value);
                  }}
                  placeholder="Tìm kiếm sản phẩm theo tên, model..."
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded border border-slate-200 bg-white" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="text-slate-500 font-mono">
                            {p.price ? `${p.price.toLocaleString('vi-VN')}₫` : 'Liên hệ'} • {p.isPublished ? 'Đang công khai' : 'Bản nháp'}
                          </div>
                        </div>
                      </div>

                      <AdminButton
                        type="button"
                        size="sm"
                        variant={isSelected ? 'ghost' : 'secondary'}
                        disabled={isSelected}
                        onClick={() => {
                          addRelatedProduct(p);
                        }}
                      >
                        {isSelected ? 'Đã thêm' : 'Chọn'}
                      </AdminButton>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <AdminButton size="sm" variant="primary" onClick={() => setProductSearchOpen(false)}>
                Hoàn tất
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal / Drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Lịch sử phiên bản (Revisions)</h3>
                <p className="text-xs text-slate-500">Mỗi lần Lưu nháp hoặc Xuất bản tạo ra 1 revision bất biến. Khôi phục sẽ tạo 1 bản nháp mới.</p>
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
              {doc.coverImage?.assetId && (
                <div className="max-h-80 overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/library/${doc.coverImage.assetId}`}
                    alt={doc.coverImage.alt || doc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{doc.title || '(Chưa có tiêu đề)'}</h1>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Tác giả: {doc.authorName || 'Ban biên tập CitiLap'}</span>
                  <span>•</span>
                  <span>Ngày: {new Date().toLocaleDateString('vi-VN')}</span>
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
                <p className="text-sm italic text-slate-600 p-3 bg-slate-50 border-l-4 border-blue-500 rounded">
                  {doc.excerpt}
                </p>
              )}

              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: doc.contentHtml || '<p class="text-slate-400">Chưa có nội dung bài viết.</p>' }}
              />
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => setPreviewOpen(false)}>
                Đóng xem trước
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
