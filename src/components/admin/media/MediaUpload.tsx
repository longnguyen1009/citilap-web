'use client';
import { useEffect, useRef, useState } from 'react';

type Entry = {
  id: string;
  file: File;
  progress: number;
  state: 'pending' | 'uploading' | 'done' | 'error';
  error: string;
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

function validateClientFile(file: File): string | null {
  if (!file.size) return 'Tệp rỗng không hợp lệ.';
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return 'Chỉ nhận ảnh (JPEG, PNG, WebP, SVG), video (MP4, WebM, MOV) hoặc tài liệu PDF.';
  }
  if (file.type === 'image/svg+xml' && file.size > 2 * 1024 * 1024) {
    return 'Ảnh SVG tối đa 2 MB.';
  }
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 5 * 1024 * 1024) {
    return 'Ảnh JPEG, PNG, WebP tối đa 5 MB.';
  }
  if (file.type === 'application/pdf' && file.size > 20 * 1024 * 1024) {
    return 'Tệp PDF tối đa 20 MB.';
  }
  if (['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) && file.size > 50 * 1024 * 1024) {
    return 'Video tải lên tối đa 50 MB.';
  }
  return null;
}

export default function MediaUpload({ onUploaded }: { onUploaded: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const request = useRef<XMLHttpRequest | null>(null);
  const stopped = useRef(false);
  useEffect(() => () => { stopped.current = true; request.current?.abort(); }, []);

  function choose(files: FileList | null) {
    if (!files) return;
    if (files.length > 10) { setMessage('Chọn tối đa 10 tệp mỗi đợt.'); return; }
    setMessage('');
    setEntries(Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, progress: 0, state: 'pending', error: '' })));
  }

  async function upload() {
    if (busyRef.current) return;
    busyRef.current = true; stopped.current = false; setBusy(true);
    const update = (id: string, patch: Partial<Entry>) => setEntries((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r));
    for (const entry of entries.filter((e) => e.state !== 'done')) {
      if (stopped.current) break;
      const validationError = validateClientFile(entry.file);
      if (validationError) {
        update(entry.id, { state: 'error', error: validationError });
        continue;
      }
      update(entry.id, { state: 'uploading', progress: 0, error: '' });
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); request.current = xhr;
          xhr.open('POST', '/api/admin/media'); xhr.timeout = 180000;
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) update(entry.id, { progress: Math.round(e.loaded * 100 / e.total) }); };
          xhr.onerror = xhr.ontimeout = () => reject(new Error('Mất kết nối. Kiểm tra thư viện trước khi thử lại.'));
          xhr.onabort = () => reject(new Error('Đã dừng. Tệp đã gửi có thể đã được lưu; kiểm tra thư viện trước khi thử lại.'));
          xhr.onload = () => {
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && result.success) resolve();
              else reject(new Error(result.error || 'Không thể tải tệp.'));
            } catch {
              reject(new Error('Phản hồi không hợp lệ.'));
            }
          };
          const body = new FormData(); body.append('file', entry.file); xhr.send(body);
        });
        update(entry.id, { state: 'done', progress: 100 }); onUploaded();
      } catch (e) {
        update(entry.id, { state: 'error', error: e instanceof Error ? e.message : 'Tải tệp thất bại.' });
      }
    }
    busyRef.current = false; setBusy(false); request.current = null;
  }

  return (
    <div className="media-panel space-y-2.5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-xs text-slate-800">Tải ảnh, SVG, Video & PDF lên</h2>
          <span className="media-muted">(JPEG/PNG/WebP ≤ 5MB · SVG ≤ 2MB · MP4/WebM/MOV ≤ 50MB · PDF ≤ 20MB · tối đa 10 tệp/lần)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="media-field">
            <span className="sr-only">Chọn ảnh tải lên</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,application/pdf"
              disabled={busy}
              onChange={(e) => choose(e.target.files)}
            />
          </label>
          {entries.length > 0 && (
            <>
              <button className="media-button media-button-primary" disabled={busy || entries.every((e) => e.state === 'done')} onClick={() => void upload()}>
                {busy ? 'Đang tải ảnh…' : 'Tải ảnh chưa hoàn tất'}
              </button>
              {busy && (
                <button className="media-button" onClick={() => { stopped.current = true; request.current?.abort(); onUploaded(); }}>
                  Dừng tải
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {message && <p role="alert" className="media-error">{message}</p>}
      {entries.length > 0 && (
        <ul className="space-y-1.5 pt-1 border-t border-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="text-xs">
              <div className="flex justify-between gap-3">
                <span className="truncate">{e.file.name}</span>
                <span className="tabular-nums font-medium">{e.state === 'done' ? 'Đã tải lên' : e.state === 'uploading' ? `${e.progress}%` : e.state === 'error' ? 'Chưa hoàn tất' : 'Chờ tải'}</span>
              </div>
              {e.state === 'uploading' && <progress className="w-full" value={e.progress} max={100} aria-label={`Tiến độ ${e.file.name}`} />}
              {e.error && <p role="alert" className="text-red-800">{e.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
