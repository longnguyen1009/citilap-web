"use client";

import Link from "next/link";
import { ChevronRight, ArrowLeft, ShieldCheck, MapPin, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If cart is empty, redirect back to home (handled in useEffect in a real app, but for simplicity here we just show a message)
  if (cart.length === 0 && !isSubmitting) {
    return (
      <div className="bg-[#f1f5f9] min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không có sản phẩm nào</h2>
          <p className="text-gray-500 mb-6">Vui lòng quay lại giỏ hàng để tiếp tục.</p>
          <Link href="/cart" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2">
            Quay lại Giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      clearCart();
      router.push("/checkout/success?orderId=CTL" + Math.floor(Math.random() * 1000000));
    }, 1500);
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/cart" className="hover:text-blue-600 transition flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase mb-6">Thanh toán đơn hàng</h1>
        
        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Customer Info */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                <MapPin className="w-5 h-5 text-blue-600" /> Thông tin nhận hàng
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên *</label>
                  <input required type="text" placeholder="Nhập họ và tên người nhận" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  <input required type="tel" placeholder="Ví dụ: 0988xxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                  <input type="email" placeholder="Để nhận email cập nhật đơn hàng" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ nhận hàng *</label>
                  <input required type="text" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                  <textarea rows={3} placeholder="Ví dụ: Giao hàng giờ hành chính..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> Phương thức thanh toán
              </h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition border-blue-500 bg-blue-50">
                  <input type="radio" name="payment" defaultChecked className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">Thanh toán khi nhận hàng (COD)</span>
                    <span className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi giao hàng tận nơi</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
                  <input type="radio" name="payment" className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">Chuyển khoản ngân hàng</span>
                    <span className="text-sm text-gray-500">Giảm thêm 100.000đ khi chuyển khoản trước</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase">Đơn hàng của bạn</h3>
              
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded border border-gray-100 p-1">
                      <img src={item.image} alt={item.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="flex flex-col justify-center flex-grow">
                      <span className="font-bold text-gray-800 text-sm line-clamp-2">{item.name}</span>
                      <div className="flex justify-between mt-1 text-sm">
                        <span className="text-gray-500">SL: {item.quantity}</span>
                        <span className="font-bold text-red-600">{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-bold text-gray-800">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold text-gray-800">Miễn phí</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 uppercase">Tổng thanh toán:</span>
                  <span className="text-3xl font-black text-red-600 tracking-tight">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT)</p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30 disabled:bg-gray-400 disabled:shadow-none"
              >
                <span className="font-black text-lg uppercase">{isSubmitting ? "ĐANG XỬ LÝ..." : "ĐẶT HÀNG NGAY"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
