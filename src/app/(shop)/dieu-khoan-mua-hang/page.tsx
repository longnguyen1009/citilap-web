import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Điều khoản đặt hàng & mua hàng (Dự thảo) | ${businessProfile.brandName}`,
  description: `Thông tin dự thảo về quy định đặt hàng, xác nhận đơn hàng và nghĩa vụ mua sắm tại ${businessProfile.brandName}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function TermsOfPurchasePage() {
  return (
    <PolicyLayout
      currentSlug="dieu-khoan-mua-hang"
      title="Điều khoản đặt hàng & mua hàng online"
      subtitle="Quy định về quy trình gửi yêu cầu mua hàng, xác nhận đơn và thanh toán tại website CitiLap"
    >
      <section className="space-y-6 text-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Nguyên tắc đặt hàng trên website</h2>
          <p className="leading-relaxed">
            Website <strong>citilap.vn</strong> được vận hành nhằm mục đích giới thiệu danh mục laptop công nghệ và tiếp nhận yêu cầu mua hàng của khách hàng.
          </p>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 my-3 text-amber-900 space-y-1">
            <p className="font-bold">Lưu ý quan trọng về trạng thái đơn hàng:</p>
            <p className="text-xs leading-relaxed">
              Khi quý khách hoàn tất thao tác gửi đơn trên website, đơn hàng sẽ được ghi nhận ở trạng thái <strong>&quot;Chờ xác nhận (PENDING)&quot;</strong>. Thao tác này là việc gửi một <em>yêu cầu mua hàng</em>, không đồng nghĩa với việc sản phẩm đã được giữ chỗ cố định, giao dịch tiền đã phát sinh hoặc đơn hàng đã tự động xác nhận thành công.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Quy trình xác nhận từ tư vấn viên</h2>
          <p className="leading-relaxed">
            Sau khi tiếp nhận yêu cầu, chuyên viên của CitiLap sẽ gọi điện trực tiếp qua số điện thoại quý khách cung cấp để:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Xác nhận chính xác mã sản phẩm, cấu hình RAM/SSD và tình trạng thực tế của máy.</li>
            <li>Thông báo mức phí vận chuyển cụ thể theo địa chỉ nhận hàng và hình thức chuyển phát.</li>
            <li>Thống nhất thời gian giao nhận dự kiến và phương thức thanh toán thuận tiện nhất.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Giá cả và thanh toán</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Giá sản phẩm hiển thị trên website là giá niêm yết theo cấu hình tương ứng tại thời điểm gửi đơn, chưa bao gồm cước phí vận chuyển (nếu có).
            </li>
            <li>
              <strong>Hiện tại website không yêu cầu thanh toán trực tuyến:</strong> Quý khách không cần nhập thẻ ngân hàng hay chuyển khoản ngay khi gửi đơn. Toàn bộ thanh toán được thực hiện bằng tiền mặt khi nhận hàng (Ship COD) sau khi đã kiểm tra máy, hoặc thanh toán trực tiếp tại showroom.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Thay đổi hoặc hủy yêu cầu đặt hàng</h2>
          <p className="leading-relaxed">
            Quý khách có thể yêu cầu thay đổi cấu hình, đổi địa chỉ nhận hàng hoặc hủy yêu cầu đặt hàng bất kỳ lúc nào trước khi đơn hàng được bàn giao cho đối tác vận chuyển bằng cách liên hệ hotline:
          </p>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mt-2 font-bold text-blue-900">
            Hotline hỗ trợ đơn hàng: <a href={businessProfile.telHref} className="text-blue-600 underline">{businessProfile.displayPhone}</a> (09:00 – 20:00)
          </div>
        </div>
      </section>
    </PolicyLayout>
  );
}
