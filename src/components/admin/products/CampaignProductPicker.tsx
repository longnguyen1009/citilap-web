'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, CheckSquare, Square, ChevronDown, Package } from 'lucide-react';

export type CampaignPickerTarget = {
  productId: string;
  variantId: string | null;
  salePrice: string;
  regularPrice: number;
  displayName: string;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type ProductItem = {
  id: string;
  name: string;
  publicName: string;
  price: number;
  publicPrice?: number;
  originalPrice?: number | null;
  stock?: number;
  productStatus: string;
  brand?: string;
  category?: { id: string; name: string; slug: string } | null;
};

type StudioVariant = {
  id: string;
  name?: string;
  sku: string;
  price: number;
  stock?: number;
  status?: string;
  availability?: string;
};

function isActiveVariant(v: StudioVariant): boolean {
  if (typeof v.status === 'string' && v.status.trim() !== '') {
    return v.status.toUpperCase() === 'ACTIVE';
  }
  if (typeof v.availability === 'string' && v.availability.trim() !== '') {
    return ['AVAILABLE', 'PREORDER', 'IN_STOCK', 'ACTIVE'].includes(v.availability.toUpperCase());
  }
  return true;
}

const PAGE_LIMIT = 30;

export default function CampaignProductPicker({
  onAdd,
  disabled = false,
}: {
  onAdd: (items: CampaignPickerTarget[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addingIds, setAddingIds] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else setBusy(true);
      setError('');

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          publicationStatus: 'PUBLISHED',
          limit: String(PAGE_LIMIT),
          page: String(targetPage),
        });
        if (categoryId) {
          params.set('categoryId', categoryId);
        }

        const res = await fetch(`/api/admin/products?${params.toString()}`, { signal });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Không tải được sản phẩm');
        }

        const activeItems: ProductItem[] = (json.data.items || []).filter((p: ProductItem) =>
          ['ACTIVE', 'active'].includes(p.productStatus)
        );

        setProducts((prev) => {
          if (!append) return activeItems;
          const existing = new Set(prev.map((item) => item.id));
          return [...prev, ...activeItems.filter((item) => !existing.has(item.id))];
        });

        setPage(json.data.page || targetPage);
        setTotalPages(json.data.totalPages || 1);
        setTotalCount(json.data.total || activeItems.length);
        if (Array.isArray(json.data.categories) && json.data.categories.length > 0) {
          setCategories(json.data.categories);
        }
      } catch (e) {
        if (!signal?.aborted) {
          setError(e instanceof Error ? e.message : 'Không tải được sản phẩm');
        }
      } finally {
        if (!signal?.aborted) {
          setBusy(false);
          setLoadingMore(false);
        }
      }
    },
    [query, categoryId]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchPage(1, false, controller.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchPage]);

  async function resolveProductTargets(product: ProductItem): Promise<CampaignPickerTarget[]> {
    const res = await fetch(`/api/admin/products/${product.id}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Không tải được cấu hình của "${product.publicName || product.name}"`);
    }
    const document = json.data.document;
    const rawVariants: StudioVariant[] = Array.isArray(document.variants) ? document.variants : [];
    const activeVariants = rawVariants.filter(isActiveVariant);
    const baseSellingPrice = Number(product.publicPrice ?? document.price ?? product.price ?? 0);

    if (activeVariants.length > 0) {
      return activeVariants.map((v) => {
        const stockText = typeof v.stock === 'number' ? ` [Tồn: ${v.stock}]` : '';
        return {
          productId: product.id,
          variantId: v.id,
          salePrice: '',
          regularPrice: Number(v.price) || baseSellingPrice,
          displayName: `${product.publicName || product.name} · ${v.name || v.sku}${stockText}`,
        };
      });
    }

    if (rawVariants.length > 0 && activeVariants.length === 0) {
      throw new Error(`Sản phẩm "${product.publicName || product.name}" không có biến thể nào đang ở trạng thái ACTIVE.`);
    }

    return [
      {
        productId: product.id,
        variantId: null,
        salePrice: '',
        regularPrice: baseSellingPrice,
        displayName: product.publicName || product.name,
      },
    ];
  }

  async function addSingle(product: ProductItem) {
    if (disabled || addingIds) return;
    setAddingIds(true);
    setError('');
    try {
      const targets = await resolveProductTargets(product);
      onAdd(targets);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được sản phẩm');
    } finally {
      setAddingIds(false);
    }
  }

  async function addSelected() {
    if (disabled || addingIds || selectedIds.size === 0) return;
    setAddingIds(true);
    setError('');
    try {
      const chosenProducts = products.filter((p) => selectedIds.has(p.id));
      const results = await Promise.all(chosenProducts.map((p) => resolveProductTargets(p)));
      const merged = results.flat();
      if (merged.length > 0) {
        onAdd(merged);
      }
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được các sản phẩm đã chọn');
    } finally {
      setAddingIds(false);
    }
  }

  function toggleSelect(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAllLoaded() {
    if (products.length === 0) return;
    const allSelected = products.every((p) => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  const allLoadedSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  return (
    <div className="mb-3 space-y-2.5 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-blue-600" />
          Chọn sản phẩm tham gia chiến dịch
        </span>
        <span className="text-[11px] text-slate-500">
          Chỉ thêm các sản phẩm &amp; biến thể đang mở bán (ACTIVE)
        </span>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-8 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            disabled={disabled}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên laptop, phụ kiện, SKU…"
            aria-label="Tìm sản phẩm tham gia chiến dịch"
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs font-normal text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>
        <div className="sm:col-span-4">
          <select
            disabled={disabled}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Lọc theo danh mục"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-select action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          type="button"
          disabled={disabled || products.length === 0}
          onClick={toggleSelectAllLoaded}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
        >
          {allLoadedSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <Square className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>
            {allLoadedSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${products.length})`}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              disabled={disabled || addingIds}
              onClick={() => void addSelected()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {addingIds
                  ? 'Đang thêm...'
                  : `Thêm các mục đã chọn (${selectedIds.size})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          {error}
        </p>
      )}

      {/* Product List */}
      <div
        className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-white"
        aria-busy={busy || loadingMore || addingIds}
      >
        {products.map((p) => {
          const isChecked = selectedIds.has(p.id);
          const currentPrice = Number(p.publicPrice ?? p.price ?? 0);
          const stockCount = typeof p.stock === 'number' ? p.stock : 0;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-xs transition ${
                isChecked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={disabled || addingIds}
                  checked={isChecked}
                  onChange={() => toggleSelect(p.id)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 truncate">
                    {p.publicName || p.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">
                      {currentPrice.toLocaleString('vi-VN')}₫
                    </span>
                    <span>·</span>
                    <span className={stockCount > 0 ? 'text-emerald-700' : 'text-amber-600'}>
                      Tồn: {stockCount}
                    </span>
                    {p.category?.name && (
                      <>
                        <span>·</span>
                        <span className="truncate">{p.category.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </label>

              <button
                type="button"
                disabled={disabled || busy || addingIds}
                onClick={() => void addSingle(p)}
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100/80 disabled:opacity-50 transition cursor-pointer"
              >
                + Thêm
              </button>
            </div>
          );
        })}

        {!busy && products.length === 0 && (
          <p className="p-3 text-center text-xs text-slate-500">
            Không có sản phẩm đang mở bán phù hợp.
          </p>
        )}
      </div>

      {/* Pagination / Load more footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <span>
          Hiển thị {products.length} / {totalCount} sản phẩm
        </span>
        {page < totalPages && (
          <button
            type="button"
            disabled={disabled || loadingMore || busy}
            onClick={() => void fetchPage(page + 1, true)}
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>{loadingMore ? 'Đang tải thêm...' : `Tải thêm (trang ${page + 1}/${totalPages})`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
