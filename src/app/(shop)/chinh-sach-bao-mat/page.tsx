import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Chính sách bảo mật thông tin (Dự thảo) | ${businessProfile.brandName}`,
  description: `Thông tin dự thảo về thu thập, xử lý và bảo vệ dữ liệu cá nhân khách hàng tại ${businessProfile.brandName}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyPolicyPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  return (
    <PolicyLayout
      currentSlug="chinh-sach-bao-mat"
      title="Chính sách bảo mật thông tin cá nhân"
      subtitle="Quy định về việc thu thập, sử dụng và bảo vệ quyền riêng tư dữ liệu của khách hàng"
    >
      <section className="space-y-6 text-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Đơn vị thu thập và xử lý dữ liệu</h2>
          <p className="leading-relaxed">
            Đơn vị phụ trách dữ liệu website: <strong>{businessProfile.brandName}</strong>.
          </p>
          <ul className="space-y-1 mt-2 text-xs text-gray-600">
            <li>• <strong>Địa chỉ cơ sở chính:</strong> {hanoi.address}</li>
            <li>• <strong>Hotline:</strong> {businessProfile.displayPhone}</li>
            <li>• <strong>Email phụ trách dữ liệu:</strong> {businessProfile.email}</li>
            <li>• <em>{businessProfile.legalEntityNotice}</em></li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Dữ liệu cá nhân được thu thập</h2>
          <p className="leading-relaxed">
            Khi quý khách gửi yêu cầu mua hàng trên website hoặc liên hệ tư vấn, CitiLap có thể tiếp nhận các thông tin gồm:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Họ và tên người nhận hàng.</li>
            <li>Số điện thoại liên hệ.</li>
            <li>Địa chỉ nhận hàng (hoặc lựa chọn cơ sở nhận máy trực tiếp).</li>
            <li>Địa chỉ email (nếu quý khách tự nguyện cung cấp để nhận thông báo).</li>
            <li>Thông tin sản phẩm, cấu hình SKU, số lượng và ghi chú đơn hàng.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Mục đích và phạm vi sử dụng</h2>
          <p className="leading-relaxed">
            Thông tin của quý khách chỉ được sử dụng cho các mục đích thiết yếu:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Liên hệ gọi điện xác nhận sản phẩm, tình trạng máy, phí vận chuyển và thời gian giao nhận.</li>
            <li>Phục vụ quá trình vận chuyển, giao nhận hàng hóa và thanh toán.</li>
            <li>Tra cứu lịch sử bảo hành, hậu mãi kỹ thuật và giải quyết khiếu nại.</li>
            <li>Phòng ngừa các hành vi spam, đặt hàng ảo hoặc gian lận hệ thống.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Các bên có thể tiếp nhận dữ liệu</h2>
          <p className="leading-relaxed">
            Dữ liệu của quý khách được bảo mật trong nội bộ hệ thống CitiLap. Khi thực hiện giao hàng, các thông tin cần thiết (tên, số điện thoại, địa chỉ) sẽ được cung cấp cho đơn vị bưu chính / chuyển phát nhanh phụ trách vận đơn. Chúng tôi không mua bán hay chia sẻ thông tin cho các bên thứ ba không liên quan.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Thời gian lưu trữ dữ liệu</h2>
          <p className="leading-relaxed">
            Dữ liệu đơn hàng dự kiến được lưu giữ trong <strong>2 năm</strong> để phục vụ nhu cầu bảo hành, đối soát và hỗ trợ kỹ thuật trọn đời máy, trừ trường hợp nghĩa vụ pháp luật yêu cầu thời hạn lưu trữ khác.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Quyền của khách hàng đối với dữ liệu cá nhân</h2>
          <p className="leading-relaxed">
            Quý khách có quyền yêu cầu tra cứu, chỉnh sửa hoặc đề nghị xóa thông tin cá nhân của mình khỏi hệ thống lưu trữ bằng cách gửi email về <strong>{businessProfile.email}</strong> hoặc gọi tới hotline <strong>{businessProfile.displayPhone}</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Biện pháp an toàn kỹ thuật</h2>
          <p className="leading-relaxed">
            Website áp dụng chứng chỉ bảo mật mã hóa đường truyền HTTPS/TLS, mã token xác thực ngẫu nhiên cho màn hình hoàn tất đơn hàng, làm mờ số điện thoại trên giao diện tra cứu công khai và phân quyền quản trị nghiêm ngặt để bảo vệ dữ liệu khách hàng.
          </p>
        </div>
      </section>
    </PolicyLayout>
  );
}
