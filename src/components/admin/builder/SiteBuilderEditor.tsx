'use client';

import {useDraftAutosave} from '../useDraftAutosave';
import SchedulePanel from '../SchedulePanel';
import DraftRecovery from '../DraftRecovery';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Save,
  Send,
  Eye,
  History,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Plus,
  EyeOff,
  Sliders,
  Grid,
  Tag,
  FolderTree,
  Bookmark,
  Newspaper,
  Info,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Smartphone,
  Monitor,
  CheckCircle,
  X,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import type {
  LandingPageStudioResponse,
  SectionItem,
  SectionType,
  ProductRuleCriteria,
} from '@/contracts/cms/site-builder';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import BlockRenderer from '@/components/builder/BlockRenderer';
import { WishlistProvider } from '@/context/WishlistContext';
import { CompareProvider } from '@/context/CompareContext';
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';

interface ProductItem {
  id: string;
  name: string;
  status: string;
}

interface RevisionItem {
  id: string;
  revision: number;
  action: string;
  actor: string;
  createdAt: string;
}

export interface SiteBuilderEditorProps {
  pageId: string;
}

const SECTION_TYPE_META: Record<
  SectionType,
  { label: string; icon: React.ElementType; desc: string }
> = {
  banner: { label: 'Banner quảng cáo', icon: ImageIcon, desc: 'Banner đơn nổi bật với nút kêu gọi hành động' },
  slider: { label: 'Slider trình chiếu', icon: Sliders, desc: 'Băng chuyền hình ảnh chạy ngang' },
  product_grid: { label: 'Lưới sản phẩm', icon: Grid, desc: 'Danh sách sản phẩm chọn thủ công hoặc theo bộ lọc' },
  featured_categories: { label: 'Danh mục nổi bật', icon: FolderTree, desc: 'Các danh mục chính kèm icon' },
  featured_brands: { label: 'Thương hiệu đối tác', icon: Tag, desc: 'Logo các hãng sản xuất lớn' },
  featured_collection: { label: 'Bộ sưu tập', icon: Bookmark, desc: 'Gắn một bộ sưu tập từ hệ thống' },
  news_reviews: { label: 'Tin tức & Đánh giá', icon: Newspaper, desc: 'Các bài viết hoặc đánh giá nổi bật' },
  intro: { label: 'Giới thiệu & Số liệu', icon: Info, desc: 'Khối giới thiệu thương hiệu và các chỉ số' },
  cta: { label: 'Kêu gọi hành động (CTA)', icon: Sparkles, desc: 'Khối chốt hành động với nút nổi bật' },
  video_reviews: { label: 'Video review', icon: Eye, desc: 'Video YouTube và TikTok' },
  customer_gallery: { label: 'Ảnh khách hàng', icon: ImageIcon, desc: 'Ảnh trải nghiệm tại cửa hàng' },
};

function createDefaultSection(type: SectionType): SectionItem {
  const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  switch (type) {
    case 'video_reviews':
      return { id, type, name: 'Video review', enabled: true, data: { type, title: 'Video review sản phẩm', videos: [] } };
    case 'customer_gallery':
      return { id, type, name: 'Ảnh khách hàng', enabled: true, data: { type, title: 'Hình ảnh khách hàng tại CitiLap', images: [] } };
    case 'banner':
      return {
        id,
        type: 'banner',
        name: 'Banner Quảng Cáo',
        enabled: true,
        data: {
          type: 'banner',
          title: '',
          subtitle: '',
          badge: '',
          imageUrl: '',
          imageAssetId: null,
          link: '',
          buttonText: '',
          secondaryLink: '',
          secondaryButtonText: '',
          layout: 'hero',
        },
      };
    case 'slider':
      return {
        id,
        type: 'slider',
        name: 'Slider Trình Chiếu',
        enabled: true,
        data: {
          type: 'slider',
          autoplay: true,
          intervalSec: 5,
          slides: [
            {
              id: `slide_${Date.now()}_1`,
              title: '',
              subtitle: '',
              badge: '',
              imageUrl: '',
              imageAssetId: null,
              link: '',
              buttonText: '',
            },
          ],
        },
      };
    case 'product_grid':
      return {
        id,
        type: 'product_grid',
        name: 'Lưới Sản Phẩm',
        enabled: true,
        data: {
          type: 'product_grid',
          title: 'Sản Phẩm Nổi Bật',
          subtitle: 'Các dòng máy được khách hàng ưa chuộng',
          badge: 'Nổi Bật',
          badgeColor: 'bg-blue-600 text-white',
          colorTheme: 'blue',
          links: [],
          sourceMode: 'rule',
          manualProductIds: [],
          ruleCriteria: {
            productType: 'laptop',
            categoryId: null,
            brandId: null,
            tag: 'all',
            availability: 'all',
            sort: 'newest',
            limit: 8,
          },
          rankNumbering: false,
          viewAllLink: '/laptop-gaming',
        },
      };
    case 'featured_categories':
      return {
        id,
        type: 'featured_categories',
        name: 'Danh Mục Nổi Bật',
        enabled: true,
        data: {
          type: 'featured_categories',
          title: 'Khám Phá Hệ Sinh Thái Danh Mục',
          subtitle: 'Lựa chọn dòng máy phù hợp nhất theo nhu cầu',
          categoryIds: [],
          items: [],
        },
      };
    case 'featured_brands':
      return {
        id,
        type: 'featured_brands',
        name: 'Thương Hiệu Đối Tác',
        enabled: true,
        data: {
          type: 'featured_brands',
          title: 'Khám Phá Theo Thương Hiệu',
          subtitle: 'Đối tác phân phối thiết bị công nghệ chính hãng',
          brandIds: [],
        },
      };
    case 'featured_collection':
      return {
        id,
        type: 'featured_collection',
        name: 'Bộ Sưu Tập Nổi Bật',
        enabled: true,
        data: {
          type: 'featured_collection',
          title: 'Bộ Sưu Tập Tuyển Chọn',
          subtitle: '',
          collectionId: '',
          limit: 12,
        },
      };
    case 'news_reviews':
      return {
        id,
        type: 'news_reviews',
        name: 'Góc Tin Tức & Đánh Giá',
        enabled: true,
        data: {
          type: 'news_reviews',
          title: 'Góc CitiLap Media & Đánh Giá',
          subtitle: 'Chia sẻ kinh nghiệm chọn mua và sử dụng thiết bị',
          postIds: [],
          limit: 4,
          categoryId: null,
        },
      };
    case 'intro':
      return {
        id,
        type: 'intro',
        name: 'Giới Thiệu & Cam Kết',
        enabled: true,
        data: {
          type: 'intro',
          title: 'Cam Kết Chất Lượng CitiLap',
          subtitle: '4 tiêu chuẩn dịch vụ vượt trội dành cho khách hàng',
          contentHtml: '',
          features: [
            { id: 'f1', icon: 'star', title: 'Máy lướt, giá tốt', description: 'Like-new 99%, tiết kiệm 30 - 50%' },
            { id: 'f2', icon: 'shield', title: 'Cam kết nguyên zin', description: '100% linh kiện chuẩn, chưa sửa chữa' },
            { id: 'f3', icon: 'refresh', title: 'Dịch vụ vượt trội', description: 'Bảo hành chu đáo, 1 đổi 1 linh hoạt' },
            { id: 'f4', icon: 'truck', title: 'Giao hàng hỏa tốc', description: 'Đồng kiểm máy trước khi thanh toán' },
          ],
        },
      };
    case 'cta':
      return {
        id,
        type: 'cta',
        name: 'Kêu Gọi Hành Động (CTA)',
        enabled: true,
        data: {
          type: 'cta',
          title: 'Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?',
          subtitle: 'Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp 1-1 qua Zalo hoặc Hotline.',
          primaryText: 'Chat Zalo Ngay',
          primaryLink: 'https://zalo.me',
          phone: '0987654321',
          secondaryText: 'Gọi Hotline',
          secondaryLink: 'tel:0987654321',
          bgImageUrl: '',
        },
      };
  }
}

export default function SiteBuilderEditor({ pageId }: SiteBuilderEditorProps) {
  const [data, setData] = useState<LandingPageStudioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active section selection
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'settings'>('sections');

  // Working state copy
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [internalName, setInternalName] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [ogImageAssetId, setOgImageAssetId] = useState<string | null>(null);

  // Dirty detection
  const [initialJson, setInitialJson] = useState('');
  const currentJson=JSON.stringify({sections,internalName,title,slug,seoTitle,seoDesc,ogImageAssetId});
  const latest=useRef(currentJson),lock=useRef(false);
  useEffect(()=>{latest.current=currentJson;},[currentJson]);
  const isDirty = initialJson !== JSON.stringify({ sections, internalName, title, slug, seoTitle, seoDesc, ogImageAssetId });

  // Dialogs
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);
  const [productPickerTarget, setProductPickerTarget] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewSections, setPreviewSections] = useState<ResolvedSectionItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  // Load initial page data
  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await mediaRequest<any>(`/api/admin/builder/${pageId}`);
      setData(res);

      const doc = res.document || res;
      setInternalName(doc.internalName || doc.name || '');
      setTitle(doc.title || '');
      setSlug(doc.slug || '');
      setSeoTitle(doc.seo?.title || '');
      setSeoDesc(doc.seo?.description || '');
      setOgImageAssetId(doc.seo?.ogImageAssetId || null);

      const loadedSections: SectionItem[] = doc.sections || [];
      setSections(loadedSections);

      if (loadedSections.length > 0 && !selectedSectionId) {
        setSelectedSectionId(loadedSections[0].id);
      }

      const snapshot = JSON.stringify({
        sections: loadedSections,
        internalName: doc.internalName || doc.name || '',
        title: doc.title || '',
        slug: doc.slug || '',
        seoTitle: doc.seo?.title || '',
        seoDesc: doc.seo?.description || '',
        ogImageAssetId: doc.seo?.ogImageAssetId || null,
      });
      setInitialJson(snapshot);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu trang.');
    } finally {
      setLoading(false);
    }
  }, [pageId, selectedSectionId]);

  useEffect(() => {
    void Promise.resolve().then(loadPageData);
  }, [loadPageData]);

  // Warning when leaving with unsaved changes
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

  // Close popovers & menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mediaPickerTarget) setMediaPickerTarget(null);
        else if (productPickerTarget) setProductPickerTarget(null);
        else if (showAddMenu) setShowAddMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaPickerTarget, productPickerTarget, showAddMenu]);

  const previewModalRef = useRef<HTMLDivElement>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const revisionsModalRef = useRef<HTMLDivElement>(null);
  const revisionsTriggerRef = useRef<HTMLElement | null>(null);

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    previewTriggerRef.current?.focus();
  };

  const closeRevisionsModal = () => {
    setShowRevisionsModal(false);
    revisionsTriggerRef.current?.focus();
  };

  // Focus trap for Preview Modal
  useEffect(() => {
    if (!showPreviewModal) return;

    const timer = setTimeout(() => {
      const closeBtn = previewModalRef.current?.querySelector<HTMLElement>('button[aria-label="Đóng cửa sổ xem trước"]');
      closeBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreviewModal();
        return;
      }
      if (e.key === 'Tab' && previewModalRef.current) {
        const focusables = previewModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPreviewModal]);

  // Focus trap for Revisions Modal
  useEffect(() => {
    if (!showRevisionsModal) return;

    const timer = setTimeout(() => {
      const closeBtn = revisionsModalRef.current?.querySelector<HTMLElement>('button[aria-label="Đóng lịch sử phiên bản"]');
      closeBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRevisionsModal();
        return;
      }
      if (e.key === 'Tab' && revisionsModalRef.current) {
        const focusables = revisionsModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showRevisionsModal]);

  // Section manipulation helpers
  const handleAddSection = (type: SectionType) => {
    const newSec = createDefaultSection(type);
    setSections((prev) => [...prev, newSec]);
    setSelectedSectionId(newSec.id);
    setShowAddMenu(false);
  };

  const handleDuplicateSection = (index: number) => {
    const sec = sections[index];
    if (!sec) return;
    const deepCopiedData =
      typeof structuredClone === 'function'
        ? structuredClone(sec.data)
        : JSON.parse(JSON.stringify(sec.data));
    const clone: SectionItem = {
      ...sec,
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${sec.name} (Bản sao)`,
      data: deepCopiedData,
    } as SectionItem;
    const next = [...sections];
    next.splice(index + 1, 0, clone);
    setSections(next);
    setSelectedSectionId(clone.id);
  };

  const handleDeleteSection = (id: string) => {
    const target = sections.find((s) => s.id === id);
    const confirmMessage = target
      ? `Bạn có chắc chắn muốn xóa khối "${target.name}"?`
      : 'Bạn có chắc chắn muốn xóa khối này?';
    if (!window.confirm(confirmMessage)) return;
    const next = sections.filter((s) => s.id !== id);
    setSections(next);
    if (selectedSectionId === id) {
      setSelectedSectionId(next[0]?.id || null);
    }
  };

  const handleToggleVisible = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleMoveSection = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    setSections(next);
  };

  const updateSelectedSectionMeta = (patch: Partial<Pick<SectionItem, 'name' | 'enabled'>>) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((s) => (s.id === selectedSectionId ? ({ ...s, ...patch } as SectionItem) : s))
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSelectedSectionData = (patch: Record<string, any>) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSectionId) return s;
        return {
          ...s,
          data: {
            ...s.data,
            ...patch,
          },
        } as SectionItem;
      })
    );
  };

  // Save / Publish / Unpublish actions
  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (!data || lock.current) return false;
    if (action === 'publish') {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn xuất bản ngay?\nThay đổi này sẽ hiển thị trực tiếp cho khách hàng trên website.'
      );
      if (!confirmed) return false;
    } else if (action === 'unpublish') {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn gỡ xuất bản?\nTrang này sẽ chuyển về trạng thái lưu trữ/ẩn.'
      );
      if (!confirmed) return false;
    }
    lock.current = true;
    const submitted = currentJson;
    setSaving(true);
    setError(null);
    setConflictError(null);
    setSuccessMsg(null);

    const payload = {
      expectedRevision: data.revision ?? 0,
      action,
      document: {
        schemaVersion: 1,
        internalName,
        title,
        slug: pageId === 'home' ? '' : slug,
        seo: {
          title: seoTitle,
          description: seoDesc,
          ogImageAssetId: ogImageAssetId || null,
        },
        sections,
      },
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await mediaRequest<any>(`/api/admin/builder/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setData(res);
      const doc = res.document || res;
      if(latest.current===submitted){
      setInternalName(doc.internalName || doc.name || '');
      setTitle(doc.title || '');
      setSlug(doc.slug || '');
      setSeoTitle(doc.seo?.title || '');
      setSeoDesc(doc.seo?.description || '');
      setOgImageAssetId(doc.seo?.ogImageAssetId || null);
      setSections(doc.sections || []);
      }

      const snapshot = JSON.stringify({
        sections: doc.sections || [],
        internalName: doc.internalName || doc.name || '',
        title: doc.title || '',
        slug: doc.slug || '',
        seoTitle: doc.seo?.title || '',
        seoDesc: doc.seo?.description || '',
        ogImageAssetId: doc.seo?.ogImageAssetId || null,
      });
      setInitialJson(snapshot);

      if (action === 'publish') {
        setSuccessMsg(`Xuất bản thành công! Đang hiển thị bản r${res.publishedRevision || res.revision}.`);
      } else if (action === 'unpublish') {
        setSuccessMsg('Đã hủy xuất bản trang.');
      } else {
        setSuccessMsg(`Đã lưu bản nháp r${res.revision}.`);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu trang.';
      if (msg.includes('409') || msg.includes('Xung đột') || msg.includes('CONFLICT')) {
        setConflictError(
          'Xung đột phiên bản (409): Trang đã được sửa đổi ở nơi khác. Dữ liệu của bạn vẫn được giữ trên màn hình này. Hãy kiểm tra hoặc tải lại.'
        );
      } else {
        setError(msg);
      }
      return false;
    } finally {
      lock.current=false;
      setSaving(false);
    }
  };

  const autosaveStatus=useDraftAutosave(currentJson,data?.revision||0,!!data&&!loading,isDirty,saving,()=>handleSave('save'));
  // Live Preview Modal
  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
    setPreviewLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await mediaRequest<any>(`/api/admin/builder/${pageId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: 1,
          internalName,
          title,
          slug: pageId === 'home' ? '' : slug,
          seo: {
            title: seoTitle,
            description: seoDesc,
            ogImageAssetId: ogImageAssetId || null,
          },
          sections,
        }),
      });
      setPreviewSections(res.sections || []);
    } catch {
      // Graceful fallback to client sections
      setPreviewSections(sections as unknown as ResolvedSectionItem[]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Revisions Modal
  const handleOpenRevisions = async () => {
    setShowRevisionsModal(true);
    setRevisionsLoading(true);
    try {
      const res = await mediaRequest<{ revisions: RevisionItem[] }>(
        `/api/admin/builder/${pageId}/revisions`
      );
      setRevisions(res.revisions || []);
    } catch {
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const openPreviewModal = () => {
    previewTriggerRef.current = document.activeElement as HTMLElement;
    void handleOpenPreview();
  };

  const openRevisionsModal = () => {
    revisionsTriggerRef.current = document.activeElement as HTMLElement;
    void handleOpenRevisions();
  };

  const handleRestoreRevision = async (targetRev: number) => {
    if (!data || lock.current) return;
    if (!confirm(`Bạn có chắc muốn khôi phục bản nháp từ phiên bản r${targetRev}?`)) return;

    lock.current = true;
    setSaving(true);
    setLoading(true);
    try {
      await mediaRequest<unknown>(`/api/admin/builder/${pageId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRevision: targetRev,
          expectedRevision: data.revision,
        }),
      });
      closeRevisionsModal();
      await loadPageData();
      setSuccessMsg(`Đã khôi phục thành công bản r${targetRev} thành bản nháp mới.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi khôi phục phiên bản.');
    } finally {
      lock.current = false;
      setSaving(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Đang tải trình soạn thảo Site Builder...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-red-900">Không thể tải trang</h3>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={loadPageData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedIndex = sections.findIndex((s) => s.id === selectedSectionId);

  return (
    <div className="admin-builder-editor flex flex-col bg-slate-100 overflow-hidden">
      {/* 1. TOP STATUS & ACTION BAR */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/builder"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại danh sách"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {internalName || title || 'Trang chưa đặt tên'}
              </h1>
              {pageId === 'home' ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">
                  Trang chủ
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                  /landing/{slug}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  data?.status === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : data?.status === 'ARCHIVED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {data?.status === 'PUBLISHED'
                  ? 'Đã xuất bản'
                  : data?.status === 'ARCHIVED'
                  ? 'Đã ẩn'
                  : 'Bản nháp'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Bản r{data?.revision ?? 0}</span>
              <span>•</span>
              {data?.publishedRevision ? (
                <span className="text-emerald-700 font-medium">
                  Public: r{data.publishedRevision}
                </span>
              ) : (
                <span className="text-amber-700">Chưa có bản public</span>
              )}
              {autosaveStatus && (
                <>
                  <span>•</span>
                  <span className="text-slate-400 italic text-[11px]" role="status">
                    {autosaveStatus}
                  </span>
                </>
              )}
              {isDirty && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Chưa lưu thay đổi
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openRevisionsModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Lịch sử</span>
          </button>

          <button
            type="button"
            onClick={openPreviewModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Xem trước</span>
          </button>

          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => handleSave('save')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition disabled:opacity-40 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>

          {data?.status === 'PUBLISHED' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('unpublish')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Gỡ xuất bản</span>
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('publish')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Xuất bản ngay</span>
          </button>
        </div>
      </header>

      {/* Notifications / Error / Conflict Alert */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 p-1 rounded hover:bg-rose-100 transition cursor-pointer"
            aria-label="Đóng thông báo lỗi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {conflictError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{conflictError}</span>
          </div>
          <button
            onClick={loadPageData}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
          >
            Tải lại bản mới nhất
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN STUDIO LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Section list & Structure tabs */}
        <aside className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
          {/* Tab selector */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition cursor-pointer ${
                activeTab === 'sections'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Khối nội dung ({sections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Cài đặt & SEO
            </button>
          </div>

          {activeTab === 'sections' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Add Section Header */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Thứ tự hiển thị
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm khối</span>
                  </button>

                  {/* Add Dropdown Menu */}
                  {showAddMenu && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 space-y-1">
                      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Chọn loại khối
                      </div>
                      {(Object.keys(SECTION_TYPE_META) as SectionType[]).map((type) => {
                        const meta = SECTION_TYPE_META[type];
                        const Icon = meta.icon;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleAddSection(type)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-blue-50/70 text-left transition group cursor-pointer"
                          >
                            <span className="p-1.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition">
                              <Icon className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                                {meta.label}
                              </div>
                              <div className="text-[11px] text-slate-500 leading-tight">
                                {meta.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Sections list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {sections.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-400 text-xs space-y-2">
                    <p>Trang này chưa có khối nội dung nào.</p>
                    <p>Bấm &quot;Thêm khối&quot; phía trên để bắt đầu dựng giao diện.</p>
                  </div>
                ) : (
                  sections.map((sec, idx) => {
                    const meta = SECTION_TYPE_META[sec.type] || {
                      label: sec.type,
                      icon: LayoutIconFallback,
                    };
                    const Icon = meta.icon;
                    const isSelected = sec.id === selectedSectionId;

                    return (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionId(sec.id)}
                        className={`group p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-400 shadow-2xs'
                            : sec.enabled
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-slate-50 border-dashed border-slate-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="p-1 text-slate-500 shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {sec.name || meta.label}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {meta.label} {!sec.enabled && '• Đang ẩn'}
                            </div>
                          </div>
                        </div>

                        {/* Quick Control Actions */}
                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleVisible(sec.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title={sec.enabled ? 'Ẩn khối' : 'Hiện khối'}
                          >
                            {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, -1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 disabled:opacity-20"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => handleMoveSection(idx, 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 disabled:opacity-20"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSection(idx)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                            title="Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                            title="Xóa khối"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* SETTINGS & SEO TAB */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên quản trị nội bộ (Admin)</label>
                <input
                  type="text"
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Ví dụ: Trang chủ chính thức hoặc Landing Sale Hè"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề trang (Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Tiêu đề hiển thị"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Đường dẫn tĩnh (Slug)</label>
                <input
                  type="text"
                  value={slug}
                  disabled={pageId === 'home'}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                  placeholder="duong-dan-landing"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {pageId === 'home'
                    ? 'Đường dẫn trang chủ là cố định (/)'
                    : `URL truy cập: /landing/${slug || 'slug'}`}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Tối ưu hóa tìm kiếm (SEO)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Tiêu đề SEO</label>
                    <input
                      type="text"
                      maxLength={70}
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      placeholder="Mặc định lấy theo tiêu đề trang"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mô tả SEO</label>
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={seoDesc}
                      onChange={(e) => setSeoDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      placeholder="Mô tả tóm tắt nội dung khi hiển thị trên Google..."
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mã Media Asset ảnh OG</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ogImageAssetId || ''}
                        onChange={(e) => setOgImageAssetId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        placeholder="Asset ID..."
                      />
                      <button
                        type="button"
                        onClick={() => setMediaPickerTarget('og_image')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Chọn ảnh
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Lịch xuất bản tự động</h4>
                <SchedulePanel
                  entityType="landing"
                  entityId={data?.id || pageId}
                  revision={data?.revision || 0}
                  dirty={isDirty || saving}
                />
              </div>

              {isDirty && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Sao lưu & Khôi phục nháp</h4>
                  <DraftRecovery
                    draft={JSON.parse(currentJson)}
                    endpoint={`/api/admin/builder/${pageId}`}
                  />
                </div>
              )}
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: Section Form Editor */}
        <main className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {selectedSection ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {selectedIndex + 1}
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        {SECTION_TYPE_META[selectedSection.type]?.label || selectedSection.type}
                      </h2>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {selectedSection.id} • loại: {selectedSection.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(selectedSection.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedSection.enabled
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedSection.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{selectedSection.enabled ? 'Đang hiển thị' : 'Đang ẩn'}</span>
                    </button>
                  </div>
                </div>

                {/* Common Section Name field */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên khối nội dung (Quản trị)</label>
                  <input
                    type="text"
                    value={selectedSection.name}
                    onChange={(e) => updateSelectedSectionMeta({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    placeholder="Nhập tên khối quản trị"
                  />
                </div>

                {/* FORM FIELDS BY TYPE */}
                <div className="space-y-4 text-xs pt-2 border-t border-slate-100">
                  {selectedSection.data.type === 'banner' && (
                    <BannerForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={() => setMediaPickerTarget('banner_image')}
                    />
                  )}
                  {selectedSection.data.type === 'slider' && (
                    <SliderForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(slideIdx) => setMediaPickerTarget(`slide_image:${slideIdx}`)}
                    />
                  )}
                  {selectedSection.data.type === 'product_grid' && (
                    <ProductGridForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickProduct={() => setProductPickerTarget('product_grid')}
                    />
                  )}
                  {selectedSection.data.type === 'featured_categories' && (
                    <FeaturedCategoriesForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                  {selectedSection.data.type === 'featured_brands' && (
                    <FeaturedBrandsForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                  {selectedSection.data.type === 'featured_collection' && (
                    <FeaturedCollectionForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                  {selectedSection.data.type === 'news_reviews' && (
                    <NewsReviewsForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                  {selectedSection.data.type === 'intro' && (
                    <IntroForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                  {selectedSection.data.type === 'video_reviews' && (
                    <VideoReviewsForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(videoIdx) => setMediaPickerTarget(`video_thumb:${videoIdx}`)}
                    />
                  )}
                  {selectedSection.data.type === 'customer_gallery' && (
                    <CustomerGalleryForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(imgIdx) => setMediaPickerTarget(`gallery_image:${imgIdx}`)}
                      onAddMedia={() => setMediaPickerTarget('gallery_image_add')}
                    />
                  )}
                  {selectedSection.data.type === 'cta' && (
                    <CtaForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Chọn một khối ở danh sách bên trái để chỉnh sửa thông tin chi tiết.
            </div>
          )}
        </main>
      </div>

      {/* 3. MEDIA PICKER DIALOG */}
      {mediaPickerTarget && (
        <MediaDialog
          title="Chọn hình ảnh từ thư viện"
          onClose={() => setMediaPickerTarget(null)}
        >
          <MediaBrowser
            picker
            onSelect={(asset) => {
              if (mediaPickerTarget === 'banner_image' && selectedSection?.data.type === 'banner') {
                updateSelectedSectionData({ imageUrl: asset.url || '', imageAssetId: asset.id });
              } else if (mediaPickerTarget === 'og_image') {
                setOgImageAssetId(asset.id);
              } else if (mediaPickerTarget.startsWith('slide_image:') && selectedSection?.data.type === 'slider') {
                const sIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                const slides = [...(selectedSection.data.slides || [])];
                if (slides[sIdx]) {
                  slides[sIdx] = { ...slides[sIdx], imageUrl: asset.url || '', imageAssetId: asset.id };
                  updateSelectedSectionData({ slides });
                }
              } else if (mediaPickerTarget.startsWith('video_thumb:') && selectedSection?.data.type === 'video_reviews') {
                const vIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                const videos = [...(selectedSection.data.videos || [])];
                if (videos[vIdx]) {
                  videos[vIdx] = { ...videos[vIdx], thumbnail: asset.url || '' };
                  updateSelectedSectionData({ videos });
                }
              } else if (mediaPickerTarget.startsWith('gallery_image:') && selectedSection?.data.type === 'customer_gallery') {
                const gIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                const images = [...(selectedSection.data.images || [])];
                if (images[gIdx]) {
                  images[gIdx] = { ...images[gIdx], url: asset.url || '' };
                  updateSelectedSectionData({ images });
                }
              } else if (mediaPickerTarget === 'gallery_image_add' && selectedSection?.data.type === 'customer_gallery') {
                const current = selectedSection.data.images || [];
                updateSelectedSectionData({
                  images: [...current, { url: asset.url || '', alt: 'Khách hàng CitiLap' }],
                });
              }
              setMediaPickerTarget(null);
            }}
          />
        </MediaDialog>
      )}

      {/* 4. PRODUCT SELECTOR DIALOG */}
      {productPickerTarget && (
        <ProductSelectorDialog
          onClose={() => setProductPickerTarget(null)}
          onSelect={(product) => {
            if (selectedSection?.data.type === 'product_grid') {
              const current = selectedSection.data.manualProductIds || [];
              if (!current.includes(product.id) && current.length < 48) {
                updateSelectedSectionData({ manualProductIds: [...current, product.id] });
              }
            }
          }}
        />
      )}

      {/* 5. PREVIEW MODAL */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreviewModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6"
        >
          <div
            ref={previewModalRef}
            className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span id="preview-modal-title" className="text-sm font-bold text-slate-900">
                  Xem trước bản dựng
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  DRAFT PREVIEW
                </span>
              </div>

              {/* Viewport switch */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                    previewViewport === 'desktop'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                    previewViewport === 'mobile'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile (390px)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={closePreviewModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Đóng cửa sổ xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Renderer */}
            <div className="flex-1 overflow-y-auto bg-slate-200 flex justify-center p-4">
              <div
                className={`bg-white shadow-xl transition-all overflow-y-auto ${
                  previewViewport === 'mobile'
                    ? 'w-[390px] min-h-[700px] rounded-3xl border-8 border-slate-800'
                    : 'w-full max-w-5xl rounded-xl'
                }`}
              >
                {previewLoading ? (
                  <div className="flex items-center justify-center p-20 text-slate-400 text-sm">
                    Đang dựng bản xem trước với dữ liệu thực tế...
                  </div>
                ) : (
                  <div className="p-4 sm:p-6 space-y-6">
                    <WishlistProvider>
                      <CompareProvider>
                        <BlockRenderer sections={previewSections} />
                      </CompareProvider>
                    </WishlistProvider>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. REVISIONS MODAL */}
      {showRevisionsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revisions-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRevisionsModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            ref={revisionsModalRef}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 id="revisions-modal-title" className="text-sm font-bold text-slate-900">
                  Lịch sử các phiên bản
                </h3>
              </div>
              <button
                type="button"
                onClick={closeRevisionsModal}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Đóng lịch sử phiên bản"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {revisionsLoading ? (
                <p className="text-center text-slate-400 text-xs py-8">Đang tải lịch sử...</p>
              ) : revisions.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">Chưa có lịch sử phiên bản nào.</p>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Phiên bản r{rev.revision}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 uppercase">
                          {rev.action}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(rev.createdAt).toLocaleString('vi-VN')} • Bởi {rev.actor}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreRevision(rev.revision)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Khôi phục
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutIconFallback(props: React.SVGProps<SVGSVGElement>) {
  return <LayoutGrid {...props} />;
}

function LayoutGrid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ProductSelectorDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: ProductItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductItem[]; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await mediaRequest<{ items: ProductItem[]; hasMore: boolean }>(
          `/api/admin/navigation/products?q=${encodeURIComponent(query)}&page=${page}`
        );
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ignore = true;
    };
  }, [query, page]);

  return (
    <MediaDialog title="Chọn sản phẩm vào lưới" onClose={onClose}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm theo tên sản phẩm..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-center text-slate-400 text-xs py-6">Đang tìm kiếm...</p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-6">Không tìm thấy sản phẩm nào.</p>
          ) : (
            data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">ID: {p.id}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status === 'ACTIVE' ? 'Đã xuất bản' : 'Bản nháp'}
                </span>
              </button>
            ))
          )}
        </div>

        {data && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
            >
              Trang trước
            </button>
            <span className="text-slate-500">Trang {page}</span>
            <button
              type="button"
              disabled={!data.hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </MediaDialog>
  );
}

// ==========================================
// TYPED FORM SUB-COMPONENTS FOR 9 SECTION TYPES
// ==========================================

type BannerData = Extract<SectionItem['data'], { type: 'banner' }>;
type SliderData = Extract<SectionItem['data'], { type: 'slider' }>;
type ProductGridData = Extract<SectionItem['data'], { type: 'product_grid' }>;
type FeaturedCategoriesData = Extract<SectionItem['data'], { type: 'featured_categories' }>;
type FeaturedBrandsData = Extract<SectionItem['data'], { type: 'featured_brands' }>;
type FeaturedCollectionData = Extract<SectionItem['data'], { type: 'featured_collection' }>;
type NewsReviewsData = Extract<SectionItem['data'], { type: 'news_reviews' }>;
type IntroData = Extract<SectionItem['data'], { type: 'intro' }>;
type CtaData = Extract<SectionItem['data'], { type: 'cta' }>;
type VideoReviewsData = Extract<SectionItem['data'], { type: 'video_reviews' }>;
type CustomerGalleryData = Extract<SectionItem['data'], { type: 'customer_gallery' }>;

function BannerForm({
  data,
  update,
  onPickMedia,
}: {
  data: BannerData;
  update: (p: Partial<BannerData>) => void;
  onPickMedia: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề banner</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Tiêu đề chính..."
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Huy hiệu (Badge)</label>
          <input
            type="text"
            value={data.badge || ''}
            onChange={(e) => update({ badge: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Giảm giá sốc"
          />
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ (Subtitle)</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Mô tả ngắn gọn"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Bố cục (Layout)</label>
          <select
            value={data.layout || 'hero'}
            onChange={(e) => update({ layout: e.target.value as 'hero' | 'split' | 'fullwidth' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          >
            <option value="hero">Hero (Toàn cảnh nổi bật)</option>
            <option value="split">Split (Chia 2 cột)</option>
            <option value="fullwidth">Full Width (Rộng toàn màn)</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Ảnh Banner (URL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.imageUrl || ''}
              onChange={(e) => update({ imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={onPickMedia}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              Chọn ảnh
            </button>
          </div>
        </div>
      </div>

      {data.imageUrl && (
        <div className="h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chữ nút chính (Primary CTA)</label>
          <input
            type="text"
            value={data.buttonText || ''}
            onChange={(e) => update({ buttonText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Khám phá ngay"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút chính</label>
          <input
            type="text"
            value={data.link || ''}
            onChange={(e) => update({ link: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-gaming"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Chữ nút phụ (Secondary CTA)</label>
          <input
            type="text"
            value={data.secondaryButtonText || ''}
            onChange={(e) => update({ secondaryButtonText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Xem thêm"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút phụ</label>
          <input
            type="text"
            value={data.secondaryLink || ''}
            onChange={(e) => update({ secondaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-van-phong"
          />
        </div>
      </div>
    </div>
  );
}

function SliderForm({
  data,
  update,
  onPickMedia,
}: {
  data: SliderData;
  update: (p: Partial<SliderData>) => void;
  onPickMedia: (slideIdx: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={data.autoplay ?? true}
            onChange={(e) => update({ autoplay: e.target.checked })}
            className="rounded text-blue-600"
          />
          <span className="font-bold text-slate-700">Tự động chuyển slide (Autoplay)</span>
        </label>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Thời gian mỗi slide (Giây)</label>
          <input
            type="number"
            min={2}
            max={20}
            value={data.intervalSec ?? 5}
            onChange={(e) =>
              update({ intervalSec: Math.max(2, Math.min(20, parseInt(e.target.value) || 5)) })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Danh sách Slide ({data.slides?.length || 0})</span>
          <button
            type="button"
            onClick={() => {
              const currentSlides = data.slides || [];
              const newSlide = {
                id: `slide_${Date.now()}_${currentSlides.length + 1}`,
                title: `Slide ${currentSlides.length + 1}`,
                subtitle: 'Mô tả ngắn gọn ưu đãi hoặc cấu hình',
                badge: 'Hot Deal',
                imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
                imageAssetId: null,
                link: '/laptop-gaming',
                buttonText: 'Khám phá ngay',
              };
              update({ slides: [...currentSlides, newSlide] });
            }}
            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            + Thêm slide
          </button>
        </div>

        {data.slides?.map((slide, sIdx) => (
          <div key={slide.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 text-xs">Slide #{sIdx + 1}</span>
              <div className="flex items-center gap-2">
                {sIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...data.slides];
                      const [moved] = next.splice(sIdx, 1);
                      next.splice(sIdx - 1, 0, moved);
                      update({ slides: next });
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded text-xs"
                    title="Di chuyển lên"
                  >
                    ↑
                  </button>
                )}
                {sIdx < data.slides.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...data.slides];
                      const [moved] = next.splice(sIdx, 1);
                      next.splice(sIdx + 1, 0, moved);
                      update({ slides: next });
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded text-xs"
                    title="Di chuyển xuống"
                  >
                    ↓
                  </button>
                )}
                {data.slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Xóa slide #${sIdx + 1}?`)) return;
                      const next = data.slides.filter((_, idx) => idx !== sIdx);
                      update({ slides: next });
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
                  >
                    Xóa slide
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tiêu đề slide</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], title: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Tiêu đề chính"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Huy hiệu (Badge)</label>
                <input
                  type="text"
                  value={slide.badge || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], badge: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Ví dụ: Hot Deal"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Mô tả phụ (Subtitle)</label>
              <input
                type="text"
                value={slide.subtitle || ''}
                onChange={(e) => {
                  const next = [...data.slides];
                  next[sIdx] = { ...next[sIdx], subtitle: e.target.value };
                  update({ slides: next });
                }}
                placeholder="Mô tả phụ của slide"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Ảnh nền / banner (URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slide.imageUrl}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], imageUrl: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="URL hình ảnh"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => onPickMedia(sIdx)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Chọn ảnh
                </button>
              </div>
              {slide.imageUrl && (
                <div className="mt-2 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.imageUrl} alt={slide.title || 'Slide preview'} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Liên kết nút (Link)</label>
                <input
                  type="text"
                  value={slide.link || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], link: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="/laptop-gaming"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Chữ nút bấm (Button Text)</label>
                <input
                  type="text"
                  value={slide.buttonText || ''}
                  onChange={(e) => {
                    const next = [...data.slides];
                    next[sIdx] = { ...next[sIdx], buttonText: e.target.value };
                    update({ slides: next });
                  }}
                  placeholder="Khám phá ngay"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductGridForm({
  data,
  update,
  onPickProduct,
}: {
  data: ProductGridData;
  update: (p: Partial<ProductGridData>) => void;
  onPickProduct: () => void;
}) {
  return (
    <div className="space-y-4">
      {!!data.tabs?.length && <fieldset className="space-y-3 rounded-xl border p-3"><legend className="px-1 font-bold">Các tab sản phẩm</legend>{data.tabs.map((tab, index) => <div key={tab.id} className="space-y-2 rounded border bg-slate-50 p-3"><label className="block text-xs">Tên tab<input value={tab.label} onChange={e => update({ tabs: data.tabs?.map((t, i) => i === index ? { ...t, label: e.target.value } : t) })} className="mt-1 w-full rounded border p-2" /></label><label className="block text-xs">Link xem tất cả<input value={tab.href} onChange={e => update({ tabs: data.tabs?.map((t, i) => i === index ? { ...t, href: e.target.value } : t) })} className="mt-1 w-full rounded border p-2" /></label><label className="block text-xs">ID sản phẩm, mỗi dòng một ID<textarea value={tab.productIds.join('\n')} onChange={e => update({ tabs: data.tabs?.map((t, i) => i === index ? { ...t, productIds: e.target.value.split(/\s+/).filter(Boolean) } : t) })} rows={3} className="mt-1 w-full rounded border p-2 font-mono" /></label></div>)}</fieldset>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề lưới sản phẩm</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: Sản phẩm bán chạy"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Huy hiệu & Màu chủ đề</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.badge || ''}
              onChange={(e) => update({ badge: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="Huy hiệu (Hot/Sale)"
            />
            <select
              value={data.colorTheme || 'blue'}
              onChange={(e) => update({ colorTheme: e.target.value })}
              className="px-2 py-2 border border-slate-300 rounded-lg text-xs shrink-0"
            >
              <option value="blue">Xanh dương</option>
              <option value="red">Đỏ Gaming</option>
              <option value="indigo">Chàm</option>
              <option value="emerald">Xanh lục</option>
              <option value="orange">Cam</option>
              <option value="gray">Xám tối</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <label className="font-bold text-slate-800 block">Phương thức chọn sản phẩm:</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sourceMode"
              value="rule"
              checked={data.sourceMode === 'rule'}
              onChange={() => update({ sourceMode: 'rule' })}
            />
            <span className="font-medium">Theo điều kiện tự động (Rule-based)</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sourceMode"
              value="manual"
              checked={data.sourceMode === 'manual'}
              onChange={() => update({ sourceMode: 'manual' })}
            />
            <span className="font-medium">Chọn thủ công từng sản phẩm (Manual)</span>
          </label>
        </div>
      </div>

      {data.sourceMode === 'rule' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-slate-200 rounded-xl bg-white">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Loại sản phẩm</label>
            <select
              value={data.ruleCriteria?.productType || 'all'}
              onChange={(e) =>
                update({
                  ruleCriteria: {
                    ...data.ruleCriteria,
                    productType: e.target.value as ProductRuleCriteria['productType'],
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">Tất cả sản phẩm</option>
              <option value="laptop">Chỉ Laptop</option>
              <option value="accessory">Chỉ Phụ kiện & Đồ chơi</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tình trạng kho</label>
            <select
              value={data.ruleCriteria?.availability || 'all'}
              onChange={(e) =>
                update({
                  ruleCriteria: {
                    ...data.ruleCriteria,
                    availability: e.target.value as ProductRuleCriteria['availability'],
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="AVAILABLE">Còn hàng trong kho</option>
              <option value="PREORDER">Nhận đặt trước (Pre-order)</option>
              <option value="CONTACT">Liên hệ trực tiếp</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Thẻ đánh dấu (Tag)</label>
            <select
              value={data.ruleCriteria?.tag || 'all'}
              onChange={(e) =>
                update({
                  ruleCriteria: {
                    ...data.ruleCriteria,
                    tag: e.target.value as ProductRuleCriteria['tag'],
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">Tất cả nhãn</option>
              <option value="isFeatured">Sản phẩm Nổi bật</option>
              <option value="isNewArrival">Hàng Mới Về</option>
              <option value="isBestSeller">Bán Chạy Nhất</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Sắp xếp theo</label>
            <select
              value={data.ruleCriteria?.sort || 'newest'}
              onChange={(e) =>
                update({
                  ruleCriteria: {
                    ...data.ruleCriteria,
                    sort: e.target.value as ProductRuleCriteria['sort'],
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="newest">Mới nhất cập nhật</option>
              <option value="price-asc">Giá từ thấp đến cao</option>
              <option value="price-desc">Giá từ cao xuống thấp</option>
              <option value="name-asc">Tên sản phẩm (A-Z)</option>
              <option value="best-selling">Bán chạy nhất</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Số lượng hiển thị (Limit)</label>
            <input
              type="number"
              min={1}
              max={48}
              value={data.ruleCriteria?.limit || 12}
              onChange={(e) =>
                update({
                  ruleCriteria: {
                    ...data.ruleCriteria,
                    limit: Math.min(48, Math.max(1, parseInt(e.target.value) || 12)),
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4 border border-slate-200 rounded-xl bg-white">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">
              Đã chọn: {data.manualProductIds?.length || 0} sản phẩm (tối đa 48)
            </span>
            <button
              type="button"
              onClick={onPickProduct}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Chọn sản phẩm
            </button>
          </div>

          {data.manualProductIds && data.manualProductIds.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {data.manualProductIds.map((pId: string, idx: number) => (
                <div
                  key={pId}
                  className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <span className="font-mono text-slate-600 truncate max-w-xs">
                    {idx + 1}. {pId}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...(data.manualProductIds || [])];
                        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                        update({ manualProductIds: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === (data.manualProductIds?.length || 0) - 1}
                      onClick={() => {
                        const next = [...(data.manualProductIds || [])];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        update({ manualProductIds: next });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update({
                          manualProductIds: data.manualProductIds?.filter((x: string) => x !== pId),
                        });
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Xóa khỏi danh sách"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs italic">
              Chưa có sản phẩm nào được chọn. Hãy bấm nút &quot;+ Chọn sản phẩm&quot; phía trên.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Đường dẫn &quot;Xem tất cả&quot;</label>
          <input
            type="text"
            value={data.viewAllLink || ''}
            onChange={(e) => update({ viewAllLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="/laptop-gaming"
          />
        </div>
        <div className="pt-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.rankNumbering || false}
              onChange={(e) => update({ rankNumbering: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span className="font-bold text-slate-700">Hiển thị huy hiệu xếp hạng TOP 1, 2, 3</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function FeaturedCategoriesForm({
  data,
  update,
}: {
  data: FeaturedCategoriesData;
  update: (p: Partial<FeaturedCategoriesData>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold">Bố cục<select value={data.layout || 'cards'} onChange={e => update({ layout: e.target.value as 'cards' | 'board' })} className="mt-1 w-full rounded border p-2"><option value="cards">Thẻ danh mục</option><option value="board">Bảng phân loại</option></select></label>
      {!!data.items.length && <fieldset className="space-y-3 rounded border p-3"><legend className="px-1 font-bold">Ô phân loại</legend>{data.items.map((item, index) => <div key={index} className="space-y-2 rounded border p-2">{(['customName', 'customImage', 'href'] as const).map(field => <label key={field} className="block text-xs">{field === 'customName' ? 'Tên hiển thị' : field === 'customImage' ? 'URL ảnh đại diện' : 'Liên kết'}<input value={item[field] || ''} onChange={e => update({ items: data.items.map((x, i) => i === index ? { ...x, [field]: e.target.value } : x) })} className="mt-1 w-full rounded border p-2" /></label>)}</div>)}</fieldset>}
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề danh mục</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Khám Phá Hệ Sinh Thái Danh Mục"
        />
      </div>
      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Mô tả danh mục..."
        />
      </div>
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
        <div className="font-bold">Cơ chế hiển thị tự động:</div>
        <p>Các danh mục công khai đang hoạt động sẽ được tự động đồng bộ và hiển thị kèm icon theo cấu hình catalog hệ thống.</p>
      </div>
    </div>
  );
}

function FeaturedBrandsForm({
  data,
  update,
}: {
  data: FeaturedBrandsData;
  update: (p: Partial<FeaturedBrandsData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối thương hiệu</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Khám Phá Theo Thương Hiệu"
        />
      </div>
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
        <div className="font-bold">Đồng bộ từ thương hiệu sản phẩm:</div>
        <p>Logo các thương hiệu lớn (Dell, Lenovo, Asus, Apple, HP...) được tự động lấy từ danh mục thương hiệu catalog.</p>
      </div>
    </div>
  );
}

function FeaturedCollectionForm({
  data,
  update,
}: {
  data: FeaturedCollectionData;
  update: (p: Partial<FeaturedCollectionData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề bộ sưu tập (Tùy chọn ghi đè)</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Để trống sẽ lấy tên bộ sưu tập"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mã Bộ sưu tập (Collection ID / Slug)</label>
          <input
            type="text"
            value={data.collectionId || ''}
            onChange={(e) => update({ collectionId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Ví dụ: col-gaming-deals"
          />
        </div>
      </div>
    </div>
  );
}

function NewsReviewsForm({
  data,
  update,
}: {
  data: NewsReviewsData;
  update: (p: Partial<NewsReviewsData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Tiêu đề tin tức</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Góc CitiLap Media & Đánh Giá"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Số bài hiển thị (Limit)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={data.limit || 4}
            onChange={(e) =>
              update({ limit: Math.min(10, Math.max(1, parseInt(e.target.value) || 4)) })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function IntroForm({
  data,
  update,
}: {
  data: IntroData;
  update: (p: Partial<IntroData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề cam kết dịch vụ</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Cam Kết Chất Lượng CitiLap"
        />
      </div>
      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="4 tiêu chuẩn dịch vụ vượt trội dành cho khách hàng"
        />
      </div>

      <div className="space-y-2 pt-2">
        <span className="font-bold text-slate-800 block">Danh sách các cam kết (Tối đa 6):</span>
        {data.features?.map((feat, fIdx) => (
          <div key={feat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Mục #{fIdx + 1} ({feat.icon})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={feat.title}
                onChange={(e) => {
                  const next = [...(data.features || [])];
                  next[fIdx] = { ...next[fIdx], title: e.target.value };
                  update({ features: next });
                }}
                placeholder="Tiêu đề cam kết"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
              <input
                type="text"
                value={feat.description}
                onChange={(e) => {
                  const next = [...(data.features || [])];
                  next[fIdx] = { ...next[fIdx], description: e.target.value };
                  update({ features: next });
                }}
                placeholder="Chi tiết cam kết"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaForm({
  data,
  update,
}: {
  data: CtaData;
  update: (p: Partial<CtaData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề kêu gọi</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?"
        />
      </div>
      <div>
        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Nút bấm chính (Zalo)</label>
          <input
            type="text"
            value={data.primaryText || ''}
            onChange={(e) => update({ primaryText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Chat Zalo Ngay"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút chính</label>
          <input
            type="text"
            value={data.primaryLink || ''}
            onChange={(e) => update({ primaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="https://zalo.me"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Nút bấm phụ (Hotline)</label>
          <input
            type="text"
            value={data.secondaryText || ''}
            onChange={(e) => update({ secondaryText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Gọi Hotline"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">Liên kết nút phụ</label>
          <input
            type="text"
            value={data.secondaryLink || ''}
            onChange={(e) => update({ secondaryLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="tel:0987654321"
          />
        </div>
      </div>
    </div>
  );
}

function VideoReviewsForm({
  data,
  update,
  onPickMedia,
}: {
  data: VideoReviewsData;
  update: (p: Partial<VideoReviewsData>) => void;
  onPickMedia: (videoIdx: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Video review sản phẩm"
        />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Danh sách video ({data.videos?.length || 0})</span>
          <button
            type="button"
            onClick={() => {
              const current = data.videos || [];
              update({
                videos: [
                  ...current,
                  {
                    title: '',
                    url: '',
                    thumbnail: '',
                  },
                ],
              });
            }}
            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            + Thêm video
          </button>
        </div>

        {data.videos?.map((v, index) => (
          <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-bold text-slate-700 text-xs">Video #{index + 1}</span>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                onClick={() => {
                  if (!window.confirm(`Xóa video #${index + 1}?`)) return;
                  update({ videos: data.videos.filter((_, i) => i !== index) });
                }}
              >
                Xóa video
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tên video</label>
              <input
                type="text"
                value={v.title}
                onChange={(e) => {
                  const next = [...data.videos];
                  next[index] = { ...next[index], title: e.target.value };
                  update({ videos: next });
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                placeholder="Ví dụ: Đánh giá chi tiết laptop CitiLap Gaming"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                URL video (YouTube hoặc TikTok) *
              </label>
              <input
                type="text"
                value={v.url}
                onChange={(e) => {
                  const next = [...data.videos];
                  next[index] = { ...next[index], url: e.target.value };
                  update({ videos: next });
                }}
                className={`w-full px-2.5 py-1.5 border rounded text-xs bg-white ${
                  !v.url.trim() ? 'border-amber-300' : 'border-slate-300'
                }`}
                placeholder="https://www.youtube.com/watch?v=... hoặc https://www.tiktok.com/@.../video/..."
              />
              {!v.url.trim() ? (
                <p className="text-[11px] text-rose-500 font-medium mt-1">
                  Vui lòng nhập URL video (YouTube hoặc TikTok)
                </p>
              ) : !v.url.startsWith('https://') ? (
                <p className="text-[11px] text-amber-600 font-medium mt-1">
                  Đường dẫn video phải bắt đầu bằng https://
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                URL ảnh đại diện thumbnail (tùy chọn, tự lấy nếu dùng YouTube)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={v.thumbnail || ''}
                  onChange={(e) => {
                    const next = [...data.videos];
                    next[index] = { ...next[index], thumbnail: e.target.value };
                    update({ videos: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  placeholder="URL ảnh hoặc chọn từ thư viện"
                />
                <button
                  type="button"
                  onClick={() => onPickMedia(index)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Chọn ảnh
                </button>
              </div>
              {v.thumbnail && (
                <div className="mt-2 h-16 w-28 rounded overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerGalleryForm({
  data,
  update,
  onPickMedia,
  onAddMedia,
}: {
  data: CustomerGalleryData;
  update: (p: Partial<CustomerGalleryData>) => void;
  onPickMedia: (imgIdx: number) => void;
  onAddMedia: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          placeholder="Hình ảnh khách hàng tại CitiLap"
        />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Danh sách ảnh ({data.images?.length || 0})</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddMedia}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
            >
              + Chọn từ thư viện
            </button>
            <button
              type="button"
              onClick={() => {
                const current = data.images || [];
                update({
                  images: [
                    ...current,
                    {
                      url: '',
                      alt: '',
                    },
                  ],
                });
              }}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              + Nhập URL
            </button>
          </div>
        </div>

        {data.images?.map((img, index) => (
          <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 items-start">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.alt || 'Gallery image'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                  Chưa có ảnh
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs">Ảnh #{index + 1}</span>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  onClick={() => {
                    if (!window.confirm(`Xóa ảnh #${index + 1}?`)) return;
                    update({ images: data.images.filter((_, i) => i !== index) });
                  }}
                >
                  Xóa
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">URL ảnh *</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={img.url}
                    onChange={(e) => {
                      const next = [...data.images];
                      next[index] = { ...next[index], url: e.target.value };
                      update({ images: next });
                    }}
                    className={`w-full px-2.5 py-1 border rounded text-xs bg-white ${
                      !img.url.trim() ? 'border-amber-300' : 'border-slate-300'
                    }`}
                    placeholder="https://... hoặc /images/..."
                  />
                  <button
                    type="button"
                    onClick={() => onPickMedia(index)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Chọn
                  </button>
                </div>
                {!img.url.trim() ? (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    Vui lòng nhập URL ảnh hoặc chọn từ thư viện Media
                  </p>
                ) : !img.url.startsWith('http://') && !img.url.startsWith('https://') && !img.url.startsWith('/') ? (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    Đường dẫn ảnh phải bắt đầu bằng https:// hoặc /
                  </p>
                ) : data.images.findIndex((other) => other.url.trim() === img.url.trim()) !== index ? (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    Ảnh này trùng với ảnh #{data.images.findIndex((other) => other.url.trim() === img.url.trim()) + 1} — trang chủ sẽ hiển thị lặp lại. Hãy chọn ảnh khác.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Mô tả ảnh (Alt / Caption)</label>
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => {
                    const next = [...data.images];
                    next[index] = { ...next[index], alt: e.target.value };
                    update({ images: next });
                  }}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
                  placeholder="Ví dụ: Khách hàng nhận máy MacBook Air M3"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

