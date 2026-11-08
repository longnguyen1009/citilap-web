"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Scale, Sparkles, Search, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/product/ProductCard';
import Breadcrumb from '@/components/layout/Breadcrumb';
import type { HomepageProduct } from '@/server/services/catalog.service';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, storageError, loaded } = useWishlist();
  const [result, setResult] = useState<{ ids: string; products: HomepageProduct[]; unavailableIds: string[] } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const ids = wishlist.map((item) => item.productId).join(',');

  useEffect(() => {
    if (!loaded || !ids) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/wishlist?ids=' + encodeURIComponent(ids), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Không thể tải giá hiện tại. Thử lại để xem danh sách.');
        const data = await response.json();
        if (!controller.signal.aborted) {
          setResult({ ...data, ids });
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('citilap:price-refresh', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('citilap:price-refresh', refresh);
      clearInterval(timer);
    };
  }, [ids, loaded, retry]);

  return (
    <div className="bg-slate-50 min-h-[70vh] pb-16">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Sản phẩm yêu thích', href: '/wishlist' },
        ]}
      />

      <div className="container mx-auto max-w-[1370px] px-4 pt-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Danh sách yêu thích ({wishlist.length})
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Lưu trên thiết bị này, tối đa 100 sản phẩm. Mở sản phẩm để chọn cấu hình và kiểm tra khả dụng trước khi đặt.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/so-sanh"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 bg-white text-xs font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>So sánh cấu hình</span>
            </Link>
            <Link
              href="/chon-laptop"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tư vấn chọn máy</span>
            </Link>
          </div>
        </div>

        {storageError && (
          <p role="status" className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            Trình duyệt không cho lưu trên thiết bị. Danh sách chỉ được giữ trong phiên này.
          </p>
        )}

        {!loaded ? (
          <div role="status" className="bg-white rounded-2xl border border-slate-200/80 py-14 text-center text-sm text-slate-500">
            Đang tải danh sách…
          </div>
        ) : !ids ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Chưa có sản phẩm yêu thích</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Hãy bấm biểu tượng trái tim trên các mẫu laptop hoặc phụ kiện bạn quan tâm để lưu lại và theo dõi giá bán mới nhất.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs sm:text-sm text-white transition shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Khám phá sản phẩm</span>
              </Link>
              <Link
                href="/chon-laptop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white font-bold text-xs sm:text-sm text-slate-700 hover:text-blue-600 transition"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Gợi ý theo ngân sách</span>
              </Link>
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setRetry((v) => v + 1);
              }}
              className="inline-flex items-center gap-1.5 underline font-bold text-red-800 hover:text-red-900 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : result?.ids !== ids ? (
          <div role="status" className="bg-white rounded-2xl border border-slate-200/80 py-14 text-center text-sm text-slate-500">
            Đang tải giá hiện tại…
          </div>
        ) : (
          <>
            {result.unavailableIds.map((id) => (
              <div
                key={id}
                role="status"
                className="p-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center justify-between gap-3"
              >
                <span>Một sản phẩm đã lưu không còn công khai.</span>
                <button
                  type="button"
                  onClick={() => removeFromWishlist(id)}
                  className="inline-flex items-center gap-1 underline text-red-600 font-medium cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bỏ khỏi danh sách</span>
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {result.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
