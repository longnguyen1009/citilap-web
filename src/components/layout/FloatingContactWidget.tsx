"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  PhoneIncoming,
  MessageCircle,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones,
} from "lucide-react";
import type { PublicStorefrontSettings } from "@/contracts/cms/settings";
import { businessProfile } from "@/config/business-profile";
import { useTurnstile } from "@/components/Turnstile";
import { trackStorefront } from "@/lib/storefront-metrics";

const CALLBACK_TOPICS = [
  "Tư vấn chọn mua Laptop",
  "Hỏi tình trạng máy & tồn kho showroom",
  "Tư vấn trả góp / thanh toán",
  "Báo giá doanh nghiệp (có VAT)",
  "Hỗ trợ kỹ thuật / bảo hành",
] as const;

export default function FloatingContactWidget({
  settings,
}: {
  settings?: PublicStorefrontSettings | null;
}) {
  const pathname = usePathname();
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (settings && settings.floatingContactEnabled === false) {
    return null;
  }

  // Keep checkout flow distraction-free
  if (pathname.startsWith("/checkout")) {
    return null;
  }

  const phone = settings?.storePhone || businessProfile.displayPhone;
  const telHref = settings?.storePhone
    ? `tel:${settings.storePhone.replace(/\s+/g, "")}`
    : businessProfile.telHref;
  const zaloUrl = settings?.zaloUrl || businessProfile.socialProfiles.zalo;
  const messengerUrl =
    settings?.messengerUrl?.trim() ||
    settings?.facebookUrl?.trim() ||
    businessProfile.socialProfiles.facebook;

  return (
    <>
      <aside
        aria-label="Kênh liên hệ nhanh"
        className="fixed right-3.5 bottom-36 md:right-4 md:bottom-24 z-30 flex flex-col items-end gap-2.5"
      >
        {/* Action buttons: always visible on desktop, expandable on mobile */}
        <div
          className={`flex flex-col items-end gap-2.5 transition-all ${
            mobileExpanded ? "flex" : "hidden md:flex"
          }`}
        >
          {/* 1. Callback Request */}
          <button
            type="button"
            onClick={() => {
              setCallbackOpen(true);
              setMobileExpanded(false);
            }}
            title="Yêu cầu CitiLap gọi lại"
            className="group flex items-center gap-2.5 bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200/90 hover:border-emerald-400 rounded-full pl-3.5 pr-1.5 py-1.5 md:p-1 md:hover:pl-3.5 md:hover:pr-1.5 shadow-lg transition-all cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-800 whitespace-nowrap md:hidden md:group-hover:inline">
              Yêu cầu gọi lại
            </span>
            <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneIncoming className="w-4 h-4" />
            </span>
          </button>

          {/* 2. Messenger */}
          {messengerUrl && (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStorefront("contact_click")}
              className="group flex items-center gap-2.5 bg-white hover:bg-indigo-50 text-slate-800 border border-slate-200/90 hover:border-indigo-400 rounded-full pl-3.5 pr-1.5 py-1.5 md:p-1 md:hover:pl-3.5 md:hover:pr-1.5 shadow-lg transition-all"
              title="Chat qua Facebook Messenger"
            >
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 whitespace-nowrap md:hidden md:group-hover:inline">
                Chat Messenger
              </span>
              <span
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs"
                aria-hidden="true"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
              </span>
            </a>
          )}

          {/* 3. Zalo */}
          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-white hover:bg-sky-50 text-slate-800 border border-slate-200/90 hover:border-sky-400 rounded-full pl-3.5 pr-1.5 py-1.5 md:p-1 md:hover:pl-3.5 md:hover:pr-1.5 shadow-lg transition-all"
              title="Chat Zalo tư vấn trực tiếp"
            >
              <span className="text-xs font-bold text-slate-700 group-hover:text-sky-700 whitespace-nowrap md:hidden md:group-hover:inline">
                Chat Zalo
              </span>
              <span className="w-9 h-9 rounded-full bg-[#0068ff] text-white font-black text-[11px] tracking-tight flex items-center justify-center shrink-0 shadow-xs">
                Zalo
              </span>
            </a>
          )}

          {/* 4. Direct Hotline */}
          <a
            href={telHref}
            className="group flex items-center gap-2.5 bg-white hover:bg-rose-50 text-slate-800 border border-slate-200/90 hover:border-rose-400 rounded-full pl-3.5 pr-1.5 py-1.5 md:p-1 md:hover:pl-3.5 md:hover:pr-1.5 shadow-lg transition-all"
            title={`Gọi ngay Hotline ${phone}`}
          >
            <div className="text-right leading-tight md:hidden md:group-hover:block">
              <div className="text-[10px] font-semibold text-slate-400">Hotline</div>
              <div className="text-xs font-black text-rose-600 whitespace-nowrap">{phone}</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall className="w-4 h-4" />
            </span>
          </a>
        </div>

        {/* Mobile launcher toggle */}
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? "Đóng menu liên hệ nhanh" : "Mở menu liên hệ nhanh Zalo, Messenger, Hotline"}
          className="md:hidden w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 ring-4 ring-blue-500/20 cursor-pointer"
        >
          {mobileExpanded ? (
            <X className="w-5 h-5" />
          ) : (
            <>
              <Headphones className="w-4 h-4" />
              <span className="text-[8px] font-extrabold leading-none">Hỗ trợ</span>
            </>
          )}
        </button>
      </aside>

      {callbackOpen && (
        <CallbackRequestModal
          pathname={pathname}
          phone={phone}
          onClose={() => setCallbackOpen(false)}
        />
      )}
    </>
  );
}

function CallbackRequestModal({
  pathname,
  phone,
  onClose,
}: {
  pathname: string;
  phone: string;
  onClose: () => void;
}) {
  const turnstile = useTurnstile("contact");
  const [name, setName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [topic, setTopic] = useState<string>(CALLBACK_TOPICS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstile.ready || submitting) return;
    if (!name.trim() || !customerPhone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại nhận cuộc gọi.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cf-turnstile-response": turnstile.token,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: customerPhone.trim(),
          subject: `[Yêu cầu gọi lại] ${topic}`,
          message: `${
            note.trim() ? note.trim() + "\n" : ""
          }(Gửi từ trang: ${pathname})`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể gửi yêu cầu lúc này.");
      }
      trackStorefront("contact_click");
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể gửi yêu cầu gọi lại. Vui lòng thử lại hoặc gọi trực tiếp hotline."
      );
    } finally {
      turnstile.reset();
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="callback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div>
              <h2 id="callback-modal-title" className="text-sm sm:text-base font-black">
                Yêu Cầu CitiLap Gọi Lại
              </h2>
              <p className="text-[11px] text-blue-100">
                Kỹ thuật viên sẽ liên hệ trong 5 – 15 phút (giờ làm việc)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Đã nhận yêu cầu gọi lại!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cảm ơn <strong className="text-slate-900">{name}</strong>. Nhân viên CitiLap sẽ gọi tới số{" "}
              <strong className="text-blue-600 font-mono">{customerPhone}</strong> sớm nhất.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="cb-name" className="block font-bold text-slate-700 uppercase mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="cb-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Minh Quân"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="cb-phone" className="block font-bold text-slate-700 uppercase mb-1">
                Số điện thoại nhận cuộc gọi <span className="text-red-500">*</span>
              </label>
              <input
                id="cb-phone"
                type="tel"
                required
                maxLength={20}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ví dụ: 0988 123 456"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="cb-topic" className="block font-bold text-slate-700 uppercase mb-1">
                Nội dung cần tư vấn
              </label>
              <select
                id="cb-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {CALLBACK_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cb-note" className="block font-bold text-slate-700 uppercase mb-1">
                Ghi chú thêm (tùy chọn)
              </label>
              <textarea
                id="cb-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mẫu máy đang quan tâm, khung giờ tiện nghe máy..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {turnstile.widget}

            <button
              type="submit"
              disabled={submitting || !turnstile.ready}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Gửi yêu cầu gọi lại
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Cần gấp? Gọi trực tiếp Hotline{" "}
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-bold text-blue-600 underline">
                {phone}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
