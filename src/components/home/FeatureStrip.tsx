import { Laptop, ShieldCheck, ThumbsUp, Truck } from "lucide-react";

const features = [
  { icon: Laptop, title: "Máy lướt, giá tốt" },
  { icon: ShieldCheck, title: "Cam kết nguyên zin" },
  { icon: ThumbsUp, title: "Dịch vụ vượt trội" },
  { icon: Truck, title: "Giao hàng nhanh chóng" },
];

export default function FeatureStrip() {
  return (
    <section className="pb-12">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white border-b-4 border-blue-600 rounded-xl p-4 flex flex-col md:flex-row items-center justify-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 cursor-pointer group"
              >
                <div className="bg-blue-50 text-blue-600 p-3 rounded-full group-hover:bg-blue-600 group-hover:text-white transition duration-300">
                  <Icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <span className="font-bold text-gray-800 text-sm md:text-base text-center md:text-left group-hover:text-blue-600 transition duration-300">
                  {feature.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
