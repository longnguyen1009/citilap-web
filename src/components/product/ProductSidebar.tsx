import { MapPin, Truck, CreditCard, ShieldCheck, Headphones, CheckCircle, Package, DollarSign, Award, ThumbsUp } from "lucide-react";

export default function ProductSidebar() {
  return (
    <div className="space-y-4">
      {/* Address Block */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-red-600 flex items-center gap-2 mb-3 uppercase text-sm">
          <MapPin className="w-5 h-5 fill-red-600 text-white" />
          Địa chỉ cửa hàng
        </h3>
        <ul className="space-y-2 text-[13px] text-gray-700">
          <li className="flex gap-2"><div className="w-4 flex-shrink-0 text-red-500 text-center mt-0.5">❖</div> 79 Lê Thanh Nghị - Bạch Mai - Hà Nội</li>
          <li className="flex gap-2"><div className="w-4 flex-shrink-0 text-red-500 text-center mt-0.5">❖</div> 273 Trần Quốc Hoàn - Cầu Giấy - Hà Nội</li>
          <li className="flex gap-2"><div className="w-4 flex-shrink-0 text-red-500 text-center mt-0.5">❖</div> 300 Mê Linh - Vĩnh Yên - Vĩnh Phúc</li>
          <li className="flex gap-2"><div className="w-4 flex-shrink-0 text-red-500 text-center mt-0.5">❖</div> 464 Cao Thắng - Hòa Hưng - Hồ Chí Minh</li>
        </ul>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-red-600 p-2 rounded-full text-white shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-red-600 text-[13px]">Miễn Phí Ship Trong Nội Thành</h4>
            <p className="text-xs text-gray-600">Bán kính 10km từ cửa hàng.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-red-600 p-2 rounded-full text-white shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-red-600 text-[13px]">Thanh Toán Trả Góp Linh Động</h4>
            <p className="text-xs text-gray-600">Thanh toán qua thẻ tín dụng<br/>Hỗ trợ lãi suất ưu đãi qua MPOS | HDsaison | Mcredit với CCCD</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-red-600 p-2 rounded-full text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-red-600 text-[13px]">Cam Kết Chất Lượng</h4>
            <p className="text-xs text-gray-600">Bảo hành 1 năm phần cứng.<br/>Miễn phí cài đặt phần mềm, vệ sinh máy trọn đời.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-red-600 p-2 rounded-full text-white shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-red-600 text-[13px]">Hỗ Trợ 24/7</h4>
            <p className="text-xs text-gray-600">Hỗ trợ tư vấn tận tình, nhanh chóng</p>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-red-600 uppercase text-sm mb-4">VÌ SAO NÊN CHỌN CITILAP ?</h3>
        <ul className="space-y-4 text-[13px] text-gray-700">
          <li className="flex items-start gap-3">
            <Package className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Hệ thống bán lẻ, bán buôn uy tín chất lượng <strong>hàng đầu</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Giá <strong>Rẻ Nhất</strong> thị trường</span>
          </li>
          <li className="flex items-start gap-3">
            <Award className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Nhà phân phối Laptop <strong>hàng đầu</strong> toàn quốc</span>
          </li>
          <li className="flex items-start gap-3">
            <ThumbsUp className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Hỗ trợ kỹ thuật <strong>trọn đời</strong> với đội ngũ KTV kinh nghiệm lâu năm</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Dịch vụ bảo hành, bảo trì sản phẩm nhanh chóng.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
