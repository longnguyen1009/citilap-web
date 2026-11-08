'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
  Check,
  RotateCcw,
  Upload,
} from 'lucide-react';
import PageHeader from '@/components/admin/ui/PageHeader';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import StudioAsset from '@/components/admin/products/StudioAsset';
import { useDraftAutosave } from '@/components/admin/useDraftAutosave';
import type {
  NavigationDetail,
  NavigationDocument,
  ResolvedNavigation,
} from '@/contracts/cms/navigation';
import {
  categoryHref,
  categoryDescendantIds,
  RESERVED_CATEGORY_ROOTS,
} from '@/lib/category-paths';

type CategoryItem = NavigationDocument['categories'][number];

interface CategoryFormData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  visible: boolean;
  image: string;
  assetId: string;
  alt: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  parentId: null,
  visible: true,
  image: '',
  assetId: '',
  alt: '',
};

export function generateCategorySlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export interface TreeCategoryItem extends CategoryItem {
  level: number;
  hasChildren: boolean;
  parentName: string | null;
  href: string;
  productCount: number;
}

export default function CategoriesStudio() {
  const [detail, setDetail] = useState<NavigationDetail | null>(null);
  const [doc, setDoc] = useState<NavigationDocument | null>(null);
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(false);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'root' | 'child' | 'visible' | 'hidden'>('all');

  // Form states (Left Column)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Selection states (for Bulk actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');

  // Dialog states
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ResolvedNavigation | null>(null);
  const [leaveConfirm, setLeaveConfirm] = useState<(() => void) | null>(null);

  const formNameInputRef = useRef<HTMLInputElement>(null);
  const latestDoc = useRef(doc);
  const isSavingLock = useRef(false);

  useEffect(() => {
    latestDoc.current = doc;
  }, [doc]);

  const isDirty = Boolean(doc && JSON.stringify(doc) !== baseline);

  // Adopt fetched navigation detail
  const adoptDetail = useCallback((d: NavigationDetail) => {
    setDetail(d);
    setDoc(d.document);
    setBaseline(JSON.stringify(d.document));
  }, []);

  // Fetch initial data
  const loadData = useCallback(() => {
    setBusy(true);
    return Promise.all([
      mediaRequest<NavigationDetail>('/api/admin/navigation'),
      fetch('/api/categories')
        .then(r => r.json())
        .catch(() => []),
    ])
      .then(([navData, catApiData]) => {
        adoptDetail(navData);
        const list = Array.isArray(catApiData)
          ? catApiData
          : catApiData?.data || catApiData?.categories || [];
        const counts: Record<string, number> = {};
        for (const item of list) {
          if (item?.id && item?._count?.products !== undefined) {
            counts[item.id] = item._count.products;
          }
        }
        setProductCounts(counts);
      })
      .catch(e => {
        setNotification({ type: 'error', message: (e as Error).message });
      })
      .finally(() => setBusy(false));
  }, [adoptDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Warn on tab/window close if unsaved
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

  // Save / Publish handler
  const handleSave = async (action: 'save' | 'publish'): Promise<boolean> => {
    if (!doc || !detail || isSavingLock.current) return false;
    isSavingLock.current = true;
    setBusy(true);
    setNotification(null);
    const submittedDocString = JSON.stringify(doc);

    try {
      const result = await mediaRequest<NavigationDetail>('/api/admin/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: detail.revision,
          action,
          document: doc,
        }),
      });
      setDetail(result);
      setBaseline(JSON.stringify(result.document));
      if (JSON.stringify(latestDoc.current) === submittedDocString) {
        setDoc(result.document);
      }
      setNotification({
        type: 'success',
        message:
          action === 'publish'
            ? 'Đã xuất bản cấu trúc danh mục thành công lên website!'
            : 'Đã lưu bản nháp danh mục thành công.',
      });
      return true;
    } catch (e) {
      setNotification({ type: 'error', message: (e as Error).message });
      return false;
    } finally {
      isSavingLock.current = false;
      setBusy(false);
    }
  };

  // Draft autosave hook
  const autosaveStatus = useDraftAutosave(
    doc,
    detail?.revision || 0,
    Boolean(detail),
    isDirty,
    busy,
    () => handleSave('save')
  );

  // Categories list shortcut
  const categories = useMemo(() => doc?.categories || [], [doc?.categories]);

  // Build recursive hierarchical tree like WordPress
  const treeCategories = useMemo<TreeCategoryItem[]>(() => {
    if (!categories.length) return [];

    const categoriesById = new Map(categories.map(c => [c.id, c]));
    const childrenByParent = new Map<string | null, CategoryItem[]>();

    for (const c of categories) {
      const pid = c.parentId && categoriesById.has(c.parentId) ? c.parentId : null;
      const list = childrenByParent.get(pid) || [];
      list.push(c);
      childrenByParent.set(pid, list);
    }

    const result: TreeCategoryItem[] = [];

    const traverse = (parentId: string | null, level: number) => {
      const children = childrenByParent.get(parentId) || [];
      for (const item of children) {
        const hasChildren = (childrenByParent.get(item.id) || []).length > 0;
        const parentName = item.parentId ? categoriesById.get(item.parentId)?.name || null : null;
        let href = '/';
        try {
          href = categoryHref(item, categories);
        } catch {
          href = `/${item.slug}`;
        }

        result.push({
          ...item,
          level,
          hasChildren,
          parentName,
          href,
          productCount: productCounts[item.id] ?? 0,
        });

        traverse(item.id, level + 1);
      }
    };

    traverse(null, 0);

    // Safeguard for any orphan categories
    const processedIds = new Set(result.map(r => r.id));
    for (const c of categories) {
      if (!processedIds.has(c.id)) {
        let href = `/${c.slug}`;
        try {
          href = categoryHref(c, categories);
        } catch {}
        result.push({
          ...c,
          level: 0,
          hasChildren: false,
          parentName: null,
          href,
          productCount: productCounts[c.id] ?? 0,
        });
      }
    }

    return result;
  }, [categories, productCounts]);

  // Filtered categories based on Search & Filter Tabs
  const filteredCategories = useMemo(() => {
    let items = treeCategories;

    // Apply Filter Tab
    if (filterTab === 'root') {
      items = items.filter(c => c.level === 0);
    } else if (filterTab === 'child') {
      items = items.filter(c => c.level > 0);
    } else if (filterTab === 'visible') {
      items = items.filter(c => c.visible);
    } else if (filterTab === 'hidden') {
      items = items.filter(c => !c.visible);
    }

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [treeCategories, filterTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const roots = categories.filter(c => !c.parentId).length;
    const children = total - roots;
    const visible = categories.filter(c => c.visible).length;
    const hidden = total - visible;
    return { total, roots, children, visible, hidden };
  }, [categories]);

  // Form Handlers
  const handleNameChange = (name: string) => {
    setFormData(prev => {
      const next: CategoryFormData = { ...prev, name };
      if (!isSlugManuallyEdited) {
        next.slug = generateCategorySlug(name);
      }
      return next;
    });
    setFormError(null);
  };

  const handleSlugChange = (slug: string) => {
    setIsSlugManuallyEdited(true);
    setFormData(prev => ({
      ...prev,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }));
    setFormError(null);
  };

  const handleRegenerateSlug = () => {
    if (!formData.name.trim()) return;
    const newSlug = generateCategorySlug(formData.name);
    setFormData(prev => ({ ...prev, slug: newSlug }));
    setIsSlugManuallyEdited(false);
  };

  const startEditCategory = (item: CategoryItem) => {
    setEditingId(item.id);
    setFormData({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      parentId: item.parentId,
      visible: item.visible,
      image: item.image || '',
      assetId: item.assetId || '',
      alt: item.alt || '',
    });
    setIsSlugManuallyEdited(true);
    setFormError(null);

    // Scroll to left form smoothly
    formNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => formNameInputRef.current?.focus(), 250);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setIsSlugManuallyEdited(false);
    setFormError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;

    const trimmedName = formData.name.trim();
    const trimmedSlug = (formData.slug.trim() || generateCategorySlug(trimmedName)).toLowerCase();

    // Validation
    if (!trimmedName) {
      setFormError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (trimmedName.length > 120) {
      setFormError('Tên danh mục không được vượt quá 120 ký tự.');
      return;
    }
    if (!trimmedSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setFormError('Slug không hợp lệ. Chỉ chấp nhận chữ thường không dấu, số và dấu gạch ngang.');
      return;
    }

    // Check reserved roots if root category
    if (!formData.parentId && RESERVED_CATEGORY_ROOTS.has(trimmedSlug)) {
      setFormError(`Slug "${trimmedSlug}" trùng với từ khóa hệ thống của CitiLap. Vui lòng chọn slug khác.`);
      return;
    }

    // Check duplicate name
    const duplicateName = categories.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingId
    );
    if (duplicateName) {
      setFormError(`Tên danh mục "${trimmedName}" đã tồn tại. Vui lòng đặt tên khác.`);
      return;
    }

    // Check duplicate slug
    const duplicateSlug = categories.find(
      c => c.slug.toLowerCase() === trimmedSlug.toLowerCase() && c.id !== editingId
    );
    if (duplicateSlug) {
      setFormError(`Slug "/${trimmedSlug}" đã được sử dụng bởi danh mục khác.`);
      return;
    }

    // Prevent cycles
    if (editingId && formData.parentId) {
      const descendants = categoryDescendantIds(
        { id: editingId, slug: trimmedSlug, parentId: formData.parentId },
        categories
      );
      if (descendants.includes(formData.parentId)) {
        setFormError('Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha.');
        return;
      }
    }

    // Ensure parent visibility constraint
    let finalVisible = formData.visible;
    if (finalVisible && formData.parentId) {
      const parentCat = categories.find(c => c.id === formData.parentId);
      if (parentCat && !parentCat.visible) {
        // Parent is hidden, so either keep child hidden or auto-enable parent
        finalVisible = false;
        setNotification({
          type: 'info',
          message: `Danh mục cha "${parentCat.name}" đang ẩn, nên danh mục con này sẽ được đặt trạng thái ẩn theo quy định phân cấp.`,
        });
      }
    }

    if (editingId) {
      // Update existing
      const updatedList = categories.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: trimmedName,
            slug: trimmedSlug,
            description: formData.description.trim(),
            parentId: formData.parentId || null,
            visible: finalVisible,
            image: formData.image,
            assetId: formData.assetId,
            alt: formData.alt.trim(),
          };
        }
        return c;
      });

      setDoc({ ...doc, categories: updatedList });
      setNotification({
        type: 'success',
        message: `Đã cập nhật thông tin danh mục "${trimmedName}".`,
      });
      cancelEdit();
    } else {
      // Create new category
      const newCategory: CategoryItem = {
        id: crypto.randomUUID(),
        name: trimmedName,
        slug: trimmedSlug,
        description: formData.description.trim(),
        parentId: formData.parentId || null,
        visible: finalVisible,
        image: formData.image,
        assetId: formData.assetId,
        alt: formData.alt.trim(),
      };

      setDoc({ ...doc, categories: [...categories, newCategory] });
      setNotification({
        type: 'success',
        message: `Đã thêm danh mục mới "${trimmedName}". Hãy nhấn "Xuất bản" khi hoàn tất để cập nhật website.`,
      });
      setFormData(initialFormData);
      setIsSlugManuallyEdited(false);
      setFormError(null);
    }
  };

  // Toggle Visibility
  const toggleVisibility = (cat: CategoryItem) => {
    if (!doc) return;
    const newVisible = !cat.visible;

    // If enabling a child whose parent is hidden, also enable parent
    let updatedList = [...categories];

    if (newVisible && cat.parentId) {
      const parentCat = updatedList.find(c => c.id === cat.parentId);
      if (parentCat && !parentCat.visible) {
        updatedList = updatedList.map(c => (c.id === cat.parentId ? { ...c, visible: true } : c));
        setNotification({
          type: 'info',
          message: `Đã tự động hiển thị danh mục cha "${parentCat.name}" để cho phép hiển thị danh mục con.`,
        });
      }
    }

    // If hiding a parent, also hide all descendants
    if (!newVisible) {
      const descendantIds = new Set(categoryDescendantIds(cat, categories));
      updatedList = updatedList.map(c => (descendantIds.has(c.id) ? { ...c, visible: false } : c));
    } else {
      updatedList = updatedList.map(c => (c.id === cat.id ? { ...c, visible: true } : c));
    }

    setDoc({ ...doc, categories: updatedList });
  };

  // Delete Category
  const handleDeleteCategory = (cat: CategoryItem) => {
    if (!doc) return;
    const isSeedOrReferenced = detail?.categoryIds.includes(cat.id);

    if (isSeedOrReferenced) {
      alert(
        `Danh mục "${cat.name}" đang được liên kết với dữ liệu sản phẩm trong hệ thống. Bạn không thể xóa vĩnh viễn, nhưng có thể chuyển trạng thái sang [Ẩn] để không hiển thị ra website.`
      );
      return;
    }

    const hasChildren = categories.some(c => c.parentId === cat.id);
    if (hasChildren) {
      alert(
        `Danh mục "${cat.name}" đang có các danh mục con trực thuộc. Vui lòng di chuyển hoặc xóa các danh mục con trước khi xóa danh mục này.`
      );
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`)) {
      setDoc({
        ...doc,
        categories: categories.filter(c => c.id !== cat.id),
      });
      if (editingId === cat.id) cancelEdit();
      setNotification({
        type: 'success',
        message: `Đã xóa danh mục "${cat.name}".`,
      });
    }
  };

  // Reorder (Move Up / Down among siblings)
  const handleMoveSibling = (cat: CategoryItem, direction: 'up' | 'down') => {
    if (!doc) return;
    const siblings = categories.filter(c => c.parentId === cat.parentId);
    const currentIndex = siblings.findIndex(c => c.id === cat.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetCat = siblings[targetIndex];
    const catOriginalIdx = categories.findIndex(c => c.id === cat.id);
    const targetOriginalIdx = categories.findIndex(c => c.id === targetCat.id);

    const nextCategories = [...categories];
    [nextCategories[catOriginalIdx], nextCategories[targetOriginalIdx]] = [
      nextCategories[targetOriginalIdx],
      nextCategories[catOriginalIdx],
    ];

    setDoc({ ...doc, categories: nextCategories });
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredCategories.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyBulkAction = () => {
    if (!doc || !bulkAction || selectedIds.size === 0) return;

    if (bulkAction === 'show') {
      const updated = categories.map(c => (selectedIds.has(c.id) ? { ...c, visible: true } : c));
      setDoc({ ...doc, categories: updated });
      setNotification({
        type: 'success',
        message: `Đã hiển thị ${selectedIds.size} danh mục được chọn.`,
      });
    } else if (bulkAction === 'hide') {
      const updated = categories.map(c => (selectedIds.has(c.id) ? { ...c, visible: false } : c));
      setDoc({ ...doc, categories: updated });
      setNotification({
        type: 'success',
        message: `Đã ẩn ${selectedIds.size} danh mục được chọn.`,
      });
    } else if (bulkAction === 'delete') {
      const canDelete = categories.filter(
        c => selectedIds.has(c.id) && !detail?.categoryIds.includes(c.id)
      );
      const cannotDeleteCount = selectedIds.size - canDelete.length;

      if (canDelete.length === 0) {
        alert(
          'Tất cả danh mục đã chọn đều đang được liên kết với sản phẩm và không thể xóa vĩnh viễn. Bạn có thể chọn hành động "Ẩn" thay thế.'
        );
        return;
      }

      if (
        window.confirm(
          `Bạn có chắc chắn muốn xóa ${canDelete.length} danh mục?` +
            (cannotDeleteCount > 0
              ? ` (${cannotDeleteCount} danh mục có sản phẩm liên kết sẽ được giữ lại)`
              : '')
        )
      ) {
        const canDeleteIds = new Set(canDelete.map(c => c.id));
        setDoc({
          ...doc,
          categories: categories.filter(c => !canDeleteIds.has(c.id)),
        });
        setSelectedIds(new Set());
        setNotification({
          type: 'success',
          message: `Đã xóa ${canDelete.length} danh mục thành công.`,
        });
      }
    }

    setBulkAction('');
  };

  // Open Preview Modal
  const handleShowPreview = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const preview = await mediaRequest<ResolvedNavigation>('/api/admin/navigation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      setPreviewData(preview);
    } catch (e) {
      setNotification({ type: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Valid parent options for the current form
  const availableParentOptions = useMemo(() => {
    let list = treeCategories;
    if (editingId) {
      const descendants = new Set(
        categoryDescendantIds(
          { id: editingId, slug: formData.slug, parentId: formData.parentId },
          categories
        )
      );
      list = list.filter(c => !descendants.has(c.id));
    }
    return list;
  }, [treeCategories, editingId, formData.slug, formData.parentId, categories]);

  if (!doc) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu phân loại sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Page Header with WordPress Inspiration */}
      <PageHeader
        title="Danh mục sản phẩm"
        description="Quản lý cấu trúc ngành hàng, phân cấp cha/con và đường dẫn URL theo chuẩn chuyên nghiệp WordPress."
        breadcrumbs={[
          { label: 'Tổng quan', href: '/admin/dashboard' },
          { label: 'Sản phẩm', href: '/admin/products' },
          { label: 'Danh mục SP' },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              #{detail?.revision ?? 0}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isDirty
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {autosaveStatus}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShowPreview}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem trước</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('save')}
              disabled={busy || !isDirty}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('publish')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Xuất bản ngay</span>
            </button>
          </div>
        }
      />

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`mb-5 p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="truncate">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-Column Split View (Classic WordPress Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: Add New Category / Edit Category Form       */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden sticky top-6">
            {/* Form Header */}
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors ${
                editingId
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    editingId ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {editingId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">
                    {editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                  </h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    {editingId ? `ID: ${editingId}` : 'Phân loại cho sản phẩm trên website'}
                  </p>
                </div>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-md shadow-2xs transition cursor-pointer"
                  title="Hủy chỉnh sửa và quay lại thêm mới"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Tạo mới</span>
                </button>
              )}
            </div>

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-1.5 leading-snug">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Category Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={formNameInputRef}
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: Laptop Gaming, Bàn phím cơ..."
                  className="w-full text-xs sm:text-[13px] px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Tên riêng sẽ hiển thị trên trang web và menu điều hướng.
                </p>
              </div>

              {/* 2. Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Đường dẫn tĩnh (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateSlug}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition"
                    title="Tự tạo slug chuẩn SEO từ tên danh mục"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tự tạo slug</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-slate-400 font-mono select-none">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    placeholder="laptop-gaming"
                    className="w-full text-xs sm:text-[13px] pl-6 pr-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Chuỗi định danh URL viết thường, không dấu, ngăn cách bằng gạch nối (-).
                </p>
              </div>

              {/* 3. Parent Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Danh mục cha
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      parentId: e.target.value ? e.target.value : null,
                    }))
                  }
                  className="w-full text-xs sm:text-[13px] px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-medium"
                >
                  <option value="">— Trống (Danh mục gốc cấp cao nhất)</option>
                  {availableParentOptions.map(cat => {
                    const indent = '\u00A0\u00A0'.repeat(cat.level);
                    const prefix = cat.level === 0 ? '' : '↳ ';
                    return (
                      <option key={cat.id} value={cat.id}>
                        {indent}
                        {prefix}
                        {cat.name}
                        {!cat.visible ? ' (Đang ẩn)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Chỉ định danh mục cấp trên để tạo cấu trúc phân cấp (ví dụ: ASUS ROG thuộc Laptop
                  Gaming).
                </p>
              </div>

              {/* 4. Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả tóm tắt nội dung danh mục, phục vụ chuẩn SEO và hiển thị..."
                  className="w-full text-xs sm:text-[13px] px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-normal"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Mô tả không bắt buộc nhưng giúp khách hàng hiểu rõ ngành hàng và hỗ trợ Google SEO.
                </p>
              </div>

              {/* 5. Thumbnail / Asset */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Ảnh đại diện danh mục
                </label>
                {formData.assetId || formData.image ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        {formData.assetId ? (
                          <StudioAsset id={formData.assetId} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={formData.image}
                            alt={formData.alt || 'Category thumbnail'}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={formData.alt}
                          onChange={e => setFormData(prev => ({ ...prev, alt: e.target.value }))}
                          placeholder="Mô tả ảnh (ALT) *"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData(prev => ({ ...prev, assetId: '', image: '', alt: '' }))
                        }
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold p-1 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Gỡ ảnh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setImagePickerOpen(true)}
                    className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-blue-500 rounded-lg bg-slate-50/50 hover:bg-blue-50/40 text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <span>Chọn ảnh từ Thư viện Media</span>
                  </button>
                )}
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Ảnh thumbnail xuất hiện ở khối danh mục trang chủ và megamenu.
                </p>
              </div>

              {/* 6. Visibility Status */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={e => setFormData(prev => ({ ...prev, visible: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Hiển thị công khai trên website
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 ml-6 leading-normal">
                  Nếu tắt, danh mục này (và các danh mục con trực thuộc) sẽ tạm ẩn khỏi giao diện
                  người mua.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    editingId
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Cập nhật danh mục</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Thêm danh mục mới</span>
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: WordPress-Style Categories Data Table       */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-3">
          {/* Controls Bar: Filter tabs & Search */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('root')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterTab === 'root'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cấp gốc ({stats.roots})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('child')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterTab === 'child'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Danh mục con ({stats.children})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('visible')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterTab === 'visible'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Hiển thị ({stats.visible})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('hidden')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterTab === 'hidden'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Đang ẩn ({stats.hidden})
                </button>
              </div>

              {/* Instant Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm danh mục, slug..."
                  className="w-full text-xs pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Actions row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  disabled={selectedIds.size === 0}
                  className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Hành động hàng loạt</option>
                  <option value="show">Hiển thị các mục đã chọn</option>
                  <option value="hide">Ẩn các mục đã chọn</option>
                  <option value="delete">Xóa các mục đã chọn</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyBulkAction}
                  disabled={!bulkAction || selectedIds.size === 0}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-40 cursor-pointer"
                >
                  Áp dụng
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-slate-500 font-medium">
                    Đã chọn <strong className="text-slate-800">{selectedIds.size}</strong> mục
                  </span>
                )}
              </div>

              <div className="text-slate-500 text-[11.5px]">
                Hiển thị <strong className="text-slate-800">{filteredCategories.length}</strong> /{' '}
                {stats.total} danh mục
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px] tracking-wider select-none">
                    <th className="py-3 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCategories.length > 0 &&
                          selectedIds.size === filteredCategories.length
                        }
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2 w-12 text-center">Ảnh</th>
                    <th className="py-3 px-3 min-w-[200px]">Tên danh mục</th>
                    <th className="py-3 px-3 min-w-[130px]">Đường dẫn tĩnh (Slug)</th>
                    <th className="py-3 px-3 min-w-[110px]">Danh mục cha</th>
                    <th className="py-3 px-3 w-20 text-center">Sản phẩm</th>
                    <th className="py-3 px-3 w-24 text-center">Trạng thái</th>
                    <th className="py-3 px-2 w-16 text-center">Thứ tự</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <FolderTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          {searchQuery ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchQuery
                            ? 'Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc "Tất cả".'
                            : 'Sử dụng biểu mẫu bên trái để tạo danh mục đầu tiên.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map(cat => {
                      const isSelected = selectedIds.has(cat.id);
                      const isEditing = editingId === cat.id;
                      const isSeedOrReferenced = detail?.categoryIds.includes(cat.id);

                      return (
                        <tr
                          key={cat.id}
                          className={`group transition-colors ${
                            isEditing
                              ? 'bg-amber-50/80 hover:bg-amber-50'
                              : isSelected
                              ? 'bg-blue-50/50 hover:bg-blue-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(cat.id)}
                              className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Thumbnail */}
                          <td className="py-2.5 px-2 text-center align-middle">
                            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200/80 overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-2xs">
                              {cat.assetId ? (
                                <StudioAsset id={cat.assetId} />
                              ) : cat.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cat.image}
                                  alt={cat.alt || cat.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <FolderTree className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </td>

                          {/* Name & Hierarchy (WordPress indentation + hover action links) */}
                          <td className="py-2.5 px-3 align-middle">
                            <div
                              style={{
                                paddingLeft: `${Math.min(cat.level * 20, 80)}px`,
                              }}
                              className="flex flex-col"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cat.level > 0 && (
                                  <span className="text-slate-400 select-none font-mono">
                                    {'— '.repeat(cat.level)}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className={`text-xs font-bold text-left hover:text-blue-600 transition cursor-pointer ${
                                    cat.level === 0 ? 'text-slate-900' : 'text-slate-800'
                                  }`}
                                >
                                  {cat.name}
                                </button>
                                {cat.level === 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                    Gốc
                                  </span>
                                )}
                              </div>

                              {cat.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {cat.description}
                                </p>
                              )}

                              {/* WordPress Row Action Links (Appear on hover) */}
                              <div className="flex items-center gap-2 mt-1 opacity-70 group-hover:opacity-100 transition-opacity text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                                >
                                  Chỉnh sửa
                                </button>
                                <span className="text-slate-300">|</span>

                                <a
                                  href={cat.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-0.5"
                                  title="Xem trang danh mục ngoài website"
                                >
                                  <span>Xem ngoài web</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <span className="text-slate-300">|</span>

                                <button
                                  type="button"
                                  onClick={() => toggleVisibility(cat)}
                                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                                >
                                  {cat.visible ? 'Ẩn đi' : 'Bật hiển thị'}
                                </button>

                                {!isSeedOrReferenced && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat)}
                                      className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                                    >
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Slug */}
                          <td className="py-2.5 px-3 align-middle font-mono text-[11.5px] text-slate-600">
                            <span className="bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                              /{cat.slug}
                            </span>
                          </td>

                          {/* Parent Category */}
                          <td className="py-2.5 px-3 align-middle text-slate-600">
                            {cat.parentName ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                                <Layers className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[120px]">{cat.parentName}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">— (Cấp gốc)</span>
                            )}
                          </td>

                          {/* Product Count */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            <span
                              className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                                cat.productCount > 0
                                  ? 'bg-blue-100/70 text-blue-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {cat.productCount}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleVisibility(cat)}
                              className="cursor-pointer"
                              title="Nhấp để thay đổi trạng thái hiển thị"
                            >
                              {cat.visible ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Hiển thị
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  Đang ẩn
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Reorder Arrows (Move up / down among siblings) */}
                          <td className="py-2.5 px-2 text-center align-middle">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveSibling(cat, 'up')}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer active:scale-95"
                                title="Di chuyển lên"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSibling(cat, 'down')}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer active:scale-95"
                                title="Di chuyển xuống"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Guide Callout */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-600">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>💡 Hướng dẫn cấu trúc danh mục:</strong> Cấu trúc phân cấp cha/con tự động
                đồng bộ với <strong>MegaMenu</strong> và bộ lọc tìm kiếm sản phẩm. Danh mục cha bị ẩn
                sẽ tự động ẩn các danh mục con. Sau khi thay đổi, nhấn nút{' '}
                <strong className="text-blue-700">"Xuất bản ngay"</strong> ở góc trên bên phải để áp
                dụng tức thì ra trang web chính thức.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Dialog */}
      {imagePickerOpen && (
        <MediaDialog title="Chọn ảnh đại diện danh mục" onClose={() => setImagePickerOpen(false)}>
          <MediaBrowser
            picker
            onSelect={a => {
              setFormData(prev => ({
                ...prev,
                assetId: a.id,
                image: '',
                alt: a.alt || a.name || prev.alt,
              }));
              setImagePickerOpen(false);
            }}
          />
        </MediaDialog>
      )}

      {/* Navigation Preview Modal */}
      {previewData && (
        <MediaDialog title="Xem trước cấu trúc danh mục" onClose={() => setPreviewData(null)}>
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-slate-600">
              Dưới đây là cấu trúc danh mục hiển thị khi xuất bản lên website:
            </p>
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              {previewData.categories.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded border border-slate-200/60"
                >
                  <span className="font-semibold text-slate-800">
                    {c.parentId ? '↳ ' : '📁 '}
                    {c.name}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{c.href}</span>
                </div>
              ))}
            </div>
          </div>
        </MediaDialog>
      )}
    </div>
  );
}

