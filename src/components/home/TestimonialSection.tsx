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
    <section className="py-4 md:py-6 lg:py-8" aria-label="Đánh giá từ khách hàng">
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-xs border border-slate-200/90 p-3.5 md:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4 mb-4 md:mb-6 pb-3 md:pb-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase text-slate-900 tracking-tight leading-snug">
                  Khách Hàng Nói Gì Về CitiLap
                </h2>
                <p className="text-[12px] md:text-[13px] text-slate-500 mt-0.5">
                  Chia sẻ từ khách hàng đã mua tại cửa hàng và đặt hàng trực tuyến
                </p>
              </div>
            </div>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 inline-flex items-center gap-1.5 self-start md:self-auto text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
              >
                Xem tất cả đánh giá <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-flow-col auto-cols-[84%] overflow-x-auto snap-x snap-mandatory hide-scrollbar md:grid-flow-row md:auto-cols-auto md:grid-cols-3 gap-2.5 md:gap-4 lg:gap-5">
            {items.map((review, i) => (
              <div
                key={i}
                className="snap-start flex flex-col justify-between border border-slate-200/80 rounded-xl lg:rounded-2xl p-3.5 md:p-5 bg-slate-50/40 hover:bg-white hover:border-blue-400 hover:shadow-xs transition duration-200 motion-reduce:transition-none"
              >
                <div>
                  <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-2xs shrink-0">
                      {initials(review.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-[12px] md:text-[14px] truncate">{review.name}</h3>
                      {review.role && <p className="text-[11px] text-slate-500 truncate">{review.role}</p>}
                    </div>
                  </div>

                  <div className="flex gap-0.5 mb-2 md:mb-2.5" aria-label={`${review.rating} trên 5 sao`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"}`}
                      />
                    ))}
                  </div>

                  <p className="text-[12px] md:text-[13px] lg:text-[14px] text-slate-600 leading-relaxed italic line-clamp-4 sm:line-clamp-none">
                    &quot;{review.text}&quot;
                  </p>
                </div>

                {review.product && (
                  <div className="mt-3 md:mt-4 pt-2.5 md:pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between gap-2">
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
