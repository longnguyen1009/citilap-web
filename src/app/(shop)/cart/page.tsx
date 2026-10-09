"use client";

import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight, Minus, Plus, Tag, ShieldCheck, Truck, Headphones } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    // Mock coupon validation
    if (code === "CITILAP100") {
      setCouponDiscount(100000);
      setCouponApplied(true);
    } else if (code === "WELCOME50") {
      setCouponDiscount(50000);
      setCouponApplied(true);
    } else {
      alert("Mã giảm giá không hợp lệ!");
      setCouponApplied(false);
      setCouponDiscount(0);
    }
  };

  const discount = couponApplied ? couponDiscount : 0;

  if (cart.length === 0) {
    return (
      <div className="bg-[#f1f5f9] min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <ShoppingCart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 mb-6">Bạn chưa chọn sản phẩm nào để mua.</p>
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2">
            Tiếp tục mua sắm <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <Breadcrumb items={[
        { label: "Trang chủ", href: "/" },
        { label: `Giỏ hàng (${cartCount} sản phẩm)`, href: "/cart" },
      ]} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
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
                      <Link href={`/product/${item.productId}`} className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center hover:shadow-md transition">
                        <div className="relative w-full h-full"><Image src={item.image} alt={item.name} fill sizes="96px" className="object-contain" /></div>
                      </Link>
                      <div className="flex flex-col flex-grow justify-center min-w-0">
                        <Link href={`/product/${item.productId}`} className="font-bold text-gray-800 hover:text-blue-600 line-clamp-2 leading-tight text-sm md:text-base">
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <span className="text-xs text-gray-500 mt-1 line-clamp-1">{item.variantLabel}</span>
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

              {/* Coupon */}
              <div className="mb-4">
                <label htmlFor="coupon-input" className="block text-sm font-bold text-gray-700 mb-1">Mã giảm giá</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="coupon-input"
                      type="text"
                      placeholder="Nhập mã coupon..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim()}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-bold text-gray-700 rounded-lg transition shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                {couponApplied && (
                  <p className="text-xs text-green-600 mt-1.5 font-medium">
                    Đã áp dụng mã &quot;{couponCode}&quot; — giảm {couponDiscount.toLocaleString("vi-VN")}đ
                  </p>
                )}
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Tạm tính ({cartCount} sản phẩm):</span>
                  <span className="font-bold text-gray-800">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span>Giảm giá:</span>
                    <span className="font-bold text-green-600">- {discount.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}
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
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30 mb-3"
              >
                <span className="font-black text-lg uppercase">TIẾN HÀNH ĐẶT HÀNG</span>
              </Link>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Bảo hành 12T</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Giao nhanh</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Headphones className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Hỗ trợ 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
