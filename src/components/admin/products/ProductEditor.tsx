'use client';
import { useRef } from 'react';
import { useDraftAutosave } from '@/components/admin/useDraftAutosave';
import DraftRecovery from '@/components/admin/DraftRecovery';
import SchedulePanel from '@/components/admin/SchedulePanel';
import InspectionEditor from './InspectionEditor';
import ProductStorefrontFields from './ProductStorefrontFields';
import { productHref } from '@/lib/product-paths';


import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { catalogNeedTag } from '@/lib/catalog-needs';

const NEED_PRESETS = [
  { key: 'gaming', label: 'Gaming', icon: '🎮' },
  { key: 'van-phong', label: 'Văn phòng', icon: '💼' },
  { key: 'mong-nhe', label: 'Mỏng nhẹ', icon: '🪶' },
  { key: 'do-hoa', label: 'Đồ họa – kỹ thuật', icon: '🎨' },
  { key: 'sinh-vien', label: 'Sinh viên', icon: '🎓' },
  { key: 'cam-ung', label: 'Cảm ứng', icon: '👆' },
  { key: 'laptop-ai', label: 'Laptop AI', icon: '⚡' },
  { key: 'doanh-nhan', label: 'Doanh nhân', icon: '👔' },
];
import {
  Save,
  Globe,
  Eye,
  EyeOff,
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Layers,
  Cpu,
  DollarSign,
  FileText,
  Search,
  ExternalLink,
  History,
  ArrowUp,
  ArrowDown,
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
import {
  attributeTemplates,
  attributeTemplateDefinitions,
  availabilityLabels,
  conditionLabels,
  blankProduct,
  type ProductDocument,
  type ProductTemplate,
} from '@/contracts/cms/product-studio';
import MediaBrowser, { mediaRequest } from '../media/MediaBrowser';
import MediaDialog from '../media/MediaDialog';
import MediaUpload from '../media/MediaUpload';
import StudioAsset from './StudioAsset';
import RichContentEditor from './RichContentEditor';

interface DetailResponse {
  id: string;
  revision: number;
  document: ProductDocument;
  published: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
}

interface BrandOption {
  id: string;
  name: string;
  status?: string;
}

interface ProductEditorProps {
  id?: string | null;
}

type TabKey = 'info' | 'specs' | 'pricing' | 'media' | 'content' | 'seo' | 'history';

interface RevisionItem {
  revision: number;
  action: string;
  createdAt: string;
  actorName: string;
  summary: string;
  isCurrent: boolean;
  isPublished: boolean;
  isLegacy: boolean;
}

interface SnapshotDetail {
  productId: string;
  revision: number;
  action: string;
  createdAt: string;
  document: ProductDocument;
}

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export default function ProductEditor({ id }: ProductEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [doc, setDoc] = useState<ProductDocument | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const latestDoc=useRef(doc), saveLock=useRef(false);
  useEffect(()=>{latestDoc.current=doc;},[doc]);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [baseline, setBaseline] = useState<string>('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Media picker & Preview states
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [contentMediaPickerOpen, setContentMediaPickerOpen] = useState<boolean>(false);
  const [mediaRefresh, setMediaRefresh] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  // Revision & Restore states
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState<boolean>(false);
  const [selectedRevisionSnapshot, setSelectedRevisionSnapshot] = useState<SnapshotDetail | null>(null);
  const [restoreConfirmRev, setRestoreConfirmRev] = useState<RevisionItem | null>(null);
  const [restoring, setRestoring] = useState<boolean>(false);

  // Related products picker states
  const [relatedPickerOpen, setRelatedPickerOpen] = useState<boolean>(false);
  const [relatedSearch, setRelatedSearch] = useState<string>('');
  const [relatedCandidates, setRelatedCandidates] = useState<{ id: string; name: string; sku?: string; image?: string; price: number }[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);

  const isDirty = !!doc && JSON.stringify(doc) !== baseline;

  // Load categories, brands, and product data
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch categories
      const catRes = await fetch('/api/categories').then(r => r.json()).catch(() => ({ success: false }));
      if (catRes.success && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      } else {
        const studioRes = await mediaRequest<{ categories: CategoryOption[] }>('/api/admin/product-studio').catch(() => null);
        if (studioRes?.categories) setCategories(studioRes.categories);
      }

      // 2. Fetch canonical brands
      const brandRes = await mediaRequest<{ items: BrandOption[] }>('/api/admin/brands').catch(() => null);
      if (brandRes?.items && Array.isArray(brandRes.items)) {
        setBrands(brandRes.items);
      }

      // 3. Fetch product if editing
      if (id) {
        const detail = await mediaRequest<DetailResponse>(`/api/admin/products/${id}`);
        setDoc(detail.document);
        setRevision(detail.revision);
        setIsPublished(detail.published);
        setBaseline(JSON.stringify(detail.document));
      } else {
        const initial = blankProduct();
        setDoc(initial);
        setRevision(0);
        setIsPublished(false);
        setBaseline(JSON.stringify(initial));
      }
    } catch (err) {
      setLoadError((err as Error).message || 'Không thể tải dữ liệu sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateDoc = <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => {
    setDoc(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSlugify = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const fetchRelatedCandidates = async (query: string) => {
    setLoadingRelated(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '12');
      if (query.trim()) params.set('q', query.trim());
      const res = await mediaRequest<{ items: { id: string; name: string; sku?: string; image?: string; price: number }[] }>(`/api/admin/products?${params.toString()}`);
      setRelatedCandidates((res.items || []).filter(item => item.id !== id));
    } catch {
      setRelatedCandidates([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const ALL_TEMPLATES: { key: ProductTemplate; label: string }[] = [
    { key: 'LAPTOP', label: 'Laptop' },
    { key: 'MOUSE', label: 'Chuột Gaming' },
    { key: 'KEYBOARD', label: 'Bàn phím cơ' },
    { key: 'HEADPHONE', label: 'Tai nghe' },
    { key: 'CHARGER', label: 'Củ sạc & Cáp' },
    { key: 'HUB', label: 'Hub chuyển đổi' },
    { key: 'BAG', label: 'Balo & Túi' },
    { key: 'MONITOR', label: 'Màn hình' },
    { key: 'ACCESSORY', label: 'Phụ kiện khác' },
    { key: 'TECH', label: 'Đồ chơi công nghệ' },
  ];

  const handleSwitchTemplate = (newTemplate: ProductTemplate) => {
    if (!doc || newTemplate === doc.template) return;
    const existingSpecs = doc.specs || [];
    const defaultKeys = attributeTemplates[newTemplate] || [];
    const mapped = defaultKeys.map(k => ({
      key: k,
      value: existingSpecs.find(s => s.key === k)?.value || '',
    }));
    const unmapped = existingSpecs.filter(s => !(defaultKeys as readonly string[]).includes(s.key) && s.value.trim() !== '');
    updateDoc('template', newTemplate);
    updateDoc('specs', [...mapped, ...unmapped]);
    if (unmapped.length > 0) {
      setStatusMessage({
        type: 'warning',
        text: `Đã đổi sang mẫu ${newTemplate}. ${unmapped.length} thông số cũ được bảo toàn trong danh sách.`,
      });
    }
  };

  const handleSave = useCallback(async (action: 'save' | 'publish' | 'unpublish') => {
    if (!doc || saveLock.current) return false;
    saveLock.current=true;
    const submitted=JSON.stringify(doc);
    setSaving(true);
    setStatusMessage(null);

    try {
      const endpoint = id ? `/api/admin/products/${id}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';

      const result = await mediaRequest<DetailResponse>(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: revision,
          action,
          document: doc,
        }),
      });

      if(JSON.stringify(latestDoc.current)===submitted)setDoc(result.document);
      setRevision(result.revision);
      setIsPublished(result.published);
      setBaseline(JSON.stringify(result.document));


      if (action === 'publish') {
        setStatusMessage({ type: 'success', text: 'Đã xuất bản sản phẩm lên website thành công.' });
      } else if (action === 'unpublish') {
        setStatusMessage({ type: 'warning', text: 'Đã ẩn sản phẩm khỏi website.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Đã lưu bản nháp an toàn.' });
      }

      if (!id && result.id) {
        router.replace(`/admin/products/${result.id}`);
      }
      return true;
    } catch (err) {
      const errorMsg = (err as Error).message || 'Có lỗi xảy ra khi lưu.';
      setStatusMessage({
        type: 'error',
        text: `${errorMsg} Nội dung vẫn giữ trong trình soạn thảo. Lưu lại trước khi rời trang.`,
      });
      return false;
    } finally {
      saveLock.current=false;
      setSaving(false);
    }
  }, [doc, id, revision, router]);

  const autosaveStatus=useDraftAutosave(doc,revision,!!id && !loading,isDirty,saving,()=>handleSave('save'));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data hydration from API
    void loadData();
  }, [loadData]);

  // Prevent accidental navigation when unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && doc) void handleSave('save');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, doc, handleSave]);

  const fetchRevisions = useCallback(async () => {
    if (!id) return;
    setLoadingRevisions(true);
    try {
      const res = await mediaRequest<{ revisions: RevisionItem[] }>(`/api/admin/products/${id}/revisions`);
      setRevisions(res.revisions || []);
    } catch {
      // ignore
    } finally {
      setLoadingRevisions(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'history' && id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- on-demand fetch when switching to history tab
      void fetchRevisions();
    }
  }, [activeTab, id, fetchRevisions]);

  const handleRestore = async (targetRev: number) => {
    if (!id || saveLock.current) return;
    saveLock.current = true;
    const beforeRestore = JSON.stringify(latestDoc.current);
    setRestoring(true);
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await mediaRequest<{
        success: boolean;
        message: string;
        restoredFromRevision: number;
        newRevision: number;
        document: ProductDocument;
      }>(`/api/admin/products/${id}/revisions/${targetRev}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision }),
      });

      if (JSON.stringify(latestDoc.current) === beforeRestore) setDoc(res.document);
      setRevision(res.newRevision);
      setBaseline(JSON.stringify(res.document));
      setRestoreConfirmRev(null);
      setSelectedRevisionSnapshot(null);
      setStatusMessage({
        type: 'success',
        text: `Đã khôi phục phiên bản #${targetRev} thành bản nháp mới (rev #${res.newRevision}). Website vẫn hiển thị phiên bản hiện tại cho đến khi bạn xuất bản lại.`,
      });
      void fetchRevisions();
    } catch (err) {
      const msg = (err as Error).message || 'Không thể khôi phục phiên bản.';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      saveLock.current = false;
      setSaving(false);
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <AdminLoadingState message="Đang tải dữ liệu sản phẩm..." />
      </div>
    );
  }

  if (loadError || !doc) {
    return (
      <div className="py-12">
        <AdminErrorState
          title="Không thể mở sản phẩm"
          message={loadError || 'Sản phẩm không tồn tại hoặc đã bị xóa.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Layers }[] = [
    { key: 'info', label: 'Thông tin chung', icon: Layers },
    { key: 'specs', label: 'Thông số kỹ thuật', icon: Cpu },
    { key: 'pricing', label: 'Cấu hình & Giá', icon: DollarSign },
    { key: 'media', label: 'Hình ảnh & Video', icon: ImageIcon },
    { key: 'content', label: 'Bài giới thiệu', icon: FileText },
    { key: 'seo', label: 'SEO & Hiển thị', icon: Globe },
    ...(id ? [{ key: 'history' as TabKey, label: 'Lịch sử & Khôi phục', icon: History }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách sản phẩm</span>
        </Link>
        <div className="flex items-center gap-2">
          {id && isPublished && (
            <a
              href={productHref(doc)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded border border-slate-200 bg-white"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Xem trên Web</span>
            </a>
          )}
        </div>
      </div>

      {/* Page Header */}
      <p role="status" aria-live="polite">{autosaveStatus}</p>
      {isDirty && id && <DraftRecovery draft={doc} endpoint={`/api/admin/products/${id}`}/>}
      <SchedulePanel entityType="product" entityId={id} revision={revision} dirty={isDirty || saving}/>
      <PageHeader
        title={id ? doc.name || 'Biên tập sản phẩm' : 'Thêm sản phẩm mới'}
        description={
          id
            ? `Định danh ID: ${id} · Mã URL: ${doc.template === 'LAPTOP' ? '/laptop/' : '/phu-kien/'}${doc.slug || '...'}`
            : 'Tạo sản phẩm Laptop hoặc Phụ kiện với đầy đủ thông số, biến thể và hình ảnh.'
        }
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={isPublished ? 'PUBLISHED' : 'DRAFT'}
              customLabel={isPublished ? 'Đã xuất bản' : 'Bản nháp'}
            />
            {revision > 0 && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                rev #{revision}
              </span>
            )}
            {isDirty && (
              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 font-medium border border-amber-200 rounded animate-pulse">
                Chưa lưu
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              variant="secondary"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setPreviewOpen(true)}
              disabled={saving}
            >
              Xem trước
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={<Save className="w-4 h-4" />}
              onClick={() => void handleSave('save')}
              loading={saving}
            >
              Lưu nháp
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={<Globe className="w-4 h-4" />}
              onClick={() => void handleSave('publish')}
              loading={saving}
            >
              {isPublished ? 'Cập nhật website' : 'Xuất bản website'}
            </AdminButton>
            {isPublished && (
              <AdminButton
                variant="destructive"
                icon={<EyeOff className="w-4 h-4" />}
                onClick={() => void handleSave('unpublish')}
                disabled={saving}
              >
                Ẩn khỏi web
              </AdminButton>
            )}
          </div>
        }
      />

      {/* Alert banner if any */}
      {statusMessage && (
        <InlineAlert
          variant={statusMessage.type}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.text}
        </InlineAlert>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-t-xl px-2 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'info' && (
        <AdminCard title="Thông tin cơ bản" subtitle="Tên hiển thị, định danh URL, thương hiệu và danh mục của sản phẩm.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={e => {
                    const newName = e.target.value;
                    updateDoc('name', newName);
                    if (!id && !doc.slug) {
                      updateDoc('slug', handleSlugify(newName));
                    }
                  }}
                  placeholder="Ví dụ: Lenovo Legion 5 Pro 16ARX8 R7 7845HX RTX 4060"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn (Slug URL) <span className="text-rose-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-slate-100 text-slate-500 border border-r-0 border-slate-300 rounded-l-lg">
                    {doc.template === 'LAPTOP' ? '/laptop/' : '/phu-kien/'}
                  </span>
                  <input
                    type="text"
                    value={doc.slug}
                    onChange={e => updateDoc('slug', e.target.value.toLowerCase().trim())}
                    placeholder="lenovo-legion-5-pro-16arx8"
                    className="flex-1 text-sm border border-slate-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="product-tags" className="block text-xs font-bold text-slate-800">
                  Thẻ tag & Nhu cầu sử dụng
                </label>
                <span className="text-[11px] text-slate-500">
                  Chọn nhanh nhu cầu chuẩn để khách hàng lọc chính xác ở trang phân loại
                </span>
              </div>

              {/* Gợi ý chọn nhanh nhu cầu chuẩn */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Gợi ý chọn nhanh nhu cầu chuẩn:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {NEED_PRESETS.map((preset) => {
                    const normalizedTags = (doc.tags || []).map(catalogNeedTag);
                    const isSelected = normalizedTags.includes(preset.key);
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          const currentTags = doc.tags || [];
                          let newTags: string[];
                          if (isSelected) {
                            newTags = currentTags.filter(t => catalogNeedTag(t) !== preset.key);
                          } else {
                            newTags = [...currentTags, preset.key];
                          }
                          updateDoc('tags', [...new Set(newTags.map(t => t.trim().toLocaleLowerCase('vi-VN')).filter(Boolean))]);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                        {isSelected && <span className="ml-0.5 text-[10px] font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Input tự do */}
              <div>
                <input
                  id="product-tags"
                  type="text"
                  value={(doc.tags || []).join(', ')}
                  maxLength={1858}
                  onChange={e => updateDoc('tags', e.target.value.split(',').map(tag => tag.trimStart()))}
                  onBlur={() => updateDoc('tags', [...new Set((doc.tags || []).map(tag => tag.trim().toLocaleLowerCase('vi-VN')).filter(Boolean))])}
                  placeholder="gaming, sinh-vien, van-phong, do-hoa, mong-nhe..."
                  aria-describedby="product-tags-help"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p id="product-tags-help" className="mt-1 text-[11px] text-slate-500">
                  Tối đa 30 tag, mỗi tag 60 ký tự. Ngăn cách bằng dấu phẩy.
                </p>
              </div>

              {/* Danh sách tag đã gắn kèm nút xóa */}
              {(doc.tags || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Đã gắn ({doc.tags.length}):</span>
                  {doc.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          const newTags = (doc.tags || []).filter((_, idx) => idx !== i);
                          updateDoc('tags', newTags);
                        }}
                        className="text-blue-400 hover:text-blue-700 font-bold ml-0.5"
                        aria-label={`Xóa tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Danh mục sản phẩm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={doc.categoryId}
                  onChange={e => updateDoc('categoryId', e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thương hiệu / Hãng sản xuất
                </label>
                <div className="space-y-1.5">
                  <select
                    value={doc.brandId || (brands.find(b => b.name.toLowerCase() === (doc.brand || '').toLowerCase())?.id ?? '')}
                    onChange={e => {
                      const selectedId = e.target.value;
                      if (!selectedId || selectedId === '__custom__') {
                        updateDoc('brandId', null);
                      } else {
                        const b = brands.find(item => item.id === selectedId);
                        if (b) {
                          updateDoc('brandId', b.id);
                          updateDoc('brand', b.name);
                        }
                      }
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                  >
                    <option value="">-- Chọn thương hiệu đã lưu --</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.status === 'INACTIVE' ? ' (Tạm ẩn)' : ''}
                      </option>
                    ))}
                    <option value="__custom__">Nhập tên khác (Tự do / Chưa chuẩn hóa)...</option>
                  </select>
                  {(!doc.brandId || !brands.some(b => b.id === doc.brandId)) && (
                    <input
                      type="text"
                      value={doc.brand}
                      onChange={e => updateDoc('brand', e.target.value)}
                      placeholder="Nhập tên thương hiệu (ví dụ: Lenovo, Dell...)"
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tình trạng máy (Condition)
                </label>
                <select
                  value={doc.condition || 'NEW'}
                  onChange={e => updateDoc('condition', e.target.value as ProductDocument['condition'])}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                >
                  {Object.entries(conditionLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái nhận đơn trên Website
                </label>
                <select
                  value={doc.availability}
                  onChange={e => updateDoc('availability', e.target.value as ProductDocument['availability'])}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                >
                  {Object.entries(availabilityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label} ({key})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Marketing Labels */}
            <div className="pt-2 pb-1 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-700 mb-2">Nhãn tiếp thị & Nổi bật trên Website:</span>
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isNewArrival}
                    onChange={e => updateDoc('isNewArrival', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hàng mới về (New Arrival)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isBestSeller}
                    onChange={e => updateDoc('isBestSeller', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bán chạy (Best Seller)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isFeatured}
                    onChange={e => updateDoc('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Sản phẩm nổi bật (Featured)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-red-600 bg-red-50/70 border border-red-200/60 px-2.5 py-1 rounded-lg hover:bg-red-100/70 transition">
                  <input
                    type="checkbox"
                    checked={!!doc.isFlashSale}
                    onChange={e => updateDoc('isFlashSale', e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Flash Sale cũ</span>
                </label>
                <Link href="/admin/campaigns" className="text-xs font-bold text-red-700 underline">Chọn sản phẩm cho chiến dịch HOT SALE</Link>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả ngắn (Hiển thị đầu trang sản phẩm)
              </label>
              <textarea
                rows={3}
                value={doc.description}
                onChange={e => updateDoc('description', e.target.value)}
                placeholder="Tóm tắt điểm nhấn nổi bật về cấu hình, đối tượng sử dụng..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>

            {/* Related Products Section */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-700">Sản phẩm liên quan / Đề xuất:</span>
                  <span className="block text-[11px] text-slate-500">Chọn tối đa 10 sản phẩm đề xuất cùng phân khúc hoặc phụ kiện tương thích</span>
                </div>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setRelatedPickerOpen(true);
                    void fetchRelatedCandidates('');
                  }}
                >
                  Chọn sản phẩm
                </AdminButton>
              </div>

              {(doc.relatedProductIds || []).length === 0 ? (
                <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
                  Chưa chọn sản phẩm liên quan thủ công. Hệ thống sẽ tự động đề xuất các sản phẩm cùng danh mục/thương hiệu.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(doc.relatedProductIds || []).map((relId, rIdx) => (
                    <div key={relId} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {rIdx + 1}
                        </span>
                        <span className="font-mono font-medium text-slate-800">{relId}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={rIdx === 0}
                          onClick={() => {
                            const arr = [...(doc.relatedProductIds || [])];
                            const tmp = arr[rIdx - 1];
                            arr[rIdx - 1] = arr[rIdx];
                            arr[rIdx] = tmp;
                            updateDoc('relatedProductIds', arr);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={rIdx === (doc.relatedProductIds?.length || 0) - 1}
                          onClick={() => {
                            const arr = [...(doc.relatedProductIds || [])];
                            const tmp = arr[rIdx + 1];
                            arr[rIdx + 1] = arr[rIdx];
                            arr[rIdx] = tmp;
                            updateDoc('relatedProductIds', arr);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateDoc('relatedProductIds', (doc.relatedProductIds || []).filter(item => item !== relId));
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Xóa liên kết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminCard>
      )}

      {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
      {activeTab === 'specs' && (
        <AdminCard
          title="Thông số kỹ thuật"
          subtitle="Thiết lập mẫu thông số cho Laptop, Chuột, Bàn phím hoặc Phụ kiện. Các trường này đồng bộ với bộ lọc tìm kiếm và bảng so sánh trên website."
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Mẫu thông số kỹ thuật (Template):</span>
                <span className="text-[11px] text-slate-500">Đổi mẫu tự động điền danh mục trường chuẩn và giữ lại các trường cũ</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TEMPLATES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleSwitchTemplate(t.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition cursor-pointer ${
                      doc.template === t.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doc.specs.map((spec, idx) => {
                const def = attributeTemplateDefinitions[doc.template]?.find(d => d.key === spec.key);
                const isCustom = !(attributeTemplates[doc.template] as readonly string[])?.includes(spec.key);
                return (
                  <div key={spec.key || idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700">{spec.key}</span>
                        {def?.unit && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{def.unit}</span>}
                        {isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">Tùy chỉnh</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDoc('specs', doc.specs.filter((_, i) => i !== idx))}
                        className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Xóa thông số này"
                      >
                        Xóa
                      </button>
                    </div>

                    <input
                      type="text"
                      value={spec.value}
                      onChange={e =>
                        updateDoc(
                          'specs',
                          doc.specs.map((s, i) => (i === idx ? { ...s, value: e.target.value } : s))
                        )
                      }
                      placeholder={def ? `Nhập ${def.label}...` : 'Nhập giá trị...'}
                      className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />

                    {def?.options && def.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 self-center mr-0.5">Gợi ý:</span>
                        {def.options.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              updateDoc(
                                'specs',
                                doc.specs.map((s, i) => (i === idx ? { ...s, value: opt } : s))
                              )
                            }
                            className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                              spec.value === opt
                                ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              {!doc.specs.some(spec => spec.key === 'Năm ra mắt') && <AdminButton variant="secondary" size="sm" onClick={() => updateDoc('specs',[...doc.specs,{key:'Năm ra mắt',value:''}])}>Thêm năm ra mắt cho bộ lọc</AdminButton>}
              <AdminButton
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  const keyName = prompt('Nhập tên thông số mới:');
                  if (keyName && keyName.trim()) {
                    updateDoc('specs', [...doc.specs, { key: keyName.trim(), value: '' }]);
                  }
                }}
              >
                Thêm thông số tùy chỉnh
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* TAB 3: CẤU HÌNH & GIÁ */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <AdminCard title="Giá bán chung" subtitle="Giá bán tham chiếu của sản phẩm khi chưa chọn biến thể.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá bán niêm yết (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={doc.price}
                  onChange={e => updateDoc('price', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-sm font-semibold text-blue-600 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">{money(doc.price)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá gốc / Giá hãng (VNĐ - Để trống nếu không giảm giá)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={doc.originalPrice ?? ''}
                  onChange={e =>
                    updateDoc(
                      'originalPrice',
                      e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                {doc.originalPrice != null && doc.originalPrice > doc.price && (
                  <span className="text-xs text-emerald-600 mt-1 block font-medium">
                    Giảm {money(doc.originalPrice - doc.price)} (-
                    {Math.round(((doc.originalPrice - doc.price) / doc.originalPrice) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </AdminCard>

          <AdminCard
            title="Danh sách biến thể / Cấu hình"
            subtitle={
              doc.template === 'LAPTOP'
                ? 'Các tùy chọn RAM, SSD, Card đồ họa hoặc màu sắc. Khách hàng sẽ chọn biến thể này khi đặt mua.'
                : 'Các tùy chọn màu sắc, switch, kết nối, công suất hoặc phân loại tương ứng với phụ kiện.'
            }
          >
            <div className="space-y-4">
              {doc.variants.map((variant, idx) => (
                <div key={variant.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Biến thể {idx + 1}: {variant.name || variant.sku || 'Chưa đặt tên'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateDoc('variants', doc.variants.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Xóa biến thể
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-500 mb-0.5">Tên hiển thị biến thể</label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={e =>
                          updateDoc(
                            'variants',
                            doc.variants.map((v, i) => (i === idx ? { ...v, name: e.target.value } : v))
                          )
                        }
                        placeholder={
                          doc.template === 'LAPTOP'
                            ? '16GB / 512GB / RTX 4060'
                            : doc.template === 'KEYBOARD'
                            ? 'Red Switch - Màu Trắng'
                            : doc.template === 'CHARGER'
                            ? '65W GaN - Đen'
                            : 'Màu Đen / Bản Tiêu chuẩn'
                        }
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Mã SKU</label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={e =>
                          updateDoc(
                            'variants',
                            doc.variants.map((v, i) =>
                              i === idx ? { ...v, sku: e.target.value.toUpperCase().trim() } : v
                            )
                          )
                        }
                        placeholder="SKU-001"
                        className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Giá bán (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={variant.price}
                        onChange={e =>
                          updateDoc(
                            'variants',
                            doc.variants.map((v, i) =>
                              i === idx ? { ...v, price: parseInt(e.target.value, 10) || 0 } : v
                            )
                          )
                        }
                        className="w-full text-xs font-semibold text-blue-600 border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Trạng thái kho</label>
                      <select
                        value={variant.availability || 'AVAILABLE'}
                        onChange={e =>
                          updateDoc(
                            'variants',
                            doc.variants.map((v, i) =>
                              i === idx ? { ...v, availability: e.target.value as typeof v.availability } : v
                            )
                          )
                        }
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white cursor-pointer"
                      >
                        <option value="AVAILABLE">Còn hàng</option>
                        <option value="OUT_OF_STOCK">Hết hàng</option>
                        <option value="PREORDER">Đặt trước</option>
                        <option value="CONTACT">Liên hệ</option>
                      </select>
                    </div>
                  </div>

                  {/* Template specific fields */}
                  {doc.template === 'LAPTOP' ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 border-t border-slate-200">
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">RAM</label>
                        <input
                          type="text"
                          value={variant.ram || ''}
                          onChange={e =>
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) => (i === idx ? { ...v, ram: e.target.value } : v))
                            )
                          }
                          placeholder="16GB DDR5"
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Ổ cứng SSD</label>
                        <input
                          type="text"
                          value={variant.storage || ''}
                          onChange={e =>
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) => (i === idx ? { ...v, storage: e.target.value } : v))
                            )
                          }
                          placeholder="512GB NVMe"
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Card GPU</label>
                        <input
                          type="text"
                          value={variant.gpu || ''}
                          onChange={e =>
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) => (i === idx ? { ...v, gpu: e.target.value } : v))
                            )
                          }
                          placeholder="RTX 4060 8GB"
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Tình trạng</label>
                        <select
                          value={variant.condition}
                          onChange={e =>
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) =>
                                i === idx ? { ...v, condition: e.target.value as typeof v.condition } : v
                              )
                            )
                          }
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white cursor-pointer"
                        >
                          <option value="NEW">Mới 100%</option>
                          <option value="LIKE_NEW">Like New 99%</option>
                          <option value="USED">Đã qua sử dụng</option>
                          <option value="REFURBISHED">Tân trang</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 border-t border-slate-200">
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Màu sắc</label>
                        <input
                          type="text"
                          value={variant.options?.color || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) => {
                                if (i !== idx) return v;
                                const nextOpts = { ...(v.options || {}) };
                                if (val) nextOpts.color = val;
                                else delete nextOpts.color;
                                return { ...v, options: nextOpts };
                              })
                            );
                          }}
                          placeholder="Ví dụ: Đen, Trắng, Xám..."
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      {doc.template === 'KEYBOARD' && (
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">Loại Switch</label>
                          <input
                            type="text"
                            value={variant.options?.switch || ''}
                            onChange={e => {
                              const val = e.target.value;
                              updateDoc(
                                'variants',
                                doc.variants.map((v, i) => {
                                  if (i !== idx) return v;
                                  const nextOpts = { ...(v.options || {}) };
                                  if (val) nextOpts.switch = val;
                                  else delete nextOpts.switch;
                                  return { ...v, options: nextOpts };
                                })
                              );
                            }}
                            placeholder="Ví dụ: Red, Blue, Brown..."
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      )}

                      {(doc.template === 'MOUSE' || doc.template === 'HEADPHONE') && (
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">Kiểu kết nối</label>
                          <input
                            type="text"
                            value={variant.options?.connection || ''}
                            onChange={e => {
                              const val = e.target.value;
                              updateDoc(
                                'variants',
                                doc.variants.map((v, i) => {
                                  if (i !== idx) return v;
                                  const nextOpts = { ...(v.options || {}) };
                                  if (val) nextOpts.connection = val;
                                  else delete nextOpts.connection;
                                  return { ...v, options: nextOpts };
                                })
                              );
                            }}
                            placeholder="Ví dụ: Wireless 2.4G, Bluetooth..."
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      )}

                      {doc.template === 'CHARGER' && (
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">Công suất</label>
                          <input
                            type="text"
                            value={variant.options?.power || ''}
                            onChange={e => {
                              const val = e.target.value;
                              updateDoc(
                                'variants',
                                doc.variants.map((v, i) => {
                                  if (i !== idx) return v;
                                  const nextOpts = { ...(v.options || {}) };
                                  if (val) nextOpts.power = val;
                                  else delete nextOpts.power;
                                  return { ...v, options: nextOpts };
                                })
                              );
                            }}
                            placeholder="Ví dụ: 65W, 100W, 140W..."
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      )}

                      {doc.template === 'BAG' && (
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">Kích cỡ / Tương thích</label>
                          <input
                            type="text"
                            value={variant.options?.size || ''}
                            onChange={e => {
                              const val = e.target.value;
                              updateDoc(
                                'variants',
                                doc.variants.map((v, i) => {
                                  if (i !== idx) return v;
                                  const nextOpts = { ...(v.options || {}) };
                                  if (val) nextOpts.size = val;
                                  else delete nextOpts.size;
                                  return { ...v, options: nextOpts };
                                })
                              );
                            }}
                            placeholder="Ví dụ: 14 inch, 15.6 inch..."
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Tình trạng</label>
                        <select
                          value={variant.condition}
                          onChange={e =>
                            updateDoc(
                              'variants',
                              doc.variants.map((v, i) =>
                                i === idx ? { ...v, condition: e.target.value as typeof v.condition } : v
                              )
                            )
                          }
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white cursor-pointer"
                        >
                          <option value="NEW">Mới 100%</option>
                          <option value="LIKE_NEW">Like New 99%</option>
                          <option value="USED">Đã qua sử dụng</option>
                          <option value="REFURBISHED">Tân trang</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <AdminButton
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  const newSku = `${doc.slug || 'SP'}-${doc.variants.length + 1}`.toUpperCase();
                  updateDoc('variants', [
                    ...doc.variants,
                    {
                      id: crypto.randomUUID(),
                      name: '',
                      sku: newSku,
                      condition: 'NEW',
                      price: doc.price,
                      ram: '',
                      storage: '',
                      gpu: '',
                      options: {},
                      image: '',
                      availability: 'AVAILABLE',
                    },
                  ]);
                }}
              >
                Thêm cấu hình mới
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard
            title="Gói bảo hành tùy chọn"
            subtitle="Các gói bảo hành mở rộng đi kèm sản phẩm (ví dụ: Bảo hành vàng 12 tháng, Đổi mới 30 ngày)."
          >
            <div className="space-y-4">
              {doc.warranties.map((w, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Gói {idx + 1}: {w.name || 'Chưa đặt tên'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateDoc('warranties', doc.warranties.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      Xóa gói
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Tên gói bảo hành</label>
                      <input
                        type="text"
                        value={w.name}
                        onChange={e =>
                          updateDoc(
                            'warranties',
                            doc.warranties.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                          )
                        }
                        placeholder="Bảo hành tiêu chuẩn 12 tháng"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Điều chỉnh giá (VNĐ, 0 = Đã kèm)</label>
                      <input
                        type="number"
                        step="10000"
                        value={w.adjustment}
                        onChange={e =>
                          updateDoc(
                            'warranties',
                            doc.warranties.map((item, i) =>
                              i === idx ? { ...item, adjustment: parseInt(e.target.value, 10) || 0 } : item
                            )
                          )
                        }
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={w.recommended}
                          onChange={e =>
                            updateDoc(
                              'warranties',
                              doc.warranties.map((item, i) => ({
                                ...item,
                                recommended: i === idx ? e.target.checked : false,
                              }))
                            )
                          }
                          className="rounded text-blue-600 cursor-pointer"
                        />
                        <span>Đánh dấu &quot;Khuyên dùng&quot;</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Mô tả quyền lợi bảo hành</label>
                    <input
                      type="text"
                      value={w.description}
                      onChange={e =>
                        updateDoc(
                          'warranties',
                          doc.warranties.map((item, i) =>
                            i === idx ? { ...item, description: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Bao test 1 đổi 1 trong 15 ngày, bảo hành phần cứng 12 tháng..."
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                </div>
              ))}

              <AdminButton
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  updateDoc('warranties', [
                    ...doc.warranties,
                    {
                      name: 'Bảo hành tiêu chuẩn CitiLap',
                      description: 'Bảo hành phần cứng 12 tháng, hỗ trợ trọn đời phần mềm.',
                      adjustment: 0,
                      recommended: doc.warranties.length === 0,
                    },
                  ]);
                }}
              >
                Thêm gói bảo hành
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {/* TAB 4: HÌNH ẢNH & VIDEO */}
      {activeTab === 'media' && (
        <AdminCard
          title="Thư viện hình ảnh & Video"
          subtitle="Ảnh đầu tiên sẽ là ảnh đại diện (Thumbnail). Tích hợp trực tiếp từ Thư viện Media Cloudflare R2."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs text-slate-500">
                Đã chọn {doc.media.length} ảnh/video cho sản phẩm này.
              </span>
              <AdminButton
                variant="primary"
                size="sm"
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                onClick={() => setPickerOpen(true)}
              >
                Chọn ảnh từ Thư viện Media
              </AdminButton>
            </div>

            {doc.media.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Chưa có ảnh nào được gắn vào sản phẩm</p>
                <p className="text-xs text-slate-400 mt-1">Bấm nút trên để chọn từ Thư viện Media</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doc.media.map((item, idx) => (
                  <div
                    key={item.assetId}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex gap-3 items-start shadow-sm"
                  >
                    <div className="w-24 h-24 relative bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      <StudioAsset id={item.assetId} />
                      <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 bg-black/70 text-white rounded">
                        {idx === 0 ? 'Đại diện' : `#${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Mô tả ảnh (ALT) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.alt}
                          onChange={e =>
                            updateDoc(
                              'media',
                              doc.media.map((m, i) => (i === idx ? { ...m, alt: e.target.value } : m))
                            )
                          }
                          placeholder="Mô tả góc chụp, máy..."
                          className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Gán cho cấu hình
                        </label>
                        <select
                          value={item.variantId}
                          onChange={e =>
                            updateDoc(
                              'media',
                              doc.media.map((m, i) => (i === idx ? { ...m, variantId: e.target.value } : m))
                            )
                          }
                          className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white cursor-pointer"
                        >
                          <option value="">Tất cả cấu hình</option>
                          {doc.variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name || v.sku}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const newMedia = [...doc.media];
                            [newMedia[idx - 1], newMedia[idx]] = [newMedia[idx], newMedia[idx - 1]];
                            updateDoc('media', newMedia);
                          }}
                          className="text-[11px] text-slate-600 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                        >
                          Lên trước
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          disabled={idx === doc.media.length - 1}
                          onClick={() => {
                            const newMedia = [...doc.media];
                            [newMedia[idx + 1], newMedia[idx]] = [newMedia[idx], newMedia[idx + 1]];
                            updateDoc('media', newMedia);
                          }}
                          className="text-[11px] text-slate-600 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                        >
                          Xuống sau
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDoc(
                              'media',
                              doc.media.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          Bỏ ảnh này
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>
      )}

      {/* TAB 5: BÀI GIỚI THIỆU & NỘI DUNG */}
      {activeTab === 'content' && (
        <AdminCard
          title="Bài viết giới thiệu & Đánh giá chi tiết"
          subtitle="Trình biên tập trực quan CMS hỗ trợ tiêu đề, định dạng chữ, chèn ảnh từ Thư viện Media Cloudflare R2 và bảng thông số."
        >
          <div className="space-y-4">
            <RichContentEditor
              value={doc.contentHtml || ''}
              onChange={html => updateDoc('contentHtml', html)}
              onInsertMediaClick={() => setContentMediaPickerOpen(true)}
            />
            <ProductStorefrontFields document={doc} onChange={updateDoc} productId={id} />
          </div>
        </AdminCard>
      )}

      {/* TAB 6: SEO & HIỂN THỊ */}
      {activeTab === 'seo' && (
        <AdminCard
          title="Tối ưu SEO Google & Mạng xã hội"
          subtitle="Thông tin hiển thị khi khách hàng tìm kiếm trên Google hoặc chia sẻ liên kết qua Zalo/Facebook."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề SEO (Title Tag)
              </label>
              <input
                type="text"
                value={doc.seoTitle}
                onChange={e => updateDoc('seoTitle', e.target.value)}
                placeholder="Tên sản phẩm | Chính hãng giá tốt tại CitiLap"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                {doc.seoTitle.length} / 70 ký tự khuyến nghị
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả SEO (Meta Description)
              </label>
              <textarea
                rows={3}
                value={doc.seoDescription}
                onChange={e => updateDoc('seoDescription', e.target.value)}
                placeholder="Mua ngay laptop giá ưu đãi, trả góp 0%, quà tặng hấp dẫn tại CitiLap..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                {doc.seoDescription.length} / 160 ký tự khuyến nghị
              </span>
            </div>

            {/* Google SERP Snippet Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Xem trước kết quả tìm kiếm Google
              </span>
              <div className="text-blue-700 text-base font-medium truncate hover:underline cursor-pointer">
                {doc.seoTitle || doc.name || 'Tiêu đề sản phẩm'}
              </div>
              <div className="text-emerald-700 text-xs truncate">
                https://citilap.vn{doc.template === 'LAPTOP' ? '/laptop/' : '/phu-kien/'}{doc.slug || 'duong-dan-san-pham'}
              </div>
              <div className="text-slate-600 text-xs line-clamp-2">
                {doc.seoDescription || doc.description || 'Mô tả tóm tắt sản phẩm sẽ hiển thị tại đây khi khách hàng tìm kiếm...'}
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* TAB 7: LỊCH SỬ PHIÊN BẢN & KHÔI PHỤC */}
      {activeTab === 'history' && (
        <AdminCard
          title="Lịch sử các phiên bản"
          subtitle="Danh sách các lần chỉnh sửa và xuất bản. Bạn có thể xem chi tiết hoặc khôi phục phiên bản cũ về bản nháp."
        >
          {loadingRevisions ? (
            <div className="py-12">
              <AdminLoadingState message="Đang tải lịch sử phiên bản..." />
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Chưa có phiên bản lịch sử nào được ghi nhận.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Quy tắc khôi phục an toàn:</strong>
                  <span>
                    Khi bấm <strong>Khôi phục thành bản nháp</strong>, dữ liệu phiên bản cũ sẽ được nạp vào Product Studio dưới dạng một bản nháp mới (revision kế tiếp). <strong>Nội dung trên website vẫn được giữ nguyên</strong> cho đến khi bạn chủ động bấm <strong>Xuất bản website</strong>.
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Phiên bản</th>
                      <th className="py-3 px-4">Hành động</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Người thao tác</th>
                      <th className="py-3 px-4">Tóm tắt dữ liệu</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revisions.map(r => (
                      <tr
                        key={r.revision}
                        className={`hover:bg-slate-50/50 transition ${
                          r.isCurrent ? 'bg-blue-50/20 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <span>#{r.revision}</span>
                            {r.isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-normal">
                                Hiện tại
                              </span>
                            )}
                            {r.isPublished && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-normal">
                                Đang hiển thị
                              </span>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.action === 'publish'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.action === 'unpublish'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : r.action === 'restore'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {r.action === 'publish'
                              ? 'Xuất bản'
                              : r.action === 'unpublish'
                              ? 'Ẩn khỏi web'
                              : r.action === 'restore'
                              ? 'Khôi phục'
                              : 'Lưu nháp'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-mono text-slate-600">{r.actorName || 'admin'}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {r.summary}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const snap = await mediaRequest<SnapshotDetail>(
                                    `/api/admin/products/${id}/revisions/${r.revision}`
                                  );
                                  setSelectedRevisionSnapshot(snap);
                                } catch (e) {
                                  alert((e as Error).message);
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestoreConfirmRev(r)}
                              disabled={saving || restoring}
                              className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer disabled:opacity-50"
                            >
                              Khôi phục nháp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {id && <InspectionEditor productId={id} />}

      {/* MEDIA PICKER MODAL */}
      {pickerOpen && (
        <MediaDialog title="Chọn hình ảnh từ Thư viện Media" onClose={() => setPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload onUploaded={() => setMediaRefresh(n => n + 1)} />
            <MediaBrowser
              refresh={mediaRefresh}
              picker
              allowVideo={false}
              onSelect={asset => {
                if (!doc.media.some(m => m.assetId === asset.id)) {
                  updateDoc('media', [
                    ...doc.media,
                    {
                      assetId: asset.id,
                      alt: asset.alt || asset.name || doc.name,
                      variantId: '',
                    },
                  ]);
                }
                setPickerOpen(false);
              }}
            />
          </div>
        </MediaDialog>
      )}

      {/* CONTENT MEDIA PICKER DIALOG */}
      {contentMediaPickerOpen && (
        <MediaDialog title="Chọn ảnh chèn vào bài viết" onClose={() => setContentMediaPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload onUploaded={() => setMediaRefresh(n => n + 1)} />
            <MediaBrowser
              refresh={mediaRefresh}
              picker
              allowVideo={false}
              onSelect={asset => {
                const imgSnippet = `<figure class="my-4 text-center"><img src="${asset.url}" alt="${asset.alt || asset.name || doc.name}" class="rounded-lg shadow-sm mx-auto max-w-full" /><figcaption class="text-xs text-slate-500 mt-1">${asset.alt || asset.name}</figcaption></figure><p><br></p>`;
                updateDoc('contentHtml', (doc.contentHtml || '') + imgSnippet);
                setContentMediaPickerOpen(false);
              }}
            />
          </div>
        </MediaDialog>
      )}

      {/* INSPECT REVISION MODAL */}
      {selectedRevisionSnapshot && (
        <MediaDialog
          title={`Chi tiết phiên bản #${selectedRevisionSnapshot.revision}`}
          onClose={() => setSelectedRevisionSnapshot(null)}
        >
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block">Tên sản phẩm:</span>
                <span className="font-bold text-slate-800">{selectedRevisionSnapshot.document?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Giá niêm yết:</span>
                <span className="font-bold text-blue-600">
                  {money(selectedRevisionSnapshot.document?.price || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tình trạng máy:</span>
                <span className="text-slate-800">{selectedRevisionSnapshot.document?.condition || 'NEW'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Số biến thể cấu hình:</span>
                <span className="text-slate-800">
                  {selectedRevisionSnapshot.document?.variants?.length || 0} biến thể
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Mô tả ngắn:</span>
              <p className="text-xs text-slate-600 p-2 bg-white border rounded">
                {selectedRevisionSnapshot.document?.description || '(Trống)'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <AdminButton variant="secondary" onClick={() => setSelectedRevisionSnapshot(null)}>
                Đóng
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => {
                  setRestoreConfirmRev({
                    revision: selectedRevisionSnapshot.revision,
                    action: selectedRevisionSnapshot.action,
                    createdAt: selectedRevisionSnapshot.createdAt,
                    actorName: 'admin',
                    summary: '',
                    isCurrent: false,
                    isPublished: false,
                    isLegacy: false,
                  });
                  setSelectedRevisionSnapshot(null);
                }}
              >
                Khôi phục bản này
              </AdminButton>
            </div>
          </div>
        </MediaDialog>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreConfirmRev && (
        <MediaDialog
          title={`Xác nhận khôi phục phiên bản #${restoreConfirmRev.revision}`}
          onClose={() => setRestoreConfirmRev(null)}
        >
          <div className="p-4 space-y-4 max-w-md mx-auto">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lưu ý quan trọng</span>
              </div>
              <p>
                Khôi phục sẽ lấy toàn bộ dữ liệu của phiên bản <strong>#{restoreConfirmRev.revision}</strong> và tạo một <strong>bản nháp mới</strong> trong Product Studio.
              </p>
              <p className="font-semibold text-slate-800">
                Website công khai sẽ KHÔNG thay đổi cho đến khi bạn chủ động bấm nút &quot;Xuất bản website&quot;.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AdminButton
                variant="secondary"
                onClick={() => setRestoreConfirmRev(null)}
                disabled={restoring}
              >
                Hủy bỏ
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => void handleRestore(restoreConfirmRev.revision)}
                loading={restoring}
              >
                Đồng ý khôi phục thành nháp
              </AdminButton>
            </div>
          </div>
        </MediaDialog>
      )}

      {/* PREVIEW MODAL */}
      {previewOpen && (
        <MediaDialog title="Xem trước trang sản phẩm (Bản nháp)" onClose={() => setPreviewOpen(false)}>
          <div className="p-4 space-y-6 max-w-4xl mx-auto">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Đây là bản xem trước nội dung nháp trong Admin; bố cục và kiểu dáng hiển thị đầy đủ theo Renderer Storefront.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Hình ảnh sản phẩm</h3>
                <div className="grid grid-cols-3 gap-2">
                  {doc.media.map(m => (
                    <div key={m.assetId} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border">
                      <StudioAsset id={m.assetId} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900">{doc.name || 'Tên sản phẩm'}</h2>
                <div className="text-2xl font-bold text-blue-600">{money(doc.price)}</div>
                {doc.originalPrice != null && (
                  <div className="text-sm text-slate-400 line-through">{money(doc.originalPrice)}</div>
                )}
                <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded inline-block text-slate-700">
                  Trạng thái: {availabilityLabels[doc.availability]}
                </div>
                <p className="text-sm text-slate-600">{doc.description}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Thông số kỹ thuật</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {doc.specs.map(s => (
                  <div key={s.key} className="p-2 bg-slate-50 rounded flex justify-between">
                    <span className="font-semibold text-slate-600">{s.key}:</span>
                    <span className="text-slate-800">{s.value || '--'}</span>
                  </div>
                ))}
              </div>
            </div>

            {doc.variants.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Các cấu hình</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {doc.variants.map(v => (
                    <div key={v.id} className="p-2 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-800">{v.name || v.sku}</div>
                      <div className="text-blue-600 font-semibold">{money(v.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </MediaDialog>
      )}

      {/* RELATED PRODUCTS PICKER MODAL */}
      {relatedPickerOpen && (
        <MediaDialog
          title="Chọn sản phẩm liên quan / Đề xuất mua kèm"
          onClose={() => setRelatedPickerOpen(false)}
        >
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={e => {
                    const val = e.target.value;
                    setRelatedSearch(val);
                    void fetchRelatedCandidates(val);
                  }}
                  placeholder="Tìm sản phẩm theo tên hoặc SKU..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
              {loadingRelated ? (
                <div className="p-8 text-center text-xs text-slate-500">Đang tìm sản phẩm...</div>
              ) : relatedCandidates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
              ) : (
                relatedCandidates.map(candidate => {
                  const isSelected = (doc.relatedProductIds || []).includes(candidate.id);
                  const isMax = (doc.relatedProductIds || []).length >= 10;
                  return (
                    <div
                      key={candidate.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {candidate.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.image}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                            SP
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {candidate.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            {candidate.sku && <span>SKU: {candidate.sku}</span>}
                            <span className="text-blue-600 font-medium">{money(candidate.price)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateDoc(
                                'relatedProductIds',
                                (doc.relatedProductIds || []).filter(item => item !== candidate.id)
                              );
                            }}
                            className="text-xs px-2.5 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isMax}
                            onClick={() => {
                              if (isMax) return;
                              updateDoc('relatedProductIds', [
                                ...(doc.relatedProductIds || []),
                                candidate.id,
                              ]);
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                          >
                            {isMax ? 'Đã tối đa 10' : 'Chọn'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Đã chọn: {(doc.relatedProductIds || []).length} / 10 sản phẩm</span>
              <AdminButton variant="primary" size="sm" onClick={() => setRelatedPickerOpen(false)}>
                Hoàn tất
              </AdminButton>
            </div>
          </div>
        </MediaDialog>
      )}
    </div>
  );
}
