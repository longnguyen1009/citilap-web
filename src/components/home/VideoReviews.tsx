'use client';
import { useRef, useState } from 'react';
import { PlayCircle, X, ExternalLink } from 'lucide-react';
import { youtubeId } from '@/contracts/cms/media';
import { DEFAULT_REVIEW_VIDEOS } from '@/contracts/cms/settings';

type Video = { title: string; url: string; thumbnail: string };
function embed(url: string) {
  const id = youtubeId(url);
  if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  const u = new URL(url);
  return `https://www.tiktok.com/player/v1/${u.pathname.split('/').filter(Boolean).at(-1)}`;
}
export default function VideoReviews({
  title,
  videos,
  fallbackVideos,
  youtubeChannelUrl,
  tiktokChannelUrl,
}: {
  title: string;
  videos: Video[];
  fallbackVideos?: Video[];
  youtubeChannelUrl?: string;
  tiktokChannelUrl?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [platform, setPlatform] = useState('all');

  const cleanCmsVideos = (videos || []).filter(
    (v) => v && v.url && !/cellphones/i.test(v.title || '') && !/cellphones/i.test(v.url || '')
  );
  const cleanFallback = (fallbackVideos || DEFAULT_REVIEW_VIDEOS).filter(
    (v) => v && v.url && !/cellphones/i.test(v.title || '')
  );
  // Merge CMS videos with fallback so both YouTube and TikTok tabs have videos
  const mergedMap = new Map<string, Video>();
  for (const v of [...cleanCmsVideos, ...cleanFallback]) {
    if (v?.url && !mergedMap.has(v.url)) {
      mergedMap.set(v.url, v);
    }
  }
  const activeList = Array.from(mergedMap.values());

  const filtered = activeList.filter(
    (v) =>
      platform === 'all' ||
      (platform === 'youtube' ? !!youtubeId(v.url) : v.url.includes('tiktok.com'))
  );
  const [main, ...rest] = filtered;
  const ytLink = youtubeChannelUrl || 'https://www.youtube.com/@thinkview/videos';
  const tkLink = tiktokChannelUrl || 'https://www.tiktok.com/@citilapvn';

  function open(v: Video, event?: React.MouseEvent) {
    triggerRef.current = (event?.currentTarget as HTMLElement) || null;
    setVideo(v);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
    setVideo(null);
    triggerRef.current?.focus();
  }

  function thumbnail(v: Video, large = false) {
    return <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${large ? 'aspect-video' : 'aspect-video w-28 shrink-0 sm:w-44'}`}>
      {/* Remote video thumbnails stay on their source host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transform-none" />}
      <span className="absolute inset-0 flex items-center justify-center bg-black/10"><PlayCircle className={`${large ? 'h-14 w-14' : 'h-9 w-9'} rounded-full bg-black/40 text-white shadow-md`} /></span>
    </div>;
  }

  return <section className="pb-10" aria-label={title}><div className="container mx-auto max-w-[1370px] px-4"><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black uppercase text-slate-900">{title}</h2>
      <div className="flex gap-2" aria-label="Nền tảng video">
        {[['all', 'Tất cả'], ['youtube', 'YouTube'], ['tiktok', 'TikTok']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={platform === id}
            onClick={() => setPlatform(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition duration-150 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden ${
              platform === id ? 'border-red-600 bg-red-600 text-white shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    {main ? (
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <button
          type="button"
          onClick={(e) => open(main, e)}
          className="group text-left cursor-pointer rounded-xl p-1 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden active:scale-[0.99] transition duration-150"
        >
          {thumbnail(main, true)}
          <h3 className="mt-3 font-bold leading-relaxed text-slate-900 group-hover:text-red-600 transition-colors">{main.title}</h3>
        </button>
        <div className="space-y-4">
          {rest.slice(0, 4).map(v => (
            <button
              key={v.url}
              type="button"
              onClick={(e) => open(v, e)}
              className="group flex w-full items-center gap-3 text-left cursor-pointer rounded-xl p-1 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden active:scale-[0.99] transition duration-150"
            >
              {thumbnail(v)}
              <h3 className="text-sm font-bold leading-relaxed text-slate-900 group-hover:text-red-600 transition-colors">{v.title}</h3>
            </button>
          ))}
        </div>
      </div>
    ) : (
      <p className="py-10 text-center text-sm text-slate-500">Video {platform === 'tiktok' ? 'TikTok' : 'review'} đang cập nhật.</p>
    )}
    <p className="mt-5 text-xs text-slate-500">
      Tổng hợp video đánh giá chuyên sâu và trải nghiệm thực tế các mẫu Laptop Gaming, Ultrabook &amp; Like New.
    </p>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      <a
        href={ytLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase text-white hover:bg-red-700 active:scale-95 transition duration-150 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden"
      >
        <span>Kênh YouTube Review</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={tkLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase text-white hover:bg-slate-800 active:scale-95 transition duration-150 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden"
      >
        <span>Kênh TikTok @citilapvn</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
    <dialog
      ref={dialog}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-label={video?.title || title}
      onClose={() => { setVideo(null); triggerRef.current?.focus(); }}
      onClick={e => {
        if (e.target !== e.currentTarget || !dialog.current) return;
        const rect = dialog.current.getBoundingClientRect();
        const inBox =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;
        if (!inBox) close();
      }}
      className="fixed inset-0 m-auto w-[min(960px,94vw)] max-w-none overflow-hidden rounded-2xl bg-slate-950 p-0 text-white backdrop:bg-black/75"
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <h3 className="text-sm font-bold">{video?.title}</h3>
        <button
          type="button"
          autoFocus
          onClick={close}
          aria-label="Đóng video"
          className="rounded-lg p-2 hover:bg-white/10 active:scale-95 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {video && <iframe key={video.url} src={embed(video.url)} title={video.title} className="aspect-video w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />}
      {video && <a href={video.url} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm text-blue-200 hover:text-white underline focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-hidden">Xem trên kênh gốc</a>}
    </dialog>
  </div></div></section>;
}
