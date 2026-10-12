import { Star, ShieldCheck } from "lucide-react";

export default function TestimonialSection() {
  const testimonials = [
    {
      name: "Minh Anh",
      role: "Freelance Designer",
      purchase: "MacBook Pro M3 Max",
      date: "3 ngày trước",
      text: "Máy nguyên seal chính hãng, màn hình Liquid Retina cực chuẩn màu. Đội ngũ kỹ thuật hỗ trợ cài đặt các phần mềm thiết kế rất chu đáo. Giá tốt hơn các chuỗi bán lẻ lớn đáng kể!",
      rating: 5,
    },
    {
      name: "Tuấn Kiệt",
      role: "Lập trình viên / Gamer",
      purchase: "Lenovo Legion 5 Pro RTX 4070",
      date: "1 tuần trước",
      text: "Đóng gói kỹ 3 lớp chống sốc, giao hàng hoả tốc nhận trong ngày tại Hà Nội. Test máy đạt 100% điểm hiệu năng, nhiệt độ mát mẻ. Chính sách bảo hành 12 tháng tại shop làm mình rất an tâm.",
      rating: 5,
    },
    {
      name: "Hải Yến",
      role: "Sinh viên ĐH Ngoại Thương",
      purchase: "ThinkPad X1 Carbon Gen 10 (Like New 99%)",
      date: "2 tuần trước",
      text: "Lúc đầu hơi lo lắng khi mua máy cũ, nhưng khi nhận máy thì ngỡ ngàng vì đẹp như mới khui hộp! Bàn phím gõ êm vô địch, pin test còn 96%. CitiLap tư vấn rất có tâm, không chèo kéo cấu hình đắt.",
      rating: 5,
    },
  ];

  return (
    <section className="pb-16" aria-label="Đánh giá từ khách hàng">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                  Khách Hàng Nói Gì Về CitiLap
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Đánh giá thực tế từ khách hàng mua trực tiếp tại cửa hàng và đặt hàng trực tuyến
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80 self-start md:self-auto">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="text-xs font-bold text-slate-700">
                <span className="text-sm font-black text-slate-900">4.9 / 5</span> (1.200+ đánh giá)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {testimonials.map((review, i) => (
              <div
                key={i}
                className="flex flex-col justify-between border border-slate-200/80 rounded-2xl p-5 sm:p-6 bg-slate-50/40 hover:bg-white hover:border-blue-400 hover:shadow-md transition duration-300 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {review.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{review.name}</h3>
                        <p className="text-[11px] text-slate-500">{review.role}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{review.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex gap-0.5">
                      {[...Array(review.rating)].map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full ml-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã mua hàng
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                    &quot;{review.text}&quot;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Sản phẩm:</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded truncate max-w-[200px]">
                    {review.purchase}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
