'use client';
import { useEffect, useRef, useState } from 'react';
type Entry = { id: string; file: File; progress: number; state: 'pending' | 'uploading' | 'done' | 'error'; error: string };
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
    if (files.length > 10) { setMessage('Chọn tối đa 10 ảnh mỗi đợt.'); return; }
    setMessage('');
    setEntries(Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, progress: 0, state: 'pending', error: '' })));
  }
  async function upload() {
    if (busyRef.current) return;
    busyRef.current = true; stopped.current = false; setBusy(true);
    const update = (id: string, patch: Partial<Entry>) => setEntries((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r));
    for (const entry of entries.filter((e) => e.state !== 'done')) {
      if (stopped.current) break;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(entry.file.type) || !entry.file.size || entry.file.size > 5 * 1024 * 1024) { update(entry.id, { state: 'error', error: 'Chỉ nhận ảnh JPEG, PNG, WebP tối đa 5 MB.' }); continue; }
      update(entry.id, { state: 'uploading', progress: 0, error: '' });
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); request.current = xhr;
          xhr.open('POST', '/api/admin/media'); xhr.timeout = 60000;
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) update(entry.id, { progress: Math.round(e.loaded * 100 / e.total) }); };
          xhr.onerror = xhr.ontimeout = () => reject(new Error('Mất kết nối. Kiểm tra thư viện trước khi thử lại.'));
          xhr.onabort = () => reject(new Error('Đã dừng. Tệp đã gửi có thể đã được lưu; kiểm tra thư viện trước khi thử lại.'));
          xhr.onload = () => { try { const result = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300 && result.success) resolve(); else reject(new Error(result.error || 'Không thể tải ảnh.')); } catch { reject(new Error('Phản hồi không hợp lệ.')); } };
          const body = new FormData(); body.append('file', entry.file); xhr.send(body);
        });
        update(entry.id, { state: 'done', progress: 100 }); onUploaded();
      } catch (e) { update(entry.id, { state: 'error', error: e instanceof Error ? e.message : 'Tải ảnh thất bại.' }); }
    }
    busyRef.current = false; setBusy(false); request.current = null;
  }
  return <div className="media-panel space-y-4"><div className="flex flex-wrap gap-4 items-start justify-between"><div><h2 className="font-semibold">Thêm ảnh vào thư viện</h2><p className="media-muted mt-1">JPEG, PNG, WebP · tối đa 5 MB/ảnh · 10 ảnh/đợt. Ảnh tải lên có liên kết công khai.</p></div><label className="media-field"><span className="sr-only">Chọn ảnh tải lên</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => choose(e.target.files)} /></label></div>
    {message && <p role="alert" className="media-error">{message}</p>}
    <ul className="space-y-3">{entries.map((e) => <li key={e.id} className="text-sm"><div className="flex justify-between gap-3"><span className="truncate">{e.file.name}</span><span>{e.state === 'done' ? 'Đã tải lên' : e.state === 'uploading' ? `${e.progress}%` : e.state === 'error' ? 'Chưa hoàn tất' : 'Chờ tải'}</span></div>{e.state === 'uploading' && <progress className="w-full" value={e.progress} max={100} aria-label={`Tiến độ ${e.file.name}`} />}{e.error && <p role="alert" className="text-red-800">{e.error}</p>}</li>)}</ul>
    {entries.length > 0 && <div className="flex gap-2"><button className="media-button media-button-primary" disabled={busy || entries.every((e) => e.state === 'done')} onClick={() => void upload()}>{busy ? 'Đang tải ảnh…' : 'Tải ảnh chưa hoàn tất'}</button>{busy && <button className="media-button" onClick={() => { stopped.current = true; request.current?.abort(); onUploaded(); }}>Dừng tải</button>}</div>}
  </div>;
}
