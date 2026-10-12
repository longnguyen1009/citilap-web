import { Laptop, ShieldCheck, ThumbsUp, Truck } from "lucide-react";

const features = [
  {
    icon: Laptop,
    title: "Máy lướt, giá tốt",
    desc: "Like-new 99%, tiết kiệm 30 - 50%",
    color: "from-blue-600 to-indigo-600",
    bgHover: "hover:border-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Cam kết nguyên zin",
    desc: "100% linh kiện chuẩn, chưa sửa chữa",
    color: "from-emerald-600 to-teal-600",
    bgHover: "hover:border-emerald-500",
  },
  {
    icon: ThumbsUp,
    title: "Dịch vụ vượt trội",
    desc: "Bảo hành 12 tháng, 1 đổi 1 trong 7 ngày",
    color: "from-amber-500 to-orange-600",
    bgHover: "hover:border-amber-500",
  },
  {
    icon: Truck,
    title: "Giao hàng hỏa tốc",
    desc: "Đồng kiểm máy trước khi thanh toán",
    color: "from-indigo-600 to-purple-600",
    bgHover: "hover:border-indigo-500",
  },
];

export default function FeatureStrip() {
  return (
    <section className="pb-10 pt-2" aria-label="Cam kết dịch vụ">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition duration-300 group ${feature.bgHover}`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr ${feature.color} text-white flex items-center justify-center shrink-0 shadow-md shadow-slate-200 group-hover:scale-105 transition duration-300`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition truncate">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 leading-snug">
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
