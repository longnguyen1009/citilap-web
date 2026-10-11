'use client';

import { useEffect, useRef, useState } from 'react';
import { FileImage, Film, Search, X } from 'lucide-react';
import type { MediaAssetDto, MediaListDto } from '@/contracts/cms/media';
import './media.css';

export async function mediaRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'same-origin' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.' : body.error || 'Không thể xử lý yêu cầu.');
  return body.data as T;
}
export function MediaThumbnail({ asset }: { asset: MediaAssetDto }) {
  const [failed, setFailed] = useState(false);
  return <div className="media-thumb">{asset.kind === 'VIDEO' ? <Film size={36} aria-label="Video" /> :
    asset.url && !failed ? /* Image URLs are same-origin; use the direct media stream without optimizer. */
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.url} alt={asset.alt || asset.name} loading="lazy" onError={() => setFailed(true)} /> : <FileImage size={36} aria-label="Chưa có ảnh xem trước" />}</div>;
}
export default function MediaBrowser({ onSelect, refresh = 0, picker = false, allowVideo = false }: {
  onSelect: (asset: MediaAssetDto) => void; refresh?: number; picker?: boolean; allowVideo?: boolean;
}) {
  const [filters, setFilters] = useState({ q: '', kind: picker && !allowVideo ? 'IMAGE' : 'ALL', state: 'READY', page: 1 });
  const [query, setQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<MediaListDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!picker) {
      const p = new URLSearchParams(window.location.search);
      const next = { q: p.get('q') || '', kind: ['IMAGE', 'VIDEO'].includes(p.get('kind') || '') ? p.get('kind')! : 'ALL', state: p.get('state') === 'ARCHIVED' ? 'ARCHIVED' : 'READY', page: Math.max(1, Number(p.get('page')) || 1) };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from the browser URL after SSR, not derived React state
      setFilters(next); setQuery(next.q);
    }
    setReady(true);
  }, [picker]);
  useEffect(() => {
    if (!ready || composing || query === filters.q) return;
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [query, ready, composing, filters.q]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ ...filters, page: String(filters.page) });
    if (!picker) window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start a cancellable external request and clear stale feedback
    setLoading(true); setError('');
    mediaRequest<MediaListDto>(`/api/admin/media?${params}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((e) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không thể tải thư viện.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, ready, refresh, retry, picker]);
  return <div className="media-workspace space-y-5">
    <div className="media-toolbar">
      <label className="media-field flex-1" htmlFor={picker ? 'picker-search' : 'media-search'}>Tìm ảnh và video
        <span className="flex gap-2"><input ref={searchRef} id={picker ? 'picker-search' : 'media-search'} value={query} maxLength={100} placeholder="Tên tệp hoặc mô tả ảnh…" onChange={(e) => setQuery(e.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
          {query && <button type="button" className="media-button" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(''); setFilters((f) => ({ ...f, q: '', page: 1 })); searchRef.current?.focus(); }}><X size={16} /></button>}</span>
      </label>
      {!picker && <><label className="media-field">Loại tệp<select value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value, page: 1 }))}><option value="ALL">Tất cả</option><option value="IMAGE">Ảnh</option><option value="VIDEO">Video</option></select></label>
        <label className="media-field">Hiển thị<select value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value, page: 1 }))}><option value="READY">Trong thư viện</option><option value="ARCHIVED">Đã ẩn</option></select></label></>}
    </div>
    {error ? <div role="alert" className="media-error">{error} <button type="button" className="media-button" onClick={() => setRetry((n) => n + 1)}>Thử lại</button></div> : null}
    <div aria-busy={loading} className="min-h-48">
      {loading ? <p role="status" className="py-16 text-center">Đang tải thư viện…</p> : !error && data?.items.length === 0 ? <div className="media-panel text-center py-12"><Search className="mx-auto mb-3" /><p>Chưa có tệp phù hợp.</p><p className="media-muted mt-2">Tải ảnh lên hoặc thay đổi bộ lọc để tìm lại.</p></div> : !error && <div className="media-grid">{data?.items.map((asset) => <button type="button" key={asset.id} className="media-card" disabled={picker && (!asset.url || (!allowVideo && asset.kind !== 'IMAGE'))} onClick={() => onSelect(asset)}>
        <MediaThumbnail asset={asset} /><span className="media-card-body"><strong title={asset.name}>{asset.name}</strong><span className="media-muted">{asset.kind === 'VIDEO' ? 'Video YouTube' : asset.size ? `${Math.ceil(asset.size / 1024)} KB` : 'Ảnh sản phẩm cũ'} · {asset.usageCount} nơi sử dụng</span></span>
      </button>)}</div>}
    </div>
    {data && !loading && !error && <div className="media-toolbar justify-between"><p className="media-muted">{data.total} tệp · Trang {data.page}/{Math.max(1, Math.ceil(data.total / data.pageSize))}</p><div className="flex gap-2"><button type="button" className="media-button" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: data.page - 1 }))}>Trước</button><button type="button" className="media-button" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters((f) => ({ ...f, page: data.page + 1 }))}>Sau</button></div></div>}
  </div>;
}
