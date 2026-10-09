import { Star } from "lucide-react";

export default function TestimonialSection() {
  const testimonials = [
    { name: "Minh Anh", purchase: "MacBook Air M3", text: "Máy nguyên seal, đội ngũ tư vấn nhiệt tình. Giá tốt hơn nhiều nơi khác. Sẽ ủng hộ shop dài dài!" },
    { name: "Tuấn Kiệt", purchase: "Lenovo Legion 5 Pro", text: "Giao hàng nhanh, đóng gói cẩn thận. Chơi game cực mượt, không giật lag. Chính sách bảo hành 12 tháng rất an tâm." },
    { name: "Hải Yến", purchase: "[Cũ 99%] ThinkPad X1", text: "Máy lướt như mới, pin còn 95%. Rất phù hợp cho sinh viên cần máy nhẹ. Đúng như cam kết của shop!" },
  ];

  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100/50 p-6 md:p-10 hover:shadow-xl transition duration-500">
          <div className="flex items-center gap-4 mb-8 border-b-2 border-blue-50 pb-5">
            <div className="bg-yellow-50 p-3 rounded-full">
              <Star className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-wide">
              Khách Hàng Nói Gì Về CitiLap
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((review, i) => (
              <div 
                key={i} 
                className="flex flex-col gap-4 border border-gray-100 rounded-2xl p-6 bg-gray-50/40 hover:bg-white hover:border-blue-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-110 transition duration-300">
                    {review.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{review.name}</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md mt-1 inline-block">
                      Đã mua: {review.purchase}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed italic">
                  &quot;{review.text}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
