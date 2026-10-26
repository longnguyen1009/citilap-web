import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';

export default function ProductPromoBanners({ banners = [] }: { banners?: PublicStorefrontSettings['productBanners'] }) {
  return <div className="space-y-3">{banners.map((banner, index) => <div key={index} className={'rounded-2xl p-4 bg-gradient-to-br text-white shadow-md space-y-2 ' + (index ? 'from-rose-900 to-slate-900' : 'from-indigo-900 to-blue-950')}>
    <h4 className="text-sm font-black">{banner.title}</h4><p className="text-[11px] leading-snug">{banner.description}</p>
    <Link href={banner.href} className="text-xs font-bold inline-flex items-center gap-1">Tìm hiểu thêm <ArrowRight className="w-3 h-3" /></Link>
  </div>)}</div>;
}
