'use client';

import { useState } from 'react';
import ReviewForm from './ReviewForm';
import type { ApprovedProductReview } from '@/server/services/contact.service';

interface ProductReviewsSectionProps {
  productName: string;
  approvedReviews: ApprovedProductReview[];
  defaultVariantLabel?: string;
}

function formatRelativeOrDate(isoOrLabel: string): string {
  if (!isoOrLabel) return 'Gần đây';
  if (!isoOrLabel.includes('T') && !isoOrLabel.includes('-')) {
    return isoOrLabel;
  }
  const date = new Date(isoOrLabel);
  if (Number.isNaN(date.getTime())) return isoOrLabel;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function ProductReviewsSection({
  productName,
  approvedReviews,
}: ProductReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const allReviews = approvedReviews;
  const count5 = approvedReviews.filter(r => r.rating === 5).length;
  const count4 = approvedReviews.filter(r => r.rating === 4).length;
  const countLow = approvedReviews.filter(r => r.rating <= 3).length;
  const totalCount = approvedReviews.length;
  const averageScore = totalCount ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1) : '0.0';
  const pct5 = totalCount ? Math.round(count5 / totalCount * 100) : 0;
  const pct4 = totalCount ? Math.round(count4 / totalCount * 100) : 0;
  const pctLow = totalCount ? Math.round(countLow / totalCount * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <span className="text-amber-500">⭐</span> KHÁCH HÀNG ĐÁNH GIÁ &amp; NHẬN XÉT
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
        >
          {showForm ? 'Đóng ô đánh giá' : '+ Thêm đánh giá'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <ReviewForm productName={productName} />
        </div>
      )}

      {/* Rating Summary */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/60 flex flex-col sm:flex-row items-center gap-6 mb-6">
        <div className="text-center sm:border-r sm:border-slate-200 sm:pr-6 shrink-0">
          <div className="text-4xl font-black text-amber-500">
            {averageScore}
            <span className="text-xl text-slate-400 font-bold">/5</span>
          </div>
          <div aria-hidden="true" className="text-amber-400 text-base tracking-widest my-1">{'★'.repeat(Math.round(Number(averageScore)))}{'☆'.repeat(5 - Math.round(Number(averageScore)))}</div>
          <div className="text-xs sm:text-sm font-semibold text-slate-600">
            {totalCount ? `${totalCount} đánh giá đã duyệt` : 'Chưa có đánh giá'}
          </div>
        </div>
        <div className="flex-1 w-full space-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-14 font-bold text-slate-700 shrink-0">5 sao</span>
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${pct5}%` }}
              />
            </div>
            <span className="w-7 text-right font-semibold text-slate-600 tabular-nums">
              {count5}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-14 font-bold text-slate-700 shrink-0">4 sao</span>
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${pct4}%` }}
              />
            </div>
            <span className="w-7 text-right font-semibold text-slate-600 tabular-nums">
              {count4}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-14 font-bold text-slate-400 shrink-0">3-1 sao</span>
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${pctLow}%` }}
              />
            </div>
            <span className="w-7 text-right font-semibold text-slate-400 tabular-nums">
              {countLow}
            </span>
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {allReviews.map((review, index) => {
          const isLast = index === allReviews.length - 1;
          const stars =
            '★'.repeat(Math.max(1, Math.min(5, review.rating))) +
            '☆'.repeat(Math.max(0, 5 - review.rating));
          return (
            <div
              key={review.id}
              className={
                isLast ? 'pb-1' : 'border-b border-slate-100 pb-4'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    {review.reviewerName}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                    ✓ {review.verifiedLabel || 'Phản hồi đã duyệt'}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  {formatRelativeOrDate(review.createdAt)}
                </span>
              </div>
              <div className="text-amber-400 text-sm mb-1.5">
                {stars}{' '}
                <span className="text-slate-500 text-xs sm:text-sm font-medium ml-1">
                  {review.variantLabel || `Đánh giá sản phẩm ${review.productName}`}
                </span>
              </div>
              <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                {review.comment}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

