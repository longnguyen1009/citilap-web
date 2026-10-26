import { Truck, CheckCircle2 } from 'lucide-react';

export default function ProductShippingCommitment({ items = [] }: { items?: string[] }) {
  if (!items.length) return null;
  return <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 space-y-3">
    <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 pb-2.5 border-b border-gray-100"><Truck className="w-4 h-4 text-blue-600" />Chính sách vận chuyển & cam kết</h3>
    <div className="space-y-2 text-xs text-gray-700">{items.map((text, index) => <div key={index} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>{text}</span></div>)}</div>
  </div>;
}
