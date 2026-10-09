import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Chính sách đổi trả & hoàn tiền (Dự thảo) | ${businessProfile.brandName}`,
  description: `Thông tin dự thảo chính sách đổi trả sản phẩm lỗi trong 7 ngày và điều kiện hoàn tiền tại ${businessProfile.brandName}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReturnPolicyPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  return (
    <PolicyLayout
      currentSlug="chinh-sach-doi-tra"
      title="Chính sách đổi trả & hoàn tiền"
      subtitle="Quy định hỗ trợ đổi sản phẩm khi phát sinh sự cố kỹ thuật và giải quyết quyền lợi khách hàng"
    >
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Quy định đổi trả trong 7 ngày đầu</h2>
          <p className="text-sm leading-relaxed">
            Trong vòng <strong>7 ngày đầu kể từ thời điểm nhận máy</strong>, nếu laptop phát sinh lỗi kỹ thuật phần cứng thuộc phạm vi bảo hành của cửa hàng, quý khách có quyền yêu cầu đổi một máy tương đương hoặc phương án xử lý phù hợp sau khi kỹ thuật viên xác nhận lỗi.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm mt-3">
            <li>Máy đổi mới phải giữ nguyên hình thức ban đầu, không bị trầy xước, cấn móp phát sinh mới so với thời điểm nhận.</li>
            <li>Đầy đủ phụ kiện kèm theo (sạc zin, dây nguồn, quà tặng nếu có).</li>
            <li>Phiếu bán hàng và tem bảo hành trên máy còn nguyên vẹn.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Phương án hoàn tiền</h2>
          <p className="text-sm leading-relaxed">
            Trong trường hợp sản phẩm phát sinh lỗi kỹ thuật trong thời gian áp dụng nhưng CitiLap không còn máy tương đương để đổi và hai bên không thống nhất được phương án thay thế, cửa hàng sẽ hỗ trợ <strong>hoàn tiền 100%</strong> giá trị sản phẩm cho quý khách.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Trường hợp khách hàng thay đổi nhu cầu sử dụng</h2>
          <p className="text-sm leading-relaxed">
            Nếu máy hoạt động bình thường và không có lỗi kỹ thuật nhưng quý khách có nhu cầu đổi sang dòng máy khác hoặc không còn nhu cầu sử dụng:
          </p>
          <p className="text-sm leading-relaxed mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            CitiLap có thể xem xét <strong>thu mua lại theo chính sách thu mua máy cũ (Trade-in)</strong> thỏa thuận theo thời giá thị trường. Đây là chính sách thu cũ riêng biệt, <em>không áp dụng chế độ hoàn tiền không điều kiện</em>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Đầu mối hỗ trợ tiếp nhận</h2>
          <p className="text-sm leading-relaxed">
            Để được hướng dẫn thủ tục đổi trả nhanh chóng, quý khách vui lòng liên hệ:
          </p>
          <ul className="space-y-1.5 text-sm mt-2">
            <li>• <strong>Đầu mối chính:</strong> {hanoi.name} ({hanoi.address})</li>
            <li>• <strong>Hotline tiếp nhận:</strong> <a href={businessProfile.telHref} className="text-blue-600 font-bold hover:underline">{businessProfile.displayPhone}</a></li>
            <li>• <strong>Email hỗ trợ:</strong> <a href={`mailto:${businessProfile.email}`} className="text-blue-600 hover:underline">{businessProfile.email}</a></li>
          </ul>
        </div>
      </section>
    </PolicyLayout>
  );
}
