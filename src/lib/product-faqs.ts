export type ProductFaqInput =
  | { q: string; a: string; question?: string; answer?: string }
  | { question: string; answer: string; q?: string; a?: string };

export interface NormalizedProductFaq {
  q: string;
  a: string;
}

export const DEFAULT_PRODUCT_FAQS: NormalizedProductFaq[] = [
  {
    q: 'Máy có nâng cấp thêm RAM và ổ cứng SSD được không?',
    a: 'Có. Đa số các dòng Laptop tại CitiLap hỗ trợ nâng cấp RAM và ổ cứng SSD PCIe NVMe tốc độ cao. Kỹ thuật viên CitiLap hỗ trợ kiểm tra khả năng nâng cấp và miễn phí 100% công lắp đặt, cài đặt phần mềm tại showroom.',
  },
  {
    q: 'Tình trạng máy và chế độ bảo hành, đổi trả tại CitiLap như thế nào?',
    a: 'CitiLap cam kết minh bạch tình trạng sản phẩm, mainboard nguyên bản 100%. Mọi sản phẩm đều được hưởng chế độ bảo hành phần cứng mặc định 6 tháng (máy New) và 3 tháng (máy Like New), cùng chính sách lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi phần cứng từ nhà sản xuất.',
  },
  {
    q: 'Mua hàng từ xa (Ship COD) có được kiểm tra máy trước khi thanh toán không?',
    a: 'Hoàn toàn được! CitiLap hỗ trợ giao hàng toàn quốc. Khi nhận hàng, quý khách được quyền mở hộp kiểm tra ngoại hình, đối chiếu đúng mã máy, cấu hình và bật nguồn kiểm tra trước khi thanh toán.',
  },
];

export function resolveProductFaqs(faqs?: ProductFaqInput[] | null): NormalizedProductFaq[] {
  const normalized = (faqs || [])
    .map((item) => ({
      q: (item.q ?? item.question ?? '').trim(),
      a: (item.a ?? item.answer ?? '').trim(),
    }))
    .filter((item) => item.q && item.a);

  return normalized.length > 0 ? normalized : DEFAULT_PRODUCT_FAQS;
}
