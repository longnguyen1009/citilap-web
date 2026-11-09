import { Star, ExternalLink } from "lucide-react";
import type { PublicStorefrontSettings } from "@/contracts/cms/settings";

type Testimonial = PublicStorefrontSettings["testimonials"][number];

/**
 * Homepage testimonials. Only renders real reviews entered by admin in
 * Settings → "Cam kết & Đánh giá"; hidden entirely when none are configured
 * so the storefront never shows fabricated ratings.
 */
export default function TestimonialSection({
  testimonials,
  sourceUrl,
}: {
  testimonials: Testimonial[];
  sourceUrl?: string;
}) {
  const items = testimonials.filter((t) => t.name.trim() && t.text.trim());
  if (!items.length) return null;

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <section className="pb-6 sm:pb-16" aria-label="Đánh giá từ khách hàng">
      <div className="container mx-auto px-2.5 sm:px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3.5 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8 pb-3.5 sm:pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                  Khách Hàng Nói Gì Về CitiLap
                </h2>
                <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">
                  Chia sẻ từ khách hàng đã mua tại cửa hàng và đặt hàng trực tuyến
                </p>
              </div>
            </div>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 self-start md:self-auto text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition"
              >
                Xem tất cả đánh giá <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-flow-col auto-cols-[84%] overflow-x-auto snap-x snap-mandatory hide-scrollbar md:grid-flow-row md:auto-cols-auto md:grid-cols-3 gap-3 md:gap-6">
            {items.map((review, i) => (
              <div
                key={i}
                className="snap-start flex flex-col justify-between border border-slate-200/80 rounded-2xl p-3.5 sm:p-6 bg-slate-50/40 hover:bg-white hover:border-blue-400 hover:shadow-md transition duration-300"
              >
                <div>
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0">
                      {initials(review.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{review.name}</h3>
                      {review.role && <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">{review.role}</p>}
                    </div>
                  </div>

                  <div className="flex gap-0.5 mb-2 sm:mb-3" aria-label={`${review.rating} trên 5 sao`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"}`}
                      />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic line-clamp-4 sm:line-clamp-none">
                    &quot;{review.text}&quot;
                  </p>
                </div>

                {review.product && (
                  <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/60 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span>Sản phẩm:</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded truncate max-w-[180px] sm:max-w-[200px]">
                      {review.product}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
