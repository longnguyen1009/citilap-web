"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Laptop,
  Briefcase,
  Gamepad2,
  Palette,
  ShieldCheck,
  Check,
  AlertTriangle,
  Sparkles,
  PhoneCall,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Info,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { trackStorefront } from "@/lib/storefront-metrics";
import { businessProfile } from "@/config/business-profile";
import type { AdvisorInput } from "@/contracts/catalog/advisor";
import type { adviseLaptops } from "@/server/services/advisor.service";

interface LaptopAdvisorClientProps {
  initialInput: AdvisorInput;
  initialResults: Awaited<ReturnType<typeof adviseLaptops>>;
  initialError?: string;
  zaloUrl?: string | null;
}

const BUDGET_PRESETS = [
  { label: "15 triệu", value: 15_000_000 },
  { label: "20 triệu", value: 20_000_000 },
  { label: "25 triệu", value: 25_000_000 },
  { label: "30 triệu", value: 30_000_000 },
  { label: "40 triệu", value: 40_000_000 },
  { label: "50 triệu+", value: 50_000_000 },
];

const NEED_OPTIONS = [
  {
    id: "office",
    title: "Văn phòng & Lập trình",
    desc: "Mượt mà Office, Excel dữ liệu lớn, lập trình Web/App, pin bền và quạt êm.",
    badge: "RAM ≥ 16GB · Màn đẹp",
    icon: Briefcase,
    color: "blue",
  },
  {
    id: "gaming",
    title: "Gaming & Thể thao điện tử",
    desc: "Chiến mượt các tựa game AAA & Esport với card đồ họa rời (RTX / GTX), màn hình tần số quét cao.",
    badge: "Card rời RTX/GTX · Tần số quét cao",
    icon: Gamepad2,
    color: "rose",
  },
  {
    id: "creator",
    title: "Đồ họa, Dựng Video & CAD",
    desc: "Render 3D, dựng Premiere 4K, Photoshop, AutoCAD với GPU mạnh và màn chuẩn màu 100% sRGB.",
    badge: "GPU chuyên sâu · Chuẩn màu",
    icon: Palette,
    color: "purple",
  },
] as const;

const CONDITION_OPTIONS = [
  { value: "any", label: "Tất cả tình trạng", desc: "Tối ưu cấu hình cao nhất trong tầm tiền" },
  { value: "NEW", label: "Máy mới 100% Fullbox", desc: "Nguyên seal, bảo hành chính hãng" },
  { value: "USED", label: "Like New 99% Tuyển chọn", desc: "Tiết kiệm 20 - 30%, hình thức đẹp" },
] as const;

const PORTABLE_OPTIONS = [
  { value: "any", label: "Tiêu chuẩn / Không giới hạn", desc: "Ưu tiên tản nhiệt & hiệu năng tối đa" },
  { value: "yes", label: "Mỏng nhẹ di động (≤ 1.6 kg)", desc: "Tiện mang đi học, đi làm, cà phê cả ngày" },
] as const;

export default function LaptopAdvisorClient({
  initialInput,
  initialResults,
  initialError,
  zaloUrl,
}: LaptopAdvisorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const effectiveZaloBase = (zaloUrl || businessProfile.socialProfiles.zalo || 'https://zalo.me/0899188186').replace(/\/$/, '');
  const hotline = businessProfile.displayPhone || '0899.188.186';
  const hotlineTel = `tel:${businessProfile.phone || '0899188186'}`;

  const [budget, setBudget] = useState<number>(initialInput.budget);
  const [need, setNeed] = useState<"office" | "gaming" | "creator">(initialInput.need);
  const [condition, setCondition] = useState<"any" | "NEW" | "USED">(initialInput.condition);
  const [portable, setPortable] = useState<"any" | "yes">(initialInput.portable);

  const budgetInputId = useId();

  const formatCurrency = (val: number) => `${val.toLocaleString("vi-VN")}₫`;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    params.set("budget", String(budget));
    params.set("need", need);
    params.set("condition", condition);
    params.set("portable", portable);

    startTransition(() => {
      router.push(`/chon-laptop?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setBudget(25_000_000);
    setNeed("office");
    setCondition("any");
    setPortable("any");
    startTransition(() => {
      router.push("/chon-laptop");
    });
  };

  const breadcrumbItems = [
    { label: "Trang chủ", href: "/" },
    { label: "Chọn laptop theo nhu cầu", href: "/chon-laptop" },
  ];

  return (
    <div className="bg-surface min-h-screen pb-16">
      <Breadcrumb items={breadcrumbItems} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-4 space-y-8">
        {/* 1. HERO HEADER */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CitiLap Smart Advisor • Cố vấn cấu hình thông minh</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Chọn Laptop Chuẩn Nhu Cầu & Ngân Sách
            </h1>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Hệ thống tự động phân tích hàng trăm mẫu máy đang có sẵn tại CitiLap để đề xuất tối đa 3 chiếc laptop
              tối ưu nhất cho công việc của bạn. Tất cả máy đều có RAM từ 16GB và qua 24 bước kiểm định khắt khe.
            </p>

            {/* Trust chips */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-blue-200">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Kiểm định 24 bước độc quyền
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                Tiêu chuẩn RAM ≥ 16GB
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                7 ngày lỗi đổi mới
              </span>
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE CONFIGURATION FORM */}
        <section aria-labelledby="advisor-form-title" className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border-b border-slate-200 pb-4">
              <h2 id="advisor-form-title" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Tiêu chí lựa chọn của bạn</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kéo chỉnh ngân sách và chọn công việc chính để hệ thống lọc ra các máy tốt nhất.
              </p>
            </div>

            {/* Step 1: Ngân sách */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label htmlFor={budgetInputId} className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                  <span>Ngân sách tối đa bạn dự định đầu tư:</span>
                </label>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
                    {formatCurrency(budget)}
                  </span>
                </div>
              </div>

              {/* Slider (accent-color brand styling per brand-consistent-forms guidance) */}
              <div className="space-y-2">
                <input
                  id={budgetInputId}
                  name="budget"
                  type="range"
                  min="5000000"
                  max="80000000"
                  step="1000000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  style={{ accentColor: "#1d4ed8" }}
                  className="w-full h-2.5 bg-slate-200 rounded-lg cursor-pointer"
                  aria-valuemin={5000000}
                  aria-valuemax={80000000}
                  aria-valuenow={budget}
                  aria-valuetext={formatCurrency(budget)}
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>5 triệu</span>
                  <span>25 triệu</span>
                  <span>50 triệu</span>
                  <span>80 triệu+</span>
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-500 mr-1">Mốc phổ biến:</span>
                {BUDGET_PRESETS.map((preset) => {
                  const isSelected = budget === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setBudget(preset.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Nhu cầu chính (3 Rich Cards) */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
                <span>Nhu cầu sử dụng chính:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {NEED_OPTIONS.map((opt) => {
                  const isSelected = need === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNeed(opt.id)}
                      className={`p-4 sm:p-5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-3" />
                        </span>
                      )}

                      <div className="space-y-2">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            opt.color === "rose"
                              ? "bg-rose-100 text-rose-600"
                              : opt.color === "purple"
                              ? "bg-purple-100 text-purple-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                            {opt.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {opt.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <span className="inline-block text-[11px] font-semibold text-blue-800 bg-blue-100/60 px-2.5 py-1 rounded-md">
                          {opt.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3 & 4: Tình trạng máy & Tính di động */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Tình trạng máy */}
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
                  <span>Tình trạng máy mong muốn:</span>
                </div>
                <div className="space-y-2">
                  {CONDITION_OPTIONS.map((c) => {
                    const isSelected = condition === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCondition(c.value)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 font-bold text-blue-950 ring-1 ring-blue-500/20"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{c.label}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{c.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tính di động */}
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">4</span>
                  <span>Mức độ di chuyển thường xuyên:</span>
                </div>
                <div className="space-y-2">
                  {PORTABLE_OPTIONS.map((p) => {
                    const isSelected = portable === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPortable(p.value)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 font-bold text-blue-950 ring-1 ring-blue-500/20"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{p.label}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{p.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Thuật toán đối soát RAM, GPU, cân nặng và giá bán tự động cập nhật theo thời gian thực.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Đặt lại
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>{isPending ? "Đang tìm máy..." : "Tìm máy phù hợp ngay"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 3. RESULTS DISPLAY SECTION */}
        <section aria-labelledby="results-section-title" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="results-section-title" className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>Đề xuất máy tối ưu</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {initialResults.length} máy phù hợp
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Các máy được sắp xếp theo mức độ tương thích công việc và tỷ lệ hiệu năng / giá thành tốt nhất.
              </p>
            </div>

            <Link
              href="/lien-he"
              className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Cần tư vấn sâu theo phần mềm chuyên ngành? Nhắn CitiLap →</span>
            </Link>
          </div>

          {/* Error Banner if any */}
          {initialError ? (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Lỗi tra cứu:</strong>
                <p>{initialError}</p>
              </div>
            </div>
          ) : initialResults.length > 0 ? (
            /* 3-Column Recommendations Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialResults.map(({ product, reasons, limitation }, idx) => {
                const rankLabels = ["#1 Đề xuất tối ưu nhất", "#2 Lựa chọn đáng mua", "#3 Cấu hình nâng cao"];
                return (
                  <article
                    key={product.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Rank ribbon badge */}
                      <div className="mb-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {rankLabels[idx] || `#${idx + 1} Đề xuất`}
                        </span>
                      </div>

                      {/* Main Product Card */}
                      <ProductCard product={product} />

                      {/* Expert Evaluation Box */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3.5 rounded-xl border">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Điểm phù hợp nổi bật:</span>
                          </h4>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                            {reasons.map((reason, rIdx) => (
                              <li key={rIdx} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Consideration note */}
                        <div className="pt-2 border-t border-slate-200/80">
                          <div className="flex items-start gap-1.5 text-xs text-amber-900 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-amber-950">Cần cân nhắc: </strong>
                              <span>{limitation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 space-y-2">
                      <a
                        href={`${effectiveZaloBase}?text=${encodeURIComponent(
                          `Chào CitiLap, mình đang xem laptop [${product.name}] giá ${formatCurrency(
                            typeof product.price === "number" ? product.price : parseInt(String(product.price))
                          )} theo công cụ tư vấn, cần hỗ trợ thêm thông tin máy.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackStorefront('contact_click')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat Zalo tư vấn cấu hình máy này</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empathic Empty State with Actionable Guidance */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Laptop className="w-8 h-8 stroke-1.5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Chưa có máy đáp ứng đủ đồng thời các tiêu chí này
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Với ngân sách hiện tại ({formatCurrency(budget)}) kết hợp cùng tiêu chí ({need === "gaming" ? "Gaming card rời" : need === "creator" ? "Đồ họa CAD" : "Văn phòng"} + RAM ≥16GB), kho máy hiện chưa có sẵn cấu hình khớp 100%.
                </p>
              </div>

              {/* Suggestions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Gợi ý cách khắc phục nhanh:</span>
                </div>
                <div className="space-y-1.5 pl-5 list-disc">
                  <div>• Thử chọn <strong>&quot;Tất cả tình trạng&quot;</strong> hoặc <strong>&quot;Like New 99%&quot;</strong> để tối ưu thêm 20-30% cấu hình.</div>
                  <div>• Nâng nhẹ ngân sách thêm 3 - 5 triệu đồng để tiếp cận các dòng máy có card đồ họa rời mạnh hơn.</div>
                  <div>• Bỏ giới hạn trọng lượng 1.6 kg nếu đang chọn máy Gaming hoặc đồ họa nặng.</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCondition("any");
                    setBudget((b) => Math.min(80_000_000, b + 5_000_000));
                    handleSubmit();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                >
                  Nâng ngân sách +5 triệu & Xem lại
                </button>
                <a
                  href={hotlineTel}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <span>Gọi Hotline {hotline}</span>
                </a>
              </div>
            </div>
          )}
        </section>

        {/* 4. SERVICE GUARANTEES FOOTER BAR */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-0.5">Kiểm định độc quyền</h4>
                <p className="text-slate-500">Mỗi máy có chứng thư kiểm định 24 bước minh bạch từng linh kiện.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-0.5">Lỗi 1 đổi 1 trong 7 ngày</h4>
                <p className="text-slate-500">Đổi mới ngay lập tức nếu máy phát sinh lỗi phần cứng từ nhà sản xuất.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-0.5">Hỗ trợ phần mềm trọn đời</h4>
                <p className="text-slate-500">Cài đặt Windows, Office, đồ họa và vệ sinh máy định kỳ hoàn toàn miễn phí.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-0.5">Tư vấn viên tận tâm</h4>
                <p className="text-slate-500">Hotline {hotline} & Zalo túc trực từ 9h đến 20h hàng ngày.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

