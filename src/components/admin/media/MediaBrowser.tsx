'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  FileCode2,
  FileImage,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  PlayCircle,
  Search,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import {
  DEFAULT_MEDIA_FOLDERS,
  MEDIA_FILTER_KINDS,
  type MediaAssetDto,
  type MediaFilterKind,
  type MediaFolderDto,
  type MediaListDto,
} from '@/contracts/cms/media';
import { useConfirm, useToast } from '@/components/admin/ui';
import './media.css';

export class MediaRequestError extends Error {
  status: number;
  issues?: Array<{ path: string; message: string }>;
  constructor(message: string, status: number, issues?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = 'MediaRequestError';
    this.status = status;
    if (Array.isArray(issues)) this.issues = issues;
  }
}

export async function mediaRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'same-origin' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success)
    throw new MediaRequestError(
      res.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.'
        : body.error || 'Không thể xử lý yêu cầu.',
      res.status,
      Array.isArray(body.issues) ? body.issues : undefined,
    );
  return body.data as T;
}

export function getAssetBadgeInfo(asset: MediaAssetDto): { label: string; badgeClass: string } {
  switch (asset.assetType) {
    case 'YOUTUBE':
      return { label: 'YouTube', badgeClass: 'bg-red-600 text-white' };
    case 'TIKTOK':
      return { label: 'TikTok', badgeClass: 'bg-slate-900 text-white' };
    case 'GDRIVE':
      return {
        label: asset.kind === 'VIDEO' ? 'Drive Video' : 'Google Drive',
        badgeClass: 'bg-blue-600 text-white',
      };
    case 'PDF':
      return { label: 'PDF', badgeClass: 'bg-amber-600 text-white' };
    case 'SVG':
      return { label: 'SVG', badgeClass: 'bg-purple-600 text-white' };
    case 'VIDEO_FILE':
      return { label: 'Video R2', badgeClass: 'bg-indigo-600 text-white' };
    default:
      return asset.kind === 'VIDEO'
        ? { label: 'Video', badgeClass: 'bg-red-600 text-white' }
        : { label: 'Ảnh', badgeClass: 'bg-emerald-600 text-white' };
  }
}

export function MediaThumbnail({ asset }: { asset: MediaAssetDto }) {
  const [failed, setFailed] = useState(false);
  const badge = getAssetBadgeInfo(asset);
  const previewSrc =
    asset.thumbnailUrl || (asset.kind === 'IMAGE' && asset.assetType !== 'PDF' ? asset.url : null);

  return (
    <div className="media-thumb relative">
      {previewSrc && !failed ? (
        /* Image URLs are same-origin or trusted preview thumbnails; use direct stream without optimizer. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewSrc} alt={asset.alt || asset.name} loading="lazy" onError={() => setFailed(true)} />
      ) : asset.assetType === 'VIDEO_FILE' && asset.url && !failed ? (
        <video
          src={asset.url}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-slate-950"
          onError={() => setFailed(true)}
        />
      ) : asset.assetType === 'PDF' ? (
        <div className="flex flex-col items-center gap-1 text-amber-700">
          <FileText size={34} aria-label="Tài liệu PDF" />
          <span className="text-[10px] font-semibold uppercase">Tài liệu PDF</span>
        </div>
      ) : asset.assetType === 'TIKTOK' ? (
        <div className="flex flex-col items-center gap-1 text-slate-800">
          <PlayCircle size={34} aria-label="Video TikTok" />
          <span className="text-[10px] font-semibold">TikTok Video</span>
        </div>
      ) : asset.assetType === 'GDRIVE' ? (
        <div className="flex flex-col items-center gap-1 text-blue-700">
          <HardDrive size={34} aria-label="Google Drive" />
          <span className="text-[10px] font-semibold">Google Drive</span>
        </div>
      ) : asset.assetType === 'SVG' ? (
        <FileCode2 size={36} aria-label="Ảnh SVG" />
      ) : asset.kind === 'VIDEO' ? (
        <Film size={36} aria-label="Video" />
      ) : (
        <FileImage size={36} aria-label="Chưa có ảnh xem trước" />
      )}
      {asset.kind === 'VIDEO' && previewSrc && !failed && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Video size={26} className="text-white drop-shadow" />
        </span>
      )}
      <span
        className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none shadow-sm ${badge.badgeClass}`}
      >
        {badge.label}
      </span>
      {asset.kind === 'IMAGE' && asset.size && asset.size > 512 * 1024 && (
        <span
          className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none bg-amber-500/95 text-white shadow-sm"
          title="Ảnh dung lượng lớn (> 500 KB), nên cân nhắc nén WebP để tải nhanh hơn"
        >
          &gt;500KB
        </span>
      )}
    </div>
  );
}

function formatAssetMeta(asset: MediaAssetDto): string {
  const sizeLabel = asset.size ? `${Math.ceil(asset.size / 1024)} KB` : null;
  switch (asset.assetType) {
    case 'YOUTUBE':
      return 'Video YouTube';
    case 'TIKTOK':
      return 'Video TikTok';
    case 'GDRIVE':
      return asset.kind === 'VIDEO' ? 'Video Google Drive' : 'Tệp Google Drive';
    case 'PDF':
      return sizeLabel ? `PDF · ${sizeLabel}` : 'Tài liệu PDF';
    case 'SVG':
      return sizeLabel ? `SVG · ${sizeLabel}` : 'Ảnh SVG';
    case 'VIDEO_FILE':
      return sizeLabel ? `Video · ${sizeLabel}` : 'Video tải lên';
    default:
      if (asset.kind === 'VIDEO') return 'Video YouTube';
      return sizeLabel || 'Ảnh sản phẩm';
  }
}

export default function MediaBrowser({
  onSelect,
  refresh = 0,
  picker = false,
  allowVideo = false,
  defaultFolder = 'ALL',
  onFolderChange,
}: {
  onSelect: (asset: MediaAssetDto) => void;
  refresh?: number;
  picker?: boolean;
  allowVideo?: boolean;
  defaultFolder?: string;
  onFolderChange?: (folder: string) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [filters, setFilters] = useState<{
    q: string;
    kind: MediaFilterKind;
    folder: string;
    state: 'READY' | 'ARCHIVED';
    page: number;
  }>({
    q: '',
    kind: picker && !allowVideo ? 'IMAGE' : 'ALL',
    folder: defaultFolder || 'ALL',
    state: 'READY',
    page: 1,
  });
  const [query, setQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<MediaListDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  // Quản lý tạo thư mục & Chọn nhiều tệp chuyển thư mục
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderBusy, setFolderBusy] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetFolder, setBulkTargetFolder] = useState('products');

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picker) {
      const p = new URLSearchParams(window.location.search);
      const rawKind = p.get('kind') || '';
      const validKind = (MEDIA_FILTER_KINDS as readonly string[]).includes(rawKind)
        ? (rawKind as MediaFilterKind)
        : 'ALL';
      const nextFolder = p.get('folder') || 'ALL';
      const next = {
        q: p.get('q') || '',
        kind: validKind,
        folder: nextFolder,
        state: (p.get('state') === 'ARCHIVED' ? 'ARCHIVED' : 'READY') as 'READY' | 'ARCHIVED',
        page: Math.max(1, Number(p.get('page')) || 1),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from the browser URL after SSR
      setFilters(next);
      setQuery(next.q);
      onFolderChange?.(nextFolder);
    }
    setReady(true);
  }, [picker, onFolderChange]);

  useEffect(() => {
    if (!ready || composing || query === filters.q) return;
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [query, ready, composing, filters.q]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: filters.q,
      kind: filters.kind,
      folder: filters.folder,
      state: filters.state,
      page: String(filters.page),
    });
    if (!picker) window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start a cancellable external request
    setLoading(true);
    setError('');
    mediaRequest<MediaListDto>(`/api/admin/media?${params}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Không thể tải thư viện.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, ready, refresh, retry, picker]);

  const folders: MediaFolderDto[] =
    data?.folders && data.folders.length > 0
      ? data.folders
      : DEFAULT_MEDIA_FOLDERS.map((f) => ({ slug: f.slug, name: f.name, isSystem: f.isSystem, count: 0 }));

  const folderNameMap = new Map<string, string>(folders.map((f) => [f.slug, f.name]));
  const activeFolderObj = folders.find((f) => f.slug === filters.folder);

  function selectFolder(slug: string) {
    setFilters((f) => ({ ...f, folder: slug, page: 1 }));
    onFolderChange?.(slug);
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim() || folderBusy) return;
    setFolderBusy(true);
    setError('');
    try {
      const res = await mediaRequest<{ slug: string; name: string }>('/api/admin/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      setNewFolderName('');
      setCreatingFolder(false);
      selectFolder(res.slug);
      setRetry((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo thư mục.');
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleDeleteCurrentFolder() {
    if (!activeFolderObj || activeFolderObj.isSystem || folderBusy) return;
    const confirmed = await confirm({
      title: 'Xóa thư mục thư viện',
      message: `Xóa thư mục "${activeFolderObj.name}"? Các tệp bên trong (nếu có) sẽ được chuyển về thư mục "Chung / Chưa phân loại".`,
      confirmLabel: 'Xóa thư mục',
      cancelLabel: 'Hủy',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    setFolderBusy(true);
    setError('');
    try {
      await mediaRequest(`/api/admin/media/folders?slug=${encodeURIComponent(activeFolderObj.slug)}`, {
        method: 'DELETE',
      });
      toast.success(`Đã xóa thư mục "${activeFolderObj.name}".`);
      selectFolder('ALL');
      setRetry((n) => n + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể xóa thư mục.';
      setError(msg);
      toast.error(msg);
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleBulkMove() {
    if (selectedIds.size === 0 || folderBusy) return;
    setFolderBusy(true);
    setError('');
    try {
      await mediaRequest('/api/admin/media/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: Array.from(selectedIds),
          folder: bulkTargetFolder,
        }),
      });
      setSelectedIds(new Set());
      setBulkMode(false);
      setRetry((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể chuyển thư mục.');
    } finally {
      setFolderBusy(false);
    }
  }

  function toggleSelectAsset(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="media-workspace space-y-3.5">
      {/* THANH PHÂN LOẠI THƯ MỤC */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => selectFolder('ALL')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                filters.folder === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {filters.folder === 'ALL' ? <FolderOpen size={14} /> : <Folder size={14} />}
              <span>Tất cả thư mục</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filters.folder === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {data?.totalAllFolders ?? data?.total ?? 0}
              </span>
            </button>

            {folders.map((folder) => {
              const active = filters.folder === folder.slug;
              return (
                <button
                  key={folder.slug}
                  type="button"
                  onClick={() => selectFolder(folder.slug)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  {active ? <FolderOpen size={13} /> : <Folder size={13} className="text-amber-500" />}
                  <span>{folder.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {folder.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {activeFolderObj && !activeFolderObj.isSystem && (
              <button
                type="button"
                disabled={folderBusy}
                onClick={() => void handleDeleteCurrentFolder()}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                title="Xóa thư mục tùy chỉnh này"
              >
                <Trash2 size={13} />
                Xóa thư mục
              </button>
            )}
            {!creatingFolder ? (
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                <FolderPlus size={13} />
                + Thư mục
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreateFolder();
                    } else if (e.key === 'Escape') {
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder="Tên thư mục mới..."
                  maxLength={60}
                  autoFocus
                  className="text-xs px-2 py-1 rounded border border-slate-300 bg-white w-36"
                />
                <button
                  type="button"
                  disabled={folderBusy || !newFolderName.trim()}
                  onClick={() => void handleCreateFolder()}
                  className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM, BỘ LỌC LOẠI FILE & CHỌN NHIỀU ĐỂ CHUYỂN THƯ MỤC */}
      <div className="media-toolbar">
        <label className="media-field flex-1" htmlFor={picker ? 'picker-search' : 'media-search'}>
          Tìm kiếm tệp trong {filters.folder === 'ALL' ? 'tất cả thư mục' : `"${activeFolderObj?.name || filters.folder}"`}
          <span className="flex gap-2">
            <input
              ref={searchRef}
              id={picker ? 'picker-search' : 'media-search'}
              value={query}
              maxLength={100}
              placeholder="Nhập tên tệp, mô tả ALT hoặc chú thích ảnh…"
              onChange={(e) => setQuery(e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
            />
            {query && (
              <button
                type="button"
                className="media-button"
                aria-label="Xóa tìm kiếm"
                onClick={() => {
                  setQuery('');
                  setFilters((f) => ({ ...f, q: '', page: 1 }));
                  searchRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            )}
          </span>
        </label>

        {(!picker || allowVideo) && (
          <label className="media-field">
            Loại tệp
            <select
              value={filters.kind}
              onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value as MediaFilterKind, page: 1 }))}
            >
              <option value="ALL">Tất cả</option>
              <option value="IMAGE">Ảnh (JPEG/PNG/WebP/SVG)</option>
              <option value="SVG">Ảnh Vector (SVG)</option>
              <option value="VIDEO">Tất cả Video</option>
              <option value="YOUTUBE">Video YouTube</option>
              <option value="TIKTOK">Video TikTok</option>
              <option value="GDRIVE">Google Drive</option>
              <option value="PDF">Tài liệu PDF</option>
            </select>
          </label>
        )}

        {!picker && (
          <>
            <label className="media-field">
              Hiển thị
              <select
                value={filters.state}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, state: e.target.value as 'READY' | 'ARCHIVED', page: 1 }))
                }
              >
                <option value="READY">Trong thư viện</option>
                <option value="ARCHIVED">Đã ẩn</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setBulkMode((prev) => !prev);
                setSelectedIds(new Set());
              }}
              className={`media-button ${
                bulkMode ? 'bg-amber-50 border-amber-300 text-amber-900' : ''
              }`}
              title="Chọn nhiều tệp cùng lúc để chuyển sang thư mục khác"
            >
              <CheckSquare size={14} />
              {bulkMode ? 'Thoát chọn nhiều' : 'Chọn nhiều tệp'}
            </button>
          </>
        )}
      </div>

      {/* Thanh thao tác chuyển thư mục hàng loạt khi đang bật bulkMode */}
      {bulkMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/90 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-amber-950">
              Đã chọn {selectedIds.size} tệp trên trang này
            </span>
            {data?.items && data.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allPageIds = data.items.map((i) => i.id);
                  const allSelected = allPageIds.every((id) => selectedIds.has(id));
                  if (allSelected) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(allPageIds));
                  }
                }}
                className="text-blue-700 font-semibold hover:underline cursor-pointer"
              >
                {data.items.every((i) => selectedIds.has(i.id))
                  ? 'Bỏ chọn tất cả trang này'
                  : 'Chọn tất cả trang này'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Chuyển sang thư mục:</span>
            <select
              value={bulkTargetFolder}
              onChange={(e) => setBulkTargetFolder(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
            >
              {folders.map((f) => (
                <option key={f.slug} value={f.slug}>
                  📁 {f.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={selectedIds.size === 0 || folderBusy}
              onClick={() => void handleBulkMove()}
              className="media-button media-button-primary py-1"
            >
              {folderBusy ? 'Đang chuyển…' : `Chuyển ${selectedIds.size} tệp`}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div role="alert" className="media-error">
          {error}{' '}
          <button type="button" className="media-button" onClick={() => setRetry((n) => n + 1)}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div aria-busy={loading} className="min-h-48">
        {loading ? (
          <p role="status" className="py-16 text-center">
            Đang tải thư viện…
          </p>
        ) : !error && data?.items.length === 0 ? (
          <div className="media-panel text-center py-12">
            <Search className="mx-auto mb-3 text-slate-400" />
            <p className="font-semibold text-slate-700">
              Chưa có tệp nào trong {filters.folder === 'ALL' ? 'thư viện' : `thư mục "${activeFolderObj?.name || filters.folder}"`}.
            </p>
            <p className="media-muted mt-1.5">
              Tải ảnh mới lên thư mục này hoặc chọn &quot;Tất cả thư mục&quot; để xem toàn bộ tệp.
            </p>
            {filters.folder !== 'ALL' && (
              <button
                type="button"
                onClick={() => selectFolder('ALL')}
                className="media-button mt-3"
              >
                Xem tất cả thư mục ({data?.totalAllFolders ?? 0} tệp)
              </button>
            )}
          </div>
        ) : (
          !error && (
            <div className="media-grid">
              {data?.items.map((asset) => {
                const isSelected = selectedIds.has(asset.id);
                const folderLabel = folderNameMap.get(asset.folder || 'general') || asset.folder || 'Chung';
                return (
                  <button
                    type="button"
                    key={asset.id}
                    className={`media-card relative ${
                      isSelected ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/20' : ''
                    }`}
                    disabled={
                      !bulkMode &&
                      picker &&
                      (!asset.url || (!allowVideo && (asset.kind !== 'IMAGE' || asset.assetType === 'PDF')))
                    }
                    onClick={() => {
                      if (bulkMode) {
                        toggleSelectAsset(asset.id);
                      } else {
                        onSelect(asset);
                      }
                    }}
                  >
                    {bulkMode && (
                      <span className="absolute top-1.5 left-1.5 z-10 bg-white/95 rounded p-0.5 shadow">
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} className="text-slate-400" />
                        )}
                      </span>
                    )}
                    <MediaThumbnail asset={asset} />
                    <span className="media-card-body">
                      <strong title={asset.name}>{asset.name}</strong>
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded w-fit max-w-full truncate">
                        📁 {folderLabel}
                      </span>
                      <span className="media-muted">
                        {formatAssetMeta(asset)} · {asset.usageCount} nơi dùng
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {data && !loading && !error && (
        <div className="media-toolbar justify-between">
          <p className="media-muted">
            {data.total} tệp {filters.folder !== 'ALL' ? `trong "${activeFolderObj?.name || filters.folder}"` : ''} · Trang{' '}
            {data.page}/{Math.max(1, Math.ceil(data.total / data.pageSize))}
          </p>
          {data.total > data.pageSize && (
            <div className="flex gap-2">
              <button
                type="button"
                className="media-button"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: data.page - 1 }))}
              >
                Trước
              </button>
              <button
                type="button"
                className="media-button"
                disabled={data.page * data.pageSize >= data.total}
                onClick={() => setFilters((f) => ({ ...f, page: data.page + 1 }))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
