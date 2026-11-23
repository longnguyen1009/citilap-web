"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from 'next/link';
import VietQrPaymentCard from '@/components/checkout/VietQrPaymentCard';
import { X, Check, ShieldCheck, QrCode, Banknote, Ticket, AlertCircle } from "lucide-react";
import { useTurnstile } from '@/components/Turnstile';
import type { CheckoutQuote, CheckoutSelection } from '@/contracts/checkout';
import { trackStorefront } from '@/lib/storefront-metrics';

export interface QuickCheckoutProductInfo {
  id: string;
  name: string;
  image: string;
  variantLabel?: string;
  colorLabel?: string;
  warrantyLabel?: string;
  accessoriesLabels?: string[];
  totalPrice: number;
  items: CheckoutSelection['items'];
}

interface ProductQuickCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  productInfo: QuickCheckoutProductInfo;
}

export default function ProductQuickCheckoutModal({
  isOpen,
  onClose,
  productInfo,
}: ProductQuickCheckoutModalProps) {
  const [deliveryMode, setDeliveryMode] = useState<"home" | "store">("home");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedShowroom, setSelectedShowroom] = useState("hanoi");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'' | 'COD' | 'BANK_TRANSFER'>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmationHref, setConfirmationHref] = useState('');
  const [quoteState, setQuoteState] = useState<{ key: string; data: CheckoutQuote | null; error: string }>({ key: '', data: null, error: '' });
  const [retry, setRetry] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [pending, setPending] = useState<{ key: string; body: string; quote?: CheckoutQuote } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const turnstile = useTurnstile('order');
  const storageKey = 'citilap-quick-order-v1:' + productInfo.id;
  const requestBody = JSON.stringify({ items: productInfo.items, shippingMethod: deliveryMode === 'store' ? 'pickup' : 'standard', showroomId: deliveryMode === 'store' ? selectedShowroom : null, ...(paymentMethod ? { paymentMethod } : {}), ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}) });
  const quoteKey = requestBody + ':' + retry;
  const quote = pending?.quote || (quoteState.key === quoteKey && !quoteState.error ? quoteState.data : null);
  const locked = submitting || !!pending;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (isOpen) element?.showModal();
    const overflow = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [isOpen]);
  /* eslint-disable react-hooks/set-state-in-effect -- restore tab-local pending request after hydration; never read browser storage during SSR. */
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (typeof saved?.key === 'string' && typeof saved?.body === 'string') {
        const body = JSON.parse(saved.body);
        if (body.items?.[0]?.productId === productInfo.id) {
          setPending(saved); setFullName(body.customerName || ''); setPhone(body.customerPhone || '');
          setAddress(body.shippingAddress || ''); setNote(body.note || ''); setPaymentMethod(body.paymentMethod);
          setDeliveryMode(body.shippingMethod === 'pickup' ? 'store' : 'home'); setSelectedShowroom(body.showroomId || 'hanoi');
        }
      }
      const savedCoupon = sessionStorage.getItem('citilap-saved-coupon-v1')?.trim().toUpperCase();
      if (savedCoupon) {
        setCouponInput(savedCoupon);
        setAppliedCouponCode(savedCoupon);
      }
    } catch { /* Invalid browser draft is ignored; server validates every request. */ }
    setLoaded(true);
  }, [storageKey, productInfo.id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen || !loaded || pending || isSubmitted) return;
    const controller = new AbortController();
    fetch('/api/checkout/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody, signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          if (data.error?.code === 'PAYMENT_METHOD_DISABLED' && !controller.signal.aborted) setPaymentMethod('');
          if (!controller.signal.aborted && typeof data.error?.code === 'string' && data.error.code.startsWith('COUPON_')) {
            setCouponError(data.error.message || 'Mã giảm giá không hợp lệ.');
            setAppliedCouponCode('');
            return null;
          }
          throw Error(data.error?.message || 'Không thể tính tổng tiền.');
        }
        return data.data as CheckoutQuote;
      })
      .then(data => {
        if (!controller.signal.aborted && data) {
          if (data.coupon) setCouponError('');
          setQuoteState({ key: quoteKey, data, error: '' });
        }
      })
      .catch(error => { if (!controller.signal.aborted) setQuoteState({ key: quoteKey, data: null, error: error.message }); });
    return () => controller.abort();
  }, [isOpen, loaded, pending, isSubmitted, requestBody, quoteKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || !turnstile.ready || !loaded) return;
    if (!fullName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên quý khách.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setErrorMsg("Vui lòng nhập số điện thoại hợp lệ để CitiLap liên hệ xác nhận.");
      return;
    }
    if (deliveryMode === "home" && !address.trim()) {
      setErrorMsg("Vui lòng nhập địa chỉ giao hàng chi tiết.");
      return;
    }

    if (!pending && (!quote || !paymentMethod)) return;
    const attempt = pending || {
      key: crypto.randomUUID(), quote: quote!, body: JSON.stringify({
        items: quote!.lines.map(line => ({ productId: line.productId, variantId: line.variantId, warrantyName: line.warrantyName || null, quantity: line.quantity, expectedPrice: line.price })),
        customerName: fullName.trim(), customerPhone: phone.trim(), shippingAddress: deliveryMode === 'home' ? address.trim() : null, note: note.trim(),
        shippingMethod: quote!.shippingMethod, showroomId: quote!.snapshot.showroom?.id || null, paymentMethod,
        ...(quote!.coupon?.code ? { couponCode: quote!.coupon.code } : {}),
        checkoutAcknowledgment: { shippingFee: quote!.shippingFee, totalAmount: quote!.totalAmount, termsVersion: quote!.termsVersion },
      })
    };
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
    catch { setErrorMsg('Cần bật lưu trữ trình duyệt để gửi và thử lại đơn an toàn.'); return; }
    setPending(attempt); sending.current = true; setSubmitting(true); setErrorMsg('');
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key, 'cf-turnstile-response': turnstile.token }, body: attempt.body });
      const data = await response.json();
      if (response.ok && data.success) {
        sessionStorage.removeItem(storageKey); setPending(null); setOrderCode(data.orderNumber || data.orderId);
        setConfirmationHref('/checkout/success?orderId=' + encodeURIComponent(data.orderId) + '&token=' + encodeURIComponent(data.confirmationToken));
        setIsSubmitted(true); trackStorefront('order_requested'); return;
      }
      if (response.status === 403) {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg(data.error?.message || 'Vui lòng hoàn tất xác thực bảo mật rồi thử lại.'); return;
      }
      if (response.status >= 500 || response.status === 429) {
        setErrorMsg(data.error?.message || 'Chưa xác định được kết quả. Bấm thử lại cùng đơn.'); return;
      }
      sessionStorage.removeItem(storageKey); setPending(null); setRetry(value => value + 1);
      setErrorMsg(data.error?.message || 'Không thể gửi đơn. Kiểm tra thông tin rồi thử lại.');
    } catch { setErrorMsg('Chưa xác định được kết quả. Bấm thử lại cùng đơn để tránh tạo đơn trùng.'); }
    finally { sending.current = false; setSubmitting(false); turnstile.reset(); }
  };

  const handleResetAndClose = () => {
    if (submitting) return;
    setIsSubmitted(false);
    setErrorMsg("");
    onClose();
  };

  // Compile full spec string for the recap
  const specParts = [
    productInfo.variantLabel,
    productInfo.colorLabel,
    productInfo.warrantyLabel,
    productInfo.accessoriesLabels && productInfo.accessoriesLabels.length > 0
      ? `+${productInfo.accessoriesLabels.length} Phụ kiện deal sốc`
      : null,
  ].filter(Boolean);

  const specSummary = specParts.join(" | ");

  return (
    <dialog ref={dialog} aria-label="Đặt hàng nhanh" onCancel={event => { event.preventDefault(); handleResetAndClose(); }} className="m-auto w-[calc(100%-24px)] max-w-lg max-h-[92vh] rounded-3xl p-0 backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80 rounded-t-3xl sticky top-0 z-10 backdrop-blur-xs">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
              <span className="text-amber-500">⚡</span> Đặt Hàng Nhanh (Chỉ mất 1 phút)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhân viên CitiLap sẽ liên hệ xác nhận thông tin đơn hàng
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={submitting}
            className="h-11 w-11 shrink-0 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body or Success Screen */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-70">
              {/* Product Recap & Clear Price Breakdown Box */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 overflow-hidden">
                    <Image
                      src={productInfo.image || "/images/placeholder-laptop.svg"}
                      alt={productInfo.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {productInfo.name}
                    </h4>
                    {specSummary && !pending && (
                      <p className="text-[11px] text-blue-700 font-semibold truncate mt-0.5">
                        {specSummary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3.5 space-y-2 text-xs">
                  {quote && quote.lines.length > 0 && (
                    <div className="space-y-1 pb-2 border-b border-dashed border-slate-200">
                      {quote.lines.map((line, index) => (
                        <div key={index} className="flex items-start justify-between gap-2 text-slate-700">
                          <span className="line-clamp-1">{line.productName} <strong className="text-slate-900">×{line.quantity}</strong></span>
                          <span className="font-semibold text-slate-900 shrink-0 tabular-nums">{line.lineTotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tiền hàng (tạm tính):</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {quote ? quote.subtotal.toLocaleString('vi-VN') + 'đ' : 'Đang tính…'}
                    </span>
                  </div>

                  {quote && quote.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold">
                      <span>Giảm giá{quote.coupon?.code ? ` (${quote.coupon.code})` : ''}:</span>
                      <span className="tabular-nums">-{quote.discountAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Phí giao hàng:</span>
                    <span className={`font-bold tabular-nums ${quote?.shippingFee === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {quote ? (quote.shippingFee === 0 ? 'Miễn phí' : quote.shippingFee.toLocaleString('vi-VN') + 'đ') : 'Đang tính…'}
                    </span>
                  </div>

                  <div className="mt-2 pt-2.5 px-3 py-2.5 -mx-1 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-slate-900 uppercase tracking-wide">Tổng thanh toán dự kiến</div>
                      <div className="text-[10.5px] text-slate-500">Đã bao gồm tiền hàng &amp; phí giao hàng</div>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-rose-600 tabular-nums shrink-0">
                      {quote ? quote.totalAmount.toLocaleString("vi-VN") + 'đ' : 'Đang tính…'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Delivery mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">
                  Hình thức nhận máy:
                </label>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("home")}
                    aria-pressed={deliveryMode === 'home'}
                    className={`flex min-h-11 items-center gap-2 p-2.5 rounded-xl border-2 transition cursor-pointer ${deliveryMode === "home"
                        ? "border-blue-600 bg-blue-50/50 text-blue-950 font-bold"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <span className={`h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${deliveryMode === "home" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                      }`}>
                      {deliveryMode === "home" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>Giao hàng tận nơi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode("store")}
                    aria-pressed={deliveryMode === 'store'}
                    className={`flex min-h-11 items-center gap-2 p-2.5 rounded-xl border-2 transition cursor-pointer ${deliveryMode === "store"
                        ? "border-blue-600 bg-blue-50/50 text-blue-950 font-bold"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <span className={`h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${deliveryMode === "store" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                      }`}>
                      {deliveryMode === "store" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>Nhận tại Showroom</span>
                  </button>
                </div>
              </div>

              {/* Customer info fields */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="quick-customer-name" className="font-semibold text-slate-700 block mb-1">
                      Họ và tên quý khách <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="quick-customer-name"
                      autoComplete="name"
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base md:text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="quick-customer-phone" className="font-semibold text-slate-700 block mb-1">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="quick-customer-phone"
                      autoComplete="tel"
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base md:text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Home Delivery Address */}
                {deliveryMode === "home" ? (
                  <div>
                    <label htmlFor="quick-address" className="font-semibold text-slate-700 block mb-1">
                      Địa chỉ giao hàng chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      id="quick-address"
                      autoComplete="street-address"
                      maxLength={500}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã, tỉnh/thành phố"
                      className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base md:text-xs"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="quick-showroom" className="font-semibold text-slate-700 block mb-1">
                      Chọn Showroom nhận máy:
                    </label>
                    <select
                      id="quick-showroom"
                      value={selectedShowroom}
                      onChange={(e) => setSelectedShowroom(e.target.value)}
                      className="w-full min-h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base md:text-xs"
                    >
                      {(quoteState.data?.showrooms || []).map(showroom => <option key={showroom.id} value={showroom.id}>{showroom.name}: {showroom.address}</option>)}
                    </select>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label htmlFor="quick-note" className="font-semibold text-slate-700 block mb-1">
                    Ghi chú thêm (yêu cầu cài đặt Win, Office, xuất VAT...):
                  </label>
                  <textarea
                    id="quick-note"
                    maxLength={1000}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú về thời gian giao hàng hoặc phần mềm cần cài..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base md:text-xs"
                  />
                </div>
              </div>

              {/* Mã giảm giá */}
              <div className="space-y-1.5 pt-1">
                <label htmlFor="quick-coupon-input" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-rose-600" />
                  Mã giảm giá / Voucher:
                </label>
                <div className="flex gap-2">
                  <input
                    id="quick-coupon-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="Nhập mã (VD: CITILAP999, CITILAP599...)"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-bold uppercase placeholder:normal-case placeholder:font-normal"
                  />
                  {quote?.coupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCouponCode('');
                        setCouponInput('');
                        setCouponError('');
                        try { sessionStorage.removeItem('citilap-saved-coupon-v1'); } catch { }
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shrink-0 cursor-pointer"
                    >
                      Bỏ mã
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!couponInput.trim()}
                      onClick={() => {
                        const code = couponInput.trim().toUpperCase();
                        if (!code) return;
                        setCouponError('');
                        setAppliedCouponCode(code);
                        try { sessionStorage.setItem('citilap-saved-coupon-v1', code); } catch { }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-600 disabled:bg-slate-300 text-white text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
                {couponError && (
                  <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {couponError}
                  </p>
                )}
                {quote?.coupon && (
                  <p className="text-xs text-emerald-700 font-semibold">
                    Đã áp mã <strong>{quote.coupon.code}</strong> (-{quote.coupon.discountAmount.toLocaleString('vi-VN')}đ)
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-900 block">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2 text-[11px]">
                  {quoteState.data?.allowedPaymentMethods.includes('COD') && <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    aria-pressed={paymentMethod === 'COD'}
                    className={`min-h-11 p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col items-center text-center gap-1 ${paymentMethod === 'COD'
                        ? "border-blue-600 bg-blue-50/50 font-bold text-blue-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold">COD Tiền mặt</span>
                    <span className="text-[10px] text-slate-500">Khi nhận máy</span>
                  </button>}

                  {quoteState.data?.allowedPaymentMethods.includes('BANK_TRANSFER') && <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    aria-pressed={paymentMethod === 'BANK_TRANSFER'}
                    className={`min-h-11 p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col items-center text-center gap-1 ${paymentMethod === 'BANK_TRANSFER'
                        ? "border-blue-600 bg-blue-50/50 font-bold text-blue-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span className="font-bold">Chuyển khoản</span>
                    <span className="text-[10px] text-slate-500">Theo hướng dẫn cửa hàng</span>
                  </button>}
                </div>
              </div>
              {paymentMethod === 'BANK_TRANSFER' && quote?.snapshot.bankAccountInfo && (
                <VietQrPaymentCard
                  bankAccountInfo={quote.snapshot.bankAccountInfo}
                  vietQr={quote.snapshot.vietQr}
                  amount={quote.totalAmount}
                  transferNote={phone.trim() ? `CITILAP ${phone.replace(/\s+/g, '')}` : undefined}
                  compact
                />
              )}
            </fieldset>
            {quoteState.error && !pending && <div role="alert" className="text-xs text-rose-700">{quoteState.error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Tính lại</button></div>}
            {pending && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(storageKey);
                    setPending(null);
                    setErrorMsg('');
                  }}
                  className="text-xs font-bold text-blue-700 underline cursor-pointer"
                >
                  Chỉnh sửa thông tin đơn hàng
                </button>
              </div>
            )}
            {turnstile.widget}

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !loaded || !turnstile.ready || (!pending && (!quote || !paymentMethod))}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-md shadow-rose-600/25 transition active:scale-[0.99] cursor-pointer"
              >
                {submitting ? 'ĐANG GỬI…' : pending ? 'THỬ LẠI CÙNG ĐƠN' : 'XÁC NHẬN ĐẶT HÀNG NGAY'}
              </button>
              <p className="text-[10.5px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Thông tin dùng để xử lý đơn và liên hệ xác nhận.
              </p>
            </div>
          </form>
        ) : (
          /* Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-lg font-black text-slate-900">ĐẶT HÀNG THÀNH CÔNG!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Cảm ơn quý khách <strong className="text-slate-900">{fullName}</strong>. Mã đơn hàng của bạn là:
              <span className="block text-sm font-mono font-black text-blue-600 mt-1 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-200">
                #{orderCode}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Đơn đã được ghi nhận. CitiLap sẽ liên hệ số <strong className="text-slate-900">{phone}</strong> để xác nhận. Đơn chưa được đánh dấu đã thanh toán.
            </p>
            <Link href={confirmationHref} className="block text-sm font-bold text-blue-700 underline">Xem chi tiết đơn hàng</Link>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="min-h-11 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Đóng và tiếp tục xem
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
