"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Scale,
  X,
  Plus,
  Search,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Share2,
  Check,
  Sparkles,
} from "lucide-react";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import { productHref } from "@/lib/product-paths";
import { trackStorefront } from "@/lib/storefront-metrics";
import { MAX_COMPARE_PRODUCTS, type CompareApiResponse } from "@/contracts/catalog/compare";
import type { SearchSuggestionItem } from "@/server/services/search.service";

interface ComparePageClientProps {
  initialIds: string[];
}

export default function ComparePageClient({ initialIds }: ComparePageClientProps) {
  const { items } = useCompare();
  const { addToCart } = useCart();

  const [result, setResult] = useState<{ key: string; data: CompareApiResponse | null } | null>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A shared table owns its selection; session items only seed a table without a URL.
  const [selectedIds, setSelectedIds] = useState<string[] | null>(
    initialIds.length ? [...new Set(initialIds)] : null,
  );
  const activeIds = selectedIds ?? items.map((i) => i.id);
  const idsKey = activeIds.join(",");
  const data = result?.key === idsKey ? result.data : null;
  const loading = Boolean(idsKey) && result?.key !== idsKey;

  useEffect(() => {
    if (!idsKey) return;

    const controller = new AbortController();

    const fetchCompare = async () => {
      try {
        const res = await fetch(`/api/compare?ids=${idsKey}`, {
          signal: controller.signal,
        });
        const json: CompareApiResponse = await res.json();
        if (!controller.signal.aborted) setResult({ key: idsKey, data: json });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[ComparePage] Error fetching compare data:", err);
          if (!controller.signal.aborted) setResult({ key: idsKey, data: null });
        }
      }
    };

    void fetchCompare();
    trackStorefront("compare");

    return () => controller.abort();
  }, [idsKey]);

  // Quick search autocomplete
  useEffect(() => {
    if (quickSearch.trim().length < 2) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(quickSearch)}&limit=5`, {
          signal: controller.signal,
        });
        const resJson = await res.json();
        if (resJson.success && Array.isArray(resJson.data?.products)) {
          const existingIds = new Set(idsKey.split(','));
          if (!controller.signal.aborted) setSuggestions(resJson.data.products.filter((p: SearchSuggestionItem) => !existingIds.has(p.id)));
        }
      } catch {
        // Ignore abort
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quickSearch, idsKey]);

  const handleCopyLink = () => {
    if (activeIds.length === 0) return;
    const url = `${window.location.origin}/so-sanh?ids=${activeIds.join(",")}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const filteredSpecs = (data?.specs || []).filter((s) => {
    if (!onlyDifferences) return true;
    return s.isDifferent;
  });

  const breadcrumbs = [
    { label: "Trang chủ", href: "/" },
    { label: "So sánh sản phẩm", href: "/so-sanh" },
  ];

  return (
    <div className="bg-surface min-h-screen pb-20">
      <Breadcrumb items={breadcrumbs} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-4 space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                So Sánh Cấu Hình Chi Tiết
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Đối chiếu thông số kỹ thuật, màn hình, hiệu năng và giá bán thực tế giữa các mẫu máy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {activeIds.length > 0 && (
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                  copied
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-blue-600" />}
                <span>{copied ? "Đã sao chép liên kết!" : "Chia sẻ bảng so sánh"}</span>
              </button>
            )}

            {data?.success && data.specs.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyDifferences}
                  onChange={(e) => setOnlyDifferences(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Chỉ hiện điểm khác biệt</span>
              </label>
            )}

            {activeIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                }}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Bar */}
        {activeIds.length < MAX_COMPARE_PRODUCTS && (
          <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Thêm máy vào bảng so sánh (còn trống {MAX_COMPARE_PRODUCTS - activeIds.length} vị trí):
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                <span>Gợi ý:</span>
                {["Lenovo Legion", "ThinkPad", "Dell XPS", "MacBook"].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setQuickSearch(kw)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setCompareNotice(null);
                }}
                placeholder="Nhập tên laptop hoặc mã máy để thêm vào so sánh..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {compareNotice && <p className="text-xs text-emerald-700 font-semibold">{compareNotice}</p>}

            {quickSearch.trim().length >= 2 && (
              <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm max-h-48 overflow-y-auto divide-y divide-slate-100">
                {searching ? (
                  <div className="py-3 text-center text-xs text-slate-500">Đang tìm máy...</div>
                ) : suggestions.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="py-2 px-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 rounded-lg">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{sug.name}</div>
                        <div className="text-[11px] text-rose-600 font-semibold">
                          {sug.price ? `${sug.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeIds.includes(sug.id) && activeIds.length < MAX_COMPARE_PRODUCTS) {
                            setSelectedIds([...activeIds, sug.id]);
                            setQuickSearch("");
                            setSuggestions([]);
                            setCompareNotice(`Đã thêm "${sug.name}" vào bảng so sánh.`);
                          } else {
                            setCompareNotice(`Chỉ chọn tối đa ${MAX_COMPARE_PRODUCTS} sản phẩm khác nhau.`);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shrink-0 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Đang tải và đồng bộ dữ liệu so sánh...</p>
          </div>
        ) : activeIds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8 stroke-1.5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Chưa có sản phẩm nào trong bảng so sánh</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Bạn có thể bấm vào biểu tượng cán cân (So sánh) trên bất kỳ thẻ sản phẩm nào, hoặc sử dụng công cụ Cố vấn thông minh để tìm máy tối ưu nhất.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/chon-laptop"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Cố vấn chọn laptop theo nhu cầu</span>
              </Link>
              <Link
                href="/laptop-gaming"
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs transition"
              >
                Khám phá Laptop Gaming
              </Link>
            </div>
          </div>
        ) : !data?.success ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs max-w-md mx-auto space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Không thể thực hiện so sánh</h3>
            <p className="text-xs text-slate-600">{data?.error || "Dữ liệu so sánh không tương thích."}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Đặt lại bảng so sánh
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Curator Insights Banner for Laptops */}
            {data.groupType === "LAPTOP" && (
              <section
                aria-label="Đánh giá chuyên sâu giữa các dòng máy"
                className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Đánh giá nhanh từ chuyên viên CitiLap:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.products.map((product) => (
                    <div key={product.id} className="bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border border-blue-100 space-y-1.5">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{product.name}</h4>
                      <p className="text-xs text-slate-700">
                        <strong className="text-emerald-700">Phù hợp: </strong>
                        {data.specs.find((row) => row.key === "Phù hợp")?.values[product.id] || "Văn phòng & học tập đa nhiệm"}
                      </p>
                      <p className="text-xs text-amber-900">
                        <strong className="text-amber-800">Cân nhắc: </strong>
                        {data.specs.find((row) => row.key === "Hạn chế")?.values[product.id] || "Kiểm tra pin và nhu cầu đồ họa trước khi mua"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Product Overview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between relative group"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIds(activeIds.filter(id => id !== p.id))}
                    title={`Bỏ ${p.name}`}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="aspect-[4/3] w-full bg-slate-50 rounded-xl p-3 mb-3 flex items-center justify-center border border-slate-100 overflow-hidden">
                      {p.image ? (
                        <Image
                          src={p.image.startsWith("/api/library/") && !p.image.includes("?") ? `${p.image}?size=thumb&v=2` : p.image}
                          alt={p.name}
                          width={200}
                          height={150}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chưa có ảnh</span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-10">
                      <Link href={productHref({ slug: p.slug, template: p.template })} className="hover:text-blue-600 transition">
                        {p.name}
                      </Link>
                    </h3>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                        {p.price > 0 ? `${p.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                      </span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {p.originalPrice.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={p.price <= 0 || !['AVAILABLE', 'PREORDER'].includes(p.availability || '')}
                      onClick={() => {
                        addToCart({
                          id: p.variantId ? `${p.id}:${p.variantId}` : p.id,
                          productId: p.id,
                          variantId: p.variantId || undefined,
                          template: p.template,
                          name: p.name,
                          slug: p.slug,
                          price: p.price,
                          displayPrice: `${p.price.toLocaleString("vi-VN")}đ`,
                          image: p.image || "/brand/marketing-banner.webp",
                          quantity: 1,
                        });
                        trackStorefront("add_to_cart");
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Thêm giỏ hàng</span>
                    </button>
                    <Link
                      href={productHref({ slug: p.slug, template: p.template })}
                      className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                    >
                      Chi tiết →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Comparison Specs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Chi tiết thông số kỹ thuật
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {filteredSpecs.length} tiêu chí
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="p-3.5 font-bold text-slate-700 w-1/4">Thông số</th>
                      {data.products.map((p) => (
                        <th key={p.id} className="p-3.5 font-bold text-slate-900 truncate">
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSpecs.map((spec) => (
                      <tr
                        key={spec.key}
                        className={`transition-colors ${
                          spec.isDifferent ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{spec.label || spec.key}</span>
                          {spec.isDifferent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Khác biệt
                            </span>
                          )}
                        </td>
                        {data.products.map((p) => (
                          <td key={p.id} className="p-3.5 text-slate-700 font-normal">
                            {spec.values[p.id] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
