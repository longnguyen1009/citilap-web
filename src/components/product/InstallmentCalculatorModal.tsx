"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, X, ShieldCheck } from "lucide-react";
import ContactForm from '@/components/contact/ContactForm';

interface InstallmentCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  price: number;
}

export default function InstallmentCalculatorModal({
  isOpen,
  onClose,
  productName,
  price,
}: InstallmentCalculatorModalProps) {
  const [prepayPercent, setPrepayPercent] = useState<number>(0);
  const [months, setMonths] = useState<number>(12);
  const [consultation, setConsultation] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    if (isOpen) element?.showModal();
    const overflow = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {element?.close();document.body.style.overflow = overflow;focus?.focus();};
  }, [isOpen]);

  if (!isOpen) return null;

  const prepayAmount = Math.round((price * prepayPercent) / 100);
  const loanAmount = Math.max(0, price - prepayAmount);
  const monthlyPayment = Math.round(loanAmount / months);

  return (
    <dialog ref={dialog} aria-label="Tư vấn trả góp" onCancel={event => {event.preventDefault();onClose();}} className="m-auto w-[calc(100%-24px)] max-w-lg max-h-[90vh] rounded-3xl p-0 backdrop:bg-slate-950/70">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Dự toán trả góp tham khảo
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{productName}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng tư vấn trả góp"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Price Summary */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">Giá trị thanh toán máy:</span>
          <span className="text-lg font-black text-rose-600">{price.toLocaleString("vi-VN")}₫</span>
        </div>

        {/* Prepayment Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
            1. Chọn số tiền trả trước:
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[0, 20, 30, 50].map((pct) => {
              const isSelected = prepayPercent === pct;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPrepayPercent(pct)}
                  className={`py-2 px-1 rounded-xl border text-center font-bold transition cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {pct}% {pct === 0 ? "(0₫)" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tenor Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
            2. Chọn kỳ hạn trả góp:
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[3, 6, 9, 12].map((m) => {
              const isSelected = months === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`py-2 px-1 rounded-xl border text-center font-bold transition cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {m} tháng
                </button>
              );
            })}
          </div>
        </div>

        {/* Result Table */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>Số tiền trả trước ({prepayPercent}%):</span>
            <span className="font-bold text-gray-900">{prepayAmount.toLocaleString("vi-VN")}₫</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Số tiền cần trả góp:</span>
            <span className="font-bold text-gray-900">{loanAmount.toLocaleString("vi-VN")}₫</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Lãi suất ưu đãi:</span>
            <span className="font-bold text-emerald-600">Chưa gồm lãi và phí</span>
          </div>
          <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
            <span className="font-bold text-gray-800">Số tiền góp mỗi tháng:</span>
            <span className="text-base sm:text-lg font-black text-blue-700">
              {monthlyPayment.toLocaleString("vi-VN")}₫ / tháng
            </span>
          </div>
        </div>

        {/* Supporting info */}
        <div className="text-[11px] text-gray-500 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Nhân viên xác nhận điều kiện, lãi và phí trước khi đăng ký.</span>
          </div>
          <p>
            Dự toán chia đều tiền gốc theo kỳ hạn. Gửi yêu cầu tư vấn chưa tạo khoản vay hoặc xác nhận duyệt trả góp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConsultation(true)}
          className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
        >
          Xác nhận thông tin & Đăng ký tư vấn trả góp
        </button>
        {consultation && <ContactForm context={`[Tư vấn trả góp] ${productName}; giá dự kiến ${price.toLocaleString('vi-VN')}đ; trả trước ${prepayPercent}%; kỳ hạn ${months} tháng. Chưa gồm lãi và phí.`} />}

      </div>
    </dialog>
  );
}
