import { Check, RefreshCw, ShieldCheck, BadgeCheck, Wrench } from 'lucide-react';

const DEFAULT_TRUST_ITEMS = [
  'Lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi phần cứng',
  'Cam kết máy nguyên zin 100%, kiểm tra trực tiếp tại Showroom',
  'Bảo hành tiêu chuẩn 6 tháng (máy New) & 3 tháng (máy Like New) tại CitiLap',
  'Hỗ trợ cài đặt phần mềm, vệ sinh tra keo tản nhiệt miễn phí',
];

const DEFAULT_TRUST_DETAILS = [
  { title: '1 đổi 1 trong 7 ngày', description: 'Khi phát sinh lỗi phần cứng.', icon: RefreshCw },
  { title: 'Máy nguyên zin 100%', description: 'Kiểm tra trực tiếp tại showroom.', icon: BadgeCheck },
  { title: 'Bảo hành tại CitiLap', description: 'Máy New: 6 tháng · Like New: 3 tháng.', icon: ShieldCheck },
  { title: 'Chăm sóc máy miễn phí', description: 'Cài phần mềm, vệ sinh & tra keo tản nhiệt.', icon: Wrench },
];

export default function ProductTrustBadges({ items = [] }: { items?: string[] }) {
  const displayItems = items.length > 0 ? items : DEFAULT_TRUST_ITEMS;
  return (
    <section aria-label="Đặc quyền mua hàng" className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-3.5">
      <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
        <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0 text-blue-600" />
        Đặc quyền an tâm khi mua tại CitiLap
      </h2>
      <ul className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-2 gap-x-4 gap-y-3">
        {displayItems.map((text, index) => {
          const detail = DEFAULT_TRUST_DETAILS[DEFAULT_TRUST_ITEMS.indexOf(text)];
          const Icon = detail?.icon || Check;
          return (
            <li key={index} className="flex items-start gap-2 min-w-0">
              <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 text-xs leading-snug break-words">
                <p className="font-semibold text-slate-800">{detail?.title || text}</p>
                {detail && <p className="mt-0.5 text-[11px] text-slate-600">{detail.description}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
