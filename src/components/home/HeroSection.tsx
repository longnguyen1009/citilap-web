import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <>
      <section className="bg-[#0f172a] relative">
        <div className="w-full relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-[500px] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"
            alt="Hero Background"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/70 to-transparent flex items-center">
            <div className="container mx-auto px-4 max-w-[1370px]">
              <div className="max-w-xl text-white">
                <div className="inline-block border border-blue-500/50 rounded-lg px-4 py-1.5 mb-6 backdrop-blur-md bg-blue-900/40 shadow-lg">
                  <span className="text-blue-400 font-black text-sm md:text-lg tracking-widest uppercase">
                    CitiLap Gaming Zone
                  </span>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 drop-shadow-sm">
                  LAPTOP <span className="text-blue-500">GAMING</span>
                </h1>
                <p className="text-lg md:text-2xl font-bold text-yellow-400 mb-8 tracking-wide drop-shadow-md">
                  ✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/category/laptop-gaming"
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full uppercase text-sm md:text-base shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-300 transform hover:-translate-y-0.5"
                  >
                    Khám Phá Ngay
                  </Link>
                  <Link
                    href="/hot-sale"
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold py-3 px-8 rounded-full uppercase text-sm md:text-base transition duration-300"
                  >
                    Xem Ưu Đãi
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUB-BANNERS */}
      <section className="py-6">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden shadow-lg relative group h-[140px] md:h-[180px]">
              <Image
                src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop"
                alt="Ultrabook cao cấp - Sang trọng và mỏng nhẹ"
                fill
                className="object-cover group-hover:scale-105 transition duration-700 ease-in-out"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-900/50 to-transparent flex items-center p-6 md:p-8">
                <div className="text-white z-10">
                  <h3 className="text-2xl md:text-3xl font-black mb-2 text-yellow-400 uppercase italic drop-shadow-md">
                    Ultrabook Cao Cấp
                  </h3>
                  <p className="font-bold text-sm md:text-base mb-4 opacity-90">
                    Sang trọng & Mỏng nhẹ
                  </p>
                  <Link
                    href="/category/laptop-van-phong"
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-full uppercase text-xs md:text-sm shadow-lg transition"
                    aria-label="Xem ngay ultrabook cao cấp"
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg relative group h-[140px] md:h-[180px]">
              <Image
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
                alt="Ưu đãi cực khủng - Tặng chuột Gaming và Balo"
                fill
                className="object-cover group-hover:scale-105 transition duration-700 ease-in-out"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-red-900/50 to-transparent flex items-center p-6 md:p-8">
                <div className="text-white z-10">
                  <h3 className="text-2xl md:text-3xl font-black mb-2 text-yellow-400 uppercase italic drop-shadow-md">
                    Ưu đãi cực khủng
                  </h3>
                  <p className="font-bold text-sm md:text-base mb-4 opacity-90">
                    Tặng chuột Gaming & Balo
                  </p>
                  <Link
                    href="/hot-sale"
                    className="inline-flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full uppercase text-xs md:text-sm shadow-lg transition"
                    aria-label="Mua ngay ưu đãi cực khủng"
                  >
                    Mua ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
