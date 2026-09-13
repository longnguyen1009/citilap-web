"use client";

import { useState } from "react";
import { Star, Send, CheckCircle } from "lucide-react";

type ReviewFormProps = {
  productName: string;
  onSubmit?: (review: { rating: number; comment: string; name: string }) => void;
};

export default function ReviewForm({ productName, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !comment.trim() || !name.trim()) return;
    setSubmitting(true);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));

    onSubmit?.({ rating, comment: comment.trim(), name: name.trim() });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-800 mb-1">Cảm ơn bạn đã đánh giá!</h3>
        <p className="text-sm text-green-600">
          Đánh giá {rating} sao cho &quot;{productName}&quot; đã được gửi thành công.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Viết đánh giá của bạn</h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Đánh giá sao *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-500 self-center">
              {rating === 1 && "Rất tệ"}
              {rating === 2 && "Tệ"}
              {rating === 3 && "Bình thường"}
              {rating === 4 && "Tốt"}
              {rating === 5 && "Rất tốt"}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Họ tên *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn A"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Nội dung đánh giá *</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          required
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={rating === 0 || !comment.trim() || !name.trim() || submitting}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {submitting ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </form>
  );
}
