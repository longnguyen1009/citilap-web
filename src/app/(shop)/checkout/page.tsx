"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, MapPin, Truck, CreditCard, Tag, Check, PackageCheck, Headphones, Clock, Banknote } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "Bình Dương", "Đồng Nai", "Khánh Hòa", "Thanh Hóa", "Nghệ An",
];

const SHIPPING_METHODS = [
  { id: "standard", label: "Giao hàng tiêu chuẩn", time: "3-5 ngày", price: 0, icon: Truck },
  { id: "express", label: "Giao hàng nhanh (Hỏa tốc)", time: "1-2 ngày", price: 30000, icon: PackageCheck },
];

const PAYMENT_METHODS = [
  { id: "cod", label: "Thanh toán khi nhận hàng (COD)", desc: "Trả tiền mặt khi giao hàng tận nơi", icon: Banknote },
  { id: "bank", label: "Chuyển khoản ngân hàng", desc: "Giảm thêm 100.000đ khi chuyển khoản trước", icon: CreditCard },
];

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [step, setStep] = useState<"info" | "confirm">("info");

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

  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === shippingMethod)!;
  const shippingCost = selectedShipping.price;
  const couponDiscount = couponApplied ? (couponCode.toUpperCase() === "CITILAP100" ? 100000 : couponCode.toUpperCase() === "WELCOME50" ? 50000 : 0) : 0;
  const bankDiscount = paymentMethod === "bank" ? 100000 : 0;
  const totalDiscount = couponDiscount + bankDiscount;
  const total = cartTotal - totalDiscount + shippingCost;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("confirm");
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingAddress: "Địa chỉ giao hàng",
          paymentMethod: paymentMethod === "bank" ? "Chuyển khoản" : "COD",
          shippingMethod: shippingMethod,
          couponCode: couponApplied ? couponCode : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        clearCart();
        router.push(`/checkout/success?orderId=${data.orderId}`);
      } else {
        const error = await response.json();
        alert(error.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
        setIsSubmitting(false);
      }
    } catch {
      alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* Breadcrumb */}
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
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${step === "info" ? "bg-blue-600 text-white" : "bg-green-500 text-white"}`}>
            <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">{step === "info" ? "1" : "✓"}</span>
            Thông tin
          </div>
          <div className="w-12 h-0.5 bg-gray-300" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${step === "confirm" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
            <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">2</span>
            Xác nhận
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase mb-6">
          {step === "info" ? "Thanh toán đơn hàng" : "Xác nhận đơn hàng"}
        </h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-8 space-y-6">
            {step === "info" ? (
              <>
                {/* Customer Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                    <MapPin className="w-5 h-5 text-blue-600" /> Thông tin nhận hàng
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên *</label>
                      <input required type="text" placeholder="Nhập họ và tên người nhận" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại *</label>
                      <input required type="tel" placeholder="Ví dụ: 0988xxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                      <input type="email" placeholder="Để nhận email cập nhật đơn hàng" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Tỉnh / Thành phố *</label>
                      <select required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white">
                        <option value="">Chọn tỉnh/thành</option>
                        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Quận / Huyện *</label>
                      <input required type="text" placeholder="Quận / Huyện" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ cụ thể *</label>
                      <input required type="text" placeholder="Số nhà, tên đường, phường/xã..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                      <textarea rows={3} placeholder="Ví dụ: Giao hàng giờ hành chính, gọi trước khi giao..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    </div>
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                    <Truck className="w-5 h-5 text-blue-600" /> Phương thức vận chuyển
                  </h2>
                  <div className="space-y-3">
                    {SHIPPING_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-4 border rounded-lg p-4 cursor-pointer transition ${
                          shippingMethod === method.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingMethod === method.id}
                          onChange={() => setShippingMethod(method.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <method.icon className="w-5 h-5 text-gray-600 shrink-0" />
                        <div className="flex-grow">
                          <div className="font-bold text-gray-800 text-sm">{method.label}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {method.time}
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${method.price === 0 ? "text-green-600" : "text-gray-800"}`}>
                          {method.price === 0 ? "Miễn phí" : `${method.price.toLocaleString("vi-VN")}đ`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                    <CreditCard className="w-5 h-5 text-blue-600" /> Phương thức thanh toán
                  </h2>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-4 border rounded-lg p-4 cursor-pointer transition ${
                          paymentMethod === method.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <method.icon className="w-5 h-5 text-gray-600 shrink-0" />
                        <div className="flex-grow">
                          <div className="font-bold text-gray-800 text-sm">{method.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{method.desc}</div>
                        </div>
                        {method.id === "bank" && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Giảm 100k</span>}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Coupon */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2 uppercase">
                    <Tag className="w-5 h-5 text-blue-600" /> Mã giảm giá
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã coupon..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => { if (couponCode.trim()) setCouponApplied(true); }}
                      className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 rounded-lg transition shrink-0"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {couponApplied && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium">
                      <Check className="w-4 h-4" /> Đã áp dụng mã &quot;{couponCode}&quot; — giảm 100.000đ
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Step 2: Confirm Order */
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-6 flex items-center gap-2 uppercase">
                  <Check className="w-5 h-5 text-green-600" /> Xác nhận thông tin đơn hàng
                </h2>

                <div className="space-y-6">
                  {/* Order Items */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-700 mb-3">Sản phẩm ({cart.length}):</h3>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-14 h-14 flex-shrink-0 bg-white rounded border border-gray-100 p-1">
                            <img src={item.image} alt={item.name} className="object-contain w-full h-full" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</div>
                            {item.variantLabel && <div className="text-xs text-gray-500 line-clamp-1">{item.variantLabel}</div>}
                            <div className="flex justify-between mt-1 text-sm">
                              <span className="text-gray-500">x{item.quantity}</span>
                              <span className="font-bold text-red-600">{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Tạm tính:</span><span className="font-bold">{cartTotal.toLocaleString("vi-VN")}đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Phí vận chuyển:</span><span className="font-bold">{shippingCost === 0 ? "Miễn phí" : `${shippingCost.toLocaleString("vi-VN")}đ`}</span></div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Giảm giá:</span><span className="font-bold text-green-600">- {totalDiscount.toLocaleString("vi-VN")}đ</span></div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-gray-100">
                      <span className="font-bold text-gray-900 uppercase">Tổng thanh toán:</span>
                      <span className="text-3xl font-black text-red-600 tracking-tight">{total.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT)</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("info")}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 font-bold text-sm transition"
                    >
                      Quay lại chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      disabled={isSubmitting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30 disabled:bg-gray-400 disabled:shadow-none"
                    >
                      <span className="font-black text-lg uppercase">{isSubmitting ? "ĐANG XỬ LÝ..." : "ĐẶT HÀNG NGAY"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase">Đơn hàng của bạn</h3>

              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded border border-gray-100 p-1">
                      <img src={item.image} alt={item.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="flex flex-col justify-center flex-grow min-w-0">
                      <span className="font-bold text-gray-800 text-sm line-clamp-2">{item.name}</span>
                      <div className="flex justify-between mt-1 text-sm">
                        <span className="text-gray-500">x{item.quantity}</span>
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
                  <span className={`font-bold ${shippingCost === 0 ? "text-green-600" : "text-gray-800"}`}>
                    {shippingCost === 0 ? "Miễn phí" : `${shippingCost.toLocaleString("vi-VN")}đ`}
                  </span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Giảm giá:</span>
                    <span className="font-bold text-green-600">- {totalDiscount.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 uppercase">Tổng thanh toán:</span>
                  <span className="text-3xl font-black text-red-600 tracking-tight">{total.toLocaleString("vi-VN")}đ</span>
                </div>
                <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT)</p>
              </div>

              {step === "info" && (
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30"
                >
                  <span className="font-black text-lg uppercase">TIẾP TỤC</span>
                </button>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-600">Bảo hành</span>
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

              <p className="text-center text-xs text-gray-500 mt-4">
                Bằng cách đặt hàng, bạn đồng ý với <Link href="/chinh-sach/dieu-khoan" className="underline hover:text-blue-600">Điều khoản sử dụng</Link> của CitiLap.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
