import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Chính sách vận chuyển & giao nhận (Dự thảo) | ${businessProfile.brandName}`,
  description: `Thông tin dự thảo chính sách giao hàng toàn quốc, cước phí tham khảo và điều kiện miễn phí vận chuyển tại ${businessProfile.brandName}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShippingPolicyPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;
  const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh")!;

  return (
    <PolicyLayout
      currentSlug="chinh-sach-van-chuyen"
      title="Chính sách vận chuyển & giao nhận"
      subtitle="Quy định về phạm vi giao hàng, thời gian xử lý đơn, cước phí tham khảo và quy trình nhận máy"
    >
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Phạm vi giao hàng toàn quốc</h2>
          <p className="text-sm leading-relaxed">
            CitiLap hỗ trợ giao laptop và linh kiện công nghệ tới khách hàng trên toàn bộ 63 tỉnh thành Việt Nam thông qua các đối tác chuyển phát nhanh chuyên nghiệp có bảo hiểm hàng hóa giá trị cao.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Cước phí vận chuyển</h2>
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-sm space-y-2">
            <p>
              • <strong>Khoảng cước phí tham khảo:</strong> Dao động từ <strong>100.000đ – 300.000đ</strong> tùy thuộc vào phương thức vận chuyển (hỏa tốc hoặc chuyển phát tiêu chuẩn), trọng lượng đóng gói và khoảng cách địa lý.
            </p>
            <p>
              • <strong>Xác nhận cước phí:</strong> Khi quý khách đặt hàng qua website, mức phí sẽ hiển thị là <em>&quot;Xác nhận khi tư vấn&quot;</em>. Chuyên viên CitiLap sẽ thông báo chính xác số tiền cước và thống nhất với quý khách trước khi đóng gói gửi hàng.
            </p>
            <p>
              • <strong>Chính sách giao hàng gần cơ sở:</strong> CitiLap hỗ trợ <strong>miễn phí giao hàng trong bán kính 10 km quanh cơ sở Hà Nội</strong> ({hanoi.address}). Chính sách này không mặc định áp dụng cho cơ sở Bắc Ninh. Điều kiện và khoảng cách cụ thể được tư vấn viên xác nhận theo từng đơn.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Thời gian xử lý & Giao nhận dự kiến</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Liên hệ xác nhận:</strong> Tư vấn viên sẽ liên hệ trong khoảng <strong>1 – 4 giờ</strong> làm việc sau khi quý khách gửi yêu cầu đặt hàng trên website.
            </li>
            <li>
              <strong>Thời gian xử lý & đóng gói:</strong> Dự kiến trong vòng <strong>1 ngày làm việc</strong> sau khi đơn hàng được xác nhận thành công.
            </li>
            <li>
              <strong>Thời gian giao hàng:</strong>
              <ul className="list-circle pl-5 mt-1 space-y-1 text-xs text-gray-600">
                <li>Khu vực nội thành Hà Nội & Bắc Ninh: Giao trong ngày hoặc 24 giờ.</li>
                <li>Các tỉnh thành khác: Khoảng 2 – 4 ngày làm việc tùy tuyến vận chuyển.</li>
              </ul>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Đồng kiểm và kiểm tra máy khi nhận</h2>
          <p className="text-sm leading-relaxed">
            Để đảm bảo quyền lợi tối đa, quý khách được quyền <strong>mở hộp kiểm tra ngoại hình máy, phụ kiện đi kèm và tem bảo hành</strong> trước khi thanh toán tiền mặt cho nhân viên giao hàng (Ship COD). Nếu phát hiện móp méo, nứt vỡ hoặc thiếu phụ kiện, quý khách vui lòng từ chối nhận và gọi ngay hotline <strong>{businessProfile.displayPhone}</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Nhận máy trực tiếp tại Showroom (Pickup)</h2>
          <p className="text-sm leading-relaxed">
            Quý khách có nhu cầu đặt hàng online và nhận trực tiếp tại quầy có thể chọn điểm nhận:
          </p>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm mt-2 space-y-1">
            <p><strong>Cơ sở nhận đơn online duy nhất:</strong> {hanoi.name} — {hanoi.address} (ĐT: {hanoi.displayPhone}).</p>
            <p className="text-xs text-gray-500">
              <em>Lưu ý:</em> Cơ sở Bắc Ninh ({bacNinh.address}) hiện đón khách đến xem và mua trực tiếp tại chỗ, chưa hỗ trợ nhận đơn online đặt trước qua website.
            </p>
          </div>
        </div>
      </section>
    </PolicyLayout>
  );
}
