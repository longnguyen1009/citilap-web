'use client';

import { resolveProductFaqs, type ProductFaqInput } from '@/lib/product-faqs';

export type ProductFaqItem = ProductFaqInput;

interface ProductFaqAccordionProps {
  faqs?: ProductFaqItem[];
  productName?: string;
}

export function ProductFaqAccordion({
  faqs,
}: ProductFaqAccordionProps) {
  const displayFaqs = resolveProductFaqs(faqs);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs">
      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
        <span className="text-[#2563EB]">❓</span> CÂU HỎI THƯỜNG GẶP VỀ SẢN PHẨM
      </h2>

      <div className="space-y-2.5">
        {displayFaqs.map((faq, idx) => {
          const numberedQuestion = /^\d+\./.test(faq.q)
            ? faq.q
            : `${idx + 1}. ${faq.q}`;

          return (
            <details
              key={idx}
              name="product-faq-accordion"
              open={idx === 0}
              className="group border border-slate-200 rounded-2xl overflow-hidden transition-colors open:border-blue-300"
            >
              <summary className="w-full flex items-center justify-between gap-4 p-4 text-left font-bold text-sm sm:text-[15px] text-slate-800 hover:bg-slate-50 transition cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span>{numberedQuestion}</span>
                <span
                  aria-hidden="true"
                  className="text-slate-400 group-open:text-[#2563EB] font-black text-lg leading-none shrink-0 select-none"
                >
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <div className="px-4 pb-4 pt-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50 whitespace-pre-line">
                {faq.a}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

export default ProductFaqAccordion;
