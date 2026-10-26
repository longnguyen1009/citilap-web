"use client";
import { productHref } from '@/lib/product-paths';

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Scale, AlertTriangle, RefreshCw } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import { MAX_COMPARE_PRODUCTS, type CompareApiResponse } from "@/contracts/catalog/compare";

export default function CompareModal() {
  const { isCompareOpen, closeCompare, items, removeFromCompare, clearCompare } = useCompare();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareApiResponse | null>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
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

  if (!isCompareOpen) return null;


  const filteredSpecs = (data?.specs || []).filter((s) => {
    if (!onlyDifferences) return true;
    return s.isDifferent;
  });

  return (
    <dialog
      ref={dialog}
      onCancel={closeCompare}
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

                    <div className="mt-auto pt-2">
                      <Link href={productHref(p)} onClick={closeCompare} className="block text-center py-2 underline">Chọn cấu hình</Link>
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
