import Link from "next/link";
import Image from "next/image";
import { PlayCircle, ChevronRight } from "lucide-react";

export default function MediaSection() {
  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-[#0b1221] rounded-3xl shadow-2xl p-6 md:p-10 text-white relative overflow-hidden border border-gray-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-4xl font-black uppercase flex items-center gap-4">
              <PlayCircle className="w-10 h-10 text-red-500 animate-pulse" /> 
              CitiLap Media & Review
            </h2>
            <Link 
              href="/news" 
              className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white hover:underline transition duration-300 font-bold"
            >
              Xem thêm Video & Bài viết <ChevronRight className="w-5 h-5"/>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {/* Highlight Video */}
            <div className="lg:col-span-2">
              <div className="relative rounded-2xl overflow-hidden aspect-video group cursor-pointer border border-gray-700 shadow-xl">
                <Image 
                  src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1200&auto=format&fit=crop" 
                  alt="Video Review"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-700 ease-in-out opacity-80"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition duration-500">
                  <div className="w-20 h-20 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] group-hover:scale-110 transition duration-300">
                    <PlayCircle className="w-10 h-10" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <span className="bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded uppercase tracking-wider mb-3 inline-block shadow-sm">
                    Đánh giá chi tiết
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                    Đánh giá Asus ROG Strix G15: Sức mạnh đáng gờm trong tầm giá 25 Triệu!
                  </h3>
                </div>
              </div>
            </div>

            {/* Other Videos */}
            <div className="flex flex-col gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 group cursor-pointer bg-white/5 hover:bg-white/10 backdrop-blur-sm p-4 rounded-xl transition duration-300 border border-gray-800 hover:border-gray-600 shadow-lg">
                  <div className="w-32 h-24 rounded-lg overflow-hidden relative flex-shrink-0">
                    <Image 
                      src={`https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=300&auto=format&fit=crop&sig=${i}`} 
                      alt={`Video review laptop ${i}`}
                      fill
                      className="object-cover opacity-80 group-hover:scale-110 transition duration-500"
                      sizes="128px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition duration-300">
                      <PlayCircle className="w-8 h-8 text-white opacity-90 group-hover:scale-110 transition" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm md:text-base font-bold text-gray-200 group-hover:text-white line-clamp-2 mb-2 transition">
                      So sánh Lenovo Legion 5 vs Acer Nitro 5: Kẻ tám lạng người nửa cân?
                    </h4>
                    <span className="text-xs text-gray-400">2 ngày trước • 12K lượt xem</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
