"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Building2, Truck, ShieldCheck, CheckCircle2, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartValidationStatus from '@/components/cart/CartValidationStatus';
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CheckoutQuote } from "@/contracts/checkout";
import { useTurnstile } from '@/components/Turnstile';
import { trackStorefront } from '@/lib/storefront-metrics';
import { VN_PROVINCES, isVnProvince } from '@/lib/vn-provinces';
import VietQrPaymentCard from '@/components/checkout/VietQrPaymentCard';

interface PriceChangeDetails {
  quote: CheckoutQuote;
  changedItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    oldPrice: number;
    newPrice: number;
    quantity: number;
    oldLineTotal: number;
    newLineTotal: number;
  }>;
  oldSubtotal: number;
  newSubtotal: number;
  oldGrandTotal: number;
  newGrandTotal: number;
}

export default function CheckoutPage() {
  const turnstile = useTurnstile('order');
  const { cart, clearCart, updateItemPrice, checkoutReady } = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedShowroom, setSelectedShowroom] = useState('hanoi');
  const [paymentMethod, setPaymentMethod] = useState<'' | 'COD' | 'BANK_TRANSFER'>('');
  const [priceChangeDetails, setPriceChangeDetails] = useState<PriceChangeDetails | null>(null);
  const [form, setForm] = useState({fullName:'',phone:'',email:'',province:'',ward:'',address:'',note:''});
  const [loaded, setLoaded] = useState(false);
  const [quoteState, setQuoteState] = useState<{key:string;data:CheckoutQuote | null;error:string}>({key:'',data:null,error:''});
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [pending, setPending] = useState<{key:string;body:string} | null>(null);
  const sending = useRef(false);
  const quoteRequest = JSON.stringify({items:cart.map(i=>({productId:i.productId,variantId:i.variantId || null,warrantyName:i.warrantyName || null,quantity:i.quantity})),shippingMethod:deliveryType === 'pickup' ? 'pickup' : 'standard',showroomId:deliveryType === 'pickup' ? selectedShowroom : null,...(paymentMethod?{paymentMethod}:{})});
  const quote = quoteState.data;
  const quoteKey = quoteRequest + ':' + quoteRetry;
  const quoteReady = loaded && quoteState.key === quoteKey && !!quote && !quoteState.error && !!paymentMethod && checkoutReady;
  const isQuoteCalculating = !loaded || (quoteState.key !== quoteKey && !quoteState.error) || (!quote && !quoteState.error);
  const SHOWROOMS = quote?.showrooms || [];
  const locked = isSubmitting || !!pending;
  // Restore tab-local state after hydration; reading storage during SSR would mismatch HTML.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(()=>{
    try {
      const saved = JSON.parse(sessionStorage.getItem('citilap-checkout-v1') || 'null');
      if (saved?.form && Object.values(saved.form).every(v=>typeof v==='string') && ['delivery','pickup'].includes(saved.deliveryType) && ['', 'COD','BANK_TRANSFER'].includes(saved.paymentMethod) && typeof saved.selectedShowroom==='string') {
        const f = saved.form as Record<string,string>;
        // Drafts from before the 2025 address reform may carry a merged province or a district; keep only valid fields.
        setForm(prev=>({...prev,fullName:f.fullName ?? prev.fullName,phone:f.phone ?? prev.phone,email:f.email ?? prev.email,province:isVnProvince(f.province ?? '') ? f.province : '',ward:f.ward ?? '',address:f.address ?? prev.address,note:f.note ?? prev.note}));
        setDeliveryType(saved.deliveryType);setSelectedShowroom(saved.selectedShowroom);setPaymentMethod(saved.paymentMethod);
      }
      const attempt = JSON.parse(sessionStorage.getItem('citilap-checkout-attempt-v1') || 'null');
      if (typeof attempt?.key === 'string' && typeof attempt?.body === 'string') setPending(attempt);
    } catch { /* Invalid local draft is ignored; never used as server authority. */ }
    setLoaded(true);
  },[]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(()=>{if(loaded)try{sessionStorage.setItem('citilap-checkout-v1',JSON.stringify({form,deliveryType,selectedShowroom,paymentMethod}));}catch{}},[loaded,form,deliveryType,selectedShowroom,paymentMethod]);
  useEffect(()=>{
    if (!loaded || !cart.length) return;
    const controller = new AbortController();
    fetch('/api/checkout/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:quoteRequest,signal:controller.signal})
      .then(async r=>{const data=await r.json();if(!r.ok || !data.success){if(!controller.signal.aborted && data.error?.code === 'PAYMENT_METHOD_DISABLED')setPaymentMethod('');throw Error(data.error?.message || 'Chưa thể tính tổng tiền.');}return data.data as CheckoutQuote;})
      .then(data=>{if(!controller.signal.aborted)setQuoteState({key:quoteKey,data,error:''});})
      .catch(error=>{if(!controller.signal.aborted)setQuoteState(prev=>({...prev,key:quoteKey,error:error.message || 'Chưa thể tính tổng tiền.'}));});
    return ()=>controller.abort();
  },[loaded,cart.length,quoteRequest,quoteKey]);
  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {setForm(prev=>({...prev,[field]:e.target.value}));setFormError('');};
  const forgetAttempt = () => {setPending(null);sessionStorage.removeItem('citilap-checkout-attempt-v1');};
  const sendAttempt = async (attempt: {key:string;body:string}) => {
    if(sending.current)return;
    if(!turnstile.ready){setFormError('Vui lòng hoàn tất xác thực bảo mật.');return;}
    sending.current=true;setIsSubmitting(true);setFormError('');
    try {
      const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':attempt.key,'cf-turnstile-response':turnstile.token},body:attempt.body});
      const data=await response.json();
      if(response.ok && data.success){
        trackStorefront('order_requested');
        forgetAttempt();sessionStorage.removeItem('citilap-checkout-v1');clearCart();
        router.push('/checkout/success?orderId='+encodeURIComponent(data.orderId)+'&token='+encodeURIComponent(data.confirmationToken));
        return;
      }
      if(response.status >= 500 || response.status === 429)throw Error(data.error?.message || 'Chưa xác định được kết quả gửi đơn.');
      // A rejected challenge cannot determine whether an earlier lost response created the order.
      if(response.status===403){setFormError(data.error?.message || 'Vui lòng xác thực lại rồi thử lại yêu cầu.');return;}
      forgetAttempt();
      if(response.status===409 && ['PRICE_CHANGED','CHECKOUT_CHANGED'].includes(data.error?.code) && data.error?.details?.quote){setPriceChangeDetails(data.error.details);}
      else {setFormError(data.error?.message || 'Không thể gửi đơn.');if(data.error?.code==='PAYMENT_METHOD_DISABLED')setPaymentMethod('');setQuoteRetry(n=>n+1);}
    }catch{setFormError('Chưa xác định được kết quả gửi đơn. Bấm thử lại để lấy cùng đơn, không tạo yêu cầu mới.');}
    finally{sending.current=false;setIsSubmitting(false);turnstile.reset();}
  };
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if(pending){await sendAttempt(pending);return;}
    if(!quoteReady || !quote || priceChangeDetails || sending.current)return;
    const body=JSON.stringify({items:quote.lines.map(i=>({productId:i.productId,variantId:i.variantId,warrantyName:i.warrantyName || null,quantity:i.quantity,expectedPrice:i.price})),customerName:form.fullName,customerPhone:form.phone,customerEmail:form.email,shippingAddress:deliveryType==='delivery' ? [form.address.trim(),form.ward.trim(),form.province].join(', ') : null,note:form.note,shippingMethod:quote.shippingMethod,showroomId:quote.snapshot.showroom?.id || null,paymentMethod,checkoutAcknowledgment:{shippingFee:quote.shippingFee,totalAmount:quote.totalAmount,termsVersion:quote.termsVersion}});
    const attempt={key:crypto.randomUUID(),body};
    try{sessionStorage.setItem('citilap-checkout-attempt-v1',JSON.stringify(attempt));}catch{setFormError('Không thể lưu yêu cầu để thử lại an toàn. Vui lòng bật lưu trữ trình duyệt.');return;}
    setPending(attempt);await sendAttempt(attempt);
  };
  const handleConfirmPriceChange = () => {
    if(!priceChangeDetails)return;
    const next=priceChangeDetails.quote;
    setQuoteState({key:quoteKey,data:next,error:''});
    for(const line of next.lines)updateItemPrice(line.productId,line.variantId,line.price,line.warrantyName || null);
    setPriceChangeDetails(null);setFormError('Đã xác nhận thông tin mới. Kiểm tra và bấm gửi đơn.');
  };
  const handleReviewCart = () => {setPriceChangeDetails(null);router.push('/cart');};

  const isCartEmpty = loaded && cart.length === 0 && !isSubmitting && !pending;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16 flex flex-col">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="container mx-auto px-4 max-w-[1370px]">
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

      <div className="container mx-auto px-4 max-w-[1370px] mt-6 flex-1 min-h-[760px]">
        {isCartEmpty ? (
          <div className="flex flex-col items-center justify-center py-12">
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
        ) : (
          <>
            <CartValidationStatus />
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

        {priceChangeDetails && !isSubmitting && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Giá sản phẩm đã được cập nhật</p>
                <p className="text-xs text-amber-800">
                  Tổng tiền mới dự kiến: <strong className="text-red-600">{priceChangeDetails.newGrandTotal.toLocaleString("vi-VN")}₫</strong> (Giá cũ: {priceChangeDetails.oldGrandTotal.toLocaleString("vi-VN")}₫).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleConfirmPriceChange}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3.5 rounded-lg transition shadow-sm w-full sm:w-auto text-center"
              >
                Xác nhận giá mới
              </button>
            </div>
          </div>
        )}

        {quoteState.error && (
          <div role="status" className="mb-4 rounded border border-amber-300 p-3">
            {quoteState.error}
            <button type="button" className="ml-3 underline" onClick={()=>setQuoteRetry(n=>n+1)}>Kiểm tra lại</button>
          </div>
        )}
        {(!quote || quoteState.key !== quoteKey) && !quoteState.error && (
          <div role="status" className="sr-only">Đang kiểm tra giá và phí giao hàng…</div>
        )}
        {pending && <div role="status" className="mb-4 rounded border border-amber-300 p-3">Yêu cầu đang chờ kết quả. Thông tin đã được giữ để tránh tạo đơn trùng.<button type="button" disabled={isSubmitting} className="ml-3 underline" onClick={()=>sendAttempt(pending)}>Thử lại yêu cầu</button></div>}
        {turnstile.widget}
        <form onSubmit={handleSubmitOrder}><fieldset disabled={locked} className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-w-0">
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
                  disabled={!SHOWROOMS.length}
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
                        <div className="font-bold text-gray-900">{s.name} </div>
                        <div className="text-xs text-gray-600">{s.address}</div>
                        <div className="text-xs text-blue-600 font-semibold">Hotline: {s.phone}</div>

                      </div>
                    </label>
                  ))}

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
                        {VN_PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ward" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Phường / Xã <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="ward"
                        name="ward"
                        type="text"
                        value={form.ward}
                        onChange={updateField("ward")}
                        required
                        autoComplete="address-level3"
                        placeholder="Ví dụ: Phường Bạch Mai"
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
                        autoComplete="street-address"
                        placeholder="Số nhà, ngõ/ngách, tên đường, thôn/tổ dân phố..."
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
                          {quote?.lines.find(l=>l.productId===item.productId && l.variantId===(item.variantId || null))?.lineTotal.toLocaleString("vi-VN") || "—"}đ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <fieldset className="mt-4 space-y-3"><legend className="font-bold">Phương thức thanh toán</legend>
                {(quote?.allowedPaymentMethods || []).map(method=><label key={method} className="flex items-center gap-2"><input type="radio" name="paymentMethod" checked={paymentMethod===method} onChange={()=>setPaymentMethod(method)}/>{method==='COD'?'Thanh toán khi nhận máy (COD)':'Chuyển khoản ngân hàng'}</label>)}
                {paymentMethod==='BANK_TRANSFER' && (
                  <VietQrPaymentCard
                    bankAccountInfo={quote?.snapshot.bankAccountInfo}
                    vietQr={quote?.snapshot.vietQr}
                    amount={quote?.totalAmount}
                    transferNote={form.phone.trim() ? `CITILAP ${form.phone.replace(/\s+/g, '')}` : undefined}
                    compact
                  />
                )}
              </fieldset>
              {/* Tổng tiền */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} SP):</span>
                  <span className="font-bold text-gray-900">{quote ? quote.subtotal.toLocaleString("vi-VN") + "đ" : "—"}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>Phí vận chuyển:</span>
                  <span className="text-blue-700 font-semibold">{quote ? (quote.shippingFee === 0 ? "Miễn phí" : quote.shippingFee.toLocaleString("vi-VN") + "đ") : "—"}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900 uppercase">Tổng thanh toán:</span>
                  <span className="text-xl font-black text-red-600">{quote ? quote.totalAmount.toLocaleString("vi-VN") + "đ" : "—"}</span>
                </div>
                <p className="text-[11px] text-gray-500 italic text-right mt-1">
                  Đã bao gồm phí giao hàng.
                </p>
              </div>

              {/* Nút gửi đơn hàng */}
              <button
                type="submit"
                disabled={isSubmitting || !quoteReady || !!priceChangeDetails || !turnstile.ready}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base uppercase tracking-wider cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi yêu cầu...
                  </>
                ) : isQuoteCalculating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tính tổng tiền...
                  </>
                ) : !paymentMethod ? (
                  "Vui lòng chọn phương thức thanh toán"
                ) : (
                  "Gửi Đơn Đặt Hàng"
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3 leading-tight">
                Bằng việc nhấn &quot;Gửi Đơn Đặt Hàng&quot;, bạn đồng ý nhận cuộc gọi tư vấn xác nhận từ CitiLap.
              </p>
            </div>
          </div>
        </fieldset></form>

        {/* Price Change Review Modal */}
        {priceChangeDetails && (
          <dialog ref={node=>{if(node && !node.open)node.showModal();}} onCancel={e=>e.preventDefault()} aria-labelledby="checkout-change-title" className="fixed inset-0 m-0 w-full max-w-none h-full max-h-none z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="checkout-change-title" className="text-lg font-bold">Thông tin đặt hàng đã thay đổi</h3>
                  <p className="text-xs text-white/90">
                    Vui lòng kiểm tra giá, phí giao hàng và thông tin thanh toán
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Giá, phí giao hàng hoặc thông tin nhận/thanh toán đã thay đổi. Kiểm tra thông tin mới trước khi xác nhận:
                </p>

                <div className="space-y-2.5">
                  {priceChangeDetails.quote.snapshot.bankAccountInfo && <p className="whitespace-pre-wrap mb-3">{priceChangeDetails.quote.snapshot.bankAccountInfo}</p>}
                  {priceChangeDetails.quote.snapshot.showroom && <p className="mb-3">{priceChangeDetails.quote.snapshot.showroom.name}: {priceChangeDetails.quote.snapshot.showroom.address}</p>}
                  <p className="mb-3">Phí giao hàng mới: {priceChangeDetails.quote.shippingFee.toLocaleString('vi-VN')}đ</p>
                  {priceChangeDetails.changedItems.map((item, idx) => {
                    const diff = item.newPrice - item.oldPrice;
                    const isIncrease = diff > 0;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex justify-between items-center gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.productName}</p>
                          <p className="text-[11px] text-gray-500">Số lượng: {item.quantity}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400 line-through">
                            {item.oldPrice.toLocaleString("vi-VN")}₫
                          </p>
                          <p className="text-sm font-bold text-red-600">
                            {item.newPrice.toLocaleString("vi-VN")}₫
                          </p>
                          <p className={`text-[10px] font-semibold ${isIncrease ? "text-amber-600" : "text-emerald-600"}`}>
                            {isIncrease ? `+${diff.toLocaleString("vi-VN")}₫` : `${diff.toLocaleString("vi-VN")}₫`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng tiền cũ:</span>
                    <span className="line-through">{priceChangeDetails.oldGrandTotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold text-sm">
                    <span>Tổng tiền mới:</span>
                    <span className="text-red-600 font-black text-base">
                      {priceChangeDetails.newGrandTotal.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirmPriceChange}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Xác nhận thông tin mới
                </button>
                <button
                  type="button"
                  onClick={handleReviewCart}
                  disabled={isSubmitting}
                  className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-300 text-sm transition cursor-pointer"
                >
                  Xem lại giỏ hàng
                </button>
              </div>
            </div>
          </dialog>
        )}
        </>
        )}
      </div>
    </div>
  );
}
