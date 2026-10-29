import { ShieldCheck } from 'lucide-react';

const DEFAULT_TRUST_ITEMS = [
  'Lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi phần cứng',
  'Cam kết máy nguyên zin 100%, kiểm tra trực tiếp tại Showroom',
  'Bảo hành phần cứng từ 3 – 12 tháng theo gói tiêu chuẩn CitiLap',
  'Hỗ trợ cài đặt phần mềm, vệ sinh tra keo tản nhiệt miễn phí',
];

export default function ProductTrustBadges({ items = [] }: { items?: string[] }) {
  const displayItems = items.length > 0 ? items : DEFAULT_TRUST_ITEMS;
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 sm:p-4 space-y-2.5">
      <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        Đặc quyền an tâm khi mua tại CitiLap
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-slate-700">
        {displayItems.map((text, index) => (
          <div key={index} className="flex items-start gap-1.5 leading-snug">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
