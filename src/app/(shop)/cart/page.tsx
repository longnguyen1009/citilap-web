"use client";

import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight, Minus, Plus, Tag, ShieldCheck, Truck, Headphones } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import CartValidationStatus from '@/components/cart/CartValidationStatus';
import Breadcrumb from "@/components/layout/Breadcrumb";
import RecentlyViewedSection from "@/components/product/RecentlyViewedSection";
import { productHref } from '@/lib/product-paths';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, checkoutReady } = useCart();

  if (cart.length === 0) {
    return (
      <div className="bg-[#f1f5f9] min-h-[60vh] py-12 px-4">
        <div className="container mx-auto max-w-[1370px] space-y-10">
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full mx-auto">
            <ShoppingCart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-6">Bạn chưa chọn sản phẩm nào để mua.</p>
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2">
              Tiếp tục mua sắm <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <RecentlyViewedSection />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-24 md:pb-12">
      <Breadcrumb items={[
        { label: "Trang chủ", href: "/" },
        { label: `Giỏ hàng (${cartCount} sản phẩm)`, href: "/cart" },
      ]} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <CartValidationStatus />
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase mb-6">Giỏ hàng</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header row (desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                <div className="col-span-6">Sản phẩm</div>
                <div className="col-span-2 text-center">Đơn giá</div>
                <div className="col-span-2 text-center">Số lượng</div>
                <div className="col-span-2 text-right">Thành tiền</div>
              </div>

              <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Product Info */}
                    <div className="col-span-6 flex gap-4 w-full">
                      <Link href={productHref({ ...item, id: item.productId })} className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center hover:shadow-md transition">
                        <div className="relative w-full h-full"><Image src={item.image} alt={item.name} fill sizes="96px" className="object-contain" /></div>
                      </Link>
                      <div className="flex flex-col flex-grow justify-center min-w-0">
                        <Link href={productHref({ ...item, id: item.productId })} className="font-bold text-gray-800 hover:text-blue-600 line-clamp-2 leading-tight text-sm md:text-base">
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1 mt-1.5 w-fit leading-relaxed">
                            {item.variantLabel}
                          </div>
                        )}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 text-xs font-medium hover:text-red-700 mt-2 w-fit flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" /> Xoá
                        </button>
                      </div>
                    </div>

                    {/* Mobile: Price + Quantity inline */}
                    <div className="flex items-center justify-between w-full md:hidden mt-2 gap-2">
                      <span className="font-bold text-red-600 text-sm">{item.displayPrice}</span>
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-8">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center disabled:opacity-40"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-red-600 text-sm whitespace-nowrap">{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                    </div>

                    {/* Desktop: Price, Quantity, Total */}
                    <div className="col-span-2 text-center hidden md:block">
                      <span className="font-bold text-gray-800 text-sm">{item.displayPrice}</span>
                    </div>

                    <div className="col-span-2 flex justify-center hidden md:flex">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-9">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center disabled:opacity-40"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2 text-right hidden md:block">
                      <span className="font-bold text-red-600 text-lg">{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <Link href="/" className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-sm">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase">Tóm tắt đơn hàng</h3>

              {/* Promotions are priced server-side via campaigns; no client-side coupon until a real voucher system exists. */}
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
                <Tag className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>Giá hiển thị đã bao gồm khuyến mãi đang áp dụng. Tổng tiền cuối cùng được kiểm tra lại ở bước đặt hàng.</span>
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Tạm tính ({cartCount} sản phẩm):</span>
                  <span className="font-bold text-gray-800">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-blue-700">Xác nhận khi tư vấn</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 uppercase text-sm">Tạm tính dự kiến:</span>
                  <span className="text-2xl md:text-3xl font-black text-red-600 tracking-tight">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <p className="text-[11px] text-gray-500 text-right italic">(Chưa bao gồm phí vận chuyển nếu có, nhân viên sẽ xác nhận)</p>
              </div>

              <Link
                href="/checkout"
                aria-disabled={!checkoutReady}
                tabIndex={checkoutReady ? undefined : -1}
                onClick={e=>{if(!checkoutReady)e.preventDefault();}}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30 mb-3"
              >
                <span className="font-black text-lg uppercase">TIẾN HÀNH ĐẶT HÀNG</span>
              </Link>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Bảo hành tới 12T</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Giao nhanh</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Headphones className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Hỗ trợ kỹ thuật</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RecentlyViewedSection excludeIds={cart.map((item) => item.productId)} />
      </div>
    </div>
  );
}
