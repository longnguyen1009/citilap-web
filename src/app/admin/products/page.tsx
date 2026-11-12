"use client";
import { productHref } from "@/lib/product-paths";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  RefreshCw,
  Laptop,
  Headphones,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Copy,
  Download,
  X,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  InlineAlert,
  DataTable,
  type DataTableColumn,
  useConfirm,
  useToast,
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

type QualityFilterType = "ALL" | "ISSUES" | "NO_IMAGE" | "NO_SEO" | "NO_PRICE";

interface QualityIssue {
  code: "NO_IMAGE" | "NO_SEO" | "NO_PRICE";
  label: string;
  tone: string;
}

function getQualityIssues(item: CatalogItem): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!item.image || item.image.includes("placeholder")) {
    issues.push({
      code: "NO_IMAGE",
      label: "Thiếu ảnh",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    });
  }
  if (!item.price || item.price <= 0) {
    issues.push({
      code: "NO_PRICE",
      label: "Chưa có giá",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    });
  }
  if (!item.hasStudio || !item.brand?.trim() || !item.category) {
    issues.push({
      code: "NO_SEO",
      label: "Thiếu SEO",
      tone: "bg-orange-50 text-orange-700 border-orange-200",
    });
  }
  return issues;
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

function downloadProductsCsv(items: CatalogItem[], filename: string) {
  const headers = [
    "Mã SP",
    "Tên sản phẩm",
    "Slug",
    "Danh mục",
    "Thương hiệu",
    "Loại",
    "Giá bán (VND)",
    "Giá gốc (VND)",
    "Tồn kho",
    "Serial QC",
    "Trạng thái xuất bản",
    "Tình trạng nhận đơn",
    "Cảnh báo chất lượng",
    "Cập nhật",
  ];
  const escapeCsv = (val: unknown) => {
    const str = String(val ?? "");
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = items.map((item) => {
    const issues = getQualityIssues(item).map((i) => i.label).join("; ");
    const pubLabel = item.isPublished
      ? "Đang bán"
      : item.isDraftOnly && !["ARCHIVED", "archived"].includes(item.productStatus)
      ? "Nháp"
      : "Lưu trữ";
    return [
      item.id,
      item.name,
      item.slug,
      item.category?.name || "Chưa phân loại",
      item.brand || "",
      item.kind === "LAPTOP" ? "Laptop" : "Phụ kiện",
      item.price,
      item.originalPrice ?? "",
      item.stock ?? 0,
      item.availableSerialsCount ?? 0,
      pubLabel,
      item.availability,
      issues || "Đạt chuẩn",
      formatDate(item.updatedAt),
    ].map(escapeCsv).join(",");
  });

  const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function UnifiedProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  // Query state derived from searchParams
  const q = searchParams.get("q") || "";
  const kind = searchParams.get("kind") || "ALL";
  const categoryId = searchParams.get("categoryId") || "";
  const brand = searchParams.get("brand") || "";
  const publicationStatus = searchParams.get("publicationStatus") || "ALL";
  const availability = searchParams.get("availability") || "ALL";
  const rawQuality = searchParams.get("quality") || "ALL";
  const qualityFilter: QualityFilterType = (
    ["ALL", "ISSUES", "NO_IMAGE", "NO_SEO", "NO_PRICE"].includes(rawQuality) ? rawQuality : "ALL"
  ) as QualityFilterType;
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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
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
        setSelectedKeys([]);
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

  const handleArchive = useCallback(async (item: CatalogItem) => {
    const confirmed = await confirm({
      title: "Lưu trữ hoặc ẩn sản phẩm",
      message: `Bạn có chắc muốn lưu trữ hoặc ẩn sản phẩm "${item.name}" khỏi website?`,
      confirmLabel: "Lưu trữ / Ẩn",
      cancelLabel: "Hủy",
      variant: "destructive",
    });
    if (!confirmed) {
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
      const msg = resJson.data?.archived
        ? `Đã lưu trữ "${item.name}".`
        : `Đã xóa "${item.name}".`;
      setActionNotice({ type: "success", text: msg });
      toast.success(msg);
      void fetchCatalog();
    } catch (err) {
      const msg = (err as Error).message;
      setActionNotice({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }, [confirm, fetchCatalog, toast]);

  const handleDuplicate = useCallback(async (item: CatalogItem) => {
    if (duplicatingId) return;
    setDuplicatingId(item.id);
    setActionNotice(null);
    try {
      const detailRes = await fetch(`/api/admin/products/${item.id}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const detailJson = await detailRes.json().catch(() => ({}));
      if (!detailRes.ok || !detailJson?.success || !detailJson?.data?.document) {
        throw new Error(detailJson?.error || "Không thể đọc dữ liệu gốc để nhân bản.");
      }

      const sourceDoc = detailJson.data.document;
      const suffix = Math.random().toString(36).slice(2, 6);
      const copyDoc = {
        ...sourceDoc,
        name: `${sourceDoc.name || item.name} (Bản sao)`,
        slug: `${(sourceDoc.slug || item.slug).slice(0, 160)}-copy-${suffix}`,
        variants: Array.isArray(sourceDoc.variants)
          ? sourceDoc.variants.map((v: Record<string, unknown>, idx: number) => ({
              ...v,
              id: crypto.randomUUID(),
              sku: v.sku ? `${String(v.sku)}-C${idx + 1}-${suffix.toUpperCase()}` : `SKU-${suffix.toUpperCase()}-${idx + 1}`,
            }))
          : [],
      };

      const createRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          action: "save",
          document: copyDoc,
        }),
      });
      const createJson = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createJson?.success || !createJson?.data?.id) {
        throw new Error(createJson?.error || "Không thể tạo bản sao sản phẩm.");
      }

      const newId = String(createJson.data.id);
      toast.success(`Đã nhân bản "${item.name}" thành bản nháp mới.`);
      router.push(`/admin/products/${newId}`);
    } catch (err) {
      const msg = (err as Error).message || "Lỗi khi nhân bản sản phẩm.";
      setActionNotice({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setDuplicatingId(null);
    }
  }, [duplicatingId, router, toast]);

  const handleBulkArchive = useCallback(async (keys: string[], clearSelection: () => void) => {
    if (!data || keys.length === 0 || bulkBusy) return;
    const selectedItems = data.items.filter((it) => keys.includes(it.id));
    if (selectedItems.length === 0) return;

    const previewNames =
      selectedItems
        .slice(0, 3)
        .map((it) => `"${it.name}"`)
        .join(", ") + (selectedItems.length > 3 ? ` và ${selectedItems.length - 3} sản phẩm khác` : "");

    const confirmed = await confirm({
      title: "Lưu trữ / Ẩn hàng loạt",
      message: `Bạn có chắc muốn lưu trữ hoặc ẩn ${selectedItems.length} sản phẩm (${previewNames}) khỏi website?`,
      confirmLabel: `Lưu trữ ${selectedItems.length} sản phẩm`,
      cancelLabel: "Hủy",
      variant: "destructive",
    });
    if (!confirmed) return;

    setBulkBusy(true);
    setActionNotice(null);
    let okCount = 0;
    try {
      for (const it of selectedItems) {
        const res = await fetch(`/api/admin/products/${it.id}`, {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });
        if (res.ok) okCount++;
      }
      const msg = `Đã lưu trữ / ẩn ${okCount}/${selectedItems.length} sản phẩm đã chọn.`;
      setActionNotice({ type: "success", text: msg });
      toast.success(msg);
      clearSelection();
      void fetchCatalog();
    } catch (err) {
      const msg = (err as Error).message || "Có lỗi khi lưu trữ hàng loạt.";
      setActionNotice({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setBulkBusy(false);
    }
  }, [bulkBusy, confirm, data, fetchCatalog, toast]);

  const qualityCounts = useMemo(() => {
    const items = data?.items || [];
    let issues = 0;
    let noImage = 0;
    let noSeo = 0;
    let noPrice = 0;
    for (const it of items) {
      const list = getQualityIssues(it);
      if (list.length > 0) issues++;
      if (list.some((i) => i.code === "NO_IMAGE")) noImage++;
      if (list.some((i) => i.code === "NO_SEO")) noSeo++;
      if (list.some((i) => i.code === "NO_PRICE")) noPrice++;
    }
    return { issues, noImage, noSeo, noPrice };
  }, [data?.items]);

  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    if (qualityFilter === "ALL") return items;
    return items.filter((item) => {
      const issues = getQualityIssues(item);
      if (qualityFilter === "ISSUES") return issues.length > 0;
      return issues.some((i) => i.code === qualityFilter);
    });
  }, [data?.items, qualityFilter]);

  const columns = useMemo<DataTableColumn<CatalogItem>[]>(
    () => [
      {
        key: "name",
        header: "Tên sản phẩm",
        headerText: "Tên sản phẩm",
        sortable: true,
        sortType: "text",
        sortValue: (item) => item.name,
        isRowHeader: true,
        render: (item) => {
          const issues = getQualityIssues(item);
          return (
            <div className="catalog-product-cell">
              <div className="size-11 rounded-md border border-slate-200 p-0.5 bg-white overflow-hidden relative shrink-0 grid place-items-center">
                {item.image && !item.image.includes("placeholder") ? (
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
                  <span>{item.brand || "Chưa rõ hãng"}</span>
                  <span className="text-slate-300">·</span>
                  <span>{item.category?.name || "Chưa phân loại"}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-slate-400 truncate max-w-[150px]">{item.slug}</span>
                  {item.hasUnpublishedDraft && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-700 font-medium border border-amber-200 rounded">
                      Có nháp
                    </span>
                  )}
                  {issues.map((iss) => (
                    <span
                      key={iss.code}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-semibold border rounded ${iss.tone}`}
                      title={`Cảnh báo chất lượng dữ liệu: ${iss.label}`}
                    >
                      <AlertTriangle className="size-2.5 shrink-0" />
                      {iss.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "price",
        header: "Giá bán",
        headerText: "Giá bán",
        align: "right",
        sortable: true,
        sortType: "number",
        sortValue: (item) => item.price,
        className: "whitespace-nowrap",
        render: (item) => (
          <div>
            <div className="font-semibold text-blue-700 tabular-nums text-[13px]">
              {item.price > 0 ? money(item.price) : <span className="text-amber-700">Chưa có giá</span>}
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
          </div>
        ),
      },
      {
        key: "stock",
        header: "Tồn kho",
        headerText: "Tồn kho",
        align: "center",
        sortable: true,
        sortType: "number",
        sortValue: (item) => item.stock ?? 0,
        className: "whitespace-nowrap",
        render: (item) => (
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
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        headerText: "Trạng thái",
        align: "center",
        sortable: true,
        sortType: "text",
        sortValue: (item) => (item.isPublished ? "1-PUBLISHED" : item.isDraftOnly ? "2-DRAFT" : "3-ARCHIVED"),
        className: "whitespace-nowrap",
        render: (item) => (
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
        ),
      },
      {
        key: "updatedAt",
        header: "Cập nhật",
        headerText: "Cập nhật",
        align: "right",
        sortable: true,
        sortType: "date",
        sortValue: (item) => item.updatedAt,
        className: "text-slate-400 whitespace-nowrap tabular-nums",
        render: (item) => formatDate(item.updatedAt),
      },
      {
        key: "actions",
        header: "Thao tác",
        headerText: "Thao tác",
        align: "right",
        className: "whitespace-nowrap",
        render: (item) => (
          <div className="inline-flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setQuickEditItem(item)}
              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
            >
              Sửa nhanh
            </button>
            <button
              type="button"
              title="Nhân bản thành sản phẩm nháp mới"
              aria-label={`Nhân bản ${item.name}`}
              disabled={duplicatingId === item.id || loading}
              onClick={() => void handleDuplicate(item)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 font-medium text-xs disabled:opacity-40 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{duplicatingId === item.id ? "Đang sao..." : "Nhân bản"}</span>
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
        ),
      },
    ],
    [deletingId, duplicatingId, handleArchive, handleDuplicate, loading]
  );

  const hasAnyFilter = Boolean(
    q ||
      kind !== "ALL" ||
      categoryId ||
      brand ||
      publicationStatus !== "ALL" ||
      availability !== "ALL" ||
      qualityFilter !== "ALL"
  );

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

      {/* 3. Unified Card: Tabs + Inline Filter Bar + DataTable + Pagination */}
      <AdminCard bodyClassName="p-0 overflow-hidden" className="relative">
        {/* Top Row: Status Tabs + Kind Segmented Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-white text-xs">
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

          <div
            aria-label="Tìm kiếm và bộ lọc sản phẩm"
            className="flex items-center gap-2 text-xs flex-1 max-w-sm justify-end"
          >
            <form role="search" aria-label="Tìm sản phẩm" onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
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

            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => startTransition(() => router.push(pathname))}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer shrink-0"
                title="Xóa tất cả bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Data-Quality Quick Filter Bar */}
        <div className="px-4 py-1.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc nhanh chất lượng dữ liệu">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Chất lượng dữ liệu:</span>
            {([
              { key: "ALL", label: "Tất cả", count: data?.items.length ?? 0 },
              { key: "ISSUES", label: "Cần bổ sung", count: qualityCounts.issues },
              { key: "NO_IMAGE", label: "Thiếu ảnh", count: qualityCounts.noImage },
              { key: "NO_SEO", label: "Thiếu SEO", count: qualityCounts.noSeo },
              { key: "NO_PRICE", label: "Chưa có giá", count: qualityCounts.noPrice },
            ] as const).map((qf) => {
              const active = qualityFilter === qf.key;
              return (
                <button
                  key={qf.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateUrlParams({ quality: qf.key })}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                    active
                      ? "bg-amber-600 text-white border-amber-600"
                      : qf.count > 0 && qf.key !== "ALL"
                      ? "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{qf.label}</span>
                  <span className="tabular-nums opacity-80">({qf.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <details className="admin-filter-details" open={Boolean(categoryId || brand || availability !== "ALL" || sort !== "updatedAt" || order !== "desc")}>
          <summary>Bộ lọc nâng cao{categoryId || brand || availability !== "ALL" ? " · Đang áp dụng" : ""}</summary>
          <div className="admin-filter-fields">
            <label>
              Danh mục
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
            </label>

            <label>
              Thương hiệu
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
            </label>

            <label>
              Nhận đơn
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
            </label>

            <label>
              Sắp xếp máy chủ
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
            </label>
          </div>
        </details>

        {/* Error state or DataTable */}
        {error ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-2.5 rounded-full bg-red-50 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-600 mb-3">{error}</p>
            <AdminButton variant="secondary" size="sm" onClick={() => void fetchCatalog()}>
              Thử lại
            </AdminButton>
          </div>
        ) : (
          <div className={loading || isPending ? "opacity-70 transition-opacity" : ""}>
            <DataTable
              caption="Danh sách sản phẩm"
              columns={columns}
              data={filteredItems}
              rowKey={(item) => item.id}
              loading={loading && !data}
              loadingMessage="Đang tải sản phẩm..."
              emptyTitle="Không có sản phẩm phù hợp"
              emptyDescription="Hiện không có sản phẩm nào khớp với bộ lọc hiện tại."
              emptyAction={
                hasAnyFilter ? (
                  <AdminButton type="button" variant="secondary" size="sm" onClick={() => router.push(pathname)}>
                    Xóa bộ lọc
                  </AdminButton>
                ) : undefined
              }
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              bulkActions={(keys, clearSelection) => (
                <>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const rows = (data?.items || []).filter((it) => keys.includes(it.id));
                      downloadProductsCsv(
                        rows,
                        `san-pham-da-chon-${new Date().toISOString().slice(0, 10)}.csv`
                      );
                      toast.success(`Đã xuất CSV ${rows.length} sản phẩm đã chọn.`);
                    }}
                  >
                    Xuất CSV đã chọn ({keys.length})
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={bulkBusy}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => void handleBulkArchive(keys, clearSelection)}
                  >
                    Ẩn / Lưu trữ hàng loạt
                  </AdminButton>
                </>
              )}
              pagination={
                data
                  ? {
                      page: data.page,
                      pageSize: limit,
                      totalItems: data.total,
                      totalPages: data.totalPages,
                      pageSizeOptions: [20, 50, 100],
                      onPageChange: (nextPage) => updateUrlParams({ page: nextPage }),
                      onPageSizeChange: (nextLimit) => updateUrlParams({ limit: nextLimit, page: 1 }),
                    }
                  : undefined
              }
            />
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
            toast.success(text);
            void fetchCatalog();
          }}
        />
      )}
    </div>
  );
}
