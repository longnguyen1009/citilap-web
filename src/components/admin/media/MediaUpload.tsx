'use client';

import { useEffect, useRef, useState } from 'react';
import { FolderPlus, Sparkles, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_MEDIA_FOLDERS, type MediaFolderDto } from '@/contracts/cms/media';
import { mediaRequest } from './MediaBrowser';

type CompressionPreset = 'standard' | 'compact' | 'original';

type Entry = {
  id: string;
  file: File;
  originalSize: number;
  compressedSize?: number;
  dimensions?: string;
  progress: number;
  state: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  error: string;
  warning?: string;
};

type BackfillResult = {
  processed: number;
  created: number;
  alreadyReady: number;
  failed: Array<{ id: string; error: string }>;
  nextCursor: string | null;
};

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

const RASTER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateClientFile(file: File): string | null {
  if (!file.size) return 'Tệp rỗng không hợp lệ.';
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return 'Chỉ nhận ảnh (JPEG, PNG, WebP, SVG), video (MP4, WebM, MOV) hoặc tài liệu PDF.';
  }
  if (file.type === 'image/svg+xml' && file.size > 2 * 1024 * 1024) {
    return 'Ảnh SVG tối đa 2 MB.';
  }
  if (RASTER_IMAGE_TYPES.includes(file.type) && file.size > 25 * 1024 * 1024) {
    return 'Ảnh gốc tối đa 25 MB (hệ thống sẽ tự động nén WebP khi tải lên).';
  }
  if (file.type === 'application/pdf' && file.size > 20 * 1024 * 1024) {
    return 'Tệp PDF tối đa 20 MB.';
  }
  if (['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) && file.size > 50 * 1024 * 1024) {
    return 'Video tải lên tối đa 50 MB.';
  }
  return null;
}

async function compressImageInBrowser(
  file: File,
  preset: CompressionPreset,
): Promise<{ mainFile: File; thumbFile: File | null; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;

    // 1. Always generate 480px WebP thumbnail for fast grid display
    let thumbFile: File | null = null;
    try {
      const thumbRatio = srcW > 480 ? 480 / srcW : 1;
      const thumbW = Math.max(1, Math.round(srcW * thumbRatio));
      const thumbH = Math.max(1, Math.round(srcH * thumbRatio));
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.imageSmoothingEnabled = true;
        thumbCtx.imageSmoothingQuality = 'high';
        thumbCtx.drawImage(bitmap, 0, 0, thumbW, thumbH);
        const thumbBlob = await new Promise<Blob | null>((resolve) =>
          thumbCanvas.toBlob((b) => resolve(b), 'image/webp', 0.78),
        );
        if (thumbBlob && thumbBlob.size > 0) {
          thumbFile = new File([thumbBlob], 'thumb.webp', { type: 'image/webp' });
        }
      }
    } catch {
      // Ignore thumbnail generation error on client
    }

    if (preset === 'original' && file.size <= 5 * 1024 * 1024) {
      return { mainFile: file, thumbFile, width: srcW, height: srcH };
    }

    const maxDim = preset === 'compact' ? 1280 : 1600;
    const quality = preset === 'compact' ? 0.8 : 0.88;

    const scale = srcW > maxDim || srcH > maxDim ? Math.min(maxDim / srcW, maxDim / srcH) : 1;
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { mainFile: file, thumbFile, width: srcW, height: srcH };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality),
    );

    if (!webpBlob || (webpBlob.size >= file.size && file.size <= 5 * 1024 * 1024 && scale === 1)) {
      return { mainFile: file, thumbFile, width: srcW, height: srcH };
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const compressedFile = new File([webpBlob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    return {
      mainFile: compressedFile,
      thumbFile,
      width: targetW,
      height: targetH,
    };
  } finally {
    bitmap.close();
  }
}

export default function MediaUpload({
  onUploaded,
  defaultFolder = 'products',
  activeFolder,
  onFolderCreated,
}: {
  onUploaded: () => void;
  defaultFolder?: string;
  activeFolder?: string;
  onFolderCreated?: (slug: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('standard');
  const [folders, setFolders] = useState<MediaFolderDto[]>(
    DEFAULT_MEDIA_FOLDERS.map((f) => ({ slug: f.slug, name: f.name, isSystem: f.isSystem, count: 0 })),
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(
    activeFolder && activeFolder !== 'ALL' ? activeFolder : defaultFolder,
  );
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderBusy, setFolderBusy] = useState(false);

  const busyRef = useRef(false);
  const request = useRef<XMLHttpRequest | null>(null);
  const stopped = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeFolder && activeFolder !== 'ALL') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync folder selection from prop
      setSelectedFolder(activeFolder);
    }
  }, [activeFolder]);

  useEffect(() => {
    let active = true;
    mediaRequest<{ folders: MediaFolderDto[] }>('/api/admin/media/folders')
      .then((res) => {
        if (active && res.folders?.length) setFolders(res.folders);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      stopped.current = true;
      request.current?.abort();
    },
    [],
  );

  const [backfill, setBackfill] = useState<{
    running: boolean;
    created: number;
    ready: number;
    failed: number;
    done: boolean;
    error: string;
  } | null>(null);
  const backfillStop = useRef(false);
  useEffect(
    () => () => {
      backfillStop.current = true;
    },
    [],
  );

  async function handleCreateFolder() {
    if (!newFolderName.trim() || folderBusy) return;
    setFolderBusy(true);
    setMessage('');
    try {
      const res = await mediaRequest<{ slug: string; name: string; folders: MediaFolderDto[] }>(
        '/api/admin/media/folders',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newFolderName.trim() }),
        },
      );
      if (res.folders) setFolders(res.folders);
      setSelectedFolder(res.slug);
      setNewFolderName('');
      setCreatingFolder(false);
      onFolderCreated?.(res.slug);
      onUploaded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không thể tạo thư mục.');
    } finally {
      setFolderBusy(false);
    }
  }

  async function runBackfill() {
    if (backfill?.running) return;
    backfillStop.current = false;
    let cursor: string | null = null,
      created = 0,
      ready = 0,
      failed = 0;
    setBackfill({ running: true, created, ready, failed, done: false, error: '' });
    try {
      do {
        const res = await fetch('/api/admin/media/thumbnails', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor, limit: 10 }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || 'Không thể tạo ảnh thu nhỏ.');
        const data = body.data as BackfillResult;
        created += data.created;
        ready += data.alreadyReady;
        failed += data.failed.length;
        cursor = data.nextCursor;
        setBackfill({ running: !!cursor, created, ready, failed, done: !cursor, error: '' });
      } while (cursor && !backfillStop.current);
      if (backfillStop.current) setBackfill({ running: false, created, ready, failed, done: false, error: '' });
      onUploaded();
    } catch (e) {
      setBackfill({
        running: false,
        created,
        ready,
        failed,
        done: false,
        error: e instanceof Error ? e.message : 'Không thể tạo ảnh thu nhỏ.',
      });
    }
  }

  function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (files.length > 20) {
      setMessage('Chọn tối đa 20 tệp mỗi đợt.');
      return;
    }
    setMessage('');
    setEntries(
      Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        originalSize: file.size,
        progress: 0,
        state: 'pending',
        error: '',
      })),
    );
  }

  async function upload(entriesToUpload?: Entry[]) {
    if (busyRef.current) return;
    const list = entriesToUpload || entries;
    if (!list.some((e) => e.state !== 'done')) return;

    busyRef.current = true;
    stopped.current = false;
    setBusy(true);
    const update = (id: string, patch: Partial<Entry>) =>
      setEntries((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    for (const entry of list.filter((e) => e.state !== 'done')) {
      if (stopped.current) break;
      const validationError = validateClientFile(entry.file);
      if (validationError) {
        update(entry.id, { state: 'error', error: validationError });
        continue;
      }

      let fileToSend = entry.file;
      let thumbToSend: File | null = null;
      let compressedSize = entry.file.size;
      let dimensionsLabel: string | undefined;

      if (RASTER_IMAGE_TYPES.includes(entry.file.type)) {
        update(entry.id, { state: 'compressing', progress: 5, error: '', warning: '' });
        try {
          const compressed = await compressImageInBrowser(entry.file, compressionPreset);
          fileToSend = compressed.mainFile;
          thumbToSend = compressed.thumbFile;
          compressedSize = compressed.mainFile.size;
          dimensionsLabel = `${compressed.width}×${compressed.height}`;
        } catch {
          // Fallback to original file if canvas compression fails
        }
      }

      update(entry.id, {
        state: 'uploading',
        progress: 10,
        compressedSize,
        dimensions: dimensionsLabel,
        error: '',
        warning: '',
      });

      try {
        const warning = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          request.current = xhr;
          xhr.open('POST', '/api/admin/media');
          xhr.timeout = 180000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              update(entry.id, { progress: Math.max(10, Math.round((e.loaded * 100) / e.total)) });
            }
          };
          xhr.onerror = xhr.ontimeout = () =>
            reject(new Error('Mất kết nối. Kiểm tra thư viện trước khi thử lại.'));
          xhr.onabort = () =>
            reject(new Error('Đã dừng. Tệp đã gửi có thể đã được lưu; kiểm tra thư viện trước khi thử lại.'));
          xhr.onload = () => {
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && result.success) {
                const optimization = result.data?.optimization as
                  | { status?: string; error?: string | null }
                  | undefined;
                resolve(
                  optimization?.status === 'PENDING'
                    ? `${optimization.error || 'Ảnh thu nhỏ chưa được tạo.'}`
                    : '',
                );
              } else reject(new Error(result.error || 'Không thể tải tệp.'));
            } catch {
              reject(new Error('Phản hồi không hợp lệ.'));
            }
          };
          const body = new FormData();
          body.append('file', fileToSend);
          body.append('folder', selectedFolder);
          body.append('originalName', entry.file.name);
          if (thumbToSend) {
            body.append('thumbnail', thumbToSend);
          }
          xhr.send(body);
        });
        update(entry.id, { state: 'done', progress: 100, warning });
        onUploaded();
      } catch (e) {
        update(entry.id, { state: 'error', error: e instanceof Error ? e.message : 'Tải tệp thất bại.' });
      }
    }
    busyRef.current = false;
    setBusy(false);
    request.current = null;
  }

  const currentFolderName = folders.find((f) => f.slug === selectedFolder)?.name || selectedFolder;

  return (
    <div
      className={`media-panel space-y-3 transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!busy && e.dataTransfer?.files?.length) {
          choose(e.dataTransfer.files);
        }
      }}
    >
      {/* Hàng 1: Chọn thư mục đích & Chế độ nén ảnh */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="media-field min-w-[200px]">
            <span>Thư mục lưu tệp tải lên</span>
            <select
              value={selectedFolder}
              disabled={busy}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="font-semibold text-slate-800"
            >
              {folders.map((f) => (
                <option key={f.slug} value={f.slug}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </label>

          {!creatingFolder ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreatingFolder(true)}
              className="media-button text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
              title="Tạo thêm thư mục mới để phân loại ảnh"
            >
              <FolderPlus size={14} />
              + Tạo thư mục mới
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
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
                placeholder="Tên thư mục (VD: Laptop Dell)..."
                maxLength={60}
                autoFocus
                className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white min-w-[175px]"
              />
              <button
                type="button"
                disabled={folderBusy || !newFolderName.trim()}
                onClick={() => void handleCreateFolder()}
                className="media-button media-button-primary py-1 px-2.5 text-xs"
              >
                {folderBusy ? 'Đang tạo…' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="media-button py-1 px-2 text-xs"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="media-field min-w-[235px]">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Sparkles size={12} /> Chế độ tự động nén ảnh (WebP)
            </span>
            <select
              value={compressionPreset}
              disabled={busy}
              onChange={(e) => setCompressionPreset(e.target.value as CompressionPreset)}
            >
              <option value="standard">Chuẩn WebP sắc nét (≤ 1600px · Khuyên dùng)</option>
              <option value="compact">Nén mạnh siêu nhẹ (≤ 1280px · Bài viết)</option>
              <option value="original">Giữ nguyên kích thước gốc</option>
            </select>
          </label>
        </div>
      </div>

      {/* Hàng 2: Chọn tệp / Kéo thả & Nút bắt đầu tải */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <UploadCloud className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h2 className="font-semibold text-xs text-slate-800">
              Kéo thả hoặc chọn ảnh, SVG, Video & PDF vào thư mục{' '}
              <span className="text-blue-700 underline decoration-blue-300">{currentFolderName}</span>
            </h2>
            <p className="media-muted">
              Ảnh JPEG/PNG/WebP ≤ 25MB (tự động nén WebP + tạo thumbnail 480px) · SVG ≤ 2MB · Video ≤ 50MB · PDF ≤ 20MB · Tối đa 20 tệp/lần
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="media-field">
            <span className="sr-only">Chọn ảnh tải lên</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,application/pdf"
              disabled={busy}
              onChange={(e) => choose(e.target.files)}
            />
          </label>
          {entries.length > 0 && (
            <>
              <button
                type="button"
                className="media-button media-button-primary"
                disabled={busy || entries.every((e) => e.state === 'done')}
                onClick={() => void upload()}
              >
                {busy
                  ? 'Đang nén & tải lên…'
                  : `Tải ${entries.filter((e) => e.state !== 'done').length} tệp vào "${currentFolderName}"`}
              </button>
              {busy ? (
                <button
                  type="button"
                  className="media-button"
                  onClick={() => {
                    stopped.current = true;
                    request.current?.abort();
                    onUploaded();
                  }}
                >
                  Dừng tải
                </button>
              ) : (
                <button
                  type="button"
                  className="media-button text-slate-500"
                  onClick={() => {
                    setEntries([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Xóa danh sách chờ
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {message && (
        <p role="alert" className="media-error">
          {message}
        </p>
      )}

      {/* Danh sách file đang chờ / đã tải kèm thông số nén dung lượng */}
      {entries.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-slate-100">
          {entries.map((e) => {
            const savedPercent =
              e.compressedSize && e.compressedSize < e.originalSize
                ? Math.round(((e.originalSize - e.compressedSize) / e.originalSize) * 100)
                : 0;
            return (
              <li
                key={e.id}
                className="text-xs bg-slate-50/80 border border-slate-200/80 rounded-lg px-3 py-2 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {e.state === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : e.state === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : null}
                    <span className="font-medium text-slate-800 truncate">{e.file.name}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      ({formatBytes(e.originalSize)}
                      {e.compressedSize && e.compressedSize !== e.originalSize ? (
                        <strong className="text-emerald-700 ml-1">
                          → {formatBytes(e.compressedSize)}
                          {savedPercent > 0 ? ` · Giảm ${savedPercent}%` : ''}
                        </strong>
                      ) : null}
                      {e.dimensions ? ` · ${e.dimensions}px` : ''})
                    </span>
                  </div>
                  <span
                    className={`tabular-nums font-semibold ${
                      e.state === 'done'
                        ? 'text-emerald-700'
                        : e.state === 'error'
                          ? 'text-rose-700'
                          : 'text-blue-700'
                    }`}
                  >
                    {e.state === 'done'
                      ? `Đã lưu vào ${currentFolderName}`
                      : e.state === 'compressing'
                        ? 'Đang nén WebP…'
                        : e.state === 'uploading'
                          ? `Đang tải ${e.progress}%`
                          : e.state === 'error'
                            ? 'Chưa hoàn tất'
                            : 'Sẵn sàng tải'}
                  </span>
                </div>
                {(e.state === 'uploading' || e.state === 'compressing') && (
                  <progress
                    className="w-full h-1.5"
                    value={e.progress}
                    max={100}
                    aria-label={`Tiến độ ${e.file.name}`}
                  />
                )}
                {e.error && (
                  <p role="alert" className="text-red-800 text-[11px]">
                    {e.error}
                  </p>
                )}
                {e.warning && (
                  <p role="status" className="text-amber-800 text-[11px]">
                    {e.warning}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Công cụ đồng bộ thumbnail cho ảnh cũ */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="media-button text-xs py-1"
            disabled={backfill?.running}
            onClick={() => void runBackfill()}
            title="Tạo ảnh thu nhỏ 480px WebP cho ảnh cũ chưa có thumbnail."
          >
            {backfill?.running ? 'Đang tạo ảnh thu nhỏ…' : 'Đồng bộ ảnh thu nhỏ cho ảnh cũ'}
          </button>
          {backfill?.running && (
            <button
              type="button"
              className="media-button text-xs py-1"
              onClick={() => {
                backfillStop.current = true;
              }}
            >
              Dừng
            </button>
          )}
          {backfill && (
            <span role="status" className={backfill.error ? 'text-red-800' : 'media-muted'}>
              {backfill.error ||
                `${backfill.done ? 'Hoàn tất' : backfill.running ? 'Đang xử lý' : 'Đã dừng'}: tạo mới ${backfill.created}, đã có ${backfill.ready}${backfill.failed ? `, lỗi ${backfill.failed}` : ''}.`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
