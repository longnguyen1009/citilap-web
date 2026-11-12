'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useDraftAutosave,
  useAdminActorId,
  clearCommittedLocalDraft,
  transferNewEntityDraftBackup,
  writeLocalDraftBackup,
  setFirstSaveHandoff,
  consumeFirstSaveHandoff,
} from '@/components/admin/useDraftAutosave';
import DraftRecovery from '@/components/admin/DraftRecovery';
import SchedulePanel from '@/components/admin/SchedulePanel';
import InspectionEditor from './InspectionEditor';
import ProductStorefrontFields from './ProductStorefrontFields';
import VariantMatrixGeneratorPanel, {
  deduplicateSku,
  slugifySkuPart,
} from './VariantMatrixGeneratorPanel';
import {
  ProductRevisionHistoryTab,
  ProductRevisionModals,
  type RevisionItem,
  type SnapshotDetail,
} from './ProductRevisionsModal';
import {
  ProductSeoChecklistPanel,
  ProductPreviewModal,
  RelatedProductsPickerModal,
} from './ProductSeoAndModals';
import { productHref } from '@/lib/product-paths';
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
  Layers,
  Cpu,
  DollarSign,
  FileText,
  ExternalLink,
  History,
  ArrowUp,
  ArrowDown,
  Check,
  Copy,
  Sparkles,
  ShieldCheck,
  Package,
  Info,
} from 'lucide-react';
import {
  AdminCard,
  AdminButton,
  StatusBadge,
  InlineAlert,
  AdminLoadingState,
  AdminErrorState,
  useToast,
} from '@/components/admin/ui';
import {
  attributeTemplates,
  attributeTemplateDefinitions,
  availabilityLabels,
  conditionLabels,
  warrantyTypeLabels,
  warrantyMonthsOptions,
  defaultWarrantyMonthsForCondition,
  formatShortWarrantyBadge,
  formatSpecKeyLabel,
  blankProduct,
  productDocumentSchema,
  type ProductDocument,
  type ProductTemplate,
  type WarrantyType,
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

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const formatNumberDots = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  if (n < 0) return '-' + new Intl.NumberFormat('vi-VN').format(Math.abs(n));
  return new Intl.NumberFormat('vi-VN').format(n);
};

const parseNumberDots = (raw: string, allowNegative = false): number | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;
  const isNeg = allowNegative && trimmed.startsWith('-');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = Math.min(2000000000, parseInt(digits, 10) || 0);
  return isNeg ? -parsed : parsed;
};

const VARIANT_TAG_PRESETS = ['Đa nhiệm mượt', 'Bán chạy', 'Đáng mua', 'Khuyên dùng', 'Giá tốt'];

export default function ProductEditor({ id }: ProductEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const actorId = useAdminActorId();
  const draftStorageKey = id ? `product-${id}` : 'product-new';
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [doc, setDoc] = useState<ProductDocument | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const [serverRevision, setServerRevision] = useState<number>(0);
  const latestDoc = useRef(doc);
  const saveLock = useRef(false);
  const createdId = useRef<string | null>(null);
  const editVersionRef = useRef<number>(0);
  useEffect(() => {
    latestDoc.current = doc;
  }, [doc]);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishedSummary, setPublishedSummary] = useState<DetailResponse['publishedSummary']>(null);
  const [hasUnpublishedDraft, setHasUnpublishedDraft] = useState(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Media picker & Preview states
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [contentMediaPickerOpen, setContentMediaPickerOpen] = useState<boolean>(false);
  const [variantImagePickerId, setVariantImagePickerId] = useState<string | null>(null);
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
  const [relatedProductDetails, setRelatedProductDetails] = useState<Record<string, { id: string; name: string; sku?: string; image?: string; price: number }>>({});
  const relatedRequest = useRef(0);

  // Inline custom spec state
  const [newSpecKey, setNewSpecKey] = useState<string>('');
  const [newSpecValue, setNewSpecValue] = useState<string>('');
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  const markDirty = useCallback(() => {
    editVersionRef.current += 1;
    setIsDirty(true);
  }, []);

  // Load categories, brands, and product data
  const loadData = useCallback(async () => {
    if (id) {
      const handoff = consumeFirstSaveHandoff<ProductDocument>(`product-${id}`, actorId);
      if (handoff) {
        if (Array.isArray(handoff.categories)) {
          setCategories(handoff.categories as CategoryOption[]);
        }
        if (Array.isArray(handoff.brands)) {
          setBrands(handoff.brands as BrandOption[]);
        }
        setDoc(handoff.latestDoc);
        latestDoc.current = handoff.latestDoc;
        setRevision(handoff.revision);
        setServerRevision(handoff.revision);
        setIsPublished(handoff.published);
        setPublishedSummary((handoff.publishedSummary as DetailResponse['publishedSummary']) ?? null);
        setHasUnpublishedDraft(Boolean(handoff.hasUnpublishedDraft));
        setIsDirty(handoff.isDirty);
        setLoading(false);
        return;
      }
    }

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
        latestDoc.current = detail.document;
        setRevision(detail.revision);
        setServerRevision(detail.revision);
        setIsPublished(detail.published);
        setPublishedSummary(detail.publishedSummary);
        setHasUnpublishedDraft(detail.hasUnpublishedDraft);
        setIsDirty(false);
      } else {
        const initial = blankProduct();
        setDoc(initial);
        latestDoc.current = initial;
        setRevision(0);
        setServerRevision(0);
        setIsPublished(false);
        setPublishedSummary(null);
        setHasUnpublishedDraft(false);
        setIsDirty(false);
      }
    } catch (err) {
      setLoadError((err as Error).message || 'Không thể tải dữ liệu sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [id, actorId]);

  const [errorTabs, setErrorTabs] = useState<Set<TabKey>>(new Set());

  const updateDoc = <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => {
    markDirty();
    setDoc(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      latestDoc.current = next;
      return next;
    });
    setErrorTabs(prev => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      if (['price', 'originalPrice', 'variants', 'warranties'].includes(key as string)) next.delete('pricing');
      else if (key === 'media') next.delete('media');
      else if (key === 'specs') next.delete('specs');
      else if (['faqs', 'gifts', 'accessoryProductIds'].includes(key as string)) next.delete('extras');
      else if (['seoTitle', 'seoDescription'].includes(key as string)) next.delete('seo');
      else if (key === 'contentHtml') next.delete('content');
      else next.delete('info');
      return next;
    });
  };

  const handleAssignVariantImage = (variantId: string, assetId: string | null, assetFallbackAlt?: string) => {
    markDirty();
    setDoc(prev => {
      if (!prev) return prev;
      const targetVariant = prev.variants.find(v => v.id === variantId);
      const defaultAlt = assetFallbackAlt || `${prev.name || 'Sản phẩm'} - ${targetVariant?.name || 'Cấu hình'}`;

      let nextMedia = prev.media.map(m => {
        if (m.variantId === variantId && m.assetId !== assetId) {
          return { ...m, variantId: '' };
        }
        return m;
      });

      if (assetId) {
        const existingIdx = nextMedia.findIndex(m => m.assetId === assetId);
        if (existingIdx >= 0) {
          nextMedia = nextMedia.map((m, idx) => (idx === existingIdx ? { ...m, variantId } : m));
        } else if (nextMedia.length < 30) {
          nextMedia = [
            ...nextMedia,
            {
              assetId,
              alt: defaultAlt,
              variantId,
            },
          ];
        }
      }

      const nextVariants = prev.variants.map(v =>
        v.id === variantId ? { ...v, image: assetId || '' } : v
      );

      return {
        ...prev,
        media: nextMedia,
        variants: nextVariants,
      };
    });
  };

  // Matrix Generator & Quick Add states
  const [showMatrixGen, setShowMatrixGen] = useState<boolean>(false);
  const [matrixRAMs, setMatrixRAMs] = useState<string[]>(['16GB DDR5', '32GB DDR5']);
  const [matrixSSDs, setMatrixSSDs] = useState<string[]>(['512GB NVMe', '1TB NVMe']);
  const [matrixGPU, setMatrixGPU] = useState<string>('RTX 4060 8GB');
  const [matrixBasePrice, setMatrixBasePrice] = useState<number>(0);
  const [matrixStepPrice, setMatrixStepPrice] = useState<number>(2000000);

  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddTag, setQuickAddTag] = useState<string>('');
  const [quickAddRam, setQuickAddRam] = useState<string>('');
  const [quickAddStorage, setQuickAddStorage] = useState<string>('');
  const [quickAddGpu, setQuickAddGpu] = useState<string>('');
  const [quickAddCondition, setQuickAddCondition] = useState<'NEW' | 'LIKE_NEW' | 'USED' | 'REFURBISHED'>('NEW');
  const [quickAddSku, setQuickAddSku] = useState<string>('');
  const [quickAddPrice, setQuickAddPrice] = useState<string>('');
  const [quickAddOriginalPrice, setQuickAddOriginalPrice] = useState<string>('');
  const [quickAddStock, setQuickAddStock] = useState<string>('1');
  const [quickAddAvail, setQuickAddAvail] = useState<'' | 'AVAILABLE' | 'PREORDER' | 'CONTACT' | 'UNAVAILABLE'>('');

  const handleAddQuickVariant = () => {
    if (!doc) return;
    const name = quickAddName.trim();
    const priceNum = parseNumberDots(quickAddPrice);
    const price = priceNum !== null && priceNum >= 0 ? priceNum : doc.price;
    const takenSkus = new Set(doc.variants.map(v => v.sku.trim().toUpperCase()).filter(Boolean));
    const ramSlug = quickAddRam.trim() ? slugifySkuPart(quickAddRam.trim().split(/\s+/)[0] || quickAddRam.trim()) : '';
    const ssdSlug = quickAddStorage.trim() ? slugifySkuPart(quickAddStorage.trim().split(/\s+/)[0] || quickAddStorage.trim()) : '';
    const gpuSlug = quickAddGpu.trim() ? slugifySkuPart(quickAddGpu.trim()) : '';
    const autoSkuParts = [doc.slug || 'SP', ramSlug, ssdSlug, gpuSlug].filter(Boolean);
    const rawCandidateSku =
      quickAddSku.trim() ||
      (autoSkuParts.length > 1 ? autoSkuParts.join('-') : `${doc.slug || 'SP'}-${doc.variants.length + 1}`);
    const sku = deduplicateSku(rawCandidateSku, takenSkus);

    const origPriceNum = parseNumberDots(quickAddOriginalPrice);
    const originalPrice = origPriceNum !== null && origPriceNum >= 0 ? origPriceNum : null;
    const stockNum = parseInt(quickAddStock, 10);
    const stock = !Number.isNaN(stockNum) && stockNum >= 0 ? stockNum : 1;

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
      stock,
      tag: quickAddTag.trim() || undefined,
      availability: quickAddAvail || undefined,
      ram: quickAddRam.trim() || undefined,
      storage: quickAddStorage.trim() || undefined,
      gpu: quickAddGpu.trim() || undefined,
      options: {},
      image: '',
    };

    updateDoc('variants', [...doc.variants, newVariant]);
    setQuickAddName('');
    setQuickAddTag('');
    setQuickAddRam('');
    setQuickAddStorage('');
    setQuickAddGpu('');
    setQuickAddSku('');
    setQuickAddPrice('');
    setQuickAddOriginalPrice('');
    setQuickAddStock('1');
    setQuickAddAvail('');
  };

  const handleCloneVariant = (idx: number) => {
    if (!doc) return;
    const source = doc.variants[idx];
    if (!source) return;
    const takenSkus = new Set(doc.variants.map(v => v.sku.trim().toUpperCase()).filter(Boolean));
    const gpuSuffix = source.gpu && !source.sku?.toUpperCase().includes(slugifySkuPart(source.gpu))
      ? `-${slugifySkuPart(source.gpu)}`
      : '';
    const newSku = deduplicateSku(`${source.sku || doc.slug || 'SP'}${gpuSuffix}-COPY`, takenSkus);
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
    markDirty();
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
    const base = matrixBasePrice > 0 ? matrixBasePrice : doc.price;
    const takenSkus = new Set(doc.variants.map(v => v.sku.trim().toUpperCase()).filter(Boolean));
    const gpuClean = matrixGPU.trim();
    const gpuSlug = gpuClean ? `-${slugifySkuPart(gpuClean)}` : '';
    const newVariants = [];
    let stepIndex = 0;

    for (const r of rams) {
      for (const s of ssds) {
        const variantPrice = base + (stepIndex * matrixStepPrice);
        stepIndex++;
        const ramShort = r.split(' ')[0] || r;
        const ssdShort = s.split(' ')[0] || s;
        const sku = deduplicateSku(`${doc.slug || 'SP'}-${ramShort}-${ssdShort}${gpuSlug}`, takenSkus);
        newVariants.push({
          id: crypto.randomUUID(),
          name: `${ramShort} · ${ssdShort}${gpuClean ? ' · ' + gpuClean.split(' ')[0] : ''}`,
          sku,
          condition: 'NEW' as const,
          price: variantPrice,
          originalPrice: null,
          stock: 1,
          availability: 'AVAILABLE' as const,
          ram: r,
          storage: s,
          gpu: gpuClean || undefined,
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
    if (action !== 'unpublish') {
      const validation = productDocumentSchema.safeParse(doc);
      if (!validation.success) {
        const issue = validation.error.issues[0];
        const field = String(issue.path[0] || '');
        const labels: Record<string, string> = {
          name: 'Tên sản phẩm',
          slug: 'Đường dẫn',
          categoryId: 'Danh mục',
          price: 'Giá bán',
          originalPrice: 'Giá gốc',
          variants: 'Cấu hình',
          specs: 'Thông số',
          media: 'Ảnh',
          warranties: 'Bảo hành',
          tags: 'Thẻ tag',
          faqs: 'Câu hỏi',
          gifts: 'Quà tặng',
          seoTitle: 'Tiêu đề SEO',
          seoDescription: 'Mô tả SEO',
        };

        const invalidTabs = new Set<TabKey>();
        for (const iss of validation.error.issues) {
          const f = String(iss.path[0] || '');
          if (['price', 'originalPrice', 'variants', 'warranties'].includes(f)) invalidTabs.add('pricing');
          else if (f === 'media') invalidTabs.add('media');
          else if (f === 'specs') invalidTabs.add('specs');
          else if (['faqs', 'gifts', 'accessoryProductIds'].includes(f)) invalidTabs.add('extras');
          else if (['seoTitle', 'seoDescription'].includes(f)) invalidTabs.add('seo');
          else if (f === 'contentHtml') invalidTabs.add('content');
          else invalidTabs.add('info');
        }
        setErrorTabs(invalidTabs);
        setActiveTab(Array.from(invalidTabs)[0] || 'info');
        const msg = field
          ? `${labels[field] || field}: ${issue.code === 'custom' ? issue.message : 'kiểm tra giá trị, độ dài và trường bắt buộc.'}`
          : issue.message;
        setStatusMessage({
          type: 'error',
          text: msg,
        });
        toast.error(msg);
        return false;
      }
    }
    setErrorTabs(new Set());
    saveLock.current = true;
    const submittedEditVersion = editVersionRef.current;
    const submittedDocSnapshot = structuredClone(doc);
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
          document: submittedDocSnapshot,
        }),
      });

      const hasNewerEdits = editVersionRef.current !== submittedEditVersion;
      setRevision(result.revision);
      setServerRevision(result.revision);
      setIsPublished(result.published);
      setPublishedSummary(result.publishedSummary);
      setHasUnpublishedDraft(result.hasUnpublishedDraft);

      if (!id && result.id) {
        const nextEntityKey = `product-${result.id}`;
        const currentLatestDoc =
          hasNewerEdits && latestDoc.current ? latestDoc.current : result.document;
        if (hasNewerEdits) {
          transferNewEntityDraftBackup({
            actorId,
            fromEntityKey: 'product-new',
            toEntityKey: nextEntityKey,
            submittedDraft: submittedDocSnapshot,
            latestDraft: currentLatestDoc,
            newBaseRevision: result.revision,
          });
        } else {
          if (action !== 'unpublish') {
            setDoc(result.document);
            latestDoc.current = result.document;
          }
          setIsDirty(false);
          clearCommittedLocalDraft('product-new', submittedDocSnapshot, actorId);
        }
        setFirstSaveHandoff<ProductDocument>(nextEntityKey, {
          actorId,
          revision: result.revision,
          published: result.published,
          publishedSummary: result.publishedSummary,
          hasUnpublishedDraft: result.hasUnpublishedDraft,
          committedDoc: result.document,
          latestDoc: currentLatestDoc,
          isDirty: hasNewerEdits,
          categories,
          brands,
        });
        createdId.current = result.id;
        router.replace(`/admin/products/${result.id}`);
      } else if (!hasNewerEdits) {
        if (action !== 'unpublish') {
          setDoc(result.document);
          latestDoc.current = result.document;
        }
        setIsDirty(false);
        clearCommittedLocalDraft(draftStorageKey, submittedDocSnapshot, actorId);
      } else if (latestDoc.current) {
        // User edited during pending save: preserve newer in-memory edits and update local backup baseRevision
        writeLocalDraftBackup(draftStorageKey, latestDoc.current, result.revision, actorId);
      }

      if (action === 'publish') {
        setStatusMessage({ type: 'success', text: 'Đã xuất bản sản phẩm lên website thành công.' });
        toast.success('Đã xuất bản sản phẩm lên website thành công.');
      } else if (action === 'unpublish') {
        setStatusMessage({ type: 'warning', text: 'Đã ẩn sản phẩm khỏi website.' });
        toast.warning('Đã ẩn sản phẩm khỏi website.');
      } else {
        setStatusMessage({ type: 'success', text: 'Đã lưu bản nháp an toàn.' });
        toast.success('Đã lưu bản nháp an toàn.');
      }
      return true;
    } catch (err) {
      const errorMsg = (err as Error).message || 'Có lỗi xảy ra khi lưu.';
      setStatusMessage({
        type: 'error',
        text: `${errorMsg} Nội dung vẫn giữ trong trình soạn thảo. Lưu lại trước khi rời trang.`,
      });
      toast.error(errorMsg);
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }, [doc, id, revision, router, draftStorageKey, toast, actorId, categories, brands]);

  const autosaveStatus = useDraftAutosave(
    doc,
    revision,
    !loading && !!doc,
    isDirty,
    saving,
    () => handleSave('save'),
    draftStorageKey
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data hydration from API
    void loadData();
  }, [loadData]);

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
    if ((activeTab === 'history' || historyOpen) && id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- on-demand fetch when opening history
      void fetchRevisions();
    }
  }, [activeTab, historyOpen, id, fetchRevisions]);

  useEffect(() => {
    const relIds = doc?.relatedProductIds || [];
    const missing = relIds.filter(rid => !relatedProductDetails[rid]);
    if (missing.length === 0) return;
    let ignore = false;
    mediaRequest<{ items: { id: string; name: string; sku?: string; image?: string; price: number }[] }>(
      `/api/admin/products?ids=${encodeURIComponent(missing.join(','))}&limit=${Math.min(100, Math.max(20, missing.length))}`
    )
      .then(res => {
        if (ignore) return;
        const map: Record<string, { id: string; name: string; sku?: string; image?: string; price: number }> = {};
        for (const item of res.items || []) {
          map[item.id] = item;
        }
        setRelatedProductDetails(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [doc?.relatedProductIds, relatedProductDetails]);

  const handleRestore = async (targetRev: number) => {
    if (!id || saveLock.current) return;
    saveLock.current = true;
    const submittedEditVersion = editVersionRef.current;
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

      if (editVersionRef.current === submittedEditVersion) {
        setDoc(res.document);
        latestDoc.current = res.document;
        setIsDirty(false);
      }
      setRevision(res.newRevision);
      setServerRevision(res.newRevision);
      setHasUnpublishedDraft(isPublished);
      setRestoreConfirmRev(null);
      setSelectedRevisionSnapshot(null);
      const msg = `Đã khôi phục phiên bản #${targetRev} thành bản nháp mới (rev #${res.newRevision}). Website vẫn hiển thị phiên bản hiện tại cho đến khi bạn xuất bản lại.`;
      setStatusMessage({
        type: 'success',
        text: msg,
      });
      toast.success(msg);
      void fetchRevisions();
    } catch (err) {
      const msg = (err as Error).message || 'Không thể khôi phục phiên bản.';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
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
    { key: 'pricing', label: 'Giá & Cấu hình', icon: DollarSign, count: doc.variants.length },
    { key: 'specs', label: 'Thông số', icon: Cpu, count: doc.specs.filter(s => s.value?.trim()).length },
    { key: 'media', label: 'Ảnh & Video', icon: ImageIcon, count: doc.media.length },
    { key: 'content', label: 'Mô tả', icon: FileText },
    { key: 'extras', label: 'Quà & FAQ', icon: Plus, count: doc.warranties.length + (doc.gifts?.length || 0) },
    { key: 'inspection', label: 'Kiểm định', icon: Cpu },
    { key: 'seo', label: 'SEO', icon: Globe },
  ];

  const targetVariantForPicker = variantImagePickerId
    ? doc.variants.find(v => v.id === variantImagePickerId)
    : undefined;
  const currentAssignedVariantAssetId = variantImagePickerId
    ? doc.media.find(m => m.variantId === variantImagePickerId)?.assetId ||
      (targetVariantForPicker?.image && doc.media.some(m => m.assetId === targetVariantForPicker.image)
        ? targetVariantForPicker.image
        : '')
    : '';

  return (
    <div className="product-editor space-y-4 pb-12">
      {/* Compact header: back · title · status | history & view on web */}
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
        <div className="product-editor-header-actions">
          {id && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="product-editor-viewlink"
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lịch sử ({revision})</span>
            </button>
          )}
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
        </div>
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
              {errorTabs.has(tab.key) && (
                <span
                  className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-0.5"
                  title="Tab có thông tin chưa hợp lệ cần kiểm tra"
                />
              )}
            </button>
          );
        })}
      </div>

      <div id={'product-panel-' + activeTab} role="tabpanel" aria-labelledby={'product-tab-' + activeTab} tabIndex={0} className="product-editor-panel">
      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'info' && (
        <AdminCard title="Phân loại & Trạng thái">
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
                <label htmlFor="product-condition" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tình trạng chung (Thẻ SP)
                </label>
                <select
                  id="product-condition"
                  value={doc.condition || 'NEW'}
                  onChange={e => {
                    const nextCondition = e.target.value as ProductDocument['condition'];
                    const prevDefault = defaultWarrantyMonthsForCondition(doc.condition);
                    const nextDefault = defaultWarrantyMonthsForCondition(nextCondition);
                    updateDoc('condition', nextCondition);
                    if (!doc.warrantyMonths || doc.warrantyMonths === prevDefault) {
                      updateDoc('warrantyMonths', nextDefault);
                    }
                  }}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white cursor-pointer"
                >
                  {Object.entries(conditionLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Hiển thị nhãn ở góc trên thẻ SP ngoài danh sách.{' '}
                  {doc.variants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('pricing')}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      Từng cấu hình có tình trạng riêng ở Giá & Cấu hình →
                    </button>
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="product-availability" className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái bán hàng
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
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Hiển thị trên thẻ SP: <strong>{availabilityLabels[doc.availability]}</strong> (hoặc Tạm hết hàng nếu tồn kho = 0).
                </p>
              </div>
            </div>

            {/* Tồn kho & Bảo hành hiển thị trên Card sản phẩm */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Bảo hành mặc định & Tồn kho</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Hiển thị trên Card sản phẩm:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    {formatShortWarrantyBadge(doc.warrantyType || 'SHOP', doc.warrantyMonths || defaultWarrantyMonthsForCondition(doc.condition), null, doc.condition)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-emerald-700 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {doc.availability === 'AVAILABLE'
                      ? (doc.variants.length > 0
                          ? doc.variants.reduce((sum, v) => sum + (v.stock ?? 1), 0)
                          : (doc.stock ?? 1)) <= 0
                        ? 'Tạm hết hàng'
                        : 'Sẵn hàng'
                      : availabilityLabels[doc.availability]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="product-warranty-type" className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại bảo hành
                  </label>
                  <select
                    id="product-warranty-type"
                    value={doc.warrantyType || 'SHOP'}
                    onChange={e => updateDoc('warrantyType', e.target.value as WarrantyType)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                  >
                    {Object.entries(warrantyTypeLabels).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label} ({k === 'BRAND' ? 'BH Hãng...' : 'BH...'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="product-warranty-months" className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời hạn bảo hành (tháng)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      id="product-warranty-months"
                      value={warrantyMonthsOptions.includes((doc.warrantyMonths || defaultWarrantyMonthsForCondition(doc.condition)) as (typeof warrantyMonthsOptions)[number]) ? String(doc.warrantyMonths || defaultWarrantyMonthsForCondition(doc.condition)) : '__custom__'}
                      onChange={e => {
                        if (e.target.value !== '__custom__') {
                          updateDoc('warrantyMonths', parseInt(e.target.value, 10) || defaultWarrantyMonthsForCondition(doc.condition));
                        }
                      }}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                    >
                      {warrantyMonthsOptions.map(m => (
                        <option key={m} value={m}>
                          {m} tháng ({formatShortWarrantyBadge(doc.warrantyType || 'SHOP', m, null, doc.condition)})
                        </option>
                      ))}
                      <option value="__custom__">Số tháng khác...</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      aria-label="Số tháng bảo hành"
                      value={doc.warrantyMonths ?? defaultWarrantyMonthsForCondition(doc.condition)}
                      onChange={e => updateDoc('warrantyMonths', Math.min(120, Math.max(1, parseInt(e.target.value, 10) || defaultWarrantyMonthsForCondition(doc.condition))))}
                      className="w-20 text-sm text-center font-semibold border border-slate-300 rounded-lg px-2 py-2 bg-white"
                      title="Nhập số tháng bảo hành"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="product-stock-info" className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng tồn kho
                  </label>
                  {doc.variants.length > 0 ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                      <div>
                        <strong className="text-blue-700 font-bold">
                          {doc.variants.reduce((sum, v) => sum + (v.stock ?? 1), 0)}
                        </strong>{' '}
                        <span className="text-xs text-slate-500">máy ({doc.variants.length} cấu hình)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('pricing')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Sửa theo cấu hình →
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        id="product-stock-info"
                        type="number"
                        min={0}
                        max={999999}
                        value={doc.stock ?? 1}
                        onChange={e => updateDoc('stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  )}
                </div>
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
                  {(doc.relatedProductIds || []).map((relId, rIdx) => {
                    const relInfo = relatedProductDetails[relId];
                    return (
                    <div key={relId} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {rIdx + 1}
                        </span>
                        {relInfo?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={relInfo.image} alt="" className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0" />
                        ) : null}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">
                            {relInfo?.name || relId}
                          </div>
                          {relInfo ? (
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span className="text-blue-600 font-medium">{money(relInfo.price)}</span>
                              <span className="font-mono text-[10px] text-slate-400">#{relId.slice(0, 8)}</span>
                            </div>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-400">{relId}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                  );})}
                </div>
              )}
            </div></details>
          </div>
        </AdminCard>
      )}

      {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
      {activeTab === 'specs' && (
        <AdminCard
          title="Thông số kỹ thuật"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {!doc.specs.some(spec => spec.key === 'Năm ra mắt') && (
                <AdminButton variant="secondary" size="sm" onClick={() => updateDoc('specs', [...doc.specs, { key: 'Năm ra mắt', value: '' }])}>
                  + Năm ra mắt
                </AdminButton>
              )}
              {doc.template === 'LAPTOP' && !doc.specs.some(spec => spec.key === 'Phù hợp') && (
                <AdminButton variant="secondary" size="sm" onClick={() => updateDoc('specs', [...doc.specs, { key: 'Phù hợp', value: '' }])}>
                  + Phù hợp (Tư vấn)
                </AdminButton>
              )}
              {doc.template === 'LAPTOP' && !doc.specs.some(spec => spec.key === 'Hạn chế') && (
                <AdminButton variant="secondary" size="sm" onClick={() => updateDoc('specs', [...doc.specs, { key: 'Hạn chế', value: '' }])}>
                  + Hạn chế (Tư vấn)
                </AdminButton>
              )}
            </div>
          }
        >
          <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 mr-1">Mẫu thông số:</span>
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
          <div className="variant-matrix-wrapper">
            <table className="compact-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '210px' }}>Thông số</th>
                  <th>Giá trị & Gợi ý</th>
                  <th style={{ width: '64px' }}></th>
                </tr>
              </thead>
              <tbody>
                {doc.specs.map((spec, idx) => {
                  const def = attributeTemplateDefinitions[doc.template]?.find(d => d.key === spec.key);
                  const isCustom = !(attributeTemplates[doc.template] as readonly string[])?.includes(spec.key);
                  const displayLabel = formatSpecKeyLabel(spec.key);
                  return (
                    <tr key={spec.key || idx}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800">{displayLabel}</span>
                          {displayLabel !== spec.key && (
                            <span className="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded font-mono">{spec.key}</span>
                          )}
                          {def?.unit && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{def.unit}</span>}
                          {isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">Tùy chỉnh</span>}
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <input
                            type="text"
                            aria-label={displayLabel}
                            value={spec.value}
                            onChange={e =>
                              updateDoc(
                                'specs',
                                doc.specs.map((s, i) => (i === idx ? { ...s, value: e.target.value } : s))
                              )
                            }
                            placeholder={def ? `${def.label}...` : `Nhập ${displayLabel.toLowerCase()}...`}
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
                          aria-label={`Xóa ${displayLabel}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="matrix-quick-add-tr">
                  <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>+</td>
                  <td>
                    <input
                      type="text"
                      aria-label="Tên thông số mới"
                      value={newSpecKey}
                      onChange={e => setNewSpecKey(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSpecKey.trim()) {
                          e.preventDefault();
                          const k = newSpecKey.trim();
                          if (!doc.specs.some(s => s.key.toLowerCase() === k.toLowerCase())) {
                            updateDoc('specs', [...doc.specs, { key: k, value: newSpecValue.trim() }]);
                            setNewSpecKey('');
                            setNewSpecValue('');
                          }
                        }
                      }}
                      placeholder="Tên thông số mới (VD: Chất liệu)..."
                      className="matrix-input-cell font-semibold"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label="Giá trị thông số mới"
                      value={newSpecValue}
                      onChange={e => setNewSpecValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSpecKey.trim()) {
                          e.preventDefault();
                          const k = newSpecKey.trim();
                          if (!doc.specs.some(s => s.key.toLowerCase() === k.toLowerCase())) {
                            updateDoc('specs', [...doc.specs, { key: k, value: newSpecValue.trim() }]);
                            setNewSpecKey('');
                            setNewSpecValue('');
                          }
                        }
                      }}
                      placeholder="Giá trị thông số..."
                      className="matrix-input-cell"
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <AdminButton
                      variant="primary"
                      size="sm"
                      disabled={!newSpecKey.trim()}
                      onClick={() => {
                        const k = newSpecKey.trim();
                        if (!k) return;
                        if (doc.specs.some(s => s.key.toLowerCase() === k.toLowerCase())) {
                          setStatusMessage({ type: 'warning', text: `Thông số "${k}" đã tồn tại.` });
                          return;
                        }
                        updateDoc('specs', [...doc.specs, { key: k, value: newSpecValue.trim() }]);
                        setNewSpecKey('');
                        setNewSpecValue('');
                      }}
                    >
                      + Thêm
                    </AdminButton>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </AdminCard>
      )}

      {/* TAB 3: CẤU HÌNH & GIÁ */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <AdminCard title="Giá niêm yết & Tồn kho cơ bản">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="product-base-price-tab" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá bán mặc định (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="product-base-price-tab"
                    value={formatNumberDots(doc.price)}
                    onChange={e => updateDoc('price', Math.max(0, parseNumberDots(e.target.value) ?? 0))}
                    placeholder="28.900.000"
                    className="w-full text-sm font-bold text-blue-600 border border-slate-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">đ</span>
                </div>
                <span className="text-xs text-slate-500 mt-1 block">Hiển thị: {money(doc.price)}</span>
                {(() => {
                  const activeVariants = doc.variants.filter(
                    v => (!v.availability || ['AVAILABLE', 'PREORDER'].includes(v.availability)) && v.price > 0
                  );
                  if (activeVariants.length === 0) return null;
                  const lowestVariant = activeVariants.reduce(
                    (min, cur) => (cur.price < min.price ? cur : min),
                    activeVariants[0]
                  );
                  if (lowestVariant.price === doc.price) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        updateDoc('price', lowestVariant.price);
                        if (lowestVariant.originalPrice != null && lowestVariant.originalPrice > lowestVariant.price) {
                          updateDoc('originalPrice', lowestVariant.originalPrice);
                        }
                        toast.info(`Đã đồng bộ giá theo cấu hình thấp nhất (${money(lowestVariant.price)})`);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-semibold text-amber-800 transition cursor-pointer"
                    >
                      Đồng bộ theo giá biến thể thấp nhất ({money(lowestVariant.price)})
                    </button>
                  );
                })()}
              </div>
              <div>
                <label htmlFor="product-orig-price-tab" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá gốc niêm yết <span className="font-normal text-slate-500">(nếu giảm giá)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="product-orig-price-tab"
                    value={formatNumberDots(doc.originalPrice)}
                    placeholder="Không giảm giá"
                    onChange={e => updateDoc('originalPrice', parseNumberDots(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">đ</span>
                </div>
                {doc.originalPrice != null && doc.originalPrice > doc.price ? (
                  <span className="text-xs text-emerald-600 mt-1 block font-medium">
                    Tiết kiệm {money(doc.originalPrice - doc.price)} (-
                    {Math.round(((doc.originalPrice - doc.price) / doc.originalPrice) * 100)}%)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 mt-1 block">Áp dụng khi sản phẩm không chia biến thể riêng</span>
                )}
              </div>
              <div>
                <label htmlFor="product-stock-tab" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tồn kho {doc.variants.length > 0 ? '(Tổng các cấu hình)' : 'cơ bản'}
                </label>
                {doc.variants.length > 0 ? (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center justify-between">
                    <span>
                      Tổng: <strong className="text-blue-700 font-bold">{doc.variants.reduce((sum, v) => sum + (v.stock ?? 1), 0)}</strong> máy
                    </span>
                    <span className="text-[11px] text-slate-500">Nhập ở bảng cấu hình bên dưới</span>
                  </div>
                ) : (
                  <input
                    id="product-stock-tab"
                    type="number"
                    min={0}
                    max={999999}
                    value={doc.stock ?? 1}
                    onChange={e => updateDoc('stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                )}
                <span className="text-xs text-slate-400 mt-1 block">
                  Khi tồn kho = 0, web tự hiển thị &quot;Tạm hết hàng&quot;
                </span>
              </div>
            </div>
          </AdminCard>

          {(() => {
            const variantPrices = doc.variants.map(v => v.price).filter(p => p > 0);
            const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : doc.price;
            const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : doc.price;

            return (
              <AdminCard
                title={
                  <div className="flex items-center gap-2.5 flex-wrap">
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
                        const existingSkus = new Set(doc.variants.map(v => (v.sku || '').toUpperCase()).filter(Boolean));
                        const baseSku = `${slugifySkuPart(doc.slug || doc.name) || 'SP'}-${doc.variants.length + 1}`.toUpperCase();
                        const newSku = deduplicateSku(baseSku, existingSkus);
                        updateDoc('variants', [
                          ...doc.variants,
                          {
                            id: crypto.randomUUID(),
                            name: '',
                            sku: newSku,
                            condition: doc.condition || 'NEW',
                            price: doc.price,
                            stock: 1,
                            tag: '',
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
                {/* Giải thích rõ sự khác nhau giữa Tình trạng chung & Tình trạng từng cấu hình + Nhãn nổi bật */}
                <div className="mb-3 p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Mỗi cấu hình có <strong>Tình trạng (New / Like New)</strong>, <strong>Tồn kho</strong> và <strong>Nhãn nổi bật</strong> (VD: <em>Đa nhiệm mượt, Bán chạy...</em>) riêng khi khách chọn trên trang chi tiết.
                    </span>
                  </div>
                  {doc.variants.length > 0 && doc.variants[0] && doc.condition !== doc.variants[0].condition && (
                    <button
                      type="button"
                      onClick={() => updateDoc('condition', doc.variants[0].condition)}
                      className="px-2 py-1 rounded bg-white border border-blue-300 text-blue-700 font-semibold hover:bg-blue-50 cursor-pointer shrink-0"
                    >
                      Đồng bộ Tình trạng thẻ SP theo Cấu hình #1 ({conditionLabels[doc.variants[0].condition]})
                    </button>
                  )}
                </div>

                {/* Collapsible Matrix Generator */}
                {showMatrixGen && (
                  <VariantMatrixGeneratorPanel
                    docPrice={doc.price}
                    matrixRAMs={matrixRAMs}
                    setMatrixRAMs={setMatrixRAMs}
                    matrixSSDs={matrixSSDs}
                    setMatrixSSDs={setMatrixSSDs}
                    matrixGPU={matrixGPU}
                    setMatrixGPU={setMatrixGPU}
                    matrixBasePrice={matrixBasePrice}
                    setMatrixBasePrice={setMatrixBasePrice}
                    matrixStepPrice={matrixStepPrice}
                    setMatrixStepPrice={setMatrixStepPrice}
                    onClose={() => setShowMatrixGen(false)}
                    onGenerate={handleGenerateMatrix}
                  />
                )}

                {/* Compact Spreadsheet Table */}
                <div className="variant-matrix-wrapper">
                  <table className="compact-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '56px', textAlign: 'center' }} title="Ảnh riêng của cấu hình (bấm để chọn)">Ảnh</th>
                        <th style={{ minWidth: '175px' }}>Tên cấu hình & Nhãn nổi bật</th>
                        <th style={{ minWidth: '165px' }}>Thông số & Tình trạng</th>
                        <th style={{ width: '96px' }}>SKU</th>
                        <th style={{ width: '115px', textAlign: 'right' }}>Giá bán (đ)</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Giá gốc (đ)</th>
                        <th style={{ width: '68px', textAlign: 'center' }}>Tồn kho</th>
                        <th style={{ width: '104px' }}>Nhận đơn</th>
                        <th style={{ width: '64px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.variants.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-500">
                            <p className="text-xs mb-2">Chưa có biến thể hoặc cấu hình nào.</p>
                            <AdminButton
                              variant="secondary"
                              size="sm"
                              icon={<Plus className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const existingSkus = new Set(doc.variants.map(v => (v.sku || '').toUpperCase()).filter(Boolean));
                                const baseSku = `${slugifySkuPart(doc.slug || doc.name) || 'SP'}-1`.toUpperCase();
                                const newSku = deduplicateSku(baseSku, existingSkus);
                                updateDoc('variants', [
                                  {
                                    id: crypto.randomUUID(),
                                    name: 'Bản Tiêu chuẩn',
                                    sku: newSku,
                                    condition: doc.condition || 'NEW',
                                    price: doc.price,
                                    stock: doc.stock ?? 1,
                                    tag: '',
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
                        doc.variants.map((variant, idx) => {
                          const assignedAssetId =
                            doc.media.find(m => m.variantId === variant.id)?.assetId ||
                            (variant.image && doc.media.some(m => m.assetId === variant.image) ? variant.image : '');
                          return (
                          <tr key={variant.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="relative inline-flex items-center justify-center">
                                <button
                                  type="button"
                                  title={
                                    assignedAssetId
                                      ? 'Đổi ảnh đại diện riêng cho cấu hình này'
                                      : 'Chọn ảnh riêng cho cấu hình này (khách bấm chọn cấu hình sẽ nhảy sang ảnh này)'
                                  }
                                  onClick={() => setVariantImagePickerId(variant.id)}
                                  className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center transition cursor-pointer ${
                                    assignedAssetId
                                      ? 'border-2 border-blue-500 bg-slate-50 shadow-xs hover:border-blue-600'
                                      : 'border border-dashed border-slate-300 bg-slate-50/70 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40'
                                  }`}
                                >
                                  {assignedAssetId ? (
                                    <StudioAsset key={assignedAssetId} id={assignedAssetId} />
                                  ) : (
                                    <ImageIcon className="w-4 h-4" />
                                  )}
                                </button>
                                {assignedAssetId && (
                                  <button
                                    type="button"
                                    title="Gỡ ảnh riêng của cấu hình này"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleAssignVariantImage(variant.id, null);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] leading-none flex items-center justify-center shadow hover:bg-rose-600 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="space-y-1">
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
                                      ? 'Core Ultra 7 255H'
                                      : doc.template === 'KEYBOARD'
                                      ? 'Red Switch - Màu Trắng'
                                      : doc.template === 'CHARGER'
                                      ? '65W GaN - Đen'
                                      : 'Màu Đen / Bản Tiêu chuẩn'
                                  }
                                  className="matrix-input-cell font-semibold"
                                />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    aria-label={`Nhãn nổi bật cấu hình ${idx + 1}`}
                                    value={variant.tag || ''}
                                    onChange={e =>
                                      updateDoc(
                                        'variants',
                                        doc.variants.map((v, i) => (i === idx ? { ...v, tag: e.target.value } : v))
                                      )
                                    }
                                    placeholder="Nhãn nổi bật (VD: Đa nhiệm mượt, Bán chạy...)"
                                    className="matrix-mini-input flex-1 text-[11px] bg-amber-50/50 border-amber-200/80 text-amber-900 placeholder:text-slate-400"
                                  />
                                  {variant.tag && (
                                    <button
                                      type="button"
                                      title="Xóa nhãn nổi bật"
                                      onClick={() =>
                                        updateDoc(
                                          'variants',
                                          doc.variants.map((v, i) => (i === idx ? { ...v, tag: '' } : v))
                                        )
                                      }
                                      className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {VARIANT_TAG_PRESETS.map(preset => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() =>
                                        updateDoc(
                                          'variants',
                                          doc.variants.map((v, i) =>
                                            i === idx ? { ...v, tag: v.tag === preset ? '' : preset } : v
                                          )
                                        )
                                      }
                                      className={`text-[10px] px-1.5 py-0.2 rounded border transition cursor-pointer ${
                                        variant.tag === preset
                                          ? 'bg-amber-400/90 text-slate-950 border-amber-500 font-bold'
                                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </div>
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
                                    placeholder="RAM (32GB)"
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
                                    placeholder="SSD (1TB)"
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
                                    placeholder="GPU (Arc 140T)"
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
                                    title="Tình trạng riêng của cấu hình này"
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
                                type="text"
                                inputMode="numeric"
                                aria-label={`Giá bán cấu hình ${idx + 1}`}
                                value={formatNumberDots(variant.price)}
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, price: parseNumberDots(e.target.value) ?? 0 } : v
                                    )
                                  )
                                }
                                placeholder="28.900.000"
                                className="matrix-input-cell matrix-input-price"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberDots(variant.originalPrice)}
                                placeholder="Không giảm"
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, originalPrice: parseNumberDots(e.target.value) } : v
                                    )
                                  )
                                }
                                className="matrix-input-cell text-slate-500 text-right"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                max={999999}
                                aria-label={`Tồn kho cấu hình ${idx + 1}`}
                                value={variant.stock ?? 1}
                                onChange={e =>
                                  updateDoc(
                                    'variants',
                                    doc.variants.map((v, i) =>
                                      i === idx ? { ...v, stock: Math.max(0, parseInt(e.target.value, 10) || 0) } : v
                                    )
                                  )
                                }
                                className="matrix-input-cell text-center font-semibold"
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
                          );
                        })
                      )}
                    </tbody>

                    {/* INLINE QUICK ADD ROW */}
                    <tfoot>
                      <tr className="matrix-quick-add-tr">
                        <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>+</td>
                        <td style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '10px' }} title="Gắn ảnh sau khi thêm dòng">—</td>
                        <td>
                          <div className="space-y-1">
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
                            <input
                              type="text"
                              value={quickAddTag}
                              onChange={e => setQuickAddTag(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddQuickVariant();
                              }}
                              placeholder="Nhãn nổi bật (tùy chọn)..."
                              className="matrix-mini-input text-[11px]"
                            />
                          </div>
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
                            type="text"
                            inputMode="numeric"
                            value={quickAddPrice ? formatNumberDots(parseNumberDots(quickAddPrice)) : ''}
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
                            type="text"
                            inputMode="numeric"
                            value={quickAddOriginalPrice ? formatNumberDots(parseNumberDots(quickAddOriginalPrice)) : ''}
                            onChange={e => setQuickAddOriginalPrice(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder="Giá gốc"
                            className="matrix-input-cell text-slate-500 text-right"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={quickAddStock}
                            onChange={e => setQuickAddStock(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddQuickVariant();
                            }}
                            placeholder="SL"
                            className="matrix-input-cell text-center"
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
                            <option value="UNAVAILABLE">Tạm hết hàng</option>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span>Chính sách & Gói bảo hành</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  Thẻ SP: {formatShortWarrantyBadge(doc.warrantyType || 'SHOP', doc.warrantyMonths || 12)}
                </span>
                {doc.warranties.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                    {doc.warranties.length} gói tùy chọn
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
                  const isBrand = doc.warrantyType === 'BRAND';
                  const months = doc.warrantyMonths || 12;
                  updateDoc('warranties', [
                    ...doc.warranties,
                    {
                      name: isBrand ? `Bảo hành Chính hãng ${months} tháng` : `Bảo hành ${months} tháng tại CitiLap`,
                      description: isBrand
                        ? `Bảo hành chính hãng ${months} tháng tại trung tâm ủy quyền, lỗi 1 đổi 1 15 ngày đầu.`
                        : `Bảo hành phần cứng ${months} tháng tại CitiLap, lỗi 1 đổi 1 15 ngày đầu, hỗ trợ phần mềm trọn đời.`,
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
            {/* Thiết lập nhanh Bảo hành hiển thị trên Card SP */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại bảo hành trên Thẻ sản phẩm
                  </label>
                  <select
                    value={doc.warrantyType || 'SHOP'}
                    onChange={e => updateDoc('warrantyType', e.target.value as WarrantyType)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-medium cursor-pointer"
                  >
                    <option value="SHOP">Bảo hành tại CitiLap → Hiển thị &quot;BH {doc.warrantyMonths || 12} tháng&quot;</option>
                    <option value="BRAND">Bảo hành Chính hãng → Hiển thị &quot;BH Hãng {doc.warrantyMonths || 12} tháng&quot;</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian bảo hành mặc định
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {warrantyMonthsOptions.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateDoc('warrantyMonths', m)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          (doc.warrantyMonths || 12) === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        {m} tháng
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Chèn nhanh gói bảo hành:</span>
                {[
                  {
                    label: '+ BH CitiLap 6 tháng (0đ)',
                    type: 'SHOP' as const,
                    months: 6,
                    name: 'Bảo hành 6 tháng tại CitiLap',
                    description: 'Bảo hành phần cứng 6 tháng tại CitiLap, 1 đổi 1 15 ngày đầu.',
                    adjustment: 0,
                  },
                  {
                    label: '+ BH CitiLap 12 tháng (0đ)',
                    type: 'SHOP' as const,
                    months: 12,
                    name: 'Bảo hành 12 tháng tại CitiLap',
                    description: 'Bảo hành phần cứng 12 tháng tại CitiLap, 1 đổi 1 15 ngày đầu, hỗ trợ phần mềm trọn đời.',
                    adjustment: 0,
                  },
                  {
                    label: '+ BH Hãng 12 tháng (0đ)',
                    type: 'BRAND' as const,
                    months: 12,
                    name: 'Bảo hành Chính hãng 12 tháng',
                    description: 'Bảo hành chính hãng 12 tháng toàn quốc, 1 đổi 1 15 ngày đầu tại CitiLap.',
                    adjustment: 0,
                  },
                  {
                    label: '+ BH Hãng 24 tháng (0đ)',
                    type: 'BRAND' as const,
                    months: 24,
                    name: 'Bảo hành Chính hãng 24 tháng',
                    description: 'Bảo hành chính hãng 24 tháng toàn quốc, 1 đổi 1 15 ngày đầu tại CitiLap.',
                    adjustment: 0,
                  },
                  {
                    label: '+ Gói BH Mở rộng (+900.000đ)',
                    type: doc.warrantyType || ('SHOP' as const),
                    months: doc.warrantyMonths || 12,
                    name: 'Bảo hành Vàng mở rộng (+12 tháng)',
                    description: 'Cộng thêm 12 tháng bảo hành toàn diện nguồn & màn hình, miễn phí vệ sinh máy.',
                    adjustment: 900000,
                  },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (preset.adjustment === 0) {
                        updateDoc('warrantyType', preset.type);
                        updateDoc('warrantyMonths', preset.months);
                      }
                      updateDoc('warranties', [
                        ...doc.warranties,
                        {
                          name: preset.name,
                          description: preset.description,
                          adjustment: preset.adjustment,
                          recommended: doc.warranties.length === 0,
                        },
                      ]);
                    }}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {doc.warranties.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Đang áp dụng gói mặc định <strong>{formatShortWarrantyBadge(doc.warrantyType || 'SHOP', doc.warrantyMonths || 12)} (0đ)</strong>. Bấm các nút trên nếu muốn thêm gói nâng cấp bảo hành có thu phí.
              </p>
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
                            type="text"
                            inputMode="numeric"
                            aria-label={`Phụ thu gói ${idx + 1}`}
                            value={formatNumberDots(w.adjustment)}
                            onChange={e =>
                              updateDoc(
                                'warranties',
                                doc.warranties.map((item, i) =>
                                  i === idx ? { ...item, adjustment: parseNumberDots(e.target.value, true) ?? 0 } : item
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
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Tiêu đề ảnh (hiển thị khi phóng to ảnh & SEO ALT) <span className="text-rose-500">*</span>
                      </span>
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
                        placeholder="Nhập tiêu đề ảnh hiển thị khi khách bấm xem ảnh lớn..."
                        className="matrix-input-cell font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Cấu hình ảnh ${idx + 1}`}
                        value={item.variantId}
                        onChange={e => {
                          const newVariantId = e.target.value;
                          const prevVariantId = item.variantId;
                          updateDoc(
                            'media',
                            doc.media.map((m, i) => (i === idx ? { ...m, variantId: newVariantId } : m))
                          );
                          if (newVariantId) {
                            updateDoc(
                              'variants',
                              doc.variants.map(v => (v.id === newVariantId ? { ...v, image: item.assetId } : v))
                            );
                          } else if (prevVariantId) {
                            updateDoc(
                              'variants',
                              doc.variants.map(v =>
                                v.id === prevVariantId && v.image === item.assetId ? { ...v, image: '' } : v
                              )
                            );
                          }
                        }}
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
        <ProductSeoChecklistPanel
          doc={doc}
          updateDoc={updateDoc}
        />
      )}

      {/* TAB 7: LỊCH SỬ PHIÊN BẢN & KHÔI PHỤC */}
      {activeTab === 'history' && id && (
        <ProductRevisionHistoryTab
          id={id}
          revisions={revisions}
          loadingRevisions={loadingRevisions}
          saving={saving}
          restoring={restoring}
          onSelectSnapshot={setSelectedRevisionSnapshot}
          onConfirmRestore={setRestoreConfirmRev}
        />
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
              title="Bấm 'Lưu nháp' (hoặc Ctrl+S) để lưu bản nháp. Bấm 'Xuất bản' để áp dụng toàn bộ nội dung lên website."
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
          <AdminCard title="Giá & Kho">
            <div className="grid gap-3">
              <div>
                <label htmlFor="product-price" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá bán <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="product-price"
                    value={formatNumberDots(doc.price)}
                    onChange={e => updateDoc('price', Math.max(0, parseNumberDots(e.target.value) ?? 0))}
                    placeholder="28.900.000"
                    className="w-full text-sm font-bold text-blue-600 border border-slate-300 rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">đ</span>
                </div>
                <span className="text-xs text-slate-500 mt-1 block">{money(doc.price)}</span>
                {(() => {
                  const activeVariants = doc.variants.filter(
                    v => (!v.availability || ['AVAILABLE', 'PREORDER'].includes(v.availability)) && v.price > 0
                  );
                  if (activeVariants.length === 0) return null;
                  const lowestVariant = activeVariants.reduce(
                    (min, cur) => (cur.price < min.price ? cur : min),
                    activeVariants[0]
                  );
                  if (lowestVariant.price === doc.price) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        updateDoc('price', lowestVariant.price);
                        if (lowestVariant.originalPrice != null && lowestVariant.originalPrice > lowestVariant.price) {
                          updateDoc('originalPrice', lowestVariant.originalPrice);
                        }
                        toast.info(`Đã đồng bộ giá theo cấu hình thấp nhất (${money(lowestVariant.price)})`);
                      }}
                      className="mt-1.5 w-full text-left px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-semibold text-amber-800 transition cursor-pointer"
                    >
                      Đồng bộ theo giá biến thể thấp nhất ({money(lowestVariant.price)})
                    </button>
                  );
                })()}
              </div>

              <div>
                <label htmlFor="product-original-price" className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá gốc <span className="font-normal text-slate-500">(nếu giảm)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="product-original-price"
                    value={formatNumberDots(doc.originalPrice)}
                    placeholder="Không giảm"
                    onChange={e => updateDoc('originalPrice', parseNumberDots(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">đ</span>
                </div>
                {doc.originalPrice != null && doc.originalPrice > doc.price && (
                  <span className="text-xs text-emerald-600 mt-1 block font-medium">
                    Giảm {money(doc.originalPrice - doc.price)} (-
                    {Math.round(((doc.originalPrice - doc.price) / doc.originalPrice) * 100)}%)
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  Tồn kho:
                </span>
                {doc.variants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('pricing')}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {doc.variants.reduce((sum, v) => sum + (v.stock ?? 1), 0)} máy ({doc.variants.length} cấu hình)
                  </button>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    aria-label="Số lượng tồn kho"
                    value={doc.stock ?? 1}
                    onChange={e => updateDoc('stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 text-xs font-bold text-right border border-slate-300 rounded-md px-2 py-1"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Bảo hành:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded border border-slate-200 transition cursor-pointer"
                >
                  {formatShortWarrantyBadge(doc.warrantyType || 'SHOP', doc.warrantyMonths || 12)}
                </button>
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
      <DraftRecovery
        draft={doc}
        endpoint={id ? '/api/admin/products/' + id : undefined}
        storageKey={draftStorageKey}
        currentRevision={revision}
        serverRevision={serverRevision}
        dirty={isDirty}
        validateDraft={candidate => {
          if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
            return { ok: false, error: 'Bản nháp sản phẩm không đúng định dạng đối tượng.' };
          }
          const rec = candidate as Record<string, unknown>;
          if (
            typeof rec.name !== 'string' ||
            typeof rec.slug !== 'string' ||
            typeof rec.categoryId !== 'string'
          ) {
            return { ok: false, error: 'Thiếu trường thông tin cơ bản của sản phẩm.' };
          }
          const direct = productDocumentSchema.safeParse(candidate);
          if (direct.success) {
            return { ok: true, data: direct.data };
          }
          // Allow restoring in-progress new drafts where required string fields are still empty
          const withPlaceholders = productDocumentSchema.safeParse({
            ...rec,
            name: rec.name.trim() || 'draft',
            slug: rec.slug.trim() || 'draft',
            categoryId: rec.categoryId.trim() || 'draft',
          });
          if (withPlaceholders.success) {
            return {
              ok: true,
              data: {
                ...withPlaceholders.data,
                name: rec.name,
                slug: rec.slug,
                categoryId: rec.categoryId,
              },
            };
          }
          return {
            ok: false,
            error: direct.error.issues[0]?.message || 'Cấu trúc dữ liệu sản phẩm không hợp lệ.',
          };
        }}
        onRestoreLocal={(restored, meta) => {
          const validDoc = restored as ProductDocument;
          markDirty();
          setDoc(validDoc);
          latestDoc.current = validDoc;
          setRevision(meta.baseRevision);
          if (meta.isStale) {
            setStatusMessage({
              type: 'warning',
              text: `Đã khôi phục bản nháp từ phiên bản cũ (r${meta.baseRevision}, máy chủ hiện tại r${serverRevision}). Lưu trực tiếp sẽ kiểm tra xung đột phiên bản để không ghi đè nhầm dữ liệu mới.`,
            });
            toast.warning('Đã khôi phục bản nháp (phiên bản gốc cũ hơn máy chủ).');
          } else {
            toast.success('Đã khôi phục bản nháp tạm từ trình duyệt.');
          }
        }}
      />

      {/* MEDIA PICKER MODAL */}
      {pickerOpen && (
        <MediaDialog title="Chọn ảnh / video từ Thư viện Media" onClose={() => setPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload defaultFolder="products" onUploaded={() => setMediaRefresh(n => n + 1)} />
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

      {/* VARIANT IMAGE PICKER MODAL */}
      {variantImagePickerId && (
        <MediaDialog
          title={`Gắn ảnh riêng cho cấu hình: ${targetVariantForPicker?.name || targetVariantForPicker?.sku || 'Biến thể'}`}
          onClose={() => setVariantImagePickerId(null)}
        >
          <div className="space-y-4">
            {doc.media.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    1. Chọn nhanh từ các ảnh đã có của sản phẩm này ({doc.media.length} ảnh)
                  </span>
                  {currentAssignedVariantAssetId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAssignVariantImage(variantImagePickerId, null);
                        setVariantImagePickerId(null);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      ✕ Gỡ ảnh riêng (dùng ảnh chung)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {doc.media.map((m, idx) => {
                    const isSelected = currentAssignedVariantAssetId === m.assetId;
                    return (
                      <button
                        key={m.assetId}
                        type="button"
                        onClick={() => {
                          handleAssignVariantImage(variantImagePickerId, m.assetId, m.alt);
                          setVariantImagePickerId(null);
                        }}
                        className={`group relative rounded-lg overflow-hidden border-2 transition cursor-pointer text-left bg-white ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/30'
                            : 'border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
                          <StudioAsset key={m.assetId} id={m.assetId} />
                          <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
                            {idx === 0 ? 'Bìa' : `#${idx + 1}`}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <div className="p-1.5 text-[11px] text-slate-700 truncate font-medium">
                          {m.alt || `Ảnh #${idx + 1}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                {doc.media.length > 0
                  ? '2. Hoặc tải lên / chọn ảnh mới từ Thư viện Media'
                  : 'Tải lên hoặc chọn ảnh từ Thư viện Media'}
              </span>
              <MediaUpload defaultFolder="variants" onUploaded={() => setMediaRefresh(n => n + 1)} />
              <MediaBrowser
                refresh={mediaRefresh}
                picker
                allowVideo={false}
                onSelect={asset => {
                  handleAssignVariantImage(
                    variantImagePickerId,
                    asset.id,
                    asset.alt || asset.name || `${doc.name} - ${targetVariantForPicker?.name || ''}`
                  );
                  setVariantImagePickerId(null);
                }}
              />
            </div>
          </div>
        </MediaDialog>
      )}

      {/* CONTENT MEDIA PICKER DIALOG */}
      {contentMediaPickerOpen && (
        <MediaDialog title="Chọn ảnh chèn vào bài viết" onClose={() => setContentMediaPickerOpen(false)}>
          <div className="space-y-4">
            <MediaUpload defaultFolder="content" onUploaded={() => setMediaRefresh(n => n + 1)} />
            <MediaBrowser
              refresh={mediaRefresh}
              picker
              allowVideo={false}
              onSelect={asset => {
                const figure = document.createElement('figure');
                figure.style.cssText = 'width: 100%; max-width: 100%; margin: 1rem auto; text-align: center;';
                const image = document.createElement('img');
                image.src = asset.url || '';
                image.alt = asset.alt || asset.name || doc.name;
                image.style.cssText = 'width: 100%; height: auto; border-radius: 8px;';
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

      <ProductRevisionModals
        id={id}
        revision={revision}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        revisions={revisions}
        loadingRevisions={loadingRevisions}
        saving={saving}
        restoring={restoring}
        selectedRevisionSnapshot={selectedRevisionSnapshot}
        setSelectedRevisionSnapshot={setSelectedRevisionSnapshot}
        restoreConfirmRev={restoreConfirmRev}
        setRestoreConfirmRev={setRestoreConfirmRev}
        onRestore={handleRestore}
      />

      {previewOpen && (
        <ProductPreviewModal
          id={id}
          doc={doc}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {relatedPickerOpen && (
        <RelatedProductsPickerModal
          doc={doc}
          updateDoc={updateDoc}
          relatedSearch={relatedSearch}
          setRelatedSearch={setRelatedSearch}
          loadingRelated={loadingRelated}
          relatedCandidates={relatedCandidates}
          fetchRelatedCandidates={fetchRelatedCandidates}
          onClose={() => setRelatedPickerOpen(false)}
        />
      )}
    </div>
  );
}
