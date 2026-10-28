'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, AdminButton } from '@/components/admin/ui';
import type { ExternalMediaKind, MediaAssetDto } from '@/contracts/cms/media';
import {
  googleDriveFileId,
  tiktokVideoId,
  videoSchema,
  youtubeId,
} from '@/contracts/cms/media';
import MediaBrowser, { mediaRequest } from '@/components/admin/media/MediaBrowser';
import MediaUpload from '@/components/admin/media/MediaUpload';
import MediaEditor from '@/components/admin/media/MediaEditor';
import MediaDialog from '@/components/admin/media/MediaDialog';

function isValidExternalMediaUrl(url: string, mediaKind: ExternalMediaKind): boolean {
  if (mediaKind === 'YOUTUBE') return Boolean(youtubeId(url));
  if (mediaKind === 'TIKTOK') return Boolean(tiktokVideoId(url));
  if (mediaKind.startsWith('GDRIVE')) return Boolean(googleDriveFileId(url));
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return false;
    if (mediaKind === 'PDF_URL') return true;
    if (mediaKind === 'SVG_URL') return true;
    return Boolean(
      youtubeId(url) ||
        tiktokVideoId(url) ||
        googleDriveFileId(url) ||
        /\.(pdf|svg)(?:$|\?)/i.test(url),
    );
  } catch {
    return false;
  }
}

export default function MediaPage() {
  const [selected, setSelected] = useState<MediaAssetDto | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [video, setVideo] = useState<{ name: string; url: string; mediaKind: ExternalMediaKind }>({
    name: '',
    url: '',
    mediaKind: 'AUTO',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const reload = () => setRefresh((n) => n + 1);
  async function addVideo() {
    if (!videoSchema.safeParse(video).success || !isValidExternalMediaUrl(video.url, video.mediaKind)) {
      setError('Điền tên và liên kết HTTPS hợp lệ (YouTube, TikTok, Google Drive, PDF hoặc SVG).');
      document.getElementById('video-name')?.focus();
      return;
    }
    setBusy(true); setError('');
    try {
      await mediaRequest('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });
      setVideoOpen(false);
      setVideo({ name: '', url: '', mediaKind: 'AUTO' });
      setNotice('Đã lưu liên kết media vào thư viện.');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể thêm liên kết media.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="media-workspace space-y-3 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Thư viện ảnh & video"
        actions={
          <AdminButton type="button" size="sm" icon={<Plus size={15} />} onClick={() => setVideoOpen(true)}>
            Thêm video YouTube / TikTok / Drive
          </AdminButton>
        }
      />
      <MediaUpload onUploaded={reload} />
      {notice ? <p className="text-xs font-medium text-emerald-700" role="status">{notice}</p> : <p className="sr-only" role="status">{notice}</p>}
      <MediaBrowser onSelect={setSelected} refresh={refresh} />
      {selected && <MediaEditor key={selected.id} asset={selected} onClose={() => setSelected(null)} onSaved={reload} />}
      {videoOpen && (
        <MediaDialog title="Thêm video YouTube, TikTok, Google Drive, PDF/SVG" onClose={() => { if (!busy) setVideoOpen(false); }}>
          <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); void addVideo(); }}>
            <label className="media-field">
              Loại liên kết
              <select
                value={video.mediaKind}
                disabled={busy}
                onChange={(e) => setVideo({ ...video, mediaKind: e.target.value as ExternalMediaKind })}
              >
                <option value="AUTO">Tự động nhận diện (YouTube / TikTok / Google Drive / PDF / SVG)</option>
                <option value="YOUTUBE">Video YouTube (watch, shorts, youtu.be)</option>
                <option value="TIKTOK">Video TikTok (@user/video/...)</option>
                <option value="GDRIVE_IMAGE">Ảnh từ Google Drive</option>
                <option value="GDRIVE_VIDEO">Video từ Google Drive</option>
                <option value="GDRIVE_PDF">Tài liệu PDF từ Google Drive</option>
                <option value="PDF_URL">Link tệp PDF trực tiếp (HTTPS)</option>
                <option value="SVG_URL">Link ảnh SVG trực tiếp (HTTPS)</option>
              </select>
            </label>
            <label className="media-field">
              Tên video / tệp media
              <input id="video-name" value={video.name} maxLength={180} disabled={busy} placeholder="VD: Video đánh giá Lenovo Legion / Catalogue PDF…" onChange={(e) => setVideo({ ...video, name: e.target.value })} />
            </label>
            <label className="media-field">
              Liên kết YouTube / TikTok / Google Drive / PDF / SVG
              <input
                type="url"
                value={video.url}
                maxLength={1000}
                disabled={busy}
                placeholder="https://www.youtube.com/watch?v=… | https://www.tiktok.com/@…/video/… | https://drive.google.com/file/d/…"
                onChange={(e) => setVideo({ ...video, url: e.target.value })}
              />
            </label>
            <p className="media-muted">
              Hỗ trợ: YouTube, TikTok, Google Drive (chia sẻ công khai dạng <code>/file/d/...</code> hoặc <code>?id=...</code>), liên kết trực tiếp <code>.pdf</code> hoặc <code>.svg</code>.
            </p>
            {error && <p role="alert" className="media-error">{error}</p>}
            <button className="media-button media-button-primary" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu video'}
            </button>
          </form>
        </MediaDialog>
      )}
    </div>
  );
}
