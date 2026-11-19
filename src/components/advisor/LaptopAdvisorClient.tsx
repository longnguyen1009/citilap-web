"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Gamepad2,
  Palette,
  Laptop,
  AlertTriangle,
  MessageSquare,
  PhoneCall,
  RotateCcw,
  Search,
  Check,
  Feather,
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
    title: "Văn phòng & Học tập",
    shortDesc: "Office, lập trình, pin bền",
    icon: Briefcase,
  },
  {
    id: "gaming",
    title: "Gaming",
    shortDesc: "Card rời RTX/GTX, màn mượt",
    icon: Gamepad2,
  },
  {
    id: "creator",
    title: "Đồ họa & Video",
    shortDesc: "GPU mạnh, màn chuẩn màu",
    icon: Palette,
  },
] as const;

const CONDITION_OPTIONS = [
  { value: "any", label: "Tất cả" },
  { value: "NEW", label: "Mới 100%" },
  { value: "USED", label: "Like New 99%" },
] as const;

export default function LaptopAdvisorClient({
  initialInput,
  initialResults,
  initialError,
  zaloUrl,
}: LaptopAdvisorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const effectiveZaloBase = (zaloUrl || businessProfile.socialProfiles.zalo).replace(/\/$/, "");
  const hotline = businessProfile.displayPhone;
  const hotlineTel = `tel:${businessProfile.phone}`;

  const [budget, setBudget] = useState<number>(initialInput.budget);
  const [need, setNeed] = useState<"office" | "gaming" | "creator">(initialInput.need);
  const [condition, setCondition] = useState<"any" | "NEW" | "USED">(initialInput.condition);
  const [portable, setPortable] = useState<"any" | "yes">(initialInput.portable);

  const budgetInputId = useId();

  const formatCurrency = (val: number) => `${val.toLocaleString("vi-VN")}₫`;

  const applyFilters = (overrides?: {
    budget?: number;
    need?: "office" | "gaming" | "creator";
    condition?: "any" | "NEW" | "USED";
    portable?: "any" | "yes";
  }) => {
    const params = new URLSearchParams();
    params.set("budget", String(overrides?.budget ?? budget));
    params.set("need", overrides?.need ?? need);
    params.set("condition", overrides?.condition ?? condition);
    params.set("portable", overrides?.portable ?? portable);

    startTransition(() => {
      router.push(`/chon-laptop?${params.toString()}`, { scroll: false });
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleReset = () => {
    setBudget(25_000_000);
    setNeed("office");
    setCondition("any");
    setPortable("any");
    startTransition(() => {
      router.push("/chon-laptop", { scroll: false });
    });
  };

  const breadcrumbItems = [
    { label: "Trang chủ", href: "/" },
    { label: "Chọn laptop theo nhu cầu", href: "/chon-laptop" },
  ];

  return (
    <div className="bg-surface min-h-screen pb-16">
      <Breadcrumb items={breadcrumbItems} />

      <div className="container mx-auto px-3 sm:px-4 max-w-[1370px] mt-4 space-y-6">
        {/* 1. COMPACT HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Tư vấn chọn laptop
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Chọn ngân sách và nhu cầu chính để CitiLap lọc nhanh những mẫu máy phù hợp nhất.
            </p>
          </div>
          <Link
            href="/lien-he"
            className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Cần tư vấn trực tiếp?</span>
          </Link>
        </header>

        {/* 2. MINIMALIST FILTER PANEL */}
        <section
          aria-label="Bộ lọc tư vấn laptop"
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
              {/* Budget */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={budgetInputId} className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Ngân sách tối đa
                  </label>
                  <span className="text-lg sm:text-xl font-black text-blue-700 tabular-nums">
                    {formatCurrency(budget)}
                  </span>
                </div>

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
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
                  aria-valuemin={5000000}
                  aria-valuemax={80000000}
                  aria-valuenow={budget}
                  aria-valuetext={formatCurrency(budget)}
                />

                <div className="flex flex-wrap gap-1.5" style={{ flexWrap: "wrap" }}>
                  {BUDGET_PRESETS.map((preset) => {
                    const isSelected = budget === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setBudget(preset.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Need */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nhu cầu sử dụng
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {NEED_OPTIONS.map((opt) => {
                    const isSelected = need === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setNeed(opt.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 min-w-0 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm leading-tight truncate">
                            {opt.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {opt.shortDesc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom bar: Condition + Portable + Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 gap-0.5" role="group" aria-label="Tình trạng máy">
                  {CONDITION_OPTIONS.map((c) => {
                    const isSelected = condition === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setCondition(c.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-pressed={portable === "yes"}
                  onClick={() => setPortable((prev) => (prev === "yes" ? "any" : "yes"))}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    portable === "yes"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span>Mỏng nhẹ ≤ 1.6kg</span>
                  {portable === "yes" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>{isPending ? "Đang lọc..." : "Tìm máy phù hợp"}</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 3. RESULTS DISPLAY SECTION */}
        <section aria-labelledby="results-section-title" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="results-section-title" className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>Gợi ý phù hợp</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {initialResults.length} máy
              </span>
            </h2>
          </div>

          {initialError ? (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Lỗi tra cứu</strong>
                <p>{initialError}</p>
              </div>
            </div>
          ) : initialResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {initialResults.map(({ product, reasons, limitation }, idx) => {
                const rankLabels = ["#1 Tối ưu nhất", "#2 Đáng mua", "#3 Nâng cao"];
                return (
                  <article
                    key={product.id}
                    className="min-w-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                  >
                    {/* Top Rank Strip */}
                    <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          idx === 0
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200/70"
                        }`}
                      >
                        {rankLabels[idx] || `#${idx + 1} Đề xuất`}
                      </span>
                    </div>

                    {/* ProductCard with intrinsic height (overrides h-full to prevent overlap) */}
                    <div className="border-b border-slate-100">
                      <ProductCard
                        product={product}
                        className="h-auto! border-0! rounded-none! shadow-none! hover:shadow-none! hover:translate-y-0!"
                      />
                    </div>

                    {/* Evaluation & Zalo CTA */}
                    <div className="p-3.5 flex flex-col flex-1 gap-3 bg-slate-50/40">
                      <ul className="space-y-1 text-xs text-slate-700">
                        {reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>

                      {limitation && (
                        <p className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-2 rounded-lg border border-amber-200/60 leading-relaxed">
                          <strong className="font-semibold">Lưu ý: </strong>
                          {limitation}
                        </p>
                      )}

                      <a
                        href={`${effectiveZaloBase}?text=${encodeURIComponent(
                          `Chào CitiLap, mình đang xem laptop [${product.name}] giá ${formatCurrency(
                            typeof product.price === "number" ? product.price : parseInt(String(product.price), 10)
                          )} theo công cụ tư vấn, cần hỗ trợ thêm thông tin máy.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackStorefront("contact_click")}
                        className="mt-auto w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat Zalo tư vấn máy này</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Laptop className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Chưa có máy khớp đồng thời các tiêu chí này
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Thử nâng nhẹ ngân sách, chọn &quot;Tất cả&quot; tình trạng hoặc bỏ giới hạn mỏng nhẹ để xem thêm lựa chọn.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextBudget = Math.min(80_000_000, budget + 5_000_000);
                    setCondition("any");
                    setPortable("any");
                    setBudget(nextBudget);
                    applyFilters({ budget: nextBudget, condition: "any", portable: "any" });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Nâng ngân sách +5 triệu & xem lại
                </button>
                <a
                  href={hotlineTel}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gọi {hotline}</span>
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
