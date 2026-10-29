'use client';

export type ProductFaqItem =
  | { q: string; a: string; question?: string; answer?: string }
  | { question: string; answer: string; q?: string; a?: string };

interface ProductFaqAccordionProps {
  faqs?: ProductFaqItem[];
  productName?: string;
}

const DEFAULT_PRODUCT_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Máy có nâng cấp thêm RAM và ổ cứng SSD được không?',
    a: 'Có. Đa số các dòng Laptop tại CitiLap hỗ trợ nâng cấp RAM và ổ cứng SSD PCIe NVMe tốc độ cao. Kỹ thuật viên CitiLap hỗ trợ kiểm tra khả năng nâng cấp và miễn phí 100% công lắp đặt, cài đặt phần mềm tại showroom.',
  },
  {
    q: 'Tình trạng máy và chế độ bảo hành, đổi trả tại CitiLap như thế nào?',
    a: 'CitiLap cam kết minh bạch tình trạng sản phẩm, mainboard nguyên bản 100%. Mọi sản phẩm đều được hưởng chế độ bảo hành phần cứng 12 tháng và chính sách lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi phần cứng từ nhà sản xuất.',
  },
  {
    q: 'Mua hàng từ xa (Ship COD) có được kiểm tra máy trước khi thanh toán không?',
    a: 'Hoàn toàn được! CitiLap hỗ trợ giao hàng toàn quốc. Khi nhận hàng, quý khách được quyền mở hộp kiểm tra ngoại hình, đối chiếu đúng mã máy, cấu hình và bật nguồn kiểm tra trước khi thanh toán.',
  },
];

export function ProductFaqAccordion({
  faqs,
}: ProductFaqAccordionProps) {
  const normalizedFaqs = (faqs || [])
    .map((item) => ({
      q: (item.q ?? item.question ?? '').trim(),
      a: (item.a ?? item.answer ?? '').trim(),
    }))
    .filter((item) => item.q && item.a);

  const displayFaqs =
    normalizedFaqs.length > 0 ? normalizedFaqs : DEFAULT_PRODUCT_FAQS;

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
