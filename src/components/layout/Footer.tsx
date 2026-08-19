import Link from "next/link";
import { Mail, Phone, MapPin, CheckCircle, ShieldCheck, Truck, RefreshCw } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50">
      {/* Features Bar */}
      <div className="bg-slate-100 py-8 border-y border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <Truck className="w-10 h-10 text-[#d3000b]" />
              <div>
                <h4 className="font-bold text-gray-800 text-sm uppercase">Giao hàng miễn phí</h4>
                <p className="text-xs text-gray-500">Toàn quốc, thanh toán khi nhận</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-10 h-10 text-[#d3000b]" />
              <div>
                <h4 className="font-bold text-gray-800 text-sm uppercase">Bảo hành chính hãng</h4>
                <p className="text-xs text-gray-500">Cam kết 100% hàng chính hãng</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RefreshCw className="w-10 h-10 text-[#d3000b]" />
              <div>
                <h4 className="font-bold text-gray-800 text-sm uppercase">Đổi trả 15 ngày</h4>
                <p className="text-xs text-gray-500">Lỗi 1 đổi 1 trong 15 ngày đầu</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-[#d3000b]" />
              <div>
                <h4 className="font-bold text-gray-800 text-sm uppercase">Hỗ trợ trả góp 0%</h4>
                <p className="text-xs text-gray-500">Thủ tục nhanh chóng, đơn giản</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="pt-12 pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <Link href="/" className="flex flex-col mb-6">
                <span className="text-3xl font-extrabold text-[#d3000b] leading-tight tracking-tight">CitiLap</span>
                <span className="text-gray-500 text-[10px] tracking-widest uppercase font-semibold">Thế giới số của bạn</span>
              </Link>
              <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex gap-3">
                  <MapPin className="w-5 h-5 text-[#d3000b] shrink-0" />
                  <span>123 Đường Công Nghệ, Quận 1, TP. HCM.</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="w-5 h-5 text-[#d3000b] shrink-0" />
                  <a href="tel:0853111999" className="hover:text-[#d3000b] font-bold">0853.111.999</a>
                </li>
                <li className="flex gap-3">
                  <Mail className="w-5 h-5 text-[#d3000b] shrink-0" />
                  <a href="mailto:support@citilap.com" className="hover:text-[#d3000b]">support@citilap.com</a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-gray-800 uppercase">Hỗ trợ khách hàng</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/huong-dan-mua-hang" className="hover:text-[#d3000b] transition">Hướng dẫn mua hàng</Link></li>
                <li><Link href="/chinh-sach-bao-hanh" className="hover:text-[#d3000b] transition">Chính sách bảo hành</Link></li>
                <li><Link href="/chinh-sach-doi-tra" className="hover:text-[#d3000b] transition">Chính sách đổi trả</Link></li>
                <li><Link href="/chinh-sach-tra-gop" className="hover:text-[#d3000b] transition">Hướng dẫn mua trả góp</Link></li>
                <li><Link href="/kiem-tra-bao-hanh" className="hover:text-[#d3000b] transition">Kiểm tra thông tin bảo hành</Link></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-gray-800 uppercase">Chính sách chung</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/privacy-policy" className="hover:text-[#d3000b] transition">Chính sách bảo mật</Link></li>
                <li><Link href="/dieu-khoan" className="hover:text-[#d3000b] transition">Điều khoản sử dụng</Link></li>
                <li><Link href="/chinh-sach-giao-hang" className="hover:text-[#d3000b] transition">Chính sách giao hàng</Link></li>
                <li><Link href="/chinh-sach-thanh-toan" className="hover:text-[#d3000b] transition">Chính sách thanh toán</Link></li>
                <li><Link href="/contact" className="hover:text-[#d3000b] transition">Liên hệ hợp tác</Link></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-gray-800 uppercase">Đăng ký nhận khuyến mãi</h3>
              <p className="text-sm text-gray-600 mb-4">Đăng ký email để nhận ngay thông tin các chương trình khuyến mãi sớm nhất.</p>
              <form className="flex flex-col gap-3">
                <input 
                  type="email" 
                  placeholder="Nhập email của bạn..." 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#d3000b] text-sm"
                />
                <button 
                  type="submit" 
                  className="bg-[#d3000b] text-white font-medium px-4 py-2 rounded-md hover:bg-red-700 transition uppercase text-sm"
                >
                  Đăng ký
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-[#b20000] py-4 text-center text-white/70 text-sm">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <p>&copy; {new Date().getFullYear()} CitiLap. Thế giới công nghệ của bạn. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
