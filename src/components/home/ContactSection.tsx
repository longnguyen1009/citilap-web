import { MessageCircle, Phone, User } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function ContactSection() {
  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-gradient-to-br from-[#0b1221] via-blue-900 to-[#0b1221] rounded-3xl shadow-2xl p-6 md:p-12 text-white relative overflow-hidden border border-blue-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-[150px] opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-[150px] opacity-20 pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-6 flex items-center gap-4 drop-shadow-md">
                <MessageCircle className="w-12 h-12 text-blue-400" /> Tư Vấn Chọn Máy
              </h2>
              <p className="text-gray-300 mb-8 text-lg leading-relaxed max-w-lg">
                Không biết chọn máy nào? Để đội ngũ chuyên gia CitiLap giúp bạn tìm chiếc laptop phù hợp nhất với nhu cầu và ngân sách!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href={siteConfig.telHref} 
                  className="flex justify-center items-center gap-3 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-full font-bold transition duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 text-lg"
                >
                  <Phone className="w-6 h-6" /> {siteConfig.phone}
                </a>
                <a 
                  href={siteConfig.zaloUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex justify-center items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 px-8 py-4 rounded-full font-bold transition duration-300 hover:-translate-y-1 text-lg"
                >
                  <MessageCircle className="w-6 h-6 text-blue-400" /> Chat Zalo
                </a>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3 drop-shadow-sm">
                <User className="w-6 h-6 text-blue-400" /> Để lại thông tin, CitiLap gọi lại ngay
              </h3>
              <form action="/api/contact" method="post" className="flex flex-col gap-5">
                <div>
                  <label htmlFor="customerName" className="sr-only">Họ và tên</label>
                  <input 
                    type="text" 
                    id="customerName"
                    name="name"
                    placeholder="Họ và tên" 
                    className="w-full bg-gray-900/60 border border-gray-600 rounded-xl px-5 py-3.5 text-base text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300 shadow-inner" 
                    required
                  />
                </div>
                <div>
                  <label htmlFor="customerPhone" className="sr-only">Số điện thoại</label>
                  <input 
                    type="tel" 
                    id="customerPhone"
                    name="phone"
                    placeholder="Số điện thoại" 
                    className="w-full bg-gray-900/60 border border-gray-600 rounded-xl px-5 py-3.5 text-base text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300 shadow-inner" 
                    required
                  />
                </div>
                <button 
                  type="button" 
                  className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition duration-300 uppercase text-base tracking-wider mt-2 shadow-lg hover:shadow-blue-500/50"
                >
                  Nhận Tư Vấn Miễn Phí
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
