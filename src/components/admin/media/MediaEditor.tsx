'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Eye } from 'lucide-react';
import {
  DEFAULT_MEDIA_FOLDERS,
  mediaEditSchema,
  type MediaAssetDto,
  type MediaFolderDto,
  type MediaUsageDto,
} from '@/contracts/cms/media';
import { mediaRequest, MediaThumbnail } from './MediaBrowser';
import MediaDialog from './MediaDialog';

function getOpenLinkLabel(asset: MediaAssetDto): string {
  switch (asset.assetType) {
    case 'YOUTUBE':
      return 'Mở YouTube';
    case 'TIKTOK':
      return 'Mở TikTok';
    case 'GDRIVE':
      return 'Mở Google Drive';
    case 'PDF':
      return 'Mở PDF';
    case 'SVG':
      return 'Mở ảnh SVG';
    case 'VIDEO_FILE':
      return 'Mở video';
    default:
      return asset.kind === 'VIDEO' ? 'Mở YouTube' : 'Mở ảnh';
  }
}

export default function MediaEditor({
  asset,
  onClose,
  onSaved,
}: {
  asset: MediaAssetDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState(asset);
  const [name, setName] = useState(asset.name);
  const [alt, setAlt] = useState(asset.alt);
  const [caption, setCaption] = useState(asset.caption);
  const [folder, setFolder] = useState(asset.folder || 'general');
  const [folders, setFolders] = useState<MediaFolderDto[]>(
    DEFAULT_MEDIA_FOLDERS.map((f) => ({ slug: f.slug, name: f.name, isSystem: f.isSystem, count: 0 })),
  );
  const [usages, setUsages] = useState<MediaUsageDto[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [optimization, setOptimization] = useState<{ status: string; bytes: number | null } | null>(null);
  const [discard, setDiscard] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'url' | 'embed' | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const folderTouchedRef = useRef(false);
  const activeAssetIdRef = useRef(asset.id);
  const mountedRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyGenRef = useRef(0);

  const dirty =
    name !== current.name ||
    alt !== current.alt ||
    caption !== current.caption ||
    folder !== (current.folder || 'general');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      copyGenRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const targetAssetId = asset.id;
    activeAssetIdRef.current = targetAssetId;
    folderTouchedRef.current = false;
    let active = true;
    const c = new AbortController();
    const isCurrent = () =>
      active && mountedRef.current && !c.signal.aborted && activeAssetIdRef.current === targetAssetId;

    mediaRequest<{ asset: MediaAssetDto; usages: MediaUsageDto[] }>(`/api/admin/media/${targetAssetId}`, {
      signal: c.signal,
    })
      .then((data) => {
        if (!isCurrent()) return;
        setUsages(Array.isArray(data.usages) ? data.usages : []);
        if (data.asset) {
          const nextFolder = data.asset.folder || 'general';
          setCurrent((prev) => (prev.id === targetAssetId ? { ...prev, folder: nextFolder } : prev));
          if (!folderTouchedRef.current) {
            setFolder(nextFolder);
          }
        }
      })
      .catch((e) => {
        if (isCurrent()) setError(e instanceof Error ? e.message : 'Không thể tải chi tiết tệp.');
      });
    mediaRequest<{ status: string; bytes: number | null }>(`/api/admin/media/${targetAssetId}/optimize`, {
      signal: c.signal,
    })
      .then((res) => {
        if (isCurrent()) setOptimization(res);
      })
      .catch((e) => {
        if (isCurrent()) setError(e instanceof Error ? e.message : 'Không thể kiểm tra tối ưu ảnh.');
      });
    mediaRequest<{ folders: MediaFolderDto[] }>('/api/admin/media/folders', { signal: c.signal })
      .then((res) => {
        if (isCurrent() && res.folders?.length) setFolders(res.folders);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      c.abort();
      copyGenRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, [asset.id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(state = current.state) {
    const targetAssetId = current.id;
    const payload = { name, alt, caption, folder, revision: current.revision, state };
    if (!mediaEditSchema.safeParse(payload).success) {
      setError('Tên tệp bắt buộc (tối đa 180 ký tự), mô tả ảnh tối đa 300 và chú thích tối đa 1000 ký tự.');
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await mediaRequest<{ asset: MediaAssetDto }>(`/api/admin/media/${targetAssetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId) return;
      folderTouchedRef.current = false;
      setCurrent(data.asset);
      setName(data.asset.name);
      setAlt(data.asset.alt);
      setCaption(data.asset.caption);
      setFolder(data.asset.folder || 'general');
      setNotice('Đã lưu thay đổi.');
      onSaved();
    } catch (e) {
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId) return;
      setError(e instanceof Error ? e.message : 'Không thể lưu.');
    } finally {
      if (mountedRef.current && activeAssetIdRef.current === targetAssetId) {
        setBusy(false);
      }
    }
  }

  async function copyText(value: string, key: 'url' | 'embed') {
    const targetAssetId = current.id;
    const gen = ++copyGenRef.current;
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setCopiedKey(null);
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId || gen !== copyGenRef.current) return;
      setError('');
      setCopiedKey(key);
      copyTimerRef.current = setTimeout(() => {
        if (mountedRef.current && activeAssetIdRef.current === targetAssetId && copyGenRef.current === gen) {
          setCopiedKey(null);
          copyTimerRef.current = null;
        }
      }, 2000);
    } catch {
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId || gen !== copyGenRef.current) return;
      setCopiedKey(null);
      setError('Không thể sao chép vào bộ nhớ tạm. Vui lòng thử lại.');
    }
  }

  async function optimize() {
    const targetAssetId = current.id;
    setBusy(true);
    setError('');
    try {
      const res = await mediaRequest<{ status: string; bytes: number | null }>(
        `/api/admin/media/${targetAssetId}/optimize`,
        { method: 'POST' },
      );
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId) return;
      setOptimization(res);
      setNotice('Đã tạo ảnh thu nhỏ. Ảnh gốc được giữ nguyên.');
      onSaved();
    } catch (e) {
      if (!mountedRef.current || activeAssetIdRef.current !== targetAssetId) return;
      setError(e instanceof Error ? e.message : 'Không thể tối ưu ảnh.');
    } finally {
      if (mountedRef.current && activeAssetIdRef.current === targetAssetId) {
        setBusy(false);
      }
    }
  }

  return (
    <MediaDialog
      title="Chi tiết tệp & Phân loại thư mục"
      onClose={() => {
        if (!busy) {
          if (dirty) setDiscard(true);
          else onClose();
        }
      }}
    >
      {discard ? (
        <div className="space-y-4">
          <p>Thay đổi chưa được lưu. Bạn muốn tiếp tục chỉnh sửa hay bỏ thay đổi?</p>
          <div className="flex flex-wrap gap-2">
            <button className="media-button media-button-primary" onClick={() => setDiscard(false)}>
              Tiếp tục chỉnh sửa
            </button>
            <button className="media-button" onClick={onClose}>
              Bỏ thay đổi
            </button>
          </div>
        </div>
      ) : (
        <div className="media-dialog-layout">
          <div className="space-y-4">
            {current.assetType === 'VIDEO_FILE' && current.url ? (
              <video
                src={current.url}
                controls
                preload="metadata"
                className="w-full rounded-lg border border-slate-200 bg-black aspect-video"
              />
            ) : showEmbed && current.embedUrl ? (
              <iframe
                src={current.embedUrl}
                title={current.name}
                className="w-full rounded-lg border border-slate-200 bg-slate-950 aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <MediaThumbnail asset={current} />
            )}
            <p className="media-muted">
              {current.width && current.height ? `${current.width} × ${current.height} px · ` : ''}
              {current.size
                ? `${Math.ceil(current.size / 1024)} KB`
                : current.kind === 'VIDEO'
                  ? 'Liên kết video ngoài'
                  : current.assetType === 'GDRIVE'
                    ? 'Liên kết Google Drive'
                    : current.assetType === 'PDF'
                      ? 'Tài liệu PDF'
                      : 'Ảnh từ sản phẩm'}
              {current.mimeType ? ` · ${current.mimeType}` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {optimization && optimization.status !== 'NOT_APPLICABLE' && (
                <div className="w-full text-sm" role="status">
                  {optimization.status === 'READY'
                    ? `Ảnh thu nhỏ đã tối ưu: ${Math.ceil((optimization.bytes || 0) / 1024)} KB`
                    : 'Ảnh thu nhỏ chưa tối ưu. Có thể tạo lại mà không thay ảnh gốc.'}
                  {optimization.status !== 'READY' && (
                    <button
                      type="button"
                      className="media-button ml-2"
                      disabled={busy}
                      onClick={() => void optimize()}
                    >
                      Tối ưu ảnh thu nhỏ
                    </button>
                  )}
                </div>
              )}
              {current.url && (
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="media-button">
                  <ExternalLink size={13} />
                  {getOpenLinkLabel(current)}
                </a>
              )}
              {current.embedUrl && current.assetType !== 'VIDEO_FILE' && (
                <button type="button" className="media-button" onClick={() => setShowEmbed((v) => !v)}>
                  <Eye size={13} />
                  {showEmbed ? 'Ẩn khung nhúng' : 'Xem thử nhúng'}
                </button>
              )}
              {current.url && (
                <button type="button" className="media-button" onClick={() => void copyText(current.url!, 'url')}>
                  {copiedKey === 'url' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedKey === 'url' ? 'Đã chép URL' : 'Sao chép URL'}
                </button>
              )}
              {current.embedUrl && current.embedUrl !== current.url && (
                <button
                  type="button"
                  className="media-button"
                  onClick={() => void copyText(current.embedUrl!, 'embed')}
                >
                  {copiedKey === 'embed' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedKey === 'embed' ? 'Đã chép Embed' : 'Chép link nhúng'}
                </button>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Đang sử dụng ({current.usageCount})</h3>
              <ul className="mt-2 space-y-2 break-words">
                {usages.map((usage) => (
                  <li key={`${usage.ownerType}-${usage.ownerId}-${usage.slot}`} className="text-sm">
                    {usage.ownerType === 'PRODUCT' ? (
                      <a className="text-blue-700 underline" href={`/admin/products/${encodeURIComponent(usage.ownerId)}`}>
                        {usage.ownerId}
                      </a>
                    ) : (
                      `${usage.ownerType}: ${usage.ownerId}`
                    )}
                  </li>
                ))}
              </ul>
              <p className="media-muted mt-2">
                {!current.usageCount && 'Chưa có liên kết được ghi nhận. '}Ảnh gắn qua URL trong nội dung cũ có thể chưa được thống kê. Không xóa file gốc.
              </p>
            </div>
          </div>

          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label className="media-field">
              Thư mục lưu trữ
              <select
                value={folder}
                onChange={(e) => {
                  folderTouchedRef.current = true;
                  setFolder(e.target.value);
                }}
                disabled={busy}
              >
                {folders.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="media-field">
              Tên tệp
              <input
                ref={nameRef}
                value={name}
                maxLength={180}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="media-field">
              Mô tả ảnh (alt / tiêu đề khi phóng to)
              <input value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} disabled={busy} />
            </label>
            <label className="media-field">
              Chú thích
              <textarea
                className="resize-none"
                value={caption}
                maxLength={1000}
                onChange={(e) => setCaption(e.target.value)}
                disabled={busy}
              />
            </label>
            {error && (
              <p className="media-error" role="alert">
                {error}
              </p>
            )}
            <p role="status" className="text-green-800 min-h-5">
              {notice}
            </p>
            <button type="submit" className="media-button media-button-primary w-full" disabled={busy || !dirty}>
              {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
            <div className="border-t pt-4 space-y-3">
              <p className="media-muted">
                Ẩn khỏi danh sách chọn, có thể khôi phục. Liên kết ảnh đã công khai vẫn hoạt động.
              </p>
              <button
                type="button"
                disabled={busy || (current.state === 'READY' && current.usageCount > 0)}
                className="media-button"
                onClick={() => void save(current.state === 'READY' ? 'ARCHIVED' : 'READY')}
              >
                {current.state === 'READY' ? 'Ẩn khỏi thư viện' : 'Khôi phục vào thư viện'}
              </button>
            </div>
          </form>
        </div>
      )}
    </MediaDialog>
  );
}
