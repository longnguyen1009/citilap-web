import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Hướng dẫn mua hàng & đặt hàng online (Dự thảo) | ${businessProfile.brandName}`,
  description: `Các bước đặt mua laptop dễ dàng tại ${businessProfile.brandName}. Tìm kiếm, chọn SKU, gửi yêu cầu đặt hàng và nhận tư vấn nhanh chóng.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuidePurchasePage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  return (
    <PolicyLayout
      currentSlug="huong-dan-mua-hang"
      title="Hướng dẫn đặt hàng online tại CitiLap"
      subtitle="Quy trình 7 bước tinh gọn giúp bạn đặt mua laptop nhanh chóng, an toàn và tiện lợi"
    >
      <section className="space-y-6 text-sm">
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Tìm kiếm chiếc laptop ưng ý</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Quý khách có thể sử dụng thanh tìm kiếm thông minh ở đầu trang, duyệt theo danh mục sản phẩm (Laptop Gaming, Laptop Văn Phòng, Laptop Like New...) hoặc sử dụng bộ lọc cấu hình (CPU, RAM, card đồ họa, mức giá) để chọn đúng model mong muốn.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Xem chi tiết và chọn phiên bản cấu hình (SKU)</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Tại trang chi tiết sản phẩm, quý khách xem kỹ thông số kỹ thuật, hình ảnh thực tế và bấm chọn phiên bản RAM/SSD phù hợp với nhu cầu sử dụng. Giá bán sẽ tự động cập nhật chính xác theo cấu hình đã chọn.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Thêm vào giỏ hàng hoặc bấm &quot;MUA NGAY&quot;</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Bấm <strong>&quot;THÊM VÀO GIỎ&quot;</strong> nếu muốn chọn thêm phụ kiện, hoặc bấm <strong>&quot;MUA NGAY&quot;</strong> để chuyển thẳng đến giỏ hàng. Tại giỏ hàng, quý khách có thể kiểm tra lại số lượng và tổng tạm tính dự kiến.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              4
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Điền thông tin nhận hàng tại trang Checkout</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Quý khách nhập họ tên, số điện thoại chính xác và chọn hình thức nhận máy:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-gray-600">
                <li><strong>Giao hàng tận nơi:</strong> Nhập Tỉnh/Thành phố, Quận/Huyện và địa chỉ nhận máy.</li>
                <li><strong>Nhận tại showroom:</strong> Chọn cơ sở chính CitiLap Hà Nội ({hanoi.address}) để trực tiếp đến kiểm tra và nhận máy.</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              5
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Bấm &quot;GỬI ĐƠN ĐẶT HÀNG&quot;</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Không cần đăng nhập và không cần thanh toán trước. Màn hình sẽ hiển thị mã đơn hàng (ví dụ: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs">CTL-20261009-XXXX</code>) ở trạng thái <strong>Chờ xác nhận (PENDING)</strong>.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              6
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Chuyên viên CitiLap gọi điện xác nhận</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Trong vòng <strong>1 – 4 giờ làm việc</strong>, nhân viên tư vấn sẽ liên hệ qua số điện thoại của quý khách để xác nhận lại cấu hình, thông báo phí giao hàng cụ thể và thời gian giao nhận dự kiến.
              </p>
            </div>
          </div>

          {/* Step 7 */}
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
              7
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Nhận máy, kiểm tra và thanh toán an toàn</h3>
              <p className="text-gray-600 mt-1 leading-relaxed">
                Khi nhận máy, quý khách được quyền mở hộp kiểm tra ngoại hình, phụ kiện và tem bảo hành trước khi thanh toán tiền mặt cho nhân viên giao hàng (Ship COD).
              </p>
            </div>
          </div>
        </div>
      </section>
    </PolicyLayout>
  );
}
