"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Laptop,
  Headphones,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  InlineAlert,
} from "@/components/admin/ui";

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
  kind: "LAPTOP" | "ACCESSORY";
  category: { id: string; name: string; slug?: string } | null;
  brand: string;
  image: string;
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

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=150";

function money(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Local search input to avoid debounce lag
  const [searchInput, setSearchInput] = useState(q);
  const [showFilters, setShowFilters] = useState(false);

  // Data fetching state
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync search input if URL changed externally
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Push new query parameters to URL
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
        router.push(`${pathname}?${current.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  // Fetch catalog list from canonical admin API
  const fetchCatalog = useCallback(async () => {
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
      if (json?.success !== true || !catalog ||
          !Array.isArray(catalog.items) || !Array.isArray(catalog.categories) || !Array.isArray(catalog.brands) ||
          ![catalog.total, catalog.page, catalog.limit, catalog.totalPages].every(Number.isSafeInteger)) {
        throw new Error("Phản hồi danh mục không hợp lệ. Vui lòng thử lại.");
      }
      setData(catalog);
    } catch (err) {
      setError((err as Error).message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [q, kind, categoryId, brand, publicationStatus, availability, sort, order, page, limit]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: searchInput, page: 1 });
  };

  const handleArchive = async (item: CatalogItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn lưu trữ hoặc ẩn sản phẩm "${item.name}" khỏi website?`)) {
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
          ? `Đã lưu trữ sản phẩm "${item.name}" (giữ nguyên lịch sử đơn hàng).`
          : `Đã xóa sản phẩm "${item.name}".`,
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* 1. Page Header */}
      <PageHeader
        title="Quản lý Sản phẩm"
        description="Catalog sản phẩm thống nhất: quản lý danh sách, cấu hình thông số Laptop và Phụ kiện, biên tập bản nháp và xuất bản trực tiếp lên Storefront."
        breadcrumbs={[{ label: "Sản phẩm" }, { label: "Danh sách sản phẩm" }]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/admin/products/new">
              <AdminButton variant="primary" icon={<Plus className="w-4 h-4" />}>
                Thêm sản phẩm
              </AdminButton>
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

      {/* 3. Search and Filters Toolbar */}
      <AdminCard bodyClassName="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm, mã SKU, model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-20 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Tìm
            </button>
          </form>

          {/* Quick Filter Buttons & Reload */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            {/* Kind Quick Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                id="filter-kind-all"
                onClick={() => updateUrlParams({ kind: "ALL", page: 1 })}
                className={`px-2.5 py-1 font-semibold rounded-md transition ${
                  kind === "ALL"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                id="filter-kind-laptop"
                onClick={() => updateUrlParams({ kind: "LAPTOP", page: 1 })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition ${
                  kind === "LAPTOP"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                Laptop
              </button>
              <button
                type="button"
                id="filter-kind-accessory"
                onClick={() => updateUrlParams({ kind: "ACCESSORY", page: 1 })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition ${
                  kind === "ACCESSORY"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                Phụ kiện
              </button>
            </div>

            {/* Toggle advanced filters */}
            <AdminButton
              variant={showFilters ? "primary" : "secondary"}
              size="sm"
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Bộ lọc
            </AdminButton>

            {/* Reload button */}
            <button
              type="button"
              onClick={() => void fetchCatalog()}
              title="Tải lại dữ liệu"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Expandable Drawer/Section */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Danh mục</label>
              <select
                value={categoryId}
                onChange={(e) => updateUrlParams({ categoryId: e.target.value, page: 1 })}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tất cả danh mục</option>
                {data?.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thương hiệu</label>
              <select
                value={brand}
                onChange={(e) => updateUrlParams({ brand: e.target.value, page: 1 })}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tất cả thương hiệu</option>
                {data?.brands.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Publication Status */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trạng thái xuất bản</label>
              <select
                value={publicationStatus}
                onChange={(e) => updateUrlParams({ publicationStatus: e.target.value, page: 1 })}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đã xuất bản (Hiện trên web)</option>
                <option value="DRAFT">Bản nháp (Chưa công khai)</option>
                <option value="ARCHIVED">Lưu trữ / Đã ẩn</option>
              </select>
            </div>

            {/* Availability */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tình trạng bán</label>
              <select
                value={availability}
                onChange={(e) => updateUrlParams({ availability: e.target.value, page: 1 })}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả tình trạng</option>
                <option value="AVAILABLE">Còn hàng (Sẵn sàng bán)</option>
                <option value="PREORDER">Đặt trước (Pre-order)</option>
                <option value="OUT_OF_STOCK">Tạm hết hàng</option>
              </select>
            </div>

            {/* Sort & Order */}
            <div className="sm:col-span-2 md:col-span-4 flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Sắp xếp:</span>
                <select
                  value={`${sort}-${order}`}
                  onChange={(e) => {
                    const [s, o] = e.target.value.split("-");
                    updateUrlParams({ sort: s, order: o, page: 1 });
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800"
                >
                  <option value="updatedAt-desc">Mới cập nhật gần nhất</option>
                  <option value="updatedAt-asc">Cập nhật cũ nhất</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="name-asc">Tên sản phẩm (A - Z)</option>
                  <option value="name-desc">Tên sản phẩm (Z - A)</option>
                </select>
              </div>

              {/* Reset all filters */}
              {(q || kind !== "ALL" || categoryId || brand || publicationStatus !== "ALL" || availability !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    startTransition(() => {
                      router.push(pathname);
                    });
                  }}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              )}
            </div>
          </div>
        )}
      </AdminCard>

      {/* 4. Products Table */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {loading && !data ? (
          <div className="py-20">
            <AdminLoadingState message="Đang tải danh sách sản phẩm từ máy chủ..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-red-50 text-red-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Không thể tải dữ liệu</h3>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <AdminButton variant="secondary" size="sm" onClick={() => void fetchCatalog()}>
              Thử lại
            </AdminButton>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16">
            <AdminEmptyState
              title="Không tìm thấy sản phẩm nào"
              description="Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các tiêu chí bộ lọc."
              action={
                <Link href="/admin/products/new">
                  <AdminButton variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Tạo sản phẩm mới
                  </AdminButton>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Ảnh</th>
                  <th className="py-3 px-4 min-w-[260px]">Sản phẩm & Định danh</th>
                  <th className="py-3 px-4 w-36">Phân loại</th>
                  <th className="py-3 px-4 w-36 text-right">Giá bán</th>
                  <th className="py-3 px-4 w-36 text-center">Xuất bản</th>
                  <th className="py-3 px-4 w-32 text-center">Nhận đơn</th>
                  <th className="py-3 px-4 w-36 text-right">Lần sửa</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.items.map((item) => {
                  const isLaptop = item.kind === "LAPTOP";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4 text-center">
                        <div className="w-11 h-11 mx-auto rounded-lg border border-slate-200 p-0.5 bg-white overflow-hidden relative shadow-2xs">
                          <Image
                            src={item.image || FALLBACK_IMAGE}
                            alt={item.name}
                            fill
                            sizes="44px"
                            className="object-contain"
                          />
                        </div>
                      </td>

                      {/* Name & Identifiers */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                          <Link href={`/admin/products/${item.id}`}>
                            {item.name}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-slate-500">ID: {item.id}</span>
                          <span>•</span>
                          <span className="text-slate-500">{item.brand || "Chưa rõ hãng"}</span>
                          {item.revision > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-indigo-600 font-medium">
                                rev #{item.revision}
                              </span>
                            </>
                          )}
                          {item.hasUnpublishedDraft && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-700 font-semibold border border-amber-200 rounded">
                              Có nháp mới
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kind & Category */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLaptop
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isLaptop ? (
                              <Laptop className="w-3 h-3" />
                            ) : (
                              <Headphones className="w-3 h-3" />
                            )}
                            {isLaptop ? "Laptop" : "Phụ kiện"}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                            {item.category?.name || "Chưa phân loại"}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900">
                          {money(item.price)}
                        </div>
                        {item.originalPrice != null && item.originalPrice > item.price && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {money(item.originalPrice)}
                          </div>
                        )}
                      </td>

                      {/* Publication Status */}
                      <td className="py-3 px-4 text-center">
                        {item.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Đã xuất bản
                          </span>
                        ) : item.isDraftOnly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Bản nháp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Đã ẩn / Lưu trữ
                          </span>
                        )}
                      </td>

                      {/* Availability */}
                      <td className="py-3 px-4 text-center">
                        {item.availability === "AVAILABLE" ? (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Còn hàng
                          </span>
                        ) : item.availability === "PREORDER" ? (
                          <span className="text-[11px] text-indigo-700 font-medium">
                            Đặt trước
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-medium">
                            Hết hàng
                          </span>
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                        {formatDate(item.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <Link
                            href={`/admin/products/${item.id}`}
                            title="Chỉnh sửa sản phẩm"
                            className="p-1.5 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>

                          {/* Public Storefront link if published */}
                          {item.isPublished && (
                            <a
                              href={`/product/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Xem trên website"
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Archive / Delete button */}
                          <button
                            type="button"
                            onClick={() => void handleArchive(item)}
                            disabled={deletingId === item.id}
                            title="Lưu trữ / Ẩn khỏi website"
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition disabled:opacity-50"
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

        {/* 5. Pagination Bar */}
        {data && data.total > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Hiển thị{" "}
              <span className="font-bold text-slate-900">
                {(data.page - 1) * data.limit + 1}
              </span>{" "}
              -{" "}
              <span className="font-bold text-slate-900">
                {Math.min(data.page * data.limit, data.total)}
              </span>{" "}
              trong tổng số{" "}
              <span className="font-bold text-slate-900">{data.total}</span> sản phẩm
            </div>

            <div className="flex items-center gap-1.5">
              {/* Prev button */}
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => updateUrlParams({ page: data.page - 1 })}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 px-1">
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
                      onClick={() => updateUrlParams({ page: p })}
                      className={`w-7 h-7 rounded-md text-xs font-semibold transition ${
                        p === data.page
                          ? "bg-blue-600 text-white font-bold"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ));
                })()}
              </div>

              {/* Next button */}
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => updateUrlParams({ page: data.page + 1 })}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
