"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Building2, Truck, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onlinePickupLocations } from "@/config/business-profile";

const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "Bắc Ninh", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Thanh Hóa", "Nghệ An", "Quảng Ninh"
];

const SHOWROOMS = onlinePickupLocations.map((loc) => ({
  id: loc.id,
  name: loc.name,
  address: loc.address,
  phone: loc.displayPhone,
}));

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [selectedShowroom, setSelectedShowroom] = useState("hanoi");

  // Single idempotency key per checkout attempt
  const [idempotencyKey] = useState(() => `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    province: "",
    district: "",
    address: "",
    note: "",
  });

  const updateField = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formError) setFormError("");
  };

  const validateForm = (): string | null => {
    if (!form.fullName.trim()) return "Vui lòng nhập họ và tên người nhận.";
    if (!/^[0-9+\s().-]{9,20}$/.test(form.phone.trim())) return "Vui lòng nhập số điện thoại hợp lệ (9 - 15 chữ số).";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Email không hợp lệ.";

    if (deliveryType === "delivery") {
      if (!form.province) return "Vui lòng chọn Tỉnh / Thành phố nhận hàng.";
      if (!form.district.trim()) return "Vui lòng nhập Quận / Huyện.";
      if (!form.address.trim()) return "Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...).";
    }

    return null;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const error = validateForm();
    if (error) {
      setFormError(error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    let shippingAddress = "";
    if (deliveryType === "delivery") {
      shippingAddress = `${form.address.trim()}, ${form.district.trim()}, ${form.province}`;
    } else {
      const showroom = SHOWROOMS.find((s) => s.id === selectedShowroom);
      shippingAddress = `Nhận tại showroom: ${showroom?.name} (${showroom?.address})`;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
          customerName: form.fullName.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim() || null,
          shippingAddress,
          note: form.note.trim() || null,
          shippingMethod: deliveryType === "delivery" ? "standard" : "pickup",
          paymentMethod: "COD",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearCart();
        const tokenQuery = data.confirmationToken ? `&token=${encodeURIComponent(data.confirmationToken)}` : "";
        router.push(`/checkout/success?orderId=${data.orderId}${tokenQuery}`);
      } else {
        const errorMsg = data?.error?.message || data?.message || "Không thể gửi đơn hàng. Vui lòng kiểm tra lại.";
        setFormError(errorMsg);
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setFormError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.");
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (cart.length === 0 && !isSubmitting) {
    return (
      <div className="bg-[#f8fafc] min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 mb-6">Hãy chọn những chiếc laptop ưng ý trước khi gửi yêu cầu đặt hàng.</p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2 w-full justify-center shadow-sm"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1240px]">
          <nav className="flex text-sm text-gray-500 py-3.5 font-medium items-center justify-between">
            <Link href="/cart" className="hover:text-blue-600 transition flex items-center gap-1.5 text-gray-600 font-semibold">
              <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
            </Link>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Đặt hàng an toàn • Xác nhận trước khi giao
            </div>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1240px] mt-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Xác Nhận Yêu Cầu Đặt Hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gửi thông tin mua hàng nhanh chóng, không cần đăng nhập. CitiLap sẽ liên hệ xác nhận trong thời gian sớm nhất.
          </p>
        </div>

        {formError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-sm text-red-800" role="alert">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Chưa thể gửi yêu cầu đặt hàng:</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái: Thông tin nhận hàng (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Phương thức nhận hàng */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 pb-3 mb-4 border-b border-gray-100 flex items-center gap-2 uppercase tracking-wide">
                <Truck className="w-5 h-5 text-blue-600" /> Hình thức nhận hàng
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                    deliveryType === "delivery"
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 text-blue-950 font-bold"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${deliveryType === "delivery" ? "text-blue-600" : "text-gray-400"}`} />
                  <div>
                    <div className="text-sm font-bold">Giao hàng tận nơi</div>
                    <div className="text-xs text-gray-500 font-normal">Giao máy và kiểm tra tại nhà</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                    deliveryType === "pickup"
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 text-blue-950 font-bold"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${deliveryType === "pickup" ? "text-blue-600" : "text-gray-400"}`} />
                  <div>
                    <div className="text-sm font-bold">Nhận tại cửa hàng</div>
                    <div className="text-xs text-gray-500 font-normal">Trực tiếp trải nghiệm tại showroom</div>
                  </div>
                </button>
              </div>

              {/* Lựa chọn Showroom nếu chọn nhận tại cửa hàng */}
              {deliveryType === "pickup" && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Cơ sở nhận máy trực tiếp:
                  </label>
                  {SHOWROOMS.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition text-sm ${
                        selectedShowroom === s.id
                          ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20 font-medium"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="showroom"
                        checked={selectedShowroom === s.id}
                        onChange={() => setSelectedShowroom(s.id)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900">{s.name} (Trụ sở chính)</div>
                        <div className="text-xs text-gray-600">{s.address}</div>
                        <div className="text-xs text-blue-600 font-semibold">Hotline: {s.phone}</div>
                        <div className="text-[11px] text-gray-500">Giờ phục vụ: Thứ 2 – Thứ 7: 09:00 – 20:00 (Chủ nhật tiếp theo lịch hẹn)</div>
                      </div>
                    </label>
                  ))}

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Lưu ý về các cơ sở khác:</p>
                    <p>
                      • <strong>Cơ sở Bắc Ninh (Số 40 Trần Hưng Đạo):</strong> Đón khách đến xem và mua trực tiếp; hiện chưa hỗ trợ nhận đơn online tại quầy. Quý khách tại Bắc Ninh có thể chọn <em>&quot;Giao hàng tận nơi&quot;</em> hoặc liên hệ hotline <strong>0842.044.999</strong> để được hỗ trợ nhanh nhất.
                    </p>
                    <p>
                      • <strong>Cơ sở TP.HCM:</strong> Đang tạm ngưng hoạt động để nâng cấp điểm phục vụ.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Thông tin liên hệ & địa chỉ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 pb-3 mb-4 border-b border-gray-100 flex items-center gap-2 uppercase tracking-wide">
                <MapPin className="w-5 h-5 text-blue-600" /> Thông tin người nhận
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="fullName" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField("phone")}
                    required
                    placeholder="Ví dụ: 0988 123 456"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Email <span className="text-gray-400 font-normal lowercase">(tùy chọn)</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="name@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {deliveryType === "delivery" && (
                  <>
                    <div>
                      <label htmlFor="province" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Tỉnh / Thành phố <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="province"
                        name="province"
                        value={form.province}
                        onChange={updateField("province")}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="district" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Quận / Huyện <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="district"
                        name="district"
                        type="text"
                        value={form.district}
                        onChange={updateField("district")}
                        required
                        placeholder="Ví dụ: Cầu Giấy"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="address" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Địa chỉ chi tiết <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={form.address}
                        onChange={updateField("address")}
                        required
                        placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="note" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Ghi chú đơn hàng <span className="text-gray-400 font-normal lowercase">(tùy chọn)</span>
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={2}
                    value={form.note}
                    onChange={updateField("note")}
                    placeholder="Ví dụ: Cần cài đặt sẵn Windows/Office, giao trong giờ hành chính..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            {/* Hộp cam kết mua hàng minh bạch */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 text-sm text-blue-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-blue-950">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                Chính sách tiếp nhận đơn hàng tại CitiLap
              </div>
              <p className="text-xs md:text-sm text-blue-800 leading-relaxed">
                Khi gửi yêu cầu đặt hàng, quý khách <strong>chưa cần thanh toán bất kỳ khoản tiền nào</strong>. CitiLap
                sẽ gọi điện xác nhận cấu hình máy, tình trạng tồn kho thực tế và thỏa thuận thời gian giao hàng thuận tiện
                nhất trước khi xuất kho.
              </p>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-base font-bold text-gray-900 pb-3 mb-4 border-b border-gray-100 uppercase tracking-wide flex justify-between items-center">
                <span>Đơn hàng của bạn</span>
                <span className="text-xs text-blue-600 lowercase font-normal">({cart.length} mặt hàng)</span>
              </h2>

              {/* Danh sách items */}
              <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="py-3 flex gap-3 text-sm">
                    <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-lg p-1 shrink-0 relative flex items-center justify-center">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill sizes="56px" className="object-contain" />
                      ) : (
                        <div className="text-[10px] text-gray-400">Không có ảnh</div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-gray-900 line-clamp-1 text-xs md:text-sm">{item.name}</div>
                      {item.variantLabel && (
                        <div className="text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {item.variantLabel}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                        <span>Số lượng: <strong className="text-gray-800">{item.quantity}</strong></span>
                        <span className="font-bold text-red-600">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng tiền */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} SP):</span>
                  <span className="font-bold text-gray-900">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>Phí vận chuyển:</span>
                  <span className="text-blue-700 font-semibold">Chuyên viên sẽ xác nhận khi gọi</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900 uppercase">Tạm tính dự kiến:</span>
                  <span className="text-xl font-black text-red-600">{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <p className="text-[11px] text-gray-500 italic text-right mt-1">
                  (Chưa bao gồm phí giao hàng nếu có)
                </p>
              </div>

              {/* Nút gửi đơn hàng */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base uppercase tracking-wider cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi yêu cầu...
                  </>
                ) : (
                  "Gửi Đơn Đặt Hàng"
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3 leading-tight">
                Bằng việc nhấn &quot;Gửi Đơn Đặt Hàng&quot;, bạn đồng ý nhận cuộc gọi tư vấn xác nhận từ CitiLap.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
