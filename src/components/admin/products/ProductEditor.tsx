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
  { key: 'gaming', label: 'Gaming' },
  { key: 'van-phong', label: 'Văn phòng' },
  { key: 'mong-nhe', label: 'Mỏng nhẹ' },
  { key: 'do-hoa', label: 'Đồ họa – kỹ thuật' },
  { key: 'sinh-vien', label: 'Sinh viên' },
  { key: 'cam-ung', label: 'Cảm ứng' },
  { key: 'laptop-ai', label: 'Laptop AI' },
  { key: 'doanh-nhan', label: 'Doanh nhân' },
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
  Check,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
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
  productDocumentSchema,
  type ProductDocument,
  type ProductTemplate,
} from '@/contracts/cms/product-studio';
import MediaBrowser, { mediaRequest } from '../media/MediaBrowser';
import MediaDialog from '../media/MediaDialog';
import MediaUpload from '../media/MediaUpload';
import StudioAsset from './StudioAsset';
import RichContentEditor from './RichContentEditor';
import './editor.css';

interface DetailResponse {
  id: string;
  revision: number;
  document: ProductDocument;
  published: boolean;
  publishedSummary: Pick<ProductDocument, 'name' | 'slug' | 'template' | 'price' | 'availability'> | null;
  hasUnpublishedDraft: boolean;
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

type TabKey = 'info' | 'specs' | 'pricing' | 'media' | 'content' | 'extras' | 'inspection' | 'seo' | 'history';

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
  const createdId = useRef<string | null>(null);
  useEffect(()=>{latestDoc.current=doc;},[doc]);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishedSummary, setPublishedSummary] = useState<DetailResponse['publishedSummary']>(null);
  const [hasUnpublishedDraft, setHasUnpublishedDraft] = useState(false);
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
  const relatedRequest = useRef(0);

  const isDirty = !!doc && JSON.stringify(doc) !== baseline;

  // Load categories, brands, and product data
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, brandRes, detail] = await Promise.all([
        mediaRequest<{ categories: CategoryOption[] }>('/api/admin/products?limit=1'),
        mediaRequest<{ items: BrandOption[] }>('/api/admin/brands'),
        id ? mediaRequest<DetailResponse>(`/api/admin/products/${id}`) : Promise.resolve(null),
      ]);
      setCategories(catalog.categories);
      setBrands(brandRes.items);

      // 3. Fetch product if editing
      if (detail) {
        setDoc(detail.document);
        setRevision(detail.revision);
        setIsPublished(detail.published);
        setPublishedSummary(detail.publishedSummary);
        setHasUnpublishedDraft(detail.hasUnpublishedDraft);
        setBaseline(JSON.stringify(detail.document));
      } else {
        const initial = blankProduct();
        setDoc(initial);
        setRevision(0);
        setIsPublished(false);
        setPublishedSummary(null);
        setHasUnpublishedDraft(false);
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

  // Matrix Generator & Quick Add states
  const [showMatrixGen, setShowMatrixGen] = useState<boolean>(false);
  const [matrixRAMs, setMatrixRAMs] = useState<string[]>(['16GB DDR5', '32GB DDR5']);
  const [matrixSSDs, setMatrixSSDs] = useState<string[]>(['512GB NVMe', '1TB NVMe']);
  const [matrixGPU, setMatrixGPU] = useState<string>('RTX 4060 8GB');
  const [matrixBasePrice, setMatrixBasePrice] = useState<number>(25000000);
  const [matrixStepPrice, setMatrixStepPrice] = useState<number>(2000000);

  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddRam, setQuickAddRam] = useState<string>('');
  const [quickAddStorage, setQuickAddStorage] = useState<string>('');
  const [quickAddGpu, setQuickAddGpu] = useState<string>('');
  const [quickAddCondition, setQuickAddCondition] = useState<'NEW' | 'LIKE_NEW' | 'USED' | 'REFURBISHED'>('NEW');
  const [quickAddSku, setQuickAddSku] = useState<string>('');
  const [quickAddPrice, setQuickAddPrice] = useState<string>('');
  const [quickAddOriginalPrice, setQuickAddOriginalPrice] = useState<string>('');
  const [quickAddAvail, setQuickAddAvail] = useState<'' | 'AVAILABLE' | 'PREORDER' | 'CONTACT' | 'UNAVAILABLE'>('');

  const handleAddQuickVariant = () => {
    if (!doc) return;
    const name = quickAddName.trim();
    const priceNum = parseInt(quickAddPrice, 10);
    const price = !isNaN(priceNum) && priceNum >= 0 ? priceNum : doc.price;
    const sku = (quickAddSku.trim() || `${doc.slug || 'SP'}-${doc.variants.length + 1}`).toUpperCase();
    const origPriceNum = parseInt(quickAddOriginalPrice, 10);
    const originalPrice = !isNaN(origPriceNum) && origPriceNum >= 0 ? origPriceNum : null;

    const autoName = name || (doc.template === 'LAPTOP' 
      ? [quickAddRam, quickAddStorage, quickAddGpu].filter(Boolean).join(' / ') || `Cấu hình ${doc.variants.length + 1}`
      : `Cấu hình ${doc.variants.length + 1}`);

    const newVariant = {
      id: crypto.randomUUID(),
      name: autoName,
      sku,
      condition: quickAddCondition,
      price,
      originalPrice,
      availability: quickAddAvail || undefined,
      ram: quickAddRam.trim() || undefined,
      storage: quickAddStorage.trim() || undefined,
      gpu: quickAddGpu.trim() || undefined,
      options: {},
      image: '',
    };

    updateDoc('variants', [...doc.variants, newVariant]);
    setQuickAddName('');
    setQuickAddRam('');
    setQuickAddStorage('');
    setQuickAddGpu('');
    setQuickAddSku('');
    setQuickAddPrice('');
    setQuickAddOriginalPrice('');
    setQuickAddAvail('');
  };

  const handleCloneVariant = (idx: number) => {
    if (!doc) return;
    const source = doc.variants[idx];
    if (!source) return;
    const newSku = `${source.sku || doc.slug || 'SP'}-COPY-${doc.variants.length + 1}`.toUpperCase();
    const cloned = {
      ...source,
      id: crypto.randomUUID(),
      sku: newSku,
      name: source.name ? `${source.name} (Bản sao)` : `Cấu hình ${doc.variants.length + 1}`,
    };
    const nextVariants = [...doc.variants];
    nextVariants.splice(idx + 1, 0, cloned);
    updateDoc('variants', nextVariants);
  };

  const handleDeleteVariant = (variantId: string) => {
    setDoc(current => current && ({
      ...current,
      variants: current.variants.filter(v => v.id !== variantId),
      media: current.media.map(item => item.variantId === variantId ? { ...item, variantId: '' } : item),
    }));
  };

  const handleGenerateMatrix = () => {
    if (!doc) return;
    const rams = matrixRAMs.length > 0 ? matrixRAMs : ['16GB DDR5'];
    const ssds = matrixSSDs.length > 0 ? matrixSSDs : ['512GB NVMe'];
    const newVariants = [];
    let stepIndex = 0;

    for (const r of rams) {
      for (const s of ssds) {
        const variantPrice = (matrixBasePrice || doc.price) + (stepIndex * matrixStepPrice);
        stepIndex++;
        const ramShort = r.split(' ')[0] || r;
        const ssdShort = s.split(' ')[0] || s;
        newVariants.push({
          id: crypto.randomUUID(),
          name: `${ramShort} · ${ssdShort}${matrixGPU ? ' · ' + matrixGPU.split(' ')[0] : ''}`,
          sku: `${doc.slug || 'SP'}-${ramShort}-${ssdShort}`.toUpperCase(),
          condition: 'NEW' as const,
          price: variantPrice,
          originalPrice: null,
          availability: 'AVAILABLE' as const,
          ram: r,
          storage: s,
          gpu: matrixGPU || undefined,
          options: {},
          image: '',
        });
      }
    }

    updateDoc('variants', [...doc.variants, ...newVariants]);
    setShowMatrixGen(false);
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
    const request = ++relatedRequest.current;
    setLoadingRelated(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '12');
      if (query.trim()) params.set('q', query.trim());
      const res = await mediaRequest<{ items: { id: string; name: string; sku?: string; image?: string; price: number }[] }>(`/api/admin/products?${params.toString()}`);
      if (request === relatedRequest.current) setRelatedCandidates((res.items || []).filter(item => item.id !== id));
    } catch {
      if (request === relatedRequest.current) setRelatedCandidates([]);
    } finally {
      if (request === relatedRequest.current) setLoadingRelated(false);
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
    const validation = productDocumentSchema.safeParse(doc);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const field = String(issue.path[0] || '');
      const labels: Record<string, string> = { name: 'Tên sản phẩm', slug: 'Đường dẫn', categoryId: 'Danh mục', price: 'Giá bán', originalPrice: 'Giá gốc', variants: 'Cấu hình', specs: 'Thông số', media: 'Ảnh', warranties: 'Bảo hành', tags: 'Thẻ tag', faqs: 'Câu hỏi', gifts: 'Quà tặng' };
      setActiveTab(['price', 'originalPrice', 'variants', 'warranties'].includes(field) ? 'pricing' : field === 'media' ? 'media' : field === 'specs' ? 'specs' : ['faqs', 'gifts', 'accessoryProductIds'].includes(field) ? 'extras' : 'info');
      setStatusMessage({ type: 'error', text: field ? `${labels[field] || field}: ${issue.code === 'custom' ? issue.message : 'kiểm tra giá trị, độ dài và trường bắt buộc.'}` : issue.message });
      return false;
    }
    saveLock.current=true;
    const submitted=JSON.stringify(doc);
    setSaving(true);
    setStatusMessage(null);

    try {
      const targetId = id || createdId.current;
      const endpoint = targetId ? `/api/admin/products/${targetId}` : '/api/admin/products';
      const method = targetId ? 'PUT' : 'POST';

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
      setPublishedSummary(result.publishedSummary);
      setHasUnpublishedDraft(result.hasUnpublishedDraft);
      setBaseline(JSON.stringify(result.document));


      if (action === 'publish') {
        setStatusMessage({ type: 'success', text: 'Đã xuất bản sản phẩm lên website thành công.' });
      } else if (action === 'unpublish') {
        setStatusMessage({ type: 'warning', text: 'Đã ẩn sản phẩm khỏi website.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Đã lưu bản nháp an toàn.' });
      }

      if (!id && result.id) {
        createdId.current = result.id;
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

  const autosaveStatus=useDraftAutosave(doc,revision,!!id && !loading && productDocumentSchema.safeParse(doc).success,isDirty,saving,()=>handleSave('save'));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data hydration from API
    void loadData();
  }, [loadData]);

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
      setHasUnpublishedDraft(isPublished);
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

  const tabs: { key: TabKey; label: string; icon: typeof Layers; count?: number }[] = [
    { key: 'info', label: 'Thông tin', icon: Layers },
    { key: 'specs', label: 'Thông số', icon: Cpu, count: doc.specs.filter(s => s.value?.trim()).length },
    { key: 'pricing', label: 'Giá & Cấu hình', icon: DollarSign, count: doc.variants.length },
    { key: 'media', label: 'Ảnh', icon: ImageIcon, count: doc.media.length },
    { key: 'content', label: 'Mô tả', icon: FileText },
    { key: 'extras', label: 'Quà & FAQ', icon: Plus, count: doc.warranties.length + (doc.gifts?.length || 0) },
    { key: 'inspection', label: 'Kiểm định', icon: Cpu },
    { key: 'seo', label: 'SEO', icon: Globe },
    ...(id ? [{ key: 'history' as TabKey, label: 'Lịch sử', icon: History }] : []),
  ];

  return (
    <div className="product-editor space-y-4 pb-12">
      {/* Compact header: back · title · status | view on web */}
      <header className="product-editor-header">
        <Link href="/admin/products" className="product-editor-back" aria-label="Về danh sách sản phẩm" title="Về danh sách sản phẩm">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
        <h1>{id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h1>
        <StatusBadge
          status={isPublished ? 'PUBLISHED' : 'DRAFT'}
          customLabel={isPublished ? 'Đã xuất bản' : 'Bản nháp'}
        />
        {isDirty && <span className="product-editor-dirty">Chưa lưu</span>}
        {revision > 0 && <span className="product-editor-rev" title="Phiên bản">#{revision}</span>}
        {id && isPublished && (
          <a
            href={productHref(publishedSummary || doc)}
            target="_blank"
            rel="noopener noreferrer"
            className="product-editor-viewlink"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Xem trên web</span>
          </a>
        )}
      </header>

      {/* Alert banner if any */}
      {statusMessage && (
        <InlineAlert
          variant={statusMessage.type}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.text}
        </InlineAlert>
      )}

      <div className="product-editor-layout">
      <fieldset disabled={saving} className="product-editor-main min-w-0 space-y-4" aria-label="Biên tập sản phẩm">
      <AdminCard>
            <div className="space-y-3">
              <div>
                <label htmlFor="product-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="product-name"
                  value={doc.name}
                  onChange={e => {
                    const newName = e.target.value;
                    updateDoc('name', newName);
                    if (!id && (!doc.slug || doc.slug === handleSlugify(doc.name))) {
                      updateDoc('slug', handleSlugify(newName));
                    }
                  }}
                  placeholder="Ví dụ: Lenovo Legion 5 Pro 16ARX8 R7 7845HX RTX 4060"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="product-slug" className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn <span className="text-rose-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-slate-100 text-slate-500 border border-r-0 border-slate-300 rounded-l-lg">
                    {productHref({ template: doc.template })}
                  </span>
                  <input
                    type="text"
                    id="product-slug"
                  value={doc.slug}
                    onChange={e => updateDoc('slug', e.target.value.toLowerCase().trim())}
                    placeholder="lenovo-legion-5-pro-16arx8"
                    className="flex-1 text-sm border border-slate-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

      </AdminCard>
      {/* Tab Navigation */}
      <div className="product-editor-tabs" role="tablist" aria-label="Nội dung sản phẩm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={'product-tab-' + tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={'product-panel-' + tab.key}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={event => {
                const current = tabs.findIndex(item => item.key === activeTab);
                const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault();
                setActiveTab(tabs[next].key);
                document.getElementById('product-tab-' + tabs[next].key)?.focus();
              }}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="product-editor-tab"
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
              {typeof tab.count !== 'undefined' && tab.count > 0 && (
                <span className="product-editor-tab-count">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div id={'product-panel-' + activeTab} role="tabpanel" aria-labelledby={'product-tab-' + activeTab} tabIndex={0} className="product-editor-panel">
      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'info' && (
        <AdminCard title="Phân loại">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="product-category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Danh mục <span className="text-rose-500">*</span>
                </label>
                <select
                  id="product-category"
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
                <label htmlFor="product-brand" className="block text-xs font-semibold text-slate-700 mb-1">
                  Thương hiệu
                </label>
                <div className="space-y-1.5">
                  <select
                    id="product-brand"
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
                      aria-label="Tên thương hiệu tùy chỉnh"
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
                  Tình trạng

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
                </select></label>
              </div>

              <div>
                <label htmlFor="product-availability" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhận đơn
                </label>
                <select
                  id="product-availability"
                  value={doc.availability}
                  onChange={e => updateDoc('availability', e.target.value as ProductDocument['availability'])}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                >
                  {Object.entries(availabilityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Marketing Labels */}
            <details className="product-editor-disclosure"><summary>Nhãn nổi bật</summary>
              <div className="flex flex-wrap items-center gap-5 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isNewArrival}
                    onChange={e => updateDoc('isNewArrival', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hàng mới</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isBestSeller}
                    onChange={e => updateDoc('isBestSeller', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bán chạy</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!doc.isFeatured}
                    onChange={e => updateDoc('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Nổi bật</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-red-600 bg-red-50/70 border border-red-200/60 px-2.5 py-1 rounded-lg hover:bg-red-100/70 transition">
                  <input
                    type="checkbox"
                    checked={!!doc.isFlashSale}
                    onChange={e => updateDoc('isFlashSale', e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Flash Sale</span>
                </label>
                <Link href="/admin/campaigns" className="text-xs font-semibold text-red-700 hover:underline">Quản lý Flash Sale →</Link>
              </div>
            </details>

            <div>
              <label htmlFor="product-description" className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả ngắn
              </label>
              <textarea
                rows={3}
                id="product-description"
                value={doc.description}
                onChange={e => updateDoc('description', e.target.value)}
                placeholder="Tóm tắt điểm nhấn cấu hình, đối tượng sử dụng..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>

            <details className="product-editor-disclosure"><summary>Thẻ & nhu cầu <span>{doc.tags.length}</span></summary><div className="space-y-3 pt-3">
              {/* Gợi ý chọn nhanh nhu cầu chuẩn */}
              <div className="flex flex-wrap gap-1.5">
                {NEED_PRESETS.map((preset) => {
                  const normalizedTags = (doc.tags || []).map(catalogNeedTag);
                  const isSelected = normalizedTags.includes(preset.key);
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      aria-pressed={isSelected}
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
                      <span>{preset.label}</span>
                      {isSelected && <Check size={12} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              {/* Tag Input tự do */}
              <div>
                <input
                  id="product-tags"
                  type="text"
                  aria-label="Nhập thẻ cách nhau bằng dấu phẩy"
                  value={(doc.tags || []).join(', ')}
                  maxLength={1858}
                  onChange={e => updateDoc('tags', e.target.value.split(',').map(tag => tag.trimStart()))}
                  onBlur={() => updateDoc('tags', [...new Set((doc.tags || []).map(tag => tag.trim().toLocaleLowerCase('vi-VN')).filter(Boolean))])}
                  placeholder="Nhập thẻ, ngăn cách bằng dấu phẩy (gaming, sinh-vien, van-phong...)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Danh sách tag đã gắn kèm nút xóa */}
              {(doc.tags || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
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
            </div></details>

            {/* Related Products Section */}
            <details className="product-editor-disclosure"><summary>Sản phẩm liên quan <span>{doc.relatedProductIds?.length || 0}</span></summary><div className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tối đa 10 sản phẩm (để trống sẽ tự gợi ý cùng danh mục)</span>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setRelatedPickerOpen(true);
                    void fetchRelatedCandidates('');
                  }}
                >
                  + Chọn
                </AdminButton>
              </div>

              {(doc.relatedProductIds || []).length > 0 && (
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
                          title="Lên"
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
                          title="Xuống"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateDoc('relatedProductIds', (doc.relatedProductIds || []).filter(item => item !== relId));
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div></details>
          </div>
        </AdminCard>
      )}

      {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
      {activeTab === 'specs' && (
        <AdminCard
          title="Thông số"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1">
                {ALL_TEMPLATES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleSwitchTemplate(t.key)}
                    className={`px-2 py-1 text-xs font-medium rounded-md border transition cursor-pointer ${
                      doc.template === t.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {!doc.specs.some(spec => spec.key === 'Năm ra mắt') && (
                <AdminButton variant="secondary" size="sm" onClick={() => updateDoc('specs', [...doc.specs, { key: 'Năm ra mắt', value: '' }])}>
                  + Năm ra mắt
                </AdminButton>
              )}
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
                + Thông số
              </AdminButton>
            </div>
          }
        >
          <div className="variant-matrix-wrapper">
            <table className="compact-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '200px' }}>Thông số</th>
                  <th>Giá trị & Gợi ý</th>
                  <th style={{ width: '44px' }}></th>
                </tr>
              </thead>
              <tbody>
                {doc.specs.map((spec, idx) => {
                  const def = attributeTemplateDefinitions[doc.template]?.find(d => d.key === spec.key);
                  const isCustom = !(attributeTemplates[doc.template] as readonly string[])?.includes(spec.key);
                  return (
                    <tr key={spec.key || idx}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800">{spec.key}</span>
                          {def?.unit && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{def.unit}</span>}
                          {isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">Tùy chỉnh</span>}
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <input
                            type="text"
                            aria-label={spec.key}
                            value={spec.value}
                            onChange={e =>
                              updateDoc(
                                'specs',
                                doc.specs.map((s, i) => (i === idx ? { ...s, value: e.target.value } : s))
                              )
                            }
                            placeholder={def ? `${def.label}...` : 'Nhập giá trị...'}
                            className="matrix-input-cell"
                          />
                          {def?.options && def.options.length > 0 && (
                            <div className="flex flex-wrap gap-1">
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
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
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
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => updateDoc('specs', doc.specs.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa thông số"
                          aria-label={`Xóa ${spec.key}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* TAB 3: CẤU HÌNH & GIÁ */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">


          {(() => {
            const variantPrices = doc.variants.map(v => v.price).filter(p => p > 0);
            const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : doc.price;
            const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : doc.price;

            return (
              <AdminCard
                title={
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-slate-900">Cấu hình</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                      {doc.variants.length}
                    </span>
                    {doc.variants.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {minVariantPrice === maxVariantPrice
                          ? money(minVariantPrice)
                          : `${money(minVariantPrice)} – ${money(maxVariantPrice)}`}
                      </span>
                    )}
                  </div>
                }
                action={
                  <div className="flex items-center gap-2">
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => setShowMatrixGen(!showMatrixGen)}
                    >
                      Sinh nhanh
                    </AdminButton>
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
                          },
                        ]);
                      }}
                      disabled={doc.variants.length >= 40}
                    >
                      + Dòng
                    </AdminButton>
                  </div>
                }
              >
                {/* Collapsible Matrix Generator */}
                {showMatrixGen && (
                  <div className="matrix-generator-panel mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <strong className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Sinh nhanh (RAM × SSD)
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowMatrixGen(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[11px] font-bold text-blue-900 block mb-1.5">RAM</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['8GB DDR5', '16GB DDR5', '32GB DDR5', '64GB DDR5'].map(r => (
                            <label key={r} className="generator-chip-label">
                              <input
                                type="checkbox"
                                checked={matrixRAMs.includes(r)}
                                onChange={e => {
                                  setMatrixRAMs(prev => (e.target.checked ? [...prev, r] : prev.filter(x => x !== r)));
                                }}
                              />
                              <span>{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[11px] font-bold text-blue-900 block mb-1.5">SSD</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['512GB NVMe', '1TB NVMe', '2TB NVMe'].map(s => (
                            <label key={s} className="generator-chip-label">
                              <input
                                type="checkbox"
                                checked={matrixSSDs.includes(s)}
                                onChange={e => {
                                  setMatrixSSDs(prev => (e.target.checked ? [...prev, s] : prev.filter(x => x !== s)));
                                }}
                              />
                              <span>{s}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-2">
                        <div>
                          <span className="text-[11px] font-bold text-blue-900 block mb-0.5">GPU & Giá</span>
                          <input
                            type="text"
                            value={matrixGPU}
                            onChange={e => setMatrixGPU(e.target.value)}
                            placeholder="GPU mặc định"
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 mb-1.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 block">Giá từ</label>
                            <input
                              type="number"
                              value={matrixBasePrice}
                              onChange={e => setMatrixBasePrice(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold text-blue-700 border border-slate-300 rounded px-2 py-1"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 block">Bước giá (+)</label>
                            <input
                              type="number"
                              value={matrixStepPrice}
                              onChange={e => setMatrixStepPrice(Number(e.target.value) || 0)}
                              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <AdminButton variant="secondary" size="sm" onClick={() => setShowMatrixGen(false)}>
                        Hủy
                      </AdminButton>
                      <AdminButton
                        variant="primary"
                        size="sm"
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                        onClick={handleGenerateMatrix}
                      >
                        Tạo {Math.max(1, matrixRAMs.length) * Math.max(1, matrixSSDs.length)} dòng
                      </AdminButton>
                    </div>
                  </div>
                )}

                {/* Compact Spreadsheet Table */}
                <div className="variant-matrix-wrapper">
                  <table className="compact-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                        <th style={{ minWidth: '150px' }}>Tên cấu hình</th>
                        <th style={{ minWidth: '190px' }}>Thông số</th>
                        <th style={{ width: '110px' }}>SKU</th>
                        <th style={{ width: '105px', textAlign: 'right' }}>Giá bán</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Giá gốc</th>
                        <th style={{ width: '115px' }}>Nhận đơn</th>
                        <th style={{ width: '60px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.variants.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            <p className="text-xs mb-2">Chưa có biến thể hoặc cấu hình nào.</p>
                            <AdminButton
                              variant="secondary"
                              size="sm"
                              icon={<Plus className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const newSku = `${doc.slug || 'SP'}-1`.toUpperCase();
                                updateDoc('variants', [
                                  {
                                    id: crypto.randomUUID(),
                                    name: 'Bản Tiêu chuẩn',
                                    sku: newSku,
                                    condition: 'NEW',
                                    price: doc.price,
                                    ram: '',
                                    storage: '',
                                    gpu: '',
                                    options: {},
                                    image: '',
                                  },
                                ]);
                              }}
                            >
                              + Thêm cấu hình đầu tiên
                            </AdminButton>
                          </td>
                        </tr>
                      ) : (
                        doc.variants.map((variant, idx) => (
                          <tr key={variant.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td>
                              <input
                                type="text"
                                aria-label={`Tên cấu hình ${idx + 1}`}
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
                                className="matrix-input-cell font-semibold"
                              />
                            </td>
                            <td>
                              {doc.template === 'LAPTOP' ? (
                                <div className="matrix-specs-grid">
                                  <input
                                    type="text"
                                    value={variant.ram || ''}
                                    onChange={e =>
                                      updateDoc(
                                        'variants',
                                        doc.variants.map((v, i) => (i === idx ? { ...v, ram: e.target.value } : v))
                                      )
                                    }
                                    placeholder="RAM (16GB)"
                                    title="Dung lượng RAM"
                                    className="matrix-mini-input"
                                  />
                                  <input
                                    type="text"
                                    value={variant.storage || ''}
                                    onChange={e =>
                                      updateDoc(
                                        'variants',
                                        doc.variants.map((v, i) => (i === idx ? { ...v, storage: e.target.value } : v))
                                      )
                                    }
                                    placeholder="SSD (512GB)"
                                    title="Ổ cứng SSD"
                                    className="matrix-mini-input"
                                  />
                                  <input
                                    type="text"
                                    value={variant.gpu || ''}
                                    onChange={e =>
                                      updateDoc(
                                        'variants',
                                        doc.variants.map((v, i) => (i === idx ? { ...v, gpu: e.target.value } : v))
                                      )
                                    }
                                    placeholder="GPU (RTX 4060)"
                                    title="Card đồ họa GPU"
                                    className="matrix-mini-input"
                                  />
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
                                    title="Tình trạng máy"
                                    className="matrix-mini-select"
                                  >
                                    <option value="NEW">Mới 100%</option>
                                    <option value="LIKE_NEW">Like New 99%</option>
                                    <option value="USED">Đã qua sử dụng</option>
                                    <option value="REFURBISHED">Tân trang</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="matrix-specs-grid">
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
                                    placeholder="Màu sắc"
                                    className="matrix-mini-input"
                                  />
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
                                    title="Tình trạng"
                                    className="matrix-mini-select"
                                  >
                                    <option value="NEW">Mới 100%</option>
                                    <option value="LIKE_NEW">Like New 99%</option>
                                    <option value="USED">Đã dùng</option>
                                    <option value="REFURBISHED">Tân trang</option>
                                  </select>
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                aria-label={`SKU cấu hình ${idx + 1}`}
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
                                className="matrix-input-cell matrix-input-mono"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                max="2000000000"
                                aria-label={`Giá bán cấu hình ${idx + 1}`}
                                value={variant.price}
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, price: parseInt(e.target.value, 10) || 0 } : v
                                    )
                                  )
                                }
                                className="matrix-input-cell matrix-input-price"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="2000000000"
                                step="1"
                                value={variant.originalPrice ?? ''}
                                placeholder="Không giảm"
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, originalPrice: e.target.value === '' ? null : Number(e.target.value) } : v
                                    )
                                  )
                                }
                                className="matrix-input-cell text-slate-500 text-right"
                              />
                            </td>
                            <td>
                              <select
                                aria-label={`Nhận đơn cấu hình ${idx + 1}`}
                                value={variant.availability || ''}
                                data-val={variant.availability || 'DEFAULT'}
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, availability: (e.target.value || undefined) as typeof v.availability } : v
                                    )
                                  )
                                }
                                className="matrix-select-availability"
                              >
                                <option value="">Theo sản phẩm</option>
                                {Object.entries(availabilityLabels).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title="Nhân bản cấu hình này"
                                  onClick={() => handleCloneVariant(idx)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Xóa biến thể"
                                  onClick={() => handleDeleteVariant(variant.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {/* INLINE QUICK ADD ROW */}
                    <tfoot>
                      <tr className="matrix-quick-add-tr">
                        <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>+</td>
                        <td>
                          <input
                            type="text"
                            value={quickAddName}
                            onChange={e => setQuickAddName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder="Tên cấu hình mới..."
                            className="matrix-input-cell"
                          />
                        </td>
                        <td>
                          {doc.template === 'LAPTOP' ? (
                            <div className="matrix-specs-grid">
                              <input
                                type="text"
                                value={quickAddRam}
                                onChange={e => setQuickAddRam(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddQuickVariant();
                                }}
                                placeholder="RAM (16GB)"
                                className="matrix-mini-input"
                              />
                              <input
                                type="text"
                                value={quickAddStorage}
                                onChange={e => setQuickAddStorage(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddQuickVariant();
                                }}
                                placeholder="SSD (512GB)"
                                className="matrix-mini-input"
                              />
                              <input
                                type="text"
                                value={quickAddGpu}
                                onChange={e => setQuickAddGpu(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddQuickVariant();
                                }}
                                placeholder="GPU"
                                className="matrix-mini-input"
                              />
                              <select
                                value={quickAddCondition}
                                onChange={e => setQuickAddCondition(e.target.value as typeof quickAddCondition)}
                                className="matrix-mini-select"
                              >
                                <option value="NEW">Mới 100%</option>
                                <option value="LIKE_NEW">Like New</option>
                                <option value="USED">Đã dùng</option>
                                <option value="REFURBISHED">Tân trang</option>
                              </select>
                            </div>
                          ) : (
                            <div className="matrix-specs-grid">
                              <input
                                type="text"
                                value={quickAddRam}
                                onChange={e => setQuickAddRam(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddQuickVariant();
                                }}
                                placeholder="Màu sắc..."
                                className="matrix-mini-input"
                              />
                              <select
                                value={quickAddCondition}
                                onChange={e => setQuickAddCondition(e.target.value as typeof quickAddCondition)}
                                className="matrix-mini-select"
                              >
                                <option value="NEW">Mới 100%</option>
                                <option value="LIKE_NEW">Like New</option>
                                <option value="USED">Đã dùng</option>
                                <option value="REFURBISHED">Tân trang</option>
                              </select>
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={quickAddSku}
                            onChange={e => setQuickAddSku(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder={`SKU-${doc.variants.length + 1}`}
                            className="matrix-input-cell matrix-input-mono"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={quickAddPrice}
                            onChange={e => setQuickAddPrice(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder="Giá bán"
                            className="matrix-input-cell matrix-input-price"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={quickAddOriginalPrice}
                            onChange={e => setQuickAddOriginalPrice(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder="Giá gốc"
                            className="matrix-input-cell text-slate-500 text-right"
                          />
                        </td>
                        <td>
                          <select
                            value={quickAddAvail}
                            onChange={e => setQuickAddAvail(e.target.value as typeof quickAddAvail)}
                            className="matrix-select-availability"
                          >
                            <option value="">Theo sản phẩm</option>
                            <option value="AVAILABLE">Sẵn hàng</option>
                            <option value="PREORDER">Đặt trước</option>
                            <option value="CONTACT">Liên hệ</option>
                            <option value="UNAVAILABLE">Tạm ngưng</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <AdminButton variant="primary" size="sm" onClick={handleAddQuickVariant}>
                            + Thêm
                          </AdminButton>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </AdminCard>
            );
          })()}

          <AdminCard
            title={
              <div className="flex items-center gap-2">
                <span>Gói bảo hành</span>
                {doc.warranties.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                    {doc.warranties.length}
                  </span>
                )}
              </div>
            }
            action={
              <AdminButton
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  updateDoc('warranties', [
                    ...doc.warranties,
                    {
                      name: 'Bảo hành tiêu chuẩn 12 tháng',
                      description: 'Bảo hành phần cứng 12 tháng, hỗ trợ phần mềm trọn đời.',
                      adjustment: 0,
                      recommended: doc.warranties.length === 0,
                    },
                  ]);
                }}
              >
                + Thêm gói
              </AdminButton>
            }
          >
            {doc.warranties.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Chưa có gói bảo hành.</p>
            ) : (
              <div className="variant-matrix-wrapper">
                <table className="compact-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: '180px' }}>Tên gói</th>
                      <th style={{ minWidth: '240px' }}>Quyền lợi</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Phụ thu (đ)</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Khuyên dùng</th>
                      <th style={{ width: '44px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.warranties.map((w, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            aria-label={`Tên gói bảo hành ${idx + 1}`}
                            value={w.name}
                            onChange={e =>
                              updateDoc(
                                'warranties',
                                doc.warranties.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                              )
                            }
                            placeholder="Bảo hành 12 tháng"
                            className="matrix-input-cell font-semibold"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            aria-label={`Quyền lợi gói ${idx + 1}`}
                            value={w.description}
                            onChange={e =>
                              updateDoc(
                                'warranties',
                                doc.warranties.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item))
                              )
                            }
                            placeholder="1 đổi 1 15 ngày, phần cứng 12 tháng..."
                            className="matrix-input-cell"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="1"
                            min="-2000000000"
                            max="2000000000"
                            aria-label={`Phụ thu gói ${idx + 1}`}
                            value={w.adjustment}
                            onChange={e =>
                              updateDoc(
                                'warranties',
                                doc.warranties.map((item, i) =>
                                  i === idx ? { ...item, adjustment: parseInt(e.target.value, 10) || 0 } : item
                                )
                              )
                            }
                            placeholder="0 = Đã kèm"
                            className="matrix-input-cell matrix-input-price"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            aria-label={`Khuyên dùng gói ${idx + 1}`}
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
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            title="Xóa gói"
                            aria-label={`Xóa gói bảo hành ${idx + 1}`}
                            onClick={() =>
                              updateDoc('warranties', doc.warranties.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* TAB 4: HÌNH ẢNH & VIDEO */}
      {activeTab === 'media' && (
        <AdminCard
          title={
            <div className="flex items-center gap-2">
              <span>Ảnh & Video</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                {doc.media.length}/30
              </span>
            </div>
          }
          action={
            <AdminButton
              variant="primary"
              size="sm"
              icon={<ImageIcon className="w-3.5 h-3.5" />}
              onClick={() => setPickerOpen(true)}
              disabled={doc.media.length >= 30}
            >
              + Chọn ảnh/video
            </AdminButton>
          }
        >
          {doc.media.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Chưa có ảnh/video.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doc.media.map((item, idx) => (
                <div
                  key={item.assetId}
                  className="p-2.5 bg-white border border-slate-200 rounded-lg flex gap-3 items-center"
                >
                  <div className="w-20 h-20 relative bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                    <StudioAsset id={item.assetId} />
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 bg-black/70 text-white rounded">
                      {idx === 0 ? 'Bìa' : `#${idx + 1}`}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="text"
                      aria-label={`ALT ảnh ${idx + 1}`}
                      value={item.alt}
                      onChange={e =>
                        updateDoc(
                          'media',
                          doc.media.map((m, i) => (i === idx ? { ...m, alt: e.target.value } : m))
                        )
                      }
                      placeholder="Mô tả ảnh (ALT) *"
                      className="matrix-input-cell"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Cấu hình ảnh ${idx + 1}`}
                        value={item.variantId}
                        onChange={e =>
                          updateDoc(
                            'media',
                            doc.media.map((m, i) => (i === idx ? { ...m, variantId: e.target.value } : m))
                          )
                        }
                        className="matrix-input-cell flex-1 cursor-pointer"
                      >
                        <option value="">Mọi cấu hình</option>
                        {doc.variants.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name || v.sku}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={idx === 0}
                        title="Lên"
                        aria-label="Di chuyển ảnh lên"
                        onClick={() => {
                          const newMedia = [...doc.media];
                          [newMedia[idx - 1], newMedia[idx]] = [newMedia[idx], newMedia[idx - 1]];
                          updateDoc('media', newMedia);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === doc.media.length - 1}
                        title="Xuống"
                        aria-label="Di chuyển ảnh xuống"
                        onClick={() => {
                          const newMedia = [...doc.media];
                          [newMedia[idx + 1], newMedia[idx]] = [newMedia[idx], newMedia[idx + 1]];
                          updateDoc('media', newMedia);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Gỡ ảnh"
                        aria-label="Gỡ ảnh này"
                        onClick={() =>
                          updateDoc(
                            'media',
                            doc.media.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* TAB 5: MÔ TẢ CHI TIẾT */}
      {activeTab === 'content' && (
        <AdminCard title="Mô tả chi tiết">
          <RichContentEditor
            value={doc.contentHtml || ''}
            onChange={html => updateDoc('contentHtml', html)}
            onInsertMediaClick={() => setContentMediaPickerOpen(true)}
          />
        </AdminCard>
      )}

      {/* TAB 6: SEO & HIỂN THỊ */}
      {activeTab === 'seo' && (
        <AdminCard title="SEO">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="product-seo-title" className="text-xs font-semibold text-slate-700">
                  Tiêu đề SEO
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {doc.seoTitle.length}/70
                </span>
              </div>
              <input
                type="text"
                id="product-seo-title"
                value={doc.seoTitle}
                onChange={e => updateDoc('seoTitle', e.target.value)}
                placeholder={`${doc.name || 'Tên sản phẩm'} | CitiLap`}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="product-seo-description" className="text-xs font-semibold text-slate-700">
                  Mô tả SEO
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {doc.seoDescription.length}/160
                </span>
              </div>
              <textarea
                rows={3}
                id="product-seo-description"
                value={doc.seoDescription}
                onChange={e => updateDoc('seoDescription', e.target.value)}
                placeholder="Tóm tắt ưu đãi, bảo hành, trả góp..."
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>

            {/* Google SERP Snippet Preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
              <div className="text-blue-700 text-sm font-medium truncate">
                {doc.seoTitle || doc.name || 'Tiêu đề sản phẩm'}
              </div>
              <div className="text-emerald-700 text-xs truncate">
                https://citilap.vn{productHref({ ...doc, slug: doc.slug || 'duong-dan-san-pham' })}
              </div>
              <div className="text-slate-600 text-xs line-clamp-2">
                {doc.seoDescription || doc.description || 'Mô tả hiển thị trên Google...'}
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* TAB 7: LỊCH SỬ PHIÊN BẢN & KHÔI PHỤC */}
      {activeTab === 'history' && (
        <AdminCard title="Lịch sử phiên bản">
          {loadingRevisions ? (
            <div className="py-12">
              <AdminLoadingState message="Đang tải..." />
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Chưa có lịch sử.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Bản</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4">Thời gian</th>
                    <th className="py-2.5 px-4">Người sửa</th>
                    <th className="py-2.5 px-4">Tóm tắt</th>
                    <th className="py-2.5 px-4 text-right"></th>
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
                      <td className="py-2.5 px-4 font-mono font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <span>#{r.revision}</span>
                          {r.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-normal">
                              Hiện tại
                            </span>
                          )}
                          {r.isPublished && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-normal">
                              Web
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.action === 'publish'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.action === 'unpublish'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {r.action === 'publish'
                            ? 'Xuất bản'
                            : r.action === 'unpublish'
                            ? 'Ẩn'
                            : r.action === 'restore'
                            ? 'Khôi phục'
                            : 'Lưu nháp'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString('vi-VN')}
                      </td>

                      <td className="py-2.5 px-4 text-slate-700">
                        <span className="font-mono text-slate-600">{r.actorName || 'admin'}</span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                        {r.summary}
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
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
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreConfirmRev(r)}
                            disabled={saving || restoring}
                            className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer disabled:opacity-50"
                          >
                            Khôi phục
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
      )}

      {activeTab === 'extras' && <AdminCard title="Quà tặng, Mua kèm & FAQ"><ProductStorefrontFields document={doc} onChange={updateDoc} productId={id} /></AdminCard>}
      {activeTab === 'inspection' && (id ? <InspectionEditor productId={id} /> : <AdminCard title="Kiểm định"><p className="text-xs text-slate-500">Lưu sản phẩm trước để nhập hồ sơ kiểm định.</p></AdminCard>)}
      </div>
      </fieldset>
      <aside className="product-editor-sidebar space-y-4" aria-label="Xuất bản sản phẩm">
        <AdminCard>
          {/* Primary action first, secondary actions below, destructive as quiet link */}
          <div className="product-editor-actions">
            <AdminButton
              variant="primary"
              icon={<Globe className="w-4 h-4" />}
              onClick={() => void handleSave('publish')}
              loading={saving}
              className="product-editor-publish"
            >
              {isPublished ? 'Cập nhật website' : 'Xuất bản'}
            </AdminButton>
            <div className="product-editor-actions-row">
              <AdminButton
                variant="secondary"
                icon={<Save className="w-4 h-4" />}
                onClick={() => void handleSave('save')}
                loading={saving}
              >
                Lưu nháp
              </AdminButton>
              <AdminButton
                variant="secondary"
                icon={<Eye className="w-4 h-4" />}
                onClick={() => setPreviewOpen(true)}
                disabled={saving}
              >
                Xem trước
              </AdminButton>
            </div>
          </div>
          <div className="product-editor-status">
            <p
              className="product-publish-note"
              title="Lưu nháp tự động sau khi ngừng nhập; sản phẩm mới cần lưu lần đầu. Xuất bản áp dụng toàn bộ nội dung nháp."
            >
              {isPublished ? hasUnpublishedDraft || isDirty ? 'Có thay đổi chưa xuất bản' : 'Đã khớp với website' : 'Chưa hiển thị cho khách'}
            </p>
            <p role="status" aria-live="polite" className="text-xs text-slate-500">{autosaveStatus}</p>
            {isPublished && (
              <button type="button" className="product-editor-unpublish" onClick={() => void handleSave('unpublish')} disabled={saving}>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Ẩn khỏi web
              </button>
            )}
          </div>
        </AdminCard>
        <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
          <AdminCard title="Giá">
            <div className="grid gap-3">
              <div>
                <label htmlFor="product-price" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá bán <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1" max="2000000000"
                  id="product-price"
                  value={doc.price}
                  onChange={e => updateDoc('price', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-sm font-semibold text-blue-600 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">{money(doc.price)}</span>
              </div>

              <div>
                <label htmlFor="product-original-price" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá gốc <span className="font-normal text-slate-500">(nếu giảm)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1" max="2000000000"
                  id="product-original-price"
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
        </fieldset>
        <AdminCard title="Tóm tắt">
          <div className="space-y-3 text-xs">
            {doc.media[0] ? <button type="button" className="product-editor-cover" onClick={() => setActiveTab('media')} title="Mở tab Ảnh"><StudioAsset key={doc.media[0].assetId} id={doc.media[0].assetId} /></button> : <button type="button" className="product-editor-no-cover" onClick={() => setActiveTab('media')}>+ Thêm ảnh</button>}
            {publishedSummary && publishedSummary.price !== doc.price && <div className="flex justify-between gap-2"><span>Giá trên web</span><strong>{money(publishedSummary.price)}</strong></div>}
            <div className="product-editor-shortcuts">
              <button type="button" onClick={() => setActiveTab('pricing')}><span>Cấu hình</span><strong>{doc.variants.length}</strong></button>
              <button type="button" onClick={() => setActiveTab('pricing')}><span>Bảo hành</span><strong>{doc.warranties.length}</strong></button>
              <button type="button" onClick={() => setActiveTab('media')}><span>Ảnh/video</span><strong>{doc.media.length}</strong></button>
            </div>
          </div>
        </AdminCard>

        <SchedulePanel entityType="product" entityId={id} revision={revision} dirty={isDirty || saving}/>
      </aside>
      </div>
      {isDirty && id && <DraftRecovery draft={doc} endpoint={'/api/admin/products/' + id}/>}

      {/* MEDIA PICKER MODAL */}
      {pickerOpen && (
        <MediaDialog title="Chọn ảnh / video từ Thư viện Media" onClose={() => setPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload onUploaded={() => setMediaRefresh(n => n + 1)} />
            <MediaBrowser
              refresh={mediaRefresh}
              picker
              allowVideo
              onSelect={asset => {
                if (doc.media.length < 30 && !doc.media.some(m => m.assetId === asset.id)) {
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
                const figure = document.createElement('figure');
                const image = document.createElement('img');
                image.src = asset.url || '';
                image.alt = asset.alt || asset.name || doc.name;
                const caption = document.createElement('figcaption');
                caption.textContent = asset.alt || asset.name;
                figure.append(image, caption);
                const imgSnippet = figure.outerHTML + '<p><br></p>';
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
              <span>Đây là tóm tắt nội dung đang biên tập, chưa tính chương trình ưu đãi trên website.</span>
            </div>
            {id && <Link href={`/admin/products/${id}/preview`} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-blue-700 underline">Mở bố cục Storefront với bản nháp đã lưu ↗</Link>}

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
