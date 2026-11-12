'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaDialog from '@/components/admin/media/MediaDialog';
import type {
  ProductItem,
  PostItem,
  CategoryOption,
  BrandOption,
  PostCategoryOption,
} from './builder-defaults';

export function ProductSelectorDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: ProductItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductItem[]; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await mediaRequest<{ items: ProductItem[]; hasMore: boolean }>(
          `/api/admin/navigation/products?q=${encodeURIComponent(query)}&page=${page}`
        );
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ignore = true;
    };
  }, [query, page]);

  return (
    <MediaDialog title="Chọn sản phẩm vào lưới" onClose={onClose}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm theo tên sản phẩm..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-center text-slate-400 text-xs py-6">Đang tìm kiếm...</p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-6">Không tìm thấy sản phẩm nào.</p>
          ) : (
            data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">ID: {p.id}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status === 'ACTIVE' ? 'Đã xuất bản' : 'Bản nháp'}
                </span>
              </button>
            ))
          )}
        </div>

        {data && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
            >
              Trang trước
            </button>
            <span className="text-slate-500">Trang {page}</span>
            <button
              type="button"
              disabled={!data.hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </MediaDialog>
  );
}

export function PostSelectorDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: PostItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: PostItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await mediaRequest<{ items: PostItem[]; total: number }>(
          `/api/admin/posts?q=${encodeURIComponent(query)}&page=${page}&limit=10`
        );
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ignore = true;
    };
  }, [query, page]);

  return (
    <MediaDialog title="Chọn bài viết công nghệ / media" onClose={onClose}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm bài viết theo tiêu đề..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-center text-slate-400 text-xs py-6">Đang tìm kiếm...</p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-6">Không tìm thấy bài viết nào.</p>
          ) : (
            data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{p.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">/news/{p.slug}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}
                </span>
              </button>
            ))
          )}
        </div>

        {data && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
            >
              Trang trước
            </button>
            <span className="text-slate-500">
              Trang {page} ({data.total} bài)
            </span>
            <button
              type="button"
              disabled={page * 10 >= data.total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </MediaDialog>
  );
}

export function useCatalogOptions() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [postCategories, setPostCategories] = useState<PostCategoryOption[]>([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [navRes, brandRes, postCatRes] = await Promise.allSettled([
          mediaRequest<{ document?: { categories?: CategoryOption[] } }>('/api/admin/navigation'),
          mediaRequest<{ items: BrandOption[] }>('/api/admin/brands?status=ACTIVE'),
          mediaRequest<PostCategoryOption[]>('/api/admin/post-categories?status=ACTIVE'),
        ]);
        if (!ignore) {
          if (navRes.status === 'fulfilled' && navRes.value?.document?.categories) {
            setCategories(navRes.value.document.categories);
          }
          if (brandRes.status === 'fulfilled' && Array.isArray(brandRes.value?.items)) {
            setBrands(brandRes.value.items);
          }
          if (postCatRes.status === 'fulfilled' && Array.isArray(postCatRes.value)) {
            setPostCategories(postCatRes.value);
          }
        }
      } catch {
        // fail-soft
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  return { categories, brands, postCategories };
}
