'use client';

import { useEffect, useState } from 'react';
import type { ProductDocument } from '@/contracts/cms/product-studio';

export default function ProductStorefrontFields({ document: d, onChange, productId }: {
  document: ProductDocument;
  onChange: <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => void;
  productId?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Array<{id:string;name:string;publicName:string}>>([]);
  const [error, setError] = useState('');
  const [names, setNames] = useState<Record<string,string>>({});
  const ids = JSON.stringify(d.accessoryProductIds || []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/admin/products?publicationStatus=PUBLISHED&limit=30&q='+encodeURIComponent(query), {signal:controller.signal})
        .then(async response => {const data = await response.json();if (!response.ok || !data.success) throw Error('Không tải được sản phẩm mua kèm.');return data.data.items;})
        .then(setProducts).catch(error => {if (!controller.signal.aborted) setError(error.message);});
    }, 250);
    return () => {clearTimeout(timer);controller.abort();};
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all((JSON.parse(ids) as string[]).map(async id => {
      const response = await fetch('/api/admin/products/'+encodeURIComponent(id), {signal:controller.signal});
      const data = await response.json();
      return [id, response.ok && data.success ? data.data.document.name : 'Sản phẩm không còn khả dụng'] as const;
    })).then(entries => setNames(Object.fromEntries(entries))).catch(() => {if (!controller.signal.aborted) setError('Không tải được tên phụ kiện đã chọn.');});
    return () => controller.abort();
  }, [ids]);
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  return <div className="space-y-6 border-t border-slate-200 pt-5">
    <section className="space-y-3" aria-label="FAQ sản phẩm">
      <h3 className="text-sm font-bold">Câu hỏi thường gặp trên trang sản phẩm</h3>
      {(d.faqs || []).map((faq, index) => <div key={index} className="space-y-2 rounded-xl border p-3">
        <label className="block text-xs">Câu hỏi {index+1}<input className={input} maxLength={300} value={faq.q} onChange={e => onChange('faqs',d.faqs.map((item,i) => i === index ? {...item,q:e.target.value} : item))} /></label>
        <label className="block text-xs">Trả lời<textarea className={input} maxLength={2000} value={faq.a} onChange={e => onChange('faqs',d.faqs.map((item,i) => i === index ? {...item,a:e.target.value} : item))} /></label>
        <button type="button" className="text-xs text-red-700" onClick={() => onChange('faqs',d.faqs.filter((_,i) => i !== index))}>Xóa câu hỏi</button>
      </div>)}
      <button type="button" disabled={(d.faqs || []).length >= 20} onClick={() => onChange('faqs',[...(d.faqs || []),{q:'',a:''}])} className="text-sm font-semibold text-blue-700">+ Thêm câu hỏi</button>
    </section>
    <section className="space-y-2" aria-label="Quà tặng sản phẩm">
      <h3 className="text-sm font-bold">Quà tặng kèm theo máy</h3>
      {(d.gifts || []).map((gift,index) => <div key={index} className="flex gap-2"><input aria-label={'Quà tặng '+(index+1)} className={input} value={gift} maxLength={500} onChange={e => onChange('gifts',d.gifts.map((item,i) => i === index ? e.target.value : item))} /><button type="button" className="text-xs text-red-700" onClick={() => onChange('gifts',d.gifts.filter((_,i) => i !== index))}>Xóa</button></div>)}
      <button type="button" disabled={(d.gifts || []).length >= 10} className="text-sm font-semibold text-blue-700" onClick={() => onChange('gifts',[...(d.gifts || []),''])}>+ Thêm quà tặng</button>
    </section>
    <section className="space-y-2" aria-label="Sản phẩm mua kèm">
      <h3 className="text-sm font-bold">Phụ kiện mua kèm</h3>
      <p className="text-xs text-slate-500">Chọn tối đa 8 sản phẩm thật. Giá theo cấu hình đầu tiên đang công khai; phụ kiện được lưu thành dòng hàng riêng trong đơn.</p>
      {(d.accessoryProductIds || []).map((id,index) => <div key={id} className="flex items-center gap-3 rounded border p-2 text-sm"><span className="flex-1">{names[id] || 'Đang tải tên…'}</span><button type="button" disabled={!index} onClick={() => {const next=[...d.accessoryProductIds];[next[index-1],next[index]]=[next[index],next[index-1]];onChange('accessoryProductIds',next);}}>Lên</button><button type="button" className="text-red-700" onClick={() => onChange('accessoryProductIds',d.accessoryProductIds.filter(value => value !== id))}>Xóa</button></div>)}
      <label className="block text-xs">Tìm sản phẩm mua kèm<input type="search" className={input} value={query} onChange={e => setQuery(e.target.value)} /></label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="max-h-48 overflow-y-auto divide-y rounded border">{products.filter(p => p.id !== productId && !(d.accessoryProductIds || []).includes(p.id)).map(p => <button key={p.id} type="button" disabled={(d.accessoryProductIds || []).length >= 8} className="block w-full p-2 text-left text-sm hover:bg-blue-50" onClick={() => {setNames(previous => ({...previous,[p.id]:p.publicName || p.name}));onChange('accessoryProductIds',[...(d.accessoryProductIds || []),p.id]);}}>+ {p.publicName || p.name}</button>)}</div>
    </section>
  </div>;
}
