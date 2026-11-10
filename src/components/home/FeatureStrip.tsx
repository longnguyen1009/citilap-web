import { Laptop, ShieldCheck, ThumbsUp, Truck } from "lucide-react";
import { DEFAULT_SETTINGS, type PublicStorefrontSettings } from "@/contracts/cms/settings";

interface FeatureStripProps {
  settings?: Partial<PublicStorefrontSettings> | null;
}

export default function FeatureStrip({ settings: customSettings }: FeatureStripProps = {}) {
  const s = { ...DEFAULT_SETTINGS, ...customSettings };

  const features = [
    {
      icon: Laptop,
      title: s.feature1Title || DEFAULT_SETTINGS.feature1Title,
      desc: s.feature1Desc || DEFAULT_SETTINGS.feature1Desc,
      color: "from-blue-600 to-indigo-600",
      bgHover: "hover:border-blue-500",
    },
    {
      icon: ShieldCheck,
      title: s.feature2Title || DEFAULT_SETTINGS.feature2Title,
      desc: s.feature2Desc || DEFAULT_SETTINGS.feature2Desc,
      color: "from-emerald-600 to-teal-600",
      bgHover: "hover:border-emerald-500",
    },
    {
      icon: ThumbsUp,
      title: s.feature3Title || DEFAULT_SETTINGS.feature3Title,
      desc: s.feature3Desc || DEFAULT_SETTINGS.feature3Desc,
      color: "from-amber-500 to-orange-600",
      bgHover: "hover:border-amber-500",
    },
    {
      icon: Truck,
      title: s.feature4Title || DEFAULT_SETTINGS.feature4Title,
      desc: s.feature4Desc || DEFAULT_SETTINGS.feature4Desc,
      color: "from-indigo-600 to-purple-600",
      bgHover: "hover:border-indigo-500",
    },
  ];

  return (
    <section className="py-2.5 md:py-4" aria-label="Cam kết dịch vụ">
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`bg-white border border-slate-200/80 rounded-lg lg:rounded-xl p-2 md:p-3 lg:p-3.5 flex flex-col justify-start text-left gap-1 shadow-2xs hover:shadow-xs transition duration-200 motion-reduce:transition-none group ${feature.bgHover}`}
              >
                <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-gradient-to-tr ${feature.color} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-[12px] md:text-[13px] lg:text-[14px] group-hover:text-blue-600 transition leading-tight min-w-0 flex-1">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-[11px] md:text-[12px] text-slate-600 leading-snug">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
