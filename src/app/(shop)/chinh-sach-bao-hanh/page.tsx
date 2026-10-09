import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Chính sách bảo hành (Dự thảo) | ${businessProfile.brandName}`,
  description: `Thông tin dự thảo về quy trình và thời hạn bảo hành laptop mới, laptop like-new và linh kiện tại ${businessProfile.brandName}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function WarrantyPolicyPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  return (
    <PolicyLayout
      currentSlug="chinh-sach-bao-hanh"
      title="Chính sách bảo hành sản phẩm"
      subtitle="Quy định về thời hạn, điều kiện tiếp nhận và quy trình bảo hành laptop tại CitiLap"
    >
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Thời hạn bảo hành theo gói sản phẩm</h2>
          <p>
            Tại CitiLap, chúng tôi áp dụng <strong>gói bảo hành linh hoạt tùy theo tình trạng sản phẩm và gói dịch vụ quý khách lựa chọn</strong> khi mua hàng:
          </p>
          <div className="overflow-x-auto my-4">
            <table className="w-full text-left border-collapse border border-gray-200 text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-800">
                  <th className="p-3 border border-gray-200">Nhóm sản phẩm</th>
                  <th className="p-3 border border-gray-200">Thời hạn bảo hành áp dụng</th>
                  <th className="p-3 border border-gray-200">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="p-3 border border-gray-200 font-semibold">Laptop mới 100%</td>
                  <td className="p-3 border border-gray-200"><strong>6 hoặc 12 tháng</strong></td>
                  <td className="p-3 border border-gray-200">Tùy theo cấu hình model và gói dịch vụ</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 font-semibold">Laptop Like New / Đã sử dụng</td>
                  <td className="p-3 border border-gray-200"><strong>3, 6 hoặc 12 tháng</strong></td>
                  <td className="p-3 border border-gray-200">Tùy theo tình trạng máy và gói khách hàng đăng ký</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 font-semibold">Pin, sạc, màn hình & linh kiện hao mòn</td>
                  <td className="p-3 border border-gray-200"><strong>3 – 6 tháng</strong></td>
                  <td className="p-3 border border-gray-200">Áp dụng theo điều khoản riêng của từng gói linh kiện</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 italic">
            * Thời hạn bảo hành chính thức cho từng đơn hàng được ghi rõ trên thông tin sản phẩm, đơn hàng và phiếu bán hàng khi bàn giao; không mặc định tất cả sản phẩm đều bảo hành 12 tháng.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Điều kiện tiếp nhận bảo hành</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Sản phẩm còn trong thời hạn bảo hành được ghi nhận trên hệ thống hoặc phiếu bảo hành.</li>
            <li>Tem bảo hành của CitiLap hoặc nhà sản xuất trên thân máy/ốc vít còn nguyên vẹn, không có dấu hiệu bị rách, chắp vá hay tẩy xóa.</li>
            <li>Lỗi phát sinh do lỗi kỹ thuật của phần cứng hoặc linh kiện theo điều kiện sử dụng bình thường.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Các trường hợp từ chối bảo hành thương mại</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Sản phẩm bị biến dạng, móp méo, nứt vỡ do va đập, rơi rớt hoặc ngoại lực tác động.</li>
            <li>Sản phẩm có dấu hiệu bị chất lỏng, ẩm ướt, mốc rỉ hoặc chập cháy do nguồn điện không ổn định, thiên tai, sét đánh.</li>
            <li>Máy đã bị can thiệp phần cứng hoặc sửa chữa bởi bên thứ ba không thuộc ủy quyền của CitiLap.</li>
            <li>Lỗi phát sinh từ việc cài đặt phần mềm không tương thích, nhiễm virus hoặc can thiệp BIOS/firmware sai quy cách.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Quy trình và đầu mối tiếp nhận</h2>
          <p className="text-sm">
            Quý khách có thể gửi máy bảo hành qua hai hình thức:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm mt-2">
            <li>
              <strong>Trực tiếp tại showroom:</strong> Đến cơ sở chính CitiLap Hà Nội ({hanoi.address}) hoặc cơ sở CitiLap Bắc Ninh để kỹ thuật viên kiểm tra trực tiếp.
            </li>
            <li>
              <strong>Gửi qua đường bưu điện / chuyển phát nhanh:</strong> Quý khách liên hệ hotline <strong>{businessProfile.displayPhone}</strong> để được hướng dẫn đóng gói an toàn và địa chỉ người nhận.
            </li>
          </ul>
        </div>
      </section>
    </PolicyLayout>
  );
}
