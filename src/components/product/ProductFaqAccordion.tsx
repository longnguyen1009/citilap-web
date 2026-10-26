"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export default function ProductFaqAccordion({ faqs = [] }: { faqs?: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs.length) return null;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-7 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          Câu hỏi thường gặp về sản phẩm (FAQ)
        </h2>
        <span className="text-xs text-gray-400 font-medium hidden sm:inline">Giải đáp nhanh thắc mắc</span>
      </div>

      <div className="space-y-2.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isOpen ? "border-blue-400 bg-blue-50/20 shadow-2xs" : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-gray-900 hover:text-blue-600 transition cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-blue-600" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100/80 bg-white">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
