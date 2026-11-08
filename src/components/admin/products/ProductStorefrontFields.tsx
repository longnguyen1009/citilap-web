'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ArrowUp, Gift, PackagePlus, Settings } from 'lucide-react';
import type { ProductDocument } from '@/contracts/cms/product-studio';
import { DEFAULT_GIFT_BUNDLES, DEFAULT_ACCESSORY_BUNDLES, type GiftBundlePreset, type AccessoryBundlePreset } from '@/contracts/cms/settings';

export default function ProductStorefrontFields({
  document: d,
  onChange,
  productId,
}: {
  document: ProductDocument;
  onChange: <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => void;
  productId?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string; publicName: string; price?: number }>>([]);
  const [error, setError] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [giftBundles, setGiftBundles] = useState<GiftBundlePreset[]>(DEFAULT_GIFT_BUNDLES);
  const [accessoryBundles, setAccessoryBundles] = useState<AccessoryBundlePreset[]>(DEFAULT_ACCESSORY_BUNDLES);
  const ids = JSON.stringify(d.accessoryProductIds || []);

  // Load configured gift & accessory bundles from Admin Settings
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/settings', { credentials: 'same-origin', signal: controller.signal })
      .then(res => res.json())
      .then(json => {
        if (json?.success && json?.data?.document) {
          if (Array.isArray(json.data.document.giftBundles) && json.data.document.giftBundles.length > 0) {
            setGiftBundles(json.data.document.giftBundles);
          }
          if (Array.isArray(json.data.document.accessoryBundles) && json.data.document.accessoryBundles.length > 0) {
            setAccessoryBundles(json.data.document.accessoryBundles);
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/admin/products?publicationStatus=PUBLISHED&limit=30&q=' + encodeURIComponent(query), {
        signal: controller.signal,
      })
        .then(async response => {
          const data = await response.json();
          if (!response.ok || !data.success) throw Error('Không tải được sản phẩm mua kèm.');
          return data.data.items;
        })
        .then(setProducts)
        .catch(err => {
          if (!controller.signal.aborted) setError(err.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const parsedIds = JSON.parse(ids) as string[];
    if (!parsedIds.length) return;
    const controller = new AbortController();
    fetch(
      `/api/admin/products?ids=${encodeURIComponent(parsedIds.join(','))}&limit=${Math.min(100, Math.max(20, parsedIds.length))}`,
      { signal: controller.signal }
    )
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw Error('Không tải được tên phụ kiện.');
        const map: Record<string, string> = {};
        for (const item of data.data.items || []) {
          map[item.id] = item.publicName || item.name;
        }
        for (const id of parsedIds) {
          if (!map[id]) map[id] = 'Không còn khả dụng';
        }
        setNames(map);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Không tải được tên phụ kiện.');
      });
    return () => controller.abort();
  }, [ids]);

  const applyGiftBundle = (bundle: GiftBundlePreset) => {
    const merged = [...new Set([...bundle.gifts.filter(Boolean)])].slice(0, 10);
    onChange('gifts', merged);
  };

  const applyAccessoryBundle = (bundle: AccessoryBundlePreset) => {
    const validIds = bundle.productIds.filter(id => id && id !== productId);
    const merged = [...new Set([...(d.accessoryProductIds || []), ...validIds])].slice(0, 8);
    onChange('accessoryProductIds', merged);
  };

  return (
    <div className="space-y-6">
      {/* 1. QUÀ TẶNG */}
      <section className="space-y-3" aria-label="Quà tặng sản phẩm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-rose-600" />
            Quà tặng kèm theo máy <span className="text-slate-400 font-normal">({(d.gifts || []).length}/10)</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings?tab=product"
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
            >
              <Settings className="w-3 h-3" /> Cấu hình gói mặc định
            </Link>
            <button
              type="button"
              disabled={(d.gifts || []).length >= 10}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 cursor-pointer"
              onClick={() => onChange('gifts', [...(d.gifts || []), ''])}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng lẻ
            </button>
          </div>
        </div>

        {/* Preset Gift Bundles */}
        {giftBundles.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <span className="text-[11px] font-bold text-amber-900 block">
              Áp dụng nhanh gói quà tặng mẫu (Click để điền tự động):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {giftBundles.map(bundle => (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={() => applyGiftBundle(bundle)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100/80 text-amber-950 border border-amber-300 text-xs font-semibold transition shadow-2xs cursor-pointer flex items-center gap-1"
                  title={bundle.gifts.join('\n• ')}
                >
                  <Gift className="w-3 h-3 text-rose-500" />
                  <span>{bundle.name}</span>
                  <span className="text-[10px] text-amber-700 font-normal">({bundle.gifts.length} món)</span>
                </button>
              ))}
              {(d.gifts || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange('gifts', [])}
                  className="px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto"
                >
                  Xóa hết quà
                </button>
              )}
            </div>
          </div>
        )}

        {(d.gifts || []).length > 0 ? (
          <div className="space-y-1.5">
            {(d.gifts || []).map((gift, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono w-5 text-center">{index + 1}</span>
                <input
                  aria-label={'Quà tặng ' + (index + 1)}
                  className="matrix-input-cell flex-1"
                  value={gift}
                  maxLength={500}
                  placeholder="Ví dụ: Balo CitiLap chống sốc + Chuột không dây..."
                  onChange={e =>
                    onChange(
                      'gifts',
                      d.gifts.map((item, i) => (i === index ? e.target.value : item))
                    )
                  }
                />
                <button
                  type="button"
                  title="Xóa quà tặng"
                  aria-label={`Xóa quà tặng ${index + 1}`}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                  onClick={() =>
                    onChange(
                      'gifts',
                      d.gifts.filter((_, i) => i !== index)
                    )
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Chưa chọn quà tặng nào. Bấm vào gói quà mẫu phía trên hoặc thêm dòng lẻ.</p>
        )}
      </section>

      {/* 2. PHỤ KIỆN MUA KÈM */}
      <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Sản phẩm mua kèm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-blue-600" />
            Phụ kiện mua kèm <span className="text-slate-400 font-normal">({(d.accessoryProductIds || []).length}/8)</span>
          </span>
          <Link
            href="/admin/settings?tab=product"
            target="_blank"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
          >
            <Settings className="w-3 h-3" /> Cấu hình combo mua kèm mặc định
          </Link>
        </div>

        {/* Preset Accessory Bundles */}
        {accessoryBundles.some(b => b.productIds.length > 0) && (
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
            <span className="text-[11px] font-bold text-blue-900 block">
              Áp dụng nhanh gói phụ kiện mua kèm mẫu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {accessoryBundles
                .filter(b => b.productIds.length > 0)
                .map(bundle => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => applyAccessoryBundle(bundle)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100/80 text-blue-950 border border-blue-300 text-xs font-semibold transition shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <PackagePlus className="w-3 h-3 text-blue-600" />
                    <span>{bundle.name}</span>
                    <span className="text-[10px] text-blue-600 font-normal">({bundle.productIds.length} SP)</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {(d.accessoryProductIds || []).length > 0 && (
          <div className="space-y-1">
            {(d.accessoryProductIds || []).map((id, index) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
              >
                <span className="text-slate-400 font-mono">{index + 1}.</span>
                <span className="flex-1 font-medium text-slate-800 truncate">{names[id] || 'Đang tải…'}</span>
                <button
                  type="button"
                  disabled={!index}
                  title="Lên"
                  aria-label="Di chuyển lên"
                  className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                  onClick={() => {
                    const next = [...d.accessoryProductIds];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange('accessoryProductIds', next);
                  }}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Xóa"
                  aria-label="Xóa sản phẩm mua kèm"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  onClick={() =>
                    onChange(
                      'accessoryProductIds',
                      d.accessoryProductIds.filter(value => value !== id)
                    )
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="search"
          aria-label="Tìm sản phẩm mua kèm"
          placeholder="Tìm sản phẩm phụ kiện để gắn mua kèm..."
          className="matrix-input-cell"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {products
            .filter(p => p.id !== productId && !(d.accessoryProductIds || []).includes(p.id))
            .map(p => (
              <button
                key={p.id}
                type="button"
                disabled={(d.accessoryProductIds || []).length >= 8}
                className="flex items-center justify-between w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 cursor-pointer"
                onClick={() => {
                  setNames(previous => ({ ...previous, [p.id]: p.publicName || p.name }));
                  onChange('accessoryProductIds', [...(d.accessoryProductIds || []), p.id]);
                }}
              >
                <span className="truncate pr-2">+ {p.publicName || p.name}</span>
                {typeof p.price === 'number' && (
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {new Intl.NumberFormat('vi-VN').format(p.price)}đ
                  </span>
                )}
              </button>
            ))}
        </div>
      </section>

      {/* 3. CÂU HỎI THƯỜNG GẶP */}
      <section className="space-y-2 border-t border-slate-200 pt-5" aria-label="FAQ sản phẩm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Câu hỏi thường gặp (FAQ) <span className="text-slate-400 font-normal">({(d.faqs || []).length}/20)</span>
          </span>
          <button
            type="button"
            disabled={(d.faqs || []).length >= 20}
            onClick={() => onChange('faqs', [...(d.faqs || []), { q: '', a: '' }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
          </button>
        </div>

        {(d.faqs || []).length > 0 && (
          <div className="space-y-2">
            {(d.faqs || []).map((faq, index) => (
              <div key={index} className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Hỏi {index + 1}</span>
                  <input
                    aria-label={`Câu hỏi ${index + 1}`}
                    className="matrix-input-cell flex-1 font-medium"
                    maxLength={300}
                    placeholder="Nhập câu hỏi..."
                    value={faq.q}
                    onChange={e =>
                      onChange(
                        'faqs',
                        d.faqs.map((item, i) => (i === index ? { ...item, q: e.target.value } : item))
                      )
                    }
                  />
                  <button
                    type="button"
                    title="Xóa câu hỏi"
                    aria-label={`Xóa câu hỏi ${index + 1}`}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    onClick={() =>
                      onChange(
                        'faqs',
                        d.faqs.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  aria-label={`Trả lời ${index + 1}`}
                  className="matrix-input-cell"
                  maxLength={2000}
                  placeholder="Nhập câu trả lời..."
                  value={faq.a}
                  onChange={e =>
                    onChange(
                      'faqs',
                      d.faqs.map((item, i) => (i === index ? { ...item, a: e.target.value } : item))
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
