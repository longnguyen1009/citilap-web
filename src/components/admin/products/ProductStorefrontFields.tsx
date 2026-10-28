'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp } from 'lucide-react';
import type { ProductDocument } from '@/contracts/cms/product-studio';

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
  const [products, setProducts] = useState<Array<{ id: string; name: string; publicName: string }>>([]);
  const [error, setError] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const ids = JSON.stringify(d.accessoryProductIds || []);

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
    const controller = new AbortController();
    Promise.all(
      (JSON.parse(ids) as string[]).map(async id => {
        const response = await fetch('/api/admin/products/' + encodeURIComponent(id), {
          signal: controller.signal,
        });
        const data = await response.json();
        return [id, response.ok && data.success ? data.data.document.name : 'Không còn khả dụng'] as const;
      })
    )
      .then(entries => setNames(Object.fromEntries(entries)))
      .catch(() => {
        if (!controller.signal.aborted) setError('Không tải được tên phụ kiện.');
      });
    return () => controller.abort();
  }, [ids]);

  return (
    <div className="space-y-6">
      {/* 1. QUÀ TẶNG */}
      <section className="space-y-2" aria-label="Quà tặng sản phẩm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Quà tặng <span className="text-slate-400 font-normal">({(d.gifts || []).length}/10)</span>
          </span>
          <button
            type="button"
            disabled={(d.gifts || []).length >= 10}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 cursor-pointer"
            onClick={() => onChange('gifts', [...(d.gifts || []), ''])}
          >
            <Plus className="w-3.5 h-3.5" /> Thêm quà
          </button>
        </div>

        {(d.gifts || []).length > 0 && (
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
        )}
      </section>

      {/* 2. PHỤ KIỆN MUA KÈM */}
      <section className="space-y-2 border-t border-slate-200 pt-4" aria-label="Sản phẩm mua kèm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Mua kèm <span className="text-slate-400 font-normal">({(d.accessoryProductIds || []).length}/8)</span>
          </span>
        </div>

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
          placeholder="Tìm sản phẩm để gắn mua kèm..."
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
                className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 cursor-pointer"
                onClick={() => {
                  setNames(previous => ({ ...previous, [p.id]: p.publicName || p.name }));
                  onChange('accessoryProductIds', [...(d.accessoryProductIds || []), p.id]);
                }}
              >
                + {p.publicName || p.name}
              </button>
            ))}
        </div>
      </section>

      {/* 3. CÂU HỎI THƯỜNG GẶP */}
      <section className="space-y-2 border-t border-slate-200 pt-4" aria-label="FAQ sản phẩm">
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
