"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlayCircle, ChevronRight, X, Eye, Clock } from "lucide-react";

export default function MediaSection() {
  const [activeVideo, setActiveVideo] = useState<{ title: string; youtubeId: string } | null>(null);

  const mainVideo = {
    title: "Đánh giá chi tiết Asus ROG Strix G16: Quái thú hiệu năng RTX 4070 trong tầm giá!",
    tag: "Đánh giá chuyên sâu",
    duration: "14:20",
    views: "35K lượt xem",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1200&auto=format&fit=crop",
    youtubeId: "dQw4w9WgXcQ",
  };

  const sideVideos = [
    {
      id: 1,
      title: "So sánh Lenovo Legion 5 vs Acer Nitro 16: Phân khúc 30 triệu chọn máy nào?",
      duration: "12:45",
      views: "21K lượt xem",
      time: "2 ngày trước",
      image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=400&auto=format&fit=crop",
      youtubeId: "dQw4w9WgXcQ",
    },
    {
      id: 2,
      title: "Trên tay MacBook Air M3: Màn hình to, pin 18 tiếng thực tế, đáng nâng cấp?",
      duration: "09:30",
      views: "18K lượt xem",
      time: "4 ngày trước",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400&auto=format&fit=crop",
      youtubeId: "dQw4w9WgXcQ",
    },
    {
      id: 3,
      title: "8 bước kiểm tra Laptop Like-New 99% nguyên zin trước khi xuống tiền",
      duration: "16:15",
      views: "42K lượt xem",
      time: "1 tuần trước",
      image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=400&auto=format&fit=crop",
      youtubeId: "dQw4w9WgXcQ",
    },
  ];

  return (
    <section className="pb-16" aria-label="CitiLap Media và đánh giá video">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-[#0b1221] rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 text-white relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 relative z-10">
            <div>
              <h2 className="text-xl sm:text-3xl font-black uppercase flex items-center gap-3">
                <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-pulse shrink-0" />
                CitiLap Media & Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Video mổ xẻ cấu hình, so sánh thực tế và cẩm nang công nghệ độc quyền từ CitiLap
              </p>
            </div>
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-400 hover:text-white hover:underline transition font-bold shrink-0 self-start sm:self-auto"
            >
              Xem tất cả bài viết & video <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
            {/* Highlight Video */}
            <div className="lg:col-span-2">
              <div
                onClick={() => setActiveVideo({ title: mainVideo.title, youtubeId: mainVideo.youtubeId })}
                className="relative rounded-2xl overflow-hidden aspect-video group cursor-pointer border border-slate-700/80 shadow-2xl bg-slate-900"
              >
                <Image
                  src={mainVideo.image}
                  alt={mainVideo.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-700 ease-in-out opacity-80"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/25 transition duration-500">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-[0_0_25px_rgba(220,38,38,0.7)] group-hover:scale-110 transition duration-300">
                    <PlayCircle className="w-9 h-9 sm:w-11 sm:h-11" />
                  </div>
                </div>

                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 text-slate-200">
                  <Clock className="w-3.5 h-3.5" /> {mainVideo.duration}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-5 sm:p-7 bg-gradient-to-t from-black via-black/85 to-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-600 text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shadow-xs">
                      {mainVideo.tag}
                    </span>
                    <span className="text-xs text-slate-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {mainVideo.views}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-white drop-shadow-md group-hover:text-red-400 transition">
                    {mainVideo.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Side Videos */}
            <div className="flex flex-col gap-4 justify-between">
              {sideVideos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveVideo({ title: item.title, youtubeId: item.youtubeId })}
                  className="flex gap-3.5 group cursor-pointer bg-white/5 hover:bg-white/10 backdrop-blur-xs p-3 sm:p-3.5 rounded-xl transition duration-300 border border-slate-800 hover:border-slate-600 shadow-md"
                >
                  <div className="w-28 sm:w-32 h-20 sm:h-22 rounded-lg overflow-hidden relative shrink-0 bg-slate-900">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover opacity-80 group-hover:scale-105 transition duration-500"
                      sizes="128px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition duration-300">
                      <PlayCircle className="w-7 h-7 text-white opacity-90 group-hover:scale-110 transition" />
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1 rounded text-white font-medium">
                      {item.duration}
                    </span>
                  </div>

                  <div className="flex flex-col justify-center min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-white line-clamp-2 leading-snug transition mb-1.5">
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {item.time} • {item.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal Preview */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <h4 className="text-sm font-bold text-white truncate max-w-xl">{activeVideo.title}</h4>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                aria-label="Đóng video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
