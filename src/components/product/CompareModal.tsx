"use client";
import { productHref } from '@/lib/product-paths';

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Scale, AlertTriangle, RefreshCw, Search, Plus, ShoppingCart, ExternalLink } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import { MAX_COMPARE_PRODUCTS, type CompareApiResponse } from "@/contracts/catalog/compare";
import type { SearchSuggestionItem } from "@/server/services/search.service";

export default function CompareModal() {
  const { isCompareOpen, closeCompare, items, addToCompare, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareApiResponse | null>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  // Keyboard Escape handler and focus return
  useEffect(() => {
    if (!isCompareOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCompare();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      node?.close();
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
    };
  }, [isCompareOpen, closeCompare]);

  useEffect(() => {
    if (!isCompareOpen || items.length === 0) return;

    let isMounted = true;
    const fetchCompareData = async () => {
      setLoading(true);
      try {
        const ids = items.map((i) => i.id).join(",");
        const res = await fetch(`/api/compare?ids=${encodeURIComponent(ids)}`);
        const json: CompareApiResponse = await res.json();
        if (isMounted) {
          setData(json);
          // If server reports products are hidden/deleted, prune missing items from local list
          if (json.success && Array.isArray(json.products) && json.products.length > 0) {
            const validIds = new Set(json.products.map((p) => p.id));
            const missing = items.filter((it) => !validIds.has(it.id));
            if (missing.length > 0) {
              missing.forEach((it) => removeFromCompare(it.id));
            }
          }
        }
      } catch {
        if (isMounted) {
          setData({
            success: false,
            compatible: false,
            groupType: "",
            error: "Lỗi kết nối khi tải dữ liệu so sánh.",
            products: [],
            specs: [],
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchCompareData();
    const timer=setInterval(fetchCompareData,30000);
    window.addEventListener('citilap:price-refresh',fetchCompareData);
    return () => {
      clearInterval(timer);
      window.removeEventListener('citilap:price-refresh',fetchCompareData);
      isMounted = false;
    };
  }, [isCompareOpen, items, removeFromCompare]);

  useEffect(() => {
    if (!isCompareOpen || quickSearch.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(quickSearch.trim())}&limit=5`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json.data?.products)) {
            setSuggestions(
              json.data.products.filter(
                (prod: SearchSuggestionItem) => !items.some((it) => it.id === prod.id)
              )
            );
          }
        }
      } catch {
        // ignore abort
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isCompareOpen, quickSearch, items]);

  if (!isCompareOpen) return null;


  const filteredSpecs = (data?.specs || []).filter((s) => {
    if (!onlyDifferences) return true;
    return s.isDifferent;
  });

  return (
    <dialog
      ref={dialog}
      {...({ closedby: "any" } as Record<string, string>)}
      onCancel={closeCompare}
      onClose={closeCompare}
      onClick={(event) => {
        if (!("closedBy" in HTMLDialogElement.prototype)) {
          if (event.target !== dialog.current) return;
          const rect = dialog.current.getBoundingClientRect();
          const isDialogContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
          if (isDialogContent && event.target !== event.currentTarget) return;
          if (event.target === dialog.current) {
            closeCompare();
          }
        }
      }}
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none open:flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="compare-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                So sánh chi tiết sản phẩm
              </h2>
              <p className="text-xs text-slate-500">
                Đối chiếu thông số cấu hình, mức giá và tình trạng thực tế từ CitiLap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {data?.success && data.specs.length > 0 && (
              <label className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyDifferences}
                  onChange={(e) => setOnlyDifferences(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Chỉ hiện điểm khác biệt</span>
              </label>
            )}

            <button
              type="button"
              onClick={closeCompare}
              aria-label="Đóng bảng so sánh"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Add Bar when slots remain */}
        {items.length < MAX_COMPARE_PRODUCTS && (
          <search className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={quickSearch}
                  onChange={(e) => {
                    setQuickSearch(e.target.value);
                    setCompareNotice(null);
                  }}
                  placeholder={`Tìm thêm sản phẩm để so sánh (còn trống ${MAX_COMPARE_PRODUCTS - items.length} ô)...`}
                  aria-label="Tìm thêm sản phẩm để đưa vào bảng so sánh"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap">
                <span className="font-semibold text-slate-500">Gợi ý nhanh:</span>
                {["ThinkPad", "Legion", "MacBook", "Zenbook"].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setQuickSearch(kw)}
                    className="px-2 py-0.5 rounded-full bg-white border border-blue-200 hover:border-blue-500 text-blue-700 font-medium transition cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {compareNotice && (
              <p className="text-xs text-emerald-700 font-semibold">{compareNotice}</p>
            )}

            {quickSearch.trim().length >= 2 && (
              <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs max-h-44 overflow-y-auto divide-y divide-slate-100">
                {searching ? (
                  <div className="py-3 text-center text-xs text-slate-500">Đang tìm sản phẩm...</div>
                ) : suggestions.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-500">
                    Không tìm thấy sản phẩm phù hợp chưa có trong danh sách.
                  </div>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="py-1.5 px-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 rounded-lg">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{sug.name}</div>
                        <div className="text-[11px] text-rose-600 font-semibold">
                          {sug.price ? `${sug.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const res = addToCompare({
                            id: sug.id,
                            name: sug.name,
                            slug: sug.slug,
                            price: sug.price || 0,
                            image: sug.image || null,
                          });
                          if (res.success) {
                            setQuickSearch("");
                            setSuggestions([]);
                            setCompareNotice(`Đã thêm "${sug.name}" vào bảng so sánh.`);
                          } else if (res.message) {
                            setCompareNotice(res.message);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shrink-0 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>So sánh</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </search>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold">Đang cập nhật dữ liệu so sánh mới nhất...</p>
            </div>
          ) : !data?.success ? (
            <div className="py-12 max-w-md mx-auto text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Không thể thực hiện so sánh</h3>
              <p className="text-sm text-slate-600">
                {data?.error || "Có lỗi xảy ra khi tải dữ liệu."}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={clearCompare}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Xóa danh sách so sánh
                </button>
                <button
                  type="button"
                  onClick={closeCompare}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {data.groupType === 'LAPTOP' && <section aria-label="Gợi ý chọn giữa các máy" className="grid gap-3 rounded-xl bg-blue-50 p-4 md:grid-cols-3">{data.products.map(product => <div key={product.id} className="min-w-0 text-sm"><h3 className="font-bold text-slate-900">{product.name}</h3><p className="mt-2"><strong>Phù hợp: </strong>{data.specs.find(row => row.key === 'Phù hợp')?.values[product.id] || 'Chưa có đánh giá theo nhu cầu'}</p><p className="mt-2 text-amber-900"><strong>Cân nhắc: </strong>{data.specs.find(row => row.key === 'Hạn chế')?.values[product.id] || 'Kiểm tra pin, màn hình và khả năng nâng cấp trước khi chọn'}</p></div>)}</section>}
              {/* Product Cards Top Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200">
                {data.products.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-4 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeFromCompare(p.id)}
                      title={`Bỏ ${p.name}`}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="aspect-[4/3] w-full bg-white rounded-lg p-2 mb-3 flex items-center justify-center border border-slate-100 overflow-hidden">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={160}
                          height={120}
                          className="object-contain max-h-28"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chưa có ảnh</span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[36px] mb-1">
                      <Link
                        href={productHref(p)}
                        onClick={closeCompare}
                        className="hover:text-blue-600 transition"
                      >
                        {p.name}
                      </Link>
                    </h3>

                    <div className="text-base font-black text-rose-600 mb-2">
                      {p.availability === 'CONTACT' ? 'Liên hệ' : p.price.toLocaleString('vi-VN')+'đ'}
                    </div>

                    <div className="mt-auto pt-2 flex flex-col sm:flex-row gap-2">
                      {p.availability !== 'CONTACT' && p.price > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            addToCart({
                              id: p.id,
                              productId: p.id,
                              slug: p.slug,
                              name: p.name,
                              price: p.price,
                              displayPrice: `${p.price.toLocaleString("vi-VN")}đ`,
                              image: p.image || "/images/placeholder-laptop.svg",
                              quantity: 1,
                            });
                            setCompareNotice(`Đã thêm "${p.name}" vào giỏ hàng!`);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Thêm vào giỏ</span>
                        </button>
                      )}
                      <Link
                        href={productHref(p)}
                        onClick={closeCompare}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Specs Comparison Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    {filteredSpecs.map((specRow) => (
                      <tr
                        key={specRow.key}
                        className={`border-b border-slate-100 transition ${
                          specRow.isDifferent ? "bg-blue-50/30" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-600 w-1/4 align-top whitespace-nowrap bg-slate-50/50">
                          <div className="flex items-center gap-1.5">
                            <span>{specRow.label}</span>
                            {specRow.isDifferent && (
                              <span
                                title="Thông số có sự khác biệt giữa các sản phẩm"
                                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                              />
                            )}
                          </div>
                        </td>
                        {data.products.map((p) => {
                          const val = specRow.values[p.id] || "Chưa cập nhật";
                          const isMissing = val === "Chưa cập nhật";
                          return (
                            <td
                              key={p.id}
                              className={`py-3 px-4 w-1/4 align-top text-slate-900 ${
                                isMissing ? "text-slate-400 italic" : "font-medium"
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Tối đa {MAX_COMPARE_PRODUCTS} sản phẩm cùng loại</span>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="hover:text-rose-600 transition cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
            <button
              type="button"
              onClick={closeCompare}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
