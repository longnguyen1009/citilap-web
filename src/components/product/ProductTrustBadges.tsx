import { ShieldCheck } from 'lucide-react';

export default function ProductTrustBadges({ items = [] }: { items?: string[] }) {
  if (!items.length) return null;
  return <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" />Đặc quyền an tâm khi mua tại CitiLap</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-700">
      {items.map((text, index) => <div key={index} className="flex items-start gap-1.5"><span className="text-emerald-600 font-bold">✓</span><span>{text}</span></div>)}
    </div>
  </div>;
}
