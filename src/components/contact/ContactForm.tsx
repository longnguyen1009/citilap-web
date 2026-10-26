"use client";

import { useState } from "react";
import { useTurnstile } from "@/components/Turnstile";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { businessProfile } from '@/config/business-profile';
import { trackStorefront } from '@/lib/storefront-metrics';

export default function ContactForm({ appointment = false, productId = '', unitCode = '', initialMessage = '', context = '' }: { appointment?: boolean; productId?: string; unitCode?: string; initialMessage?: string; context?: string }) {
  const turnstile = useTurnstile("contact");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [website, setWebsite] = useState(""); // Honeypot field for bot trap
  const [locationId, setLocationId] = useState('hanoi');
  const [requestedAt, setRequestedAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstile.ready) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-turnstile-response": turnstile.token },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          message: [context,message].filter(Boolean).join('\n') || undefined,
          website: website || undefined,
          ...(appointment ? { appointment: { productId: productId || undefined, unitCode: unitCode || undefined, locationId, requestedAt: `${requestedAt}:00+07:00` } } : {}),
        }),
      });

      const data = (await res.json()) as { success: boolean; message?: string; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error || "Gửi yêu cầu không thành công. Vui lòng thử lại.");
        return;
      }

      setSuccessMessage(data.message || "Yêu cầu tư vấn của bạn đã được gửi thành công!");
      if (appointment) trackStorefront('appointment_requested');
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng liên hệ hotline 0899.188.186.");
    } finally {
      turnstile.reset();
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-5">
      <div>
        <h2 className="text-lg font-black text-gray-900 uppercase">
          {appointment ? 'Đặt lịch xem máy' : 'Gửi tin nhắn tư vấn'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Để lại thông tin và nhu cầu sử dụng, tư vấn viên CitiLap sẽ liên hệ hỗ trợ bạn sớm nhất.
        </p>
      </div>

      {successMessage ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            Yêu cầu đã được tiếp nhận
          </div>
          <p className="text-xs leading-relaxed">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline pt-1 block"
          >
            Gửi yêu cầu khác →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {appointment && <fieldset disabled={loading} className="space-y-3 rounded-xl bg-blue-50 p-4"><legend className="text-sm font-semibold">Lịch mong muốn</legend>
            {unitCode && <p className="text-sm">Mã máy: {unitCode}</p>}
            <label className="block text-sm">Cơ sở<select className="mt-1 w-full rounded border border-gray-300 bg-white p-2" value={locationId} onChange={e => setLocationId(e.target.value)}>{businessProfile.locations.filter(store => store.status === 'ACTIVE' && store.walkInViewingAndPurchaseEnabled).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
            <label className="block text-sm">Ngày và giờ (GMT+7)<input className="mt-1 w-full rounded border border-gray-300 bg-white p-2" type="datetime-local" value={requestedAt} onChange={e => setRequestedAt(e.target.value)} required /></label>
            <p className="text-xs text-slate-600">Chọn trong 30 ngày tới. Nhân viên xác nhận lịch và máy trước khi bạn đến; yêu cầu này chưa giữ hàng. Chủ nhật chỉ theo lịch hẹn.</p>
          </fieldset>}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Hidden honeypot field for anti-bot protection */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="hp_website">Website</label>
            <input
              id="hp_website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Họ và tên của bạn *
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ví dụ: Nguyễn Văn A"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Số điện thoại liên hệ *
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="Ví dụ: 0988 776 655"
              required
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email (tùy chọn)
            </label>
            <input
              type="email"
              name="email"
              placeholder="email@example.com"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nhu cầu cần hỗ trợ
            </label>
            <textarea
              name="message"
              rows={4}
              maxLength={1000}
              placeholder="Ví dụ: Cần tư vấn laptop gaming tầm giá 20-25 triệu để lập trình và chơi game..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none transition resize-none disabled:bg-gray-100"
            ></textarea>
          </div>

          {turnstile.widget}

          <button
            type="submit"
            disabled={!turnstile.ready || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition uppercase shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi yêu cầu...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {appointment ? 'Gửi yêu cầu hẹn xem máy' : 'Gửi yêu cầu tư vấn'}
              </>
            )}
          </button>
        </form>
      )}

      <div className="pt-2 text-[11px] text-gray-400 text-center leading-relaxed">
        Thông tin của quý khách được bảo mật và chỉ dùng cho mục đích liên hệ tư vấn sản phẩm.
      </div>
    </div>
  );
}
