"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";

interface ProductDescriptionArticleProps {
  safeDescription: string;
  productName: string;
}

export default function ProductDescriptionArticle({
  safeDescription,
  productName,
}: ProductDescriptionArticleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const plainTextLength = (safeDescription || "").replace(/<[^>]*>/g, "").trim().length;
  const hasContent = plainTextLength > 0;
  const isLongContent = plainTextLength > 550 || (safeDescription || "").includes("<h2") || (safeDescription || "").includes("<img");
  const showFull = isExpanded || !isLongContent;

  return (
    <article className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8 relative overflow-hidden">
      <h2 className="text-lg sm:text-xl font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" /> Đánh giá chi tiết sản phẩm
      </h2>

      {hasContent ? (
        <>
          <div
            className={`prose prose-base max-w-none text-gray-700 leading-relaxed space-y-4 overflow-hidden transition-all duration-300 ${
              showFull ? "max-h-none" : "max-h-[420px]"
            }`}
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />

          {/* Fade overlay when collapsed */}
          {!showFull && (
            <div className="absolute bottom-16 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          )}

          {/* Expand / Collapse Button (only for long articles) */}
          {isLongContent && (
            <div className="text-center pt-4 relative z-10">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border-2 border-blue-600 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs sm:text-sm transition shadow-2xs cursor-pointer"
              >
                <span>{isExpanded ? "Thu gọn bài đánh giá" : "Đọc tiếp bài đánh giá chi tiết"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 italic space-y-2">
          <p className="text-sm font-medium text-gray-600">
            Thông tin đánh giá chi tiết đang được đội ngũ kỹ thuật viên CitiLap cập nhật cho {productName}.
          </p>
          <p className="text-xs text-gray-400">
            Quý khách có thể xem thông số kỹ thuật bên phải hoặc liên hệ hotline để nhận hình ảnh và video thực tế máy.
          </p>
        </div>
      )}
    </article>
  );
}
