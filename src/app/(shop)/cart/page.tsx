"use client";

import Link from "next/link";
import { Trash2, ChevronRight, ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

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
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">Giỏ hàng của bạn</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase mb-6">Giỏ hàng</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                      <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-2 flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="object-contain w-full h-full" />
                      </div>
                      <div className="flex flex-col flex-grow justify-center">
                        <Link href={`/product/${item.productId}`} className="font-bold text-gray-800 hover:text-blue-600 line-clamp-2 leading-tight">
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <span className="text-sm text-gray-500 mt-1">{item.variantLabel}</span>
                        )}
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 text-xs font-medium hover:underline mt-2 w-fit flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Xoá
                        </button>
                      </div>
                    </div>

                    {/* Mobile Only: Price & Quantity */}
                    <div className="flex items-center justify-between w-full md:hidden mt-2">
                      <span className="font-bold text-red-600">{item.displayPrice}</span>
                      <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition">-</button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition">+</button>
                      </div>
                    </div>

                    {/* Desktop Only: Price, Quantity, Total */}
                    <div className="col-span-2 text-center hidden md:block">
                      <span className="font-bold text-gray-800">{item.displayPrice}</span>
                    </div>
                    
                    <div className="col-span-2 flex justify-center hidden md:flex">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-9">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center">-</button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center">+</button>
                      </div>
                    </div>

                    <div className="col-span-2 text-right hidden md:block">
                      <span className="font-bold text-red-600 text-lg">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <Link href="/" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase">Tóm tắt đơn hàng</h3>
              
              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Tạm tính ({cart.reduce((t, i) => t + i.quantity, 0)} sản phẩm):</span>
                  <span className="font-bold text-gray-800">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Khuyến mãi:</span>
                  <span className="font-bold text-green-600">- 0đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold text-gray-800">Miễn phí</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 uppercase">Tổng cộng:</span>
                  <span className="text-3xl font-black text-red-600 tracking-tight">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT)</p>
              </div>

              <Link 
                href="/checkout"
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30 mb-3"
              >
                <span className="font-black text-lg uppercase">TIẾN HÀNH ĐẶT HÀNG</span>
              </Link>
              
              <div className="text-center text-xs text-gray-500 mt-4">
                Bằng cách đặt hàng, bạn đồng ý với Điều khoản sử dụng của CitiLap.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
