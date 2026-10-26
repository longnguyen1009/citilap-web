'use client';

import { useEffect, useState } from 'react';

type Target = { productId: string; variantId: string | null; salePrice: string; regularPrice: number; displayName: string };
type Product = { id: string; name: string; publicName: string; price: number; productStatus: string };

export default function CampaignProductPicker({ onAdd }: { onAdd: (items: Target[]) => void }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError('');
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(query)}&publicationStatus=PUBLISHED&limit=20`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok || !json.success) throw Error(json.error || 'Không tải được sản phẩm');
        setProducts(json.data.items.filter((p: Product) => ['ACTIVE', 'active'].includes(p.productStatus)));
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được sản phẩm'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function add(product: Product) {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/products/${product.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw Error(json.error || 'Không tải được cấu hình');
      const document = json.data.document;
      const variants: { id: string; name?: string; sku: string; price: number }[] = document.variants;
      onAdd(variants.length ? variants.map(v => ({ productId: product.id, variantId: v.id, salePrice: '', regularPrice: v.price, displayName: `${product.publicName || product.name} · ${v.name || v.sku}` })) : [{ productId: product.id, variantId: null, salePrice: '', regularPrice: document.price, displayName: product.publicName || product.name }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thêm được sản phẩm'); }
    finally { setBusy(false); }
  }
  return <div className="mb-4 space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
    <label className="block text-xs font-semibold text-slate-700">Chọn sản phẩm tham gia chiến dịch
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên laptop, SKU…" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
    </label>
    <p className="text-xs text-slate-500">Thêm sản phẩm sẽ thêm từng cấu hình. Nhập giá sale bên dưới; có thể bỏ cấu hình không tham gia.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-lg bg-white" aria-busy={busy}>
      {products.map(p => <button key={p.id} type="button" disabled={busy} onClick={() => add(p)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-blue-50 disabled:opacity-50"><span>{p.publicName || p.name}</span><span className="shrink-0 font-semibold text-blue-700">+ Thêm</span></button>)}
      {!busy && !products.length && <p className="p-3 text-xs text-slate-500">Không có sản phẩm phù hợp.</p>}
    </div>
  </div>;
}
