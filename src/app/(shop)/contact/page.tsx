import Link from "next/link";
import { ChevronRight, MapPin, Phone, Mail, Clock, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">Liên hệ</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 uppercase tracking-tight">Liên hệ với CitiLap</h1>
          <p className="text-lg text-gray-600">Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy để lại thông tin hoặc đến trực tiếp showroom của chúng tôi để trải nghiệm sản phẩm tốt nhất.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left: Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6 uppercase border-b border-gray-100 pb-4">Thông tin liên hệ</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Địa chỉ Showroom</h3>
                    <p className="text-gray-600">123 Đường Công Nghệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Hotline & Zalo</h3>
                    <p className="text-gray-600 mb-1">Mua hàng: <a href="tel:0899188186" className="font-bold text-blue-600 hover:underline">0899.188.186</a></p>
                    <p className="text-gray-600">Kỹ thuật: <a href="tel:0899188187" className="font-bold text-blue-600 hover:underline">0899.188.187</a></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Email hỗ trợ</h3>
                    <p className="text-gray-600">support@citilap.com</p>
                    <p className="text-gray-600">cskh@citilap.com</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Giờ làm việc</h3>
                    <p className="text-gray-600">Thứ 2 - Thứ 7: 08:00 - 21:00</p>
                    <p className="text-gray-600">Chủ nhật: 09:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-10">
              <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Gửi tin nhắn cho chúng tôi</h2>
              <p className="text-gray-500 mb-8">Vui lòng điền đầy đủ thông tin bên dưới, chúng tôi sẽ phản hồi trong vòng 24h làm việc.</p>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Họ và tên *</label>
                    <input type="text" placeholder="Nguyễn Văn A" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại *</label>
                    <input type="tel" placeholder="0988xxxxxx" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input type="email" placeholder="name@example.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Vấn đề cần hỗ trợ</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white">
                    <option>Tư vấn mua hàng</option>
                    <option>Hỗ trợ kỹ thuật / Bảo hành</option>
                    <option>Thắc mắc về giao nhận</option>
                    <option>Góp ý / Khiếu nại</option>
                    <option>Hợp tác doanh nghiệp</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nội dung chi tiết *</label>
                  <textarea rows={4} placeholder="Xin chào, tôi cần hỗ trợ về..." className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition resize-y"></textarea>
                </div>

                <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 w-full md:w-auto">
                  <Send className="w-5 h-5" />
                  Gửi yêu cầu
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="mt-12 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1m3!1d3919.42436400331!2d106.69781631480088!3d10.778788992318788!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f48f4989e21%3A0xc3c5c163013b5e43!2zTmjDoCBUaOG7nSDEkOG7qWMgQsOgIFPDoGkgR8Oybg!5e0!3m2!1svi!2s!4v1680108343110!5m2!1svi!2s" 
            width="100%" 
            height="100%" 
            style={{ border: 0, borderRadius: '12px' }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
