"use client";

import { useState } from "react";
import { useTurnstile } from "@/components/Turnstile";
import { Star, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type ReviewFormProps = {
  productName: string;
  onSubmit?: (review: { rating: number; comment: string; name: string; phone?: string }) => void;
};

export default function ReviewForm({ productName, onSubmit }: ReviewFormProps) {
  const turnstile = useTurnstile("contact");
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstile.ready) return;
    if (rating === 0 || !comment.trim() || !name.trim() || !phone.trim()) {
      setError("Vui lòng chọn số sao và nhập đầy đủ thông tin.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json", "cf-turnstile-response": turnstile.token },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            message: `[Đánh giá ${rating}⭐ sản phẩm: ${productName}]: ${comment.trim()}`,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Contact submission failed");
      }

      onSubmit?.({ rating, comment: comment.trim(), name: name.trim(), phone: phone.trim() });
      setSubmitted(true);
    } catch {
      setError("Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!");
    } finally {
      turnstile.reset();
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-emerald-900 mb-1">Cảm ơn bạn đã đánh giá!</h3>
        <p className="text-sm text-emerald-700">
          Phản hồi {rating} sao cho &quot;{productName}&quot; đã được gửi đến CitiLap để kiểm tra. Phản hồi chưa được công khai trên trang sản phẩm.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setComment("");
            setPhone("");
          }}
          className="text-xs font-semibold text-emerald-800 hover:underline pt-3 block mx-auto"
        >
          Viết đánh giá khác →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Viết đánh giá của bạn</h3>
      <p className="text-xs text-slate-500 mb-5">
        Chia sẻ cảm nhận thực tế khi sử dụng sản phẩm để giúp cộng đồng có lựa chọn chính xác nhất.
      </p>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Star Rating */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Đánh giá số sao *</label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-transform hover:scale-110 cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md whitespace-nowrap">
              {rating === 1 && "1/5 - Rất tệ"}
              {rating === 2 && "2/5 - Chưa ưng ý"}
              {rating === 3 && "3/5 - Bình thường"}
              {rating === 4 && "4/5 - Tốt, hài lòng"}
              {rating === 5 && "5/5 - Rất tốt, xuất sắc!"}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Họ và tên *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Hoàng Nam"
            required
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
            Số điện thoại để xác minh phản hồi *
          </label>
          <input
            type="tel"
            required
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ví dụ: 0912 345 678"
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Comment */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nội dung đánh giá chi tiết *</label>
        <textarea
          value={comment}
          maxLength={1500}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Bạn cảm nhận thế nào về thiết kế, tốc độ, màn hình và thời lượng pin của máy?"
          required
          rows={3}
          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
        />
      </div>

      {/* Submit */}
      {turnstile.widget}
      <button
        type="submit"
        disabled={!turnstile.ready || rating === 0 || !comment.trim() || !name.trim() || !phone.trim() || submitting}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition flex items-center gap-2 cursor-pointer text-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi đánh giá...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Gửi đánh giá ngay
          </>
        )}
      </button>
    </form>
  );
}
