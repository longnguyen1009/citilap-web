'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  X,
  Undo2,
  Redo2,
  Download,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  landingPageDocumentSchema,
  type LandingPageStudioResponse,
  type SectionItem,
  type SectionType,
} from '@/contracts/cms/site-builder';
import MediaBrowser, { mediaRequest, MediaRequestError } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import MediaUpload from '@/components/admin/media/MediaUpload';
import { useConfirm, useToast } from '@/components/admin/ui';
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';
import {
  useDraftAutosave,
  useAdminActorId,
  clearCommittedLocalDraft,
  writeLocalDraftBackup,
} from '../useDraftAutosave';
import SchedulePanel from '../SchedulePanel';
import DraftRecovery, { type DraftRestoreMeta } from '../DraftRecovery';
import {
  SECTION_TYPE_META,
  createDefaultSection,
  getSectionBlockSummary,
  type RevisionItem,
} from './builder-defaults';
import BuilderAddSectionModal from './BuilderAddSectionModal';
import BuilderPreviewModal from './BuilderPreviewModal';
import BuilderRevisionsModal from './BuilderRevisionsModal';
import { ProductSelectorDialog, PostSelectorDialog } from './BuilderPickers';
import {
  BannerForm,
  SliderForm,
  ProductGridForm,
  FeaturedCategoriesForm,
  FeaturedBrandsForm,
  FeaturedCollectionForm,
  NewsReviewsForm,
  IntroForm,
  CtaForm,
  VideoReviewsForm,
  CustomerGalleryForm,
} from './BuilderSectionForms';

export interface SiteBuilderEditorProps {
  pageId: string;
}

const MAX_HISTORY = 30;

/**
 * Sections whose storefront behaviour is bound to their id (see BlockRenderer / ProductGridForm).
 * Deleting or duplicating them would silently lose that behaviour, so they are locked in the editor.
 */
const SYSTEM_SECTION_IDS: Record<string, string> = {
  'sec-hot-sale': 'Khối hệ thống HOT SALE: nội dung lấy từ Chiến dịch & Cài đặt, không thể xóa/nhân bản (có thể ẩn).',
  'sec-discover': 'Khối hệ thống Tab sản phẩm: không thể xóa/nhân bản (có thể ẩn).',
};

function LayoutIconFallback(props: React.SVGProps<SVGSVGElement>) {
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

export default function SiteBuilderEditor({ pageId }: SiteBuilderEditorProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const actorId = useAdminActorId();
  const storageKey = `builder-${pageId}`;

  const [data, setData] = useState<LandingPageStudioResponse | null>(null);
  const [expectedRevision, setExpectedRevision] = useState<number>(0);
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

  // Undo / Redo stacks for sections
  const [past, setPast] = useState<SectionItem[][]>([]);
  const [future, setFuture] = useState<SectionItem[][]>([]);
  const sectionsRef = useRef<SectionItem[]>([]);
  const pastRef = useRef<SectionItem[][]>([]);
  const futureRef = useRef<SectionItem[][]>([]);
  const lastHistoryPushRef = useRef<number>(0);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const cloneSections = useCallback((items: SectionItem[]): SectionItem[] => {
    return typeof structuredClone === 'function'
      ? structuredClone(items)
      : JSON.parse(JSON.stringify(items));
  }, []);

  const applySectionsUpdate = useCallback(
    (
      updater: SectionItem[] | ((prev: SectionItem[]) => SectionItem[]),
      options?: { coalesce?: boolean }
    ) => {
      const prev = sectionsRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return;
      const now = Date.now();
      const shouldCoalesce = Boolean(
        options?.coalesce && now - lastHistoryPushRef.current < 800
      );
      if (!shouldCoalesce) {
        const snapshot = cloneSections(prev);
        const nextPast = [...pastRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
        pastRef.current = nextPast;
        setPast(nextPast);
        lastHistoryPushRef.current = now;
      }
      futureRef.current = [];
      setFuture([]);
      sectionsRef.current = next;
      setSections(next);
    },
    [cloneSections]
  );

  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const nextPast = pastRef.current.slice(0, -1);
    const previous = pastRef.current[pastRef.current.length - 1];
    const currentSnap = cloneSections(sectionsRef.current);
    const nextFuture = [currentSnap, ...futureRef.current.slice(0, MAX_HISTORY - 1)];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    sectionsRef.current = previous;
    lastHistoryPushRef.current = 0;

    setPast(nextPast);
    setFuture(nextFuture);
    setSections(previous);
    setSelectedSectionId((sel) =>
      sel && previous.some((s) => s.id === sel) ? sel : previous[0]?.id || null
    );
  }, [cloneSections]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const [next, ...restFuture] = futureRef.current;
    const currentSnap = cloneSections(sectionsRef.current);
    const nextPast = [...pastRef.current.slice(-(MAX_HISTORY - 1)), currentSnap];

    pastRef.current = nextPast;
    futureRef.current = restFuture;
    sectionsRef.current = next;
    lastHistoryPushRef.current = 0;

    setPast(nextPast);
    setFuture(restFuture);
    setSections(next);
    setSelectedSectionId((sel) =>
      sel && next.some((s) => s.id === sel) ? sel : next[0]?.id || null
    );
  }, [cloneSections]);

  // Dirty detection (memoized so JSON.stringify is not called twice on every render)
  const [initialJson, setInitialJson] = useState('');
  const draftPayload = useMemo(
    () => ({
      sections,
      internalName,
      title,
      slug,
      seoTitle,
      seoDesc,
      ogImageAssetId,
    }),
    [sections, internalName, title, slug, seoTitle, seoDesc, ogImageAssetId]
  );
  const currentJson = useMemo(() => JSON.stringify(draftPayload), [draftPayload]);
  const latest = useRef(currentJson);
  const lock = useRef(false);
  useEffect(() => {
    latest.current = currentJson;
  }, [currentJson]);
  const isDirty = initialJson !== '' && initialJson !== currentJson;

  // Dialogs
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);
  const [productPickerTarget, setProductPickerTarget] = useState<string | null>(null);
  const [postPickerTarget, setPostPickerTarget] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewSections, setPreviewSections] = useState<ResolvedSectionItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);

  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const revisionsTriggerRef = useRef<HTMLElement | null>(null);

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
    previewTriggerRef.current?.focus();
  }, []);

  const closeRevisionsModal = useCallback(() => {
    setShowRevisionsModal(false);
    revisionsTriggerRef.current?.focus();
  }, []);

  // Load initial page data (without selectedSectionId in dependencies to prevent data loss on section click)
  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await mediaRequest<any>(`/api/admin/builder/${pageId}`);
      setData(res);
      setExpectedRevision(res.revision ?? 0);

      const doc = res.document || res;
      const nextInternalName = doc.internalName || doc.name || '';
      const nextTitle = doc.title || '';
      const nextSlug = doc.slug || '';
      const nextSeoTitle = doc.seo?.title || '';
      const nextSeoDesc = doc.seo?.description || '';
      const nextOgAssetId = doc.seo?.ogImageAssetId || null;
      const nextSections: SectionItem[] = doc.sections || [];

      setInternalName(nextInternalName);
      setTitle(nextTitle);
      setSlug(nextSlug);
      setSeoTitle(nextSeoTitle);
      setSeoDesc(nextSeoDesc);
      setOgImageAssetId(nextOgAssetId);

      sectionsRef.current = nextSections;
      setSections(nextSections);
      pastRef.current = [];
      futureRef.current = [];
      setPast([]);
      setFuture([]);
      lastHistoryPushRef.current = 0;

      setSelectedSectionId((prev) =>
        prev && nextSections.some((s) => s.id === prev)
          ? prev
          : nextSections[0]?.id || null
      );

      const snapshot = JSON.stringify({
        sections: nextSections,
        internalName: nextInternalName,
        title: nextTitle,
        slug: nextSlug,
        seoTitle: nextSeoTitle,
        seoDesc: nextSeoDesc,
        ogImageAssetId: nextOgAssetId,
      });
      setInitialJson(snapshot);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu trang.');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void Promise.resolve().then(loadPageData);
  }, [loadPageData]);

  // Close popovers & menus on Escape key, and handle Ctrl+Z / Ctrl+Y for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mediaPickerTarget) setMediaPickerTarget(null);
        else if (productPickerTarget) setProductPickerTarget(null);
        else if (postPickerTarget) setPostPickerTarget(null);
        else if (showAddMenu) setShowAddMenu(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          if (pastRef.current.length > 0) {
            e.preventDefault();
            handleUndo();
          }
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          if (futureRef.current.length > 0) {
            e.preventDefault();
            handleRedo();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaPickerTarget, productPickerTarget, postPickerTarget, showAddMenu, handleUndo, handleRedo]);

  // Restore local draft backup into sections, pageName (internalName / title), and pageSlug (slug)
  const handleRestoreLocalDraft = useCallback(
    (restoredDraft: unknown, meta: DraftRestoreMeta) => {
      if (!restoredDraft || typeof restoredDraft !== 'object') return;
      const d = restoredDraft as Record<string, unknown>;
      if (Array.isArray(d.sections)) {
        applySectionsUpdate(d.sections as SectionItem[]);
      }
      if (typeof d.internalName === 'string') setInternalName(d.internalName);
      else if (typeof d.pageName === 'string') setInternalName(d.pageName);
      if (typeof d.title === 'string') setTitle(d.title);
      if (typeof d.slug === 'string') setSlug(d.slug);
      else if (typeof d.pageSlug === 'string') setSlug(d.pageSlug);
      if (typeof d.seoTitle === 'string') setSeoTitle(d.seoTitle);
      if (typeof d.seoDesc === 'string') setSeoDesc(d.seoDesc);
      if ('ogImageAssetId' in d) {
        setOgImageAssetId(typeof d.ogImageAssetId === 'string' ? d.ogImageAssetId : null);
      }
      setExpectedRevision(meta.baseRevision);
      if (meta.isStale) {
        setConflictError(
          `Đã khôi phục bản nháp từ phiên bản cũ (r${meta.baseRevision}, máy chủ hiện tại r${data?.revision ?? 0}). Lưu trực tiếp sẽ kiểm tra xung đột phiên bản để không ghi đè nhầm dữ liệu mới.`
        );
        toast.warning('Đã khôi phục bản nháp (phiên bản gốc cũ hơn máy chủ).');
      } else {
        setConflictError(null);
        toast.success('Đã khôi phục bản nháp tạm từ trình duyệt.');
      }
    },
    [applySectionsUpdate, data?.revision, toast]
  );

  const draftRecovery = (
    <DraftRecovery
                    draft={draftPayload}
                    endpoint={`/api/admin/builder/${pageId}`}
                    storageKey={storageKey}
                    currentRevision={expectedRevision}
                    serverRevision={data?.revision ?? 0}
                    dirty={isDirty}
                    validateDraft={(candidate) => {
                      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
                        return { ok: false, error: 'Bản nháp Site Builder không đúng định dạng đối tượng.' };
                      }
                      const rec = candidate as Record<string, unknown>;
                      if (!Array.isArray(rec.sections)) {
                        return { ok: false, error: 'Thiếu danh sách khối nội dung (sections).' };
                      }
                      const docCandidate = {
                        schemaVersion: 1 as const,
                        internalName:
                          typeof rec.internalName === 'string' && rec.internalName.trim()
                            ? rec.internalName
                            : 'draft',
                        title:
                          typeof rec.title === 'string' && rec.title.trim() ? rec.title : 'draft',
                        slug:
                          pageId === 'home'
                            ? ''
                            : typeof rec.slug === 'string' && rec.slug.trim()
                            ? rec.slug
                            : 'draft',
                        seo: {
                          title: typeof rec.seoTitle === 'string' ? rec.seoTitle : '',
                          description: typeof rec.seoDesc === 'string' ? rec.seoDesc : '',
                          ogImageAssetId:
                            typeof rec.ogImageAssetId === 'string' ? rec.ogImageAssetId : null,
                        },
                        sections: rec.sections,
                      };
                      const parsed = landingPageDocumentSchema.safeParse(docCandidate);
                      if (!parsed.success) {
                        return {
                          ok: false,
                          error:
                            parsed.error.issues[0]?.message ||
                            'Cấu trúc khối nội dung Site Builder không hợp lệ.',
                        };
                      }
                      return {
                        ok: true,
                        data: {
                          sections: parsed.data.sections,
                          internalName:
                            typeof rec.internalName === 'string'
                              ? rec.internalName
                              : parsed.data.internalName,
                          title: typeof rec.title === 'string' ? rec.title : parsed.data.title,
                          slug:
                            pageId === 'home'
                              ? ''
                              : typeof rec.slug === 'string'
                              ? rec.slug
                              : parsed.data.slug,
                          seoTitle: parsed.data.seo.title,
                          seoDesc: parsed.data.seo.description,
                          ogImageAssetId: parsed.data.seo.ogImageAssetId,
                        },
                      };
                    }}
                    onRestoreLocal={handleRestoreLocalDraft}
                  />
  );

  // Download draft JSON helper (used in conflict recovery)
  const handleDownloadDraftJson = useCallback(() => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draftPayload, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `builder-${pageId}-draft.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [draftPayload, pageId]);

  // Section manipulation helpers
  const handleAddSection = (type: SectionType) => {
    const newSec = createDefaultSection(type);
    applySectionsUpdate((prev) => [...prev, newSec]);
    setSelectedSectionId(newSec.id);
    setShowAddMenu(false);
  };

  const handleDuplicateSection = (index: number) => {
    const sec = sections[index];
    if (!sec || SYSTEM_SECTION_IDS[sec.id]) return;
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
    applySectionsUpdate(next);
    setSelectedSectionId(clone.id);
    toast.success(`Đã nhân bản khối "${sec.name}".`);
  };

  const handleDeleteSection = async (id: string) => {
    if (SYSTEM_SECTION_IDS[id]) return;
    const target = sections.find((s) => s.id === id);
    const ok = await confirm({
      title: 'Xóa khối nội dung?',
      message: target
        ? `Bạn có chắc chắn muốn xóa khối "${target.name}"?`
        : 'Bạn có chắc chắn muốn xóa khối này?',
      description: 'Bạn có thể bấm Hoàn tác (Ctrl+Z) nếu xóa nhầm.',
      confirmLabel: 'Xóa khối',
      cancelLabel: 'Hủy',
      variant: 'destructive',
    });
    if (!ok) return;

    const next = sections.filter((s) => s.id !== id);
    applySectionsUpdate(next);
    if (selectedSectionId === id) {
      setSelectedSectionId(next[0]?.id || null);
    }
    toast.show({
      title: 'Đã xóa khối nội dung',
      message: `Đã xóa khối "${target?.name || id}".`,
      variant: 'info',
      action: {
        label: 'Hoàn tác',
        onClick: () => handleUndo(),
      },
    });
  };

  const handleToggleVisible = (id: string) => {
    applySectionsUpdate((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleMoveSection = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    applySectionsUpdate(next);
  };

  const updateSelectedSectionMeta = (
    patch: Partial<Pick<SectionItem, 'name' | 'enabled' | 'deviceVisibility'>>
  ) => {
    if (!selectedSectionId) return;
    applySectionsUpdate(
      (prev) =>
        prev.map((s) => (s.id === selectedSectionId ? ({ ...s, ...patch } as SectionItem) : s)),
      { coalesce: true }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSelectedSectionData = (patch: Record<string, any>) => {
    if (!selectedSectionId) return;
    applySectionsUpdate(
      (prev) =>
        prev.map((s) => {
          if (s.id !== selectedSectionId) return s;
          return {
            ...s,
            data: {
              ...s.data,
              ...patch,
            },
          } as SectionItem;
        }),
      { coalesce: true }
    );
  };

  // Save / Publish / Unpublish actions
  const handleSave = async (action: 'save' | 'publish' | 'unpublish') => {
    if (!data || lock.current) return false;
    if (pageId === 'home' && action === 'unpublish') return false;
    if (action === 'publish') {
      if (pageId === 'home' && !sections.some((s) => s.enabled)) {
        toast.error(
          'Không thể xuất bản trang chủ không có khối nào đang bật — trang chủ sẽ tự quay về giao diện mặc định cũ. Hãy bật hoặc thêm ít nhất một khối.'
        );
        return false;
      }
      const confirmed = await confirm({
        title: 'Xuất bản ngay?',
        message:
          'Bạn có chắc chắn muốn xuất bản ngay? Thay đổi này sẽ hiển thị trực tiếp cho khách hàng trên website.',
        confirmLabel: 'Xuất bản ngay',
        cancelLabel: 'Hủy',
        variant: 'primary',
      });
      if (!confirmed) return false;
    } else if (action === 'unpublish') {
      const confirmed = await confirm({
        title: 'Gỡ xuất bản trang?',
        message:
          'Bạn có chắc chắn muốn gỡ xuất bản? Trang này sẽ chuyển về trạng thái lưu trữ/ẩn và ngừng hiển thị công khai.',
        confirmLabel: 'Gỡ xuất bản',
        cancelLabel: 'Hủy',
        variant: 'warning',
      });
      if (!confirmed) return false;
    }
    lock.current = true;
    const submitted = currentJson;
    setSaving(true);
    setError(null);
    setConflictError(null);
    setSuccessMsg(null);

    const payload = {
      expectedRevision,
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
      setExpectedRevision(res.revision ?? 0);
      const doc = res.document || res;
      if (latest.current === submitted) {
        const nextSections: SectionItem[] = doc.sections || [];
        setInternalName(doc.internalName || doc.name || '');
        setTitle(doc.title || '');
        setSlug(doc.slug || '');
        setSeoTitle(doc.seo?.title || '');
        setSeoDesc(doc.seo?.description || '');
        setOgImageAssetId(doc.seo?.ogImageAssetId || null);
        sectionsRef.current = nextSections;
        setSections(nextSections);
        clearCommittedLocalDraft(storageKey, JSON.parse(submitted), actorId);
      } else {
        try {
          writeLocalDraftBackup(
            storageKey,
            JSON.parse(latest.current),
            res.revision ?? 0,
            actorId
          );
        } catch {
          // Ignore parse/storage errors
        }
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
        const msg = `Xuất bản thành công! Đang hiển thị bản r${res.publishedRevision || res.revision}.`;
        setSuccessMsg(msg);
        toast.success(msg);
      } else if (action === 'unpublish') {
        const msg = 'Đã hủy xuất bản trang.';
        setSuccessMsg(msg);
        toast.info(msg);
      } else {
        const msg = `Đã lưu bản nháp r${res.revision}.`;
        setSuccessMsg(msg);
        toast.success(msg);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu trang.';
      if (err instanceof MediaRequestError && err.status === 409) {
        setConflictError(
          'Xung đột phiên bản (409): Trang đã được sửa đổi ở nơi khác. Dữ liệu của bạn vẫn được giữ trên màn hình này. Bạn có thể tải bản nháp JSON để lưu trữ hoặc tải lại bản mới từ máy chủ.'
        );
        toast.warning('Xung đột phiên bản (409): Trang đã được sửa ở nơi khác.');
      } else {
        setError(msg);
        toast.error(msg);
      }
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  const autosaveStatus = useDraftAutosave(
    draftPayload,
    expectedRevision,
    !!data && !loading,
    isDirty,
    saving,
    () => handleSave('save'),
    storageKey
  );

  // Live Preview Modal (surfaces validation errors clearly instead of silently falling back)
  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewError(null);
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
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Không thể dựng bản xem trước do dữ liệu không hợp lệ.';
      setPreviewError(errMsg);
      setPreviewSections([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Revisions Modal (stores error state and allows retry instead of swallowing errors)
  const handleOpenRevisions = async () => {
    setShowRevisionsModal(true);
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      const res = await mediaRequest<{ revisions: RevisionItem[] }>(
        `/api/admin/builder/${pageId}/revisions`
      );
      setRevisions(res.revisions || []);
    } catch (err: unknown) {
      setRevisionsError(
        err instanceof Error ? err.message : 'Không thể tải danh sách lịch sử phiên bản.'
      );
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
    const confirmed = await confirm({
      title: `Khôi phục phiên bản r${targetRev}?`,
      message: `Bạn có chắc muốn khôi phục bản nháp từ phiên bản r${targetRev}?`,
      description: isDirty
        ? 'CẢNH BÁO: Bạn đang có các thay đổi chưa lưu! Việc khôi phục phiên bản cũ sẽ ghi đè toàn bộ thay đổi chưa lưu hiện tại.'
        : 'Phiên bản được chọn sẽ được khôi phục thành bản nháp mới nhất.',
      confirmLabel: 'Khôi phục phiên bản',
      cancelLabel: 'Hủy',
      variant: isDirty ? 'warning' : 'primary',
    });
    if (!confirmed) return;

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
      const msg = `Đã khôi phục thành công bản r${targetRev} thành bản nháp mới.`;
      setSuccessMsg(msg);
      toast.success(msg);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi khôi phục phiên bản.');
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
          {/* Undo / Redo Buttons */}
          <div className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              disabled={past.length === 0}
              onClick={handleUndo}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
              title="Hoàn tác (Ctrl+Z)"
              aria-label="Hoàn tác"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              type="button"
              disabled={future.length === 0}
              onClick={handleRedo}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
              title="Làm lại (Ctrl+Y)"
              aria-label="Làm lại"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

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
            onClick={() => void handleSave('save')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition disabled:opacity-40 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>

          {data?.status === 'PUBLISHED' && pageId !== 'home' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave('unpublish')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Gỡ xuất bản</span>
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave('publish')}
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
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{conflictError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadDraftJson}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải bản nháp JSON</span>
            </button>
            <button
              type="button"
              onClick={() => void loadPageData()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại bản mới từ máy chủ</span>
            </button>
          </div>
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

                  <BuilderAddSectionModal
                    open={showAddMenu}
                    onAddSection={handleAddSection}
                  />
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
                    const blockSummary = getSectionBlockSummary(sec, meta.label);

                    return (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionId(sec.id)}
                        className={`group p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 shadow-xs'
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
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                              {SYSTEM_SECTION_IDS[sec.id] && (
                                <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Khối hệ thống" />
                              )}
                              <span className="truncate">{sec.name || meta.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {blockSummary}
                              {sec.deviceVisibility === 'desktop' && ' • Chỉ PC'}
                              {sec.deviceVisibility === 'mobile' && ' • Chỉ SP'}
                              {!sec.enabled && ' • Đang ẩn'}
                            </div>
                          </div>
                        </div>

                        {/* Quick Control Actions */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={sec.enabled}
                            onClick={() => handleToggleVisible(sec.id)}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              sec.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={
                              sec.enabled
                                ? 'Đang bật hiển thị (Bấm để ẩn khối)'
                                : 'Đang ẩn (Bấm để bật hiển thị khối)'
                            }
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                sec.enabled ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, -1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => handleMoveSection(idx, 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(SYSTEM_SECTION_IDS[sec.id])}
                            onClick={() => handleDuplicateSection(idx)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                            title={SYSTEM_SECTION_IDS[sec.id] || 'Nhân bản'}
                            aria-label="Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(SYSTEM_SECTION_IDS[sec.id])}
                            onClick={() => void handleDeleteSection(sec.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                            title={SYSTEM_SECTION_IDS[sec.id] || 'Xóa khối'}
                            aria-label="Xóa khối"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {pageId === 'home' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[11px] text-slate-600 space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Khối chân trang chủ cố định</span>
                      <Link
                        href="/admin/settings"
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 font-bold"
                      >
                        Cấu hình ↗
                      </Link>
                    </div>
                    <p className="leading-snug text-slate-500">
                      Khối <strong>Đánh giá khách hàng</strong> &amp; <strong>Form Tư vấn chọn máy</strong> ở cuối trang chủ lấy dữ liệu Hotline/Zalo và Đánh giá từ Cài đặt Cửa hàng.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  {draftRecovery}
                </div>
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

              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Sao lưu & Khôi phục nháp</h4>
                {draftRecovery}
              </div>
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

                {/* Common Section Name & Device Visibility fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">
                      Tên khối nội dung (Quản trị)
                    </label>
                    <input
                      type="text"
                      value={selectedSection.name}
                      onChange={(e) => updateSelectedSectionMeta({ name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                      placeholder="Nhập tên khối quản trị"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">
                      Hiển thị theo thiết bị (PC / Smartphone SP)
                    </label>
                    <select
                      value={selectedSection.deviceVisibility || 'all'}
                      onChange={(e) =>
                        updateSelectedSectionMeta({
                          deviceVisibility: e.target.value as 'all' | 'desktop' | 'mobile',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                    >
                      <option value="all">Tất cả thiết bị (PC &amp; Smartphone SP)</option>
                      <option value="desktop">Chỉ hiển thị trên PC (Ẩn trên Smartphone SP)</option>
                      <option value="mobile">Chỉ hiển thị trên Smartphone SP (Ẩn trên PC)</option>
                    </select>
                  </div>
                </div>

                {/* FORM FIELDS BY TYPE */}
                <div className="space-y-4 text-xs pt-2 border-t border-slate-100">
                  {selectedSection.data.type === 'banner' && (
                    <BannerForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={() => setMediaPickerTarget('banner_image')}
                      onPickMobileMedia={() => setMediaPickerTarget('banner_mobile_image')}
                    />
                  )}
                  {selectedSection.data.type === 'slider' && (
                    <SliderForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(slideIdx) => setMediaPickerTarget(`slide_image:${slideIdx}`)}
                      onPickMobileMedia={(slideIdx) =>
                        setMediaPickerTarget(`slide_mobile_image:${slideIdx}`)
                      }
                    />
                  )}
                  {selectedSection.data.type === 'product_grid' && (
                    <ProductGridForm
                      sectionId={selectedSection.id}
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickProduct={(target) => setProductPickerTarget(target || 'product_grid')}
                    />
                  )}
                  {selectedSection.data.type === 'featured_categories' && (
                    <FeaturedCategoriesForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(itemIdx) => setMediaPickerTarget(`cat_item_image:${itemIdx}`)}
                    />
                  )}
                  {selectedSection.data.type === 'featured_brands' && (
                    <FeaturedBrandsForm
                      data={selectedSection.data}
                      update={updateSelectedSectionData}
                      onPickMedia={(brandIdx) => setMediaPickerTarget(`brand_logo:${brandIdx}`)}
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
                      onPickPost={() => setPostPickerTarget('news_reviews')}
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
                      onPickMedia={() => setMediaPickerTarget('cta_bg_image')}
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
          <div className="space-y-4">
            <MediaUpload defaultFolder="banners" onUploaded={() => undefined} />
            <MediaBrowser
              picker
              onSelect={(asset) => {
                if (mediaPickerTarget === 'banner_image' && selectedSection?.data.type === 'banner') {
                  updateSelectedSectionData({ imageUrl: asset.url || '', imageAssetId: asset.id });
                } else if (
                  mediaPickerTarget === 'banner_mobile_image' &&
                  selectedSection?.data.type === 'banner'
                ) {
                  updateSelectedSectionData({
                    mobileImageUrl: asset.url || '',
                    mobileImageAssetId: asset.id,
                  });
                } else if (mediaPickerTarget === 'og_image') {
                  setOgImageAssetId(asset.id);
                } else if (mediaPickerTarget === 'cta_bg_image' && selectedSection?.data.type === 'cta') {
                  updateSelectedSectionData({ bgImageUrl: asset.url || '' });
                } else if (
                  mediaPickerTarget.startsWith('cat_item_image:') &&
                  selectedSection?.data.type === 'featured_categories'
                ) {
                  const cIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const items = [...(selectedSection.data.items || [])];
                  if (items[cIdx]) {
                    items[cIdx] = { ...items[cIdx], customImage: asset.url || '' };
                    updateSelectedSectionData({ items });
                  }
                } else if (
                  mediaPickerTarget.startsWith('brand_logo:') &&
                  selectedSection?.data.type === 'featured_brands'
                ) {
                  const bIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const items = [...(selectedSection.data.items || [])];
                  if (items[bIdx]) {
                    items[bIdx] = { ...items[bIdx], logo: asset.url || '' };
                    updateSelectedSectionData({ items });
                  }
                } else if (
                  mediaPickerTarget.startsWith('slide_image:') &&
                  selectedSection?.data.type === 'slider'
                ) {
                  const sIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const slides = [...(selectedSection.data.slides || [])];
                  if (slides[sIdx]) {
                    slides[sIdx] = {
                      ...slides[sIdx],
                      imageUrl: asset.url || '',
                      imageAssetId: asset.id,
                    };
                    updateSelectedSectionData({ slides });
                  }
                } else if (
                  mediaPickerTarget.startsWith('slide_mobile_image:') &&
                  selectedSection?.data.type === 'slider'
                ) {
                  const sIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const slides = [...(selectedSection.data.slides || [])];
                  if (slides[sIdx]) {
                    slides[sIdx] = {
                      ...slides[sIdx],
                      mobileImageUrl: asset.url || '',
                      mobileImageAssetId: asset.id,
                    };
                    updateSelectedSectionData({ slides });
                  }
                } else if (
                  mediaPickerTarget.startsWith('video_thumb:') &&
                  selectedSection?.data.type === 'video_reviews'
                ) {
                  const vIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const videos = [...(selectedSection.data.videos || [])];
                  if (videos[vIdx]) {
                    videos[vIdx] = { ...videos[vIdx], thumbnail: asset.url || '' };
                    updateSelectedSectionData({ videos });
                  }
                } else if (
                  mediaPickerTarget.startsWith('gallery_image:') &&
                  selectedSection?.data.type === 'customer_gallery'
                ) {
                  const gIdx = parseInt(mediaPickerTarget.split(':')[1], 10);
                  const images = [...(selectedSection.data.images || [])];
                  if (images[gIdx]) {
                    images[gIdx] = { ...images[gIdx], url: asset.url || '' };
                    updateSelectedSectionData({ images });
                  }
                } else if (
                  mediaPickerTarget === 'gallery_image_add' &&
                  selectedSection?.data.type === 'customer_gallery'
                ) {
                  const current = selectedSection.data.images || [];
                  updateSelectedSectionData({
                    images: [
                      ...current,
                      { url: asset.url || '', alt: 'Khách hàng CitiLap', enabled: true },
                    ],
                  });
                }
                setMediaPickerTarget(null);
              }}
            />
          </div>
        </MediaDialog>
      )}

      {/* 4. PRODUCT SELECTOR DIALOG */}
      {productPickerTarget && (
        <ProductSelectorDialog
          onClose={() => setProductPickerTarget(null)}
          onSelect={(product) => {
            if (selectedSection?.data.type === 'product_grid') {
              if (productPickerTarget.startsWith('product_tab:')) {
                const tabIdx = parseInt(productPickerTarget.split(':')[1], 10);
                const tabs = [...(selectedSection.data.tabs || [])];
                if (tabs[tabIdx]) {
                  const currentIds = tabs[tabIdx].productIds || [];
                  if (!currentIds.includes(product.id) && currentIds.length < 48) {
                    tabs[tabIdx] = { ...tabs[tabIdx], productIds: [...currentIds, product.id] };
                    updateSelectedSectionData({ tabs });
                  }
                }
              } else {
                const current = selectedSection.data.manualProductIds || [];
                if (!current.includes(product.id) && current.length < 48) {
                  updateSelectedSectionData({ manualProductIds: [...current, product.id] });
                }
              }
            }
          }}
        />
      )}

      {/* 4b. POST SELECTOR DIALOG */}
      {postPickerTarget && (
        <PostSelectorDialog
          onClose={() => setPostPickerTarget(null)}
          onSelect={(post) => {
            if (selectedSection?.data.type === 'news_reviews') {
              const current = selectedSection.data.postIds || [];
              if (!current.includes(post.id) && current.length < 20) {
                updateSelectedSectionData({ postIds: [...current, post.id] });
              }
            }
          }}
        />
      )}

      {/* 5. PREVIEW MODAL */}
      <BuilderPreviewModal
        open={showPreviewModal}
        pageId={pageId}
        viewport={previewViewport}
        onViewportChange={setPreviewViewport}
        sections={previewSections}
        loading={previewLoading}
        error={previewError}
        onRetry={() => void handleOpenPreview()}
        onClose={closePreviewModal}
      />

      {/* 6. REVISIONS MODAL */}
      <BuilderRevisionsModal
        open={showRevisionsModal}
        revisions={revisions}
        loading={revisionsLoading}
        error={revisionsError}
        onRetry={() => void handleOpenRevisions()}
        onRestore={(rev) => void handleRestoreRevision(rev)}
        onClose={closeRevisionsModal}
      />
    </div>
  );
}
