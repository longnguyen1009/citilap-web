'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Play, PlayCircle, X, ExternalLink, ChevronRight, Sparkles, Volume2, ArrowUpRight } from 'lucide-react';
import { youtubeId, tiktokVideoId } from '@/contracts/cms/media';
import { DEFAULT_REVIEW_VIDEOS } from '@/contracts/cms/settings';

export type VideoReviewItem = {
  title: string;
  url: string;
  thumbnail: string;
  href?: string;
  enabled?: boolean;
  platform?: 'youtube' | 'tiktok';
  author?: string;
};

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TiktokIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function cleanVideoTitle(title: string): string {
  return (title || '')
    .replace(/\s*\|\s*CellphoneS/gi, '')
    .replace(/\s*\|\s*ThinkView/gi, '')
    .replace(/\s*-\s*CellphoneS/gi, '')
    .trim();
}

function getPlatform(url: string, explicit?: 'youtube' | 'tiktok'): 'youtube' | 'tiktok' {
  if (explicit) return explicit;
  if (youtubeId(url)) return 'youtube';
  if (url.includes('tiktok.com') || tiktokVideoId(url)) return 'tiktok';
  return 'youtube';
}

function getEmbedUrl(url: string): string {
  const yt = youtubeId(url);
  if (yt) {
    return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`;
  }
  const tk = tiktokVideoId(url);
  if (tk) {
    return `https://www.tiktok.com/player/v1/${tk}?autoplay=1&music_info=1&description=1`;
  }
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).at(-1);
    if (last) return `https://www.tiktok.com/player/v1/${last}?autoplay=1`;
  } catch {}
  return url;
}

export default function VideoReviews({
  title = 'Đánh Giá Thực Tế Qua Video',
  subtitle = 'Tổng hợp video review chi tiết, test hiệu năng & trải nghiệm thực tế từ YouTube và TikTok',
  limit,
  videos,
  fallbackVideos,
  youtubeChannelUrl,
  tiktokChannelUrl,
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  videos?: VideoReviewItem[];
  fallbackVideos?: VideoReviewItem[];
  youtubeChannelUrl?: string;
  tiktokChannelUrl?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoReviewItem | null>(null);
  const [spotlightVideo, setSpotlightVideo] = useState<VideoReviewItem | null>(null);
  const [platform, setPlatform] = useState<'all' | 'youtube' | 'tiktok'>('all');

  // Smart video consolidation: Ensure BOTH platforms are represented even if CMS only contains one
  const consolidatedVideos = useMemo(() => {
    const cleanList = (list?: VideoReviewItem[]) =>
      (list || [])
        .filter((v): v is VideoReviewItem => Boolean(v && v.url && v.enabled !== false && !/cellphones/i.test(v.url || '')))
        .map((v) => ({
          ...v,
          title: cleanVideoTitle(v.title),
          platform: getPlatform(v.url, v.platform),
        }));

    const cms = cleanList(videos);
    const fallback = cleanList(fallbackVideos?.length ? fallbackVideos : DEFAULT_REVIEW_VIDEOS);

    if (cms.length === 0) return fallback;

    // Check if CMS is missing TikTok or YouTube
    const hasYtInCms = cms.some((v) => v.platform === 'youtube');
    const hasTkInCms = cms.some((v) => v.platform === 'tiktok');

    let merged = [...cms];
    if (!hasTkInCms) {
      const fallbackTk = fallback.filter((v) => v.platform === 'tiktok');
      merged = [...merged, ...fallbackTk];
    }
    if (!hasYtInCms) {
      const fallbackYt = fallback.filter((v) => v.platform === 'youtube');
      merged = [...merged, ...fallbackYt];
    }

    return merged;
  }, [videos, fallbackVideos]);

  const activeVideos = useMemo(() => {
    const list = limit && limit > 0 ? consolidatedVideos.slice(0, limit) : consolidatedVideos;
    if (platform === 'all') return list;
    return list.filter((v) => v.platform === platform);
  }, [consolidatedVideos, limit, platform]);

  const youtubeCount = useMemo(
    () => consolidatedVideos.filter((v) => v.platform === 'youtube').length,
    [consolidatedVideos]
  );
  const tiktokCount = useMemo(
    () => consolidatedVideos.filter((v) => v.platform === 'tiktok').length,
    [consolidatedVideos]
  );

  // Sync spotlight video when active list changes
  useEffect(() => {
    if (activeVideos.length > 0) {
      setSpotlightVideo(activeVideos[0]);
    } else {
      setSpotlightVideo(null);
    }
  }, [platform, activeVideos]);

  const ytLink = youtubeChannelUrl || 'https://www.youtube.com/@thinkview/videos';
  const tkLink = tiktokChannelUrl || 'https://www.tiktok.com/@citilapvn';

  function openVideoModal(v: VideoReviewItem, event?: React.MouseEvent) {
    triggerRef.current = (event?.currentTarget as HTMLElement) || null;
    setActiveVideo(v);
    dialog.current?.showModal();
  }

  function closeVideoModal() {
    dialog.current?.close();
    setActiveVideo(null);
    triggerRef.current?.focus();
  }

  const isTikTokModal = activeVideo?.platform === 'tiktok';

  return (
    <section className="pb-12" aria-label={title}>
      <div className="container mx-auto max-w-[1370px] px-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-7 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Góc Review &amp; Trải Nghiệm Thực Tế</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                {title}
              </h2>
              {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
            </div>

            {/* Filter Tabs & Channel Links */}
            <div className="flex flex-wrap items-center gap-2 max-w-full">
              <div className="flex flex-wrap sm:inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1 max-w-full">
                <button
                  type="button"
                  aria-pressed={platform === 'all'}
                  onClick={() => setPlatform('all')}
                  className={`min-h-10 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                    platform === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    platform === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {consolidatedVideos.length}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={platform === 'youtube'}
                  onClick={() => setPlatform('youtube')}
                  className={`min-h-10 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                    platform === 'youtube'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <YoutubeIcon className={`w-3.5 h-3.5 shrink-0 ${platform === 'youtube' ? 'text-white' : 'text-red-600'}`} />
                  <span>YouTube</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    platform === 'youtube' ? 'bg-red-700 text-white' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {youtubeCount}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={platform === 'tiktok'}
                  onClick={() => setPlatform('tiktok')}
                  className={`min-h-10 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                    platform === 'tiktok'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TiktokIcon className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>TikTok</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    platform === 'tiktok' ? 'bg-slate-800 text-white' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {tiktokCount}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Video Showcase */}
          {activeVideos.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <PlayCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Video {platform === 'tiktok' ? 'TikTok' : 'review'} đang được cập nhật</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng quay lại sau hoặc ghé thăm kênh chính thức của CitiLap.</p>
            </div>
          ) : platform === 'tiktok' ? (
            /* Dedicated TikTok Reels / Shorts Grid View (Portrait 9:16) */
            <div className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeVideos.map((v, i) => (
                  <button
                    key={`${v.url}-${i}`}
                    type="button"
                    onClick={(e) => openVideoModal(v, e)}
                    className="group relative flex flex-col justify-end aspect-[9/15] overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    {/* Thumbnail Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail || '/brand/store-photo-01.webp'}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20" />

                    {/* Top Platform Tag */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-xs">
                        <TiktokIcon className="w-3 h-3 text-cyan-400" /> TikTok
                      </span>
                      <span className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white/80 flex items-center justify-center">
                        <Volume2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Center Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/40 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:border-red-500">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Content */}
                    <div className="relative p-3.5 z-10 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
                        {v.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                        <span className="font-medium truncate max-w-[140px]">@citilapvn</span>
                        <span className="text-[10px] text-cyan-300 font-semibold inline-flex items-center gap-0.5">
                          Xem clip <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Showcase: Spotlight Hero Video + Interactive Playlist */
            <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Spotlight Featured Video (7 cols) */}
              {spotlightVideo && (
                <div className="lg:col-span-7">
                  <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/90 shadow-sm transition hover:shadow-md">
                    <button
                      type="button"
                      onClick={(e) => openVideoModal(spotlightVideo, e)}
                      className="relative block w-full aspect-video overflow-hidden text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden"
                    >
                      {/* Video Poster Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={spotlightVideo.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                            spotlightVideo.platform === 'tiktok'
                              ? 'bg-slate-900 border border-white/20'
                              : 'bg-red-600 border border-red-500'
                          }`}
                        >
                          {spotlightVideo.platform === 'tiktok' ? (
                            <TiktokIcon className="w-3.5 h-3.5 text-cyan-300" />
                          ) : (
                            <YoutubeIcon className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>{spotlightVideo.platform === 'tiktok' ? 'TikTok' : 'YouTube Review'}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-[11px] font-bold text-white shadow-xs">
                          Nổi bật
                        </span>
                      </div>

                      {/* Big Pulsing Center Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-20 h-20 rounded-full bg-red-600/30 animate-ping" />
                          <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                            <Play className="w-7 h-7 fill-white ml-1" />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info inside Poster */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white">
                        <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2 text-white group-hover:text-red-400 transition-colors">
                          {spotlightVideo.title}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                          <span>Nhấp để phát video</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                            Xem ngay <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </p>
                      </div>
                    </button>

                    {/* Spotlight Meta / Product Link Bar */}
                    {spotlightVideo.href && (
                      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600 font-medium">Sản phẩm liên quan trong video:</span>
                        <Link
                          href={spotlightVideo.href}
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-lg transition"
                        >
                          Xem chi tiết máy <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Right Column: Playlist Rail (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách video review ({activeVideos.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Chọn video để xem</span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                  {activeVideos.map((v, idx) => {
                    const isSelected = spotlightVideo?.url === v.url;
                    return (
                      <div
                        key={`${v.url}-${idx}`}
                        className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        onClick={() => {
                          setSpotlightVideo(v);
                          // On mobile, click directly plays modal; on desktop it spotlights and highlights
                          if (window.innerWidth < 1024) {
                            openVideoModal(v);
                          }
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v.thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                              <Play className="w-3 h-3 fill-white ml-0.5" />
                            </span>
                          </div>
                          {/* Platform Mini Badge */}
                          <span
                            className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold text-white ${
                              v.platform === 'tiktok' ? 'bg-slate-950' : 'bg-red-600'
                            }`}
                          >
                            {v.platform === 'tiktok' ? 'TikTok' : 'YT'}
                          </span>
                        </div>

                        {/* Title and Action */}
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs sm:text-sm font-semibold line-clamp-2 leading-snug transition-colors ${
                            isSelected ? 'text-blue-900 font-bold' : 'text-slate-800 group-hover:text-blue-600'
                          }`}>
                            {v.title}
                          </h4>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 capitalize">
                              {v.platform === 'tiktok' ? 'Video ngắn TikTok' : 'YouTube Review'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openVideoModal(v, e);
                              }}
                              className="font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              Phát <Play className="w-2.5 h-2.5 fill-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Official Channels Action Banner */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube Channel Card */}
            <div className="relative overflow-hidden rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/60 via-white to-red-50/30 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition">
              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <YoutubeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Kênh YouTube Review &amp; Trải Nghiệm
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Đón xem các bài test hiệu năng gaming, benchmark nhiệt độ và tư vấn chọn laptop chuẩn xác.
                  </p>
                </div>
              </div>
              <a
                href={ytLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto self-start bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition duration-150 shadow-xs cursor-pointer"
              >
                <YoutubeIcon className="w-4 h-4" />
                <span>Đăng ký Kênh YouTube</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>

            {/* TikTok Channel Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-5 flex flex-col justify-between text-white shadow-2xs hover:shadow-md transition">
              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-11 h-11 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                  <TiktokIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <span>Kênh TikTok @citilapvn</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30">
                      Official
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Khám phá video unbox nhanh, mẹo vặt bảo quản máy và săn deal sốc công nghệ hàng ngày.
                  </p>
                </div>
              </div>
              <a
                href={tkLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto self-start bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition duration-150 shadow-xs cursor-pointer"
              >
                <TiktokIcon className="w-4 h-4 text-slate-950" />
                <span>Follow TikTok @citilapvn</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Player Modal Dialog */}
      <dialog
        ref={dialog}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-label={activeVideo?.title || title}
        onClose={() => {
          setActiveVideo(null);
          triggerRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget || !dialog.current) return;
          const rect = dialog.current.getBoundingClientRect();
          const inBox =
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width;
          if (!inBox) closeVideoModal();
        }}
        className={`fixed inset-0 m-auto overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm p-0 border border-slate-800 transition-all ${
          isTikTokModal
            ? 'w-[min(380px,94vw)] h-[min(680px,86vh)] rounded-3xl'
            : 'w-[min(960px,94vw)]'
        }`}
      >
        {activeVideo && (
          <div className="flex flex-col h-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                    activeVideo.platform === 'tiktok'
                      ? 'bg-slate-950 text-cyan-400 border border-slate-700'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {activeVideo.platform === 'tiktok' ? 'TikTok' : 'YouTube'}
                </span>
                <h3 className="text-xs sm:text-sm font-bold truncate text-white">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                type="button"
                autoFocus
                onClick={closeVideoModal}
                aria-label="Đóng video"
                className="rounded-lg p-1.5 hover:bg-white/10 active:scale-95 transition cursor-pointer text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Iframe Embed */}
            <div className={`relative bg-black flex-1 flex items-center justify-center ${isTikTokModal ? 'h-[calc(100%-92px)]' : 'aspect-video w-full'}`}>
              <iframe
                key={activeVideo.url}
                src={getEmbedUrl(activeVideo.url)}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-xs shrink-0">
              <a
                href={activeVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white underline"
              >
                <span>Xem trên {activeVideo.platform === 'tiktok' ? 'ứng dụng TikTok' : 'kênh YouTube'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {activeVideo.href && (
                <Link
                  href={activeVideo.href}
                  onClick={closeVideoModal}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition"
                >
                  Xem sản phẩm trong video <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
