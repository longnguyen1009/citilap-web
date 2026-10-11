'use client';
import { useState } from 'react';
import { Images, Plus } from 'lucide-react';
import type { MediaAssetDto } from '@/contracts/cms/media';
import { videoSchema, youtubeId } from '@/contracts/cms/media';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaUpload from '@/components/admin/media/MediaUpload';
import MediaEditor from '@/components/admin/media/MediaEditor';
import MediaDialog from '@/components/admin/media/MediaDialog';

export default function MediaPage() {
  const [selected, setSelected] = useState<MediaAssetDto | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [video, setVideo] = useState({ name: '', url: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const reload = () => setRefresh((n) => n + 1);
  async function addVideo() {
    if (!videoSchema.safeParse(video).success || !youtubeId(video.url)) { setError('Điền tên và liên kết HTTPS YouTube hợp lệ.'); document.getElementById('video-name')?.focus(); return; }
    setBusy(true); setError('');
    try { await mediaRequest('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(video) }); setVideoOpen(false); setVideo({ name: '', url: '' }); setNotice('Đã lưu liên kết video vào thư viện.'); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể thêm video.'); }
    finally { setBusy(false); }
  }
  return <div className="media-workspace space-y-6 max-w-7xl mx-auto">
    <div className="flex flex-wrap justify-between items-center gap-4"><div><p className="text-blue-700 font-semibold text-xs uppercase tracking-widest mb-2">CitiLap · Nội dung</p><h1 className="text-2xl font-bold flex gap-3 items-center"><Images aria-hidden="true" />Thư viện ảnh & video</h1><p className="text-slate-600 mt-2">Một nơi lưu trữ, dùng lại cho sản phẩm và nội dung website.</p></div><button className="media-button" onClick={() => setVideoOpen(true)}><Plus size={18} />Thêm video YouTube</button></div>
    <MediaUpload onUploaded={reload} /><p className="min-h-5 text-green-800" role="status">{notice}</p>
    <MediaBrowser onSelect={setSelected} refresh={refresh} />
    {selected && <MediaEditor key={selected.id} asset={selected} onClose={() => setSelected(null)} onSaved={reload} />}
    {videoOpen && <MediaDialog title="Thêm video YouTube" onClose={() => { if (!busy) setVideoOpen(false); }}><form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); void addVideo(); }}>
      <p className="media-muted">Lưu liên kết để dùng lại. Chưa tải video trực tiếp hoặc nhúng trình phát trên Frontstore trong giai đoạn này.</p>
      <label className="media-field">Tên video<input id="video-name" value={video.name} maxLength={180} disabled={busy} onChange={(e) => setVideo({ ...video, name: e.target.value })} /></label>
      <label className="media-field">Liên kết YouTube<input type="url" value={video.url} maxLength={512} disabled={busy} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => setVideo({ ...video, url: e.target.value })} /></label>
      {error && <p role="alert" className="media-error">{error}</p>}<button className="media-button media-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu video'}</button>
    </form></MediaDialog>}
  </div>;
}
