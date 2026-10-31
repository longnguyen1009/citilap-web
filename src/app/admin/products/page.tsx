"use client";
import { productHref } from '@/lib/product-paths';

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  RefreshCw,
  Laptop,
  Headphones,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  InlineAlert,
} from "@/components/admin/ui";
import ProductQuickEditDrawer from "@/components/admin/products/ProductQuickEditDrawer";
import "@/components/admin/products/catalog.css";

interface CatalogItem {
  id: string;
  name: string;
  publicName: string;
  slug: string;
  price: number;
  publicPrice: number;
  originalPrice: number | null;
  productStatus: string;
  revision: number;
  isPublished: boolean;
  isDraftOnly: boolean;
  hasUnpublishedDraft: boolean;
  availability: string;
  publicAvailability: string | null;
  publicTemplate?: string;
  kind: "LAPTOP" | "ACCESSORY";
  category: { id: string; name: string; slug?: string } | null;
  brand: string;
  image: string;
  stock?: number;
  availableSerialsCount?: number;
  updatedAt: string;
  hasStudio: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface BrandOption {
  id: string;
  name: string;
}

interface CatalogResponse {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: CategoryOption[];
  brands: BrandOption[];
}

function money(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UnifiedProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Query state derived from searchParams
  const q = searchParams.get("q") || "";
  const kind = searchParams.get("kind") || "ALL";
  const categoryId = searchParams.get("categoryId") || "";
  const brand = searchParams.get("brand") || "";
  const publicationStatus = searchParams.get("publicationStatus") || "ALL";
  const availability = searchParams.get("availability") || "ALL";
  const sort = searchParams.get("sort") || "updatedAt";
  const order = searchParams.get("order") || "desc";
  const rawPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = Number(searchParams.get("limit") || 20);
  const limit = [20, 50, 100].includes(rawLimit) ? rawLimit : 20;

  const requestId = useRef(0);

  // Data fetching state
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickEditItem, setQuickEditItem] = useState<CatalogItem | null>(null);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "" || val === "ALL") {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      }
      startTransition(() => {
        router.push(current.size ? `${pathname}?${current.toString()}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const fetchCatalog = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/products", window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("kind", kind);
      url.searchParams.set("categoryId", categoryId);
      url.searchParams.set("brand", brand);
      url.searchParams.set("publicationStatus", publicationStatus);
      url.searchParams.set("availability", availability);
      url.searchParams.set("sort", sort);
      url.searchParams.set("order", order);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi tải danh mục (${res.status})`);
      }

      const json = await res.json();
      const catalog = json?.data;
      if (
        json?.success !== true ||
        !catalog ||
        !Array.isArray(catalog.items) ||
        !Array.isArray(catalog.categories) ||
        !Array.isArray(catalog.brands) ||
        ![catalog.total, catalog.page, catalog.limit, catalog.totalPages].every(Number.isSafeInteger)
      ) {
        throw new Error("Phản hồi danh mục không hợp lệ. Vui lòng thử lại.");
      }
      if (currentRequest === requestId.current) {
        setData(catalog);
        if (catalog.page !== page) {
          const params = new URLSearchParams(window.location.search);
          params.set("page", String(catalog.page));
          router.replace(`${pathname}?${params}`, { scroll: false });
        }
      }
    } catch (err) {
      if (currentRequest === requestId.current) setError((err as Error).message || "Không thể kết nối đến máy chủ.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [q, kind, categoryId, brand, publicationStatus, availability, sort, order, page, limit, pathname, router]);

  useEffect(() => {
    requestId.current++;
    const timer = setTimeout(() => void fetchCatalog(), 100);
    return () => clearTimeout(timer);
  }, [fetchCatalog]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateUrlParams({ q: String(new FormData(e.currentTarget).get("q") || "").trim(), page: 1 });
  };

  const handleArchive = async (item: CatalogItem) => {
    if (!window.confirm(`Lưu trữ hoặc ẩn sản phẩm "${item.name}" khỏi website?`)) {
      return;
    }
    setDeletingId(item.id);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/admin/products/${item.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok || resJson?.success !== true) {
        throw new Error(resJson.error || "Không thể xử lý thao tác lưu trữ");
      }
      setActionNotice({
        type: "success",
        text: resJson.data?.archived
          ? `Đã lưu trữ "${item.name}".`
          : `Đã xóa "${item.name}".`,
      });
      void fetchCatalog();
    } catch (err) {
      setActionNotice({
        type: "error",
        text: (err as Error).message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const hasAnyFilter = Boolean(q || kind !== "ALL" || categoryId || brand || publicationStatus !== "ALL" || availability !== "ALL");

  return (
    <div className="admin-product-list space-y-3 pb-8">
      {/* 1. Compact Header */}
      <PageHeader
        title="Sản phẩm"
        description="Soạn thông tin, giá và cấu hình trong bản nháp; xuất bản để cập nhật website. Giá Flash Sale được quản lý tại Chiến dịch. Kho & Serial quản lý từng máy thực tế."
        badge={
          data && (
            <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-semibold tabular-nums">
              {data.total}
            </span>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchCatalog()}
              title="Làm mới"
              aria-label="Làm mới danh sách"
              className="inline-grid place-items-center size-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Thêm sản phẩm</span>
            </Link>
          </div>
        }
      />

      {/* 2. Notification banner if any */}
      {actionNotice && (
        <InlineAlert
          variant={actionNotice.type === "success" ? "success" : "error"}
          onClose={() => setActionNotice(null)}
        >
          {actionNotice.text}
        </InlineAlert>
      )}

      {/* 3. Unified Card: Tabs + Inline Filter Bar + Table + Pagination */}
      <AdminCard bodyClassName="p-0 overflow-hidden" className="relative">
        {/* Top Row: Status Tabs + Kind Segmented Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 border-b border-slate-200 bg-slate-50/50">
          <div className="admin-status-tabs" role="group" aria-label="Lọc trạng thái sản phẩm">
            <button
              type="button"
              aria-pressed={publicationStatus === "ALL" && availability === "ALL"}
              onClick={() => updateUrlParams({ publicationStatus: "ALL", availability: "ALL", page: 1 })}
            >
              Tất cả
            </button>
            <button
              type="button"
              aria-pressed={publicationStatus === "PUBLISHED" && availability === "ALL"}
              onClick={() => updateUrlParams({ publicationStatus: "PUBLISHED", availability: "ALL", page: 1 })}
            >
              Đang bán
            </button>
            <button
              type="button"
              aria-pressed={publicationStatus === "DRAFT" && availability === "ALL"}
              onClick={() => updateUrlParams({ publicationStatus: "DRAFT", availability: "ALL", page: 1 })}
            >
              Nháp
            </button>
            <button
              type="button"
              aria-pressed={availability === "UNAVAILABLE"}
              onClick={() => updateUrlParams({ publicationStatus: "ALL", availability: "UNAVAILABLE", page: 1 })}
            >
              Ngừng đơn
            </button>
            <button
              type="button"
              aria-pressed={publicationStatus === "ARCHIVED" && availability === "ALL"}
              onClick={() => updateUrlParams({ publicationStatus: "ARCHIVED", availability: "ALL", page: 1 })}
            >
              Lưu trữ
            </button>
          </div>

          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-white text-xs my-1.5">
            <button
              type="button"
              aria-pressed={kind === "ALL"}
              onClick={() => updateUrlParams({ kind: "ALL", page: 1 })}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                kind === "ALL" ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              aria-pressed={kind === "LAPTOP"}
              onClick={() => updateUrlParams({ kind: "LAPTOP", page: 1 })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition cursor-pointer ${
                kind === "LAPTOP" ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Laptop className="w-3 h-3" />
              <span>Laptop</span>
            </button>
            <button
              type="button"
              aria-pressed={kind === "ACCESSORY"}
              onClick={() => updateUrlParams({ kind: "ACCESSORY", page: 1 })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition cursor-pointer ${
                kind === "ACCESSORY" ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Headphones className="w-3 h-3" />
              <span>Phụ kiện</span>
            </button>
          </div>
        </div>

        {/* Second Row: Inline Search + Selects */}
        <div
          aria-label="Tìm kiếm và bộ lọc sản phẩm"
          className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white text-xs"
        >
          <form role="search" aria-label="Tìm sản phẩm" onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Từ khóa sản phẩm"
              placeholder="Tìm tên, mã SKU, model..."
              name="q"
              key={q}
              defaultValue={q}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </form>

          <select
            aria-label="Danh mục"
            value={categoryId}
            onChange={(e) => updateUrlParams({ categoryId: e.target.value, page: 1 })}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
          >
            <option value="">Danh mục: Tất cả</option>
            {data?.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Thương hiệu"
            value={brand}
            onChange={(e) => updateUrlParams({ brand: e.target.value, page: 1 })}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
          >
            <option value="">Hãng: Tất cả</option>
            {data?.brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Tình trạng nhận đơn"
            value={availability}
            onChange={(e) => updateUrlParams({ availability: e.target.value, page: 1 })}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
          >
            <option value="ALL">Nhận đơn: Tất cả</option>
            <option value="AVAILABLE">Sẵn hàng</option>
            <option value="PREORDER">Đặt trước</option>
            <option value="CONTACT">Liên hệ</option>
            <option value="UNAVAILABLE">Ngừng đơn</option>
          </select>

          <select
            aria-label="Sắp xếp"
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split("-");
              updateUrlParams({ sort: s, order: o, page: 1 });
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
          >
            <option value="updatedAt-desc">Mới sửa</option>
            <option value="updatedAt-asc">Cũ nhất</option>
            <option value="price-desc">Giá ↓</option>
            <option value="price-asc">Giá ↑</option>
            <option value="name-asc">Tên A–Z</option>
            <option value="name-desc">Tên Z–A</option>
          </select>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => startTransition(() => router.push(pathname))}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
              title="Xóa tất cả bộ lọc"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Table Content */}
        {loading && !data ? (
          <div className="py-16">
            <AdminLoadingState message="Đang tải sản phẩm..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-2.5 rounded-full bg-red-50 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-600 mb-3">{error}</p>
            <AdminButton variant="secondary" size="sm" onClick={() => void fetchCatalog()}>
              Thử lại
            </AdminButton>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-12">
            <AdminEmptyState
              title="Không có sản phẩm phù hợp"
              action={
                hasAnyFilter ? (
                  <AdminButton type="button" variant="secondary" size="sm" onClick={() => router.push(pathname)}>
                    Xóa bộ lọc
                  </AdminButton>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={loading || isPending}>
            <table className={`admin-table text-left ${loading || isPending ? "opacity-60" : ""}`}>
              <thead>
                <tr>
                  <th scope="col">Sản phẩm</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col" className="text-right">Giá bán</th>
                  <th scope="col" className="text-center">Tồn kho / QC</th>
                  <th scope="col" className="text-center">Trạng thái</th>
                  <th scope="col" className="text-right">Cập nhật</th>
                  <th scope="col" className="text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.items.map((item) => {
                  const isLaptop = item.kind === "LAPTOP";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      {/* 1. Product cell */}
                      <td>
                        <div className="catalog-product-cell">
                          <div className="size-11 rounded-md border border-slate-200 p-0.5 bg-white overflow-hidden relative shrink-0 grid place-items-center">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="44px"
                                className="object-contain"
                              />
                            ) : (
                              <Laptop className="size-5 text-slate-300" aria-label="Chưa có ảnh" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${item.id}`}
                              className="text-[13px] font-semibold text-slate-900 hover:text-blue-600 line-clamp-1"
                            >
                              {item.name}
                            </Link>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{item.brand || "—"}</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-400 truncate max-w-[180px]">{item.slug}</span>
                              {item.hasUnpublishedDraft && (
                                <span className="px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-700 font-medium border border-amber-200 rounded">
                                  Có nháp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Category */}
                      <td className="whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                          {item.category?.name || "Chưa phân loại"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isLaptop ? "Laptop" : "Phụ kiện"}
                        </div>
                      </td>

                      {/* 3. Price */}
                      <td className="text-right whitespace-nowrap">
                        <div className="font-semibold text-blue-700 tabular-nums text-[13px]">
                          {money(item.price)}
                        </div>
                        {item.originalPrice != null && item.originalPrice > item.price && (
                          <div className="text-[11px] text-slate-400 line-through tabular-nums">
                            {money(item.originalPrice)}
                          </div>
                        )}
                        {item.isPublished && item.publicPrice !== item.price && (
                          <div className="text-[10px] text-slate-500 tabular-nums">
                            Web: {money(item.publicPrice)}
                          </div>
                        )}
                      </td>

                      {/* 3.5. Stock & Serial Units */}
                      <td className="text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              (item.stock ?? 0) === 0
                                ? "text-rose-600"
                                : (item.stock ?? 0) <= 2
                                ? "text-amber-700"
                                : "text-slate-800"
                            }`}
                          >
                            Tồn: {item.stock ?? 0}
                          </span>
                          {(item.availableSerialsCount ?? 0) > 0 && (
                            <Link
                              href="/admin/inventory"
                              className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:underline"
                              title="Xem danh sách Serial & Hồ sơ QC tại Kho"
                            >
                              {item.availableSerialsCount} Serial QC
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* 4. Combined Status (Publication + Availability) */}
                      <td className="text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          {item.isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang bán
                            </span>
                          ) : item.isDraftOnly && !["ARCHIVED", "archived"].includes(item.productStatus) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Nháp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Lưu trữ
                            </span>
                          )}
                          <span
                            className={`text-[11px] ${
                              item.availability === "AVAILABLE"
                                ? "text-slate-500"
                                : item.availability === "PREORDER"
                                ? "text-blue-600 font-medium"
                                : item.availability === "CONTACT"
                                ? "text-amber-700 font-medium"
                                : "text-rose-600 font-medium"
                            }`}
                          >
                            {item.availability === "AVAILABLE"
                              ? "Sẵn hàng"
                              : item.availability === "PREORDER"
                              ? "Đặt trước"
                              : item.availability === "CONTACT"
                              ? "Liên hệ"
                              : "Ngừng đơn"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Updated date */}
                      <td className="text-right text-slate-400 whitespace-nowrap tabular-nums">
                        {formatDate(item.updatedAt)}
                      </td>

                      {/* 6. Direct row actions */}
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setQuickEditItem(item)}
                            className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
                          >
                            Sửa nhanh
                          </button>
                          {item.isPublished && (
                            <a
                              href={productHref({ ...item, template: item.publicTemplate })}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Xem trên web"
                              aria-label={`Xem ${item.name} trên web`}
                              className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            title="Lưu trữ / Ẩn"
                            aria-label={`Lưu trữ ${item.name}`}
                            disabled={deletingId === item.id || loading}
                            onClick={() => void handleArchive(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!error && data && data.total > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                <strong>{(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)}</strong> / {data.total}
              </span>
              <select
                aria-label="Số sản phẩm mỗi trang"
                value={limit}
                onChange={(event) => updateUrlParams({ limit: Number(event.target.value), page: 1 })}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs cursor-pointer"
              >
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => updateUrlParams({ page: data.page - 1 })}
                aria-label="Trang trước"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {(() => {
                const maxButtons = 5;
                const total = data.totalPages;
                let start = Math.max(1, data.page - Math.floor(maxButtons / 2));
                let end = start + maxButtons - 1;
                if (end > total) {
                  end = total;
                  start = Math.max(1, end - maxButtons + 1);
                }
                const pages: number[] = [];
                for (let p = start; p <= end; p++) pages.push(p);
                return pages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-current={p === data.page ? "page" : undefined}
                    onClick={() => updateUrlParams({ page: p })}
                    className={`w-7 h-7 rounded text-xs font-semibold transition cursor-pointer ${
                      p === data.page
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}

              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => updateUrlParams({ page: data.page + 1 })}
                aria-label="Trang sau"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Quick Edit Drawer */}
      {quickEditItem && (
        <ProductQuickEditDrawer
          item={quickEditItem}
          onClose={() => setQuickEditItem(null)}
          onSaved={(text) => {
            setActionNotice({ type: "success", text });
            void fetchCatalog();
          }}
        />
      )}
    </div>
  );
}
