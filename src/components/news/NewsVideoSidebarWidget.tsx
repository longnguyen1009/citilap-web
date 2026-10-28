"use client";

import { useRef, useState } from "react";
import { PlayCircle, Video, X, ExternalLink } from "lucide-react";
import { youtubeId } from "@/contracts/cms/media";

export interface SidebarVideoItem {
  title: string;
  url: string;
  thumbnail: string;
}

function getEmbedUrl(url: string): string | null {
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  try {
    const u = new URL(url);
    if (u.hostname.includes("tiktok.com")) {
      const videoId = u.pathname.split("/").filter(Boolean).at(-1);
      if (videoId) return `https://www.tiktok.com/player/v1/${videoId}`;
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

export default function NewsVideoSidebarWidget({
  videos,
  youtubeChannelUrl,
  tiktokChannelUrl,
}: {
  videos: SidebarVideoItem[];
  youtubeChannelUrl?: string;
  tiktokChannelUrl?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeVideo, setActiveVideo] = useState<SidebarVideoItem | null>(null);
  const [platform, setPlatform] = useState<"all" | "youtube" | "tiktok">("all");

  const filtered = videos.filter((v) => {
    if (platform === "all") return true;
    if (platform === "youtube") return Boolean(youtubeId(v.url));
    return v.url.includes("tiktok.com");
  });

  const openVideo = (v: SidebarVideoItem) => {
    setActiveVideo(v);
    dialogRef.current?.showModal();
  };

  const closeVideo = () => {
    dialogRef.current?.close();
    setActiveVideo(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
            <Video className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
            Video Review &amp; TikTok
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              ["all", "Tất cả"],
              ["youtube", "YouTube"],
              ["tiktok", "TikTok"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlatform(id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                platform === id
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.slice(0, 5).map((item, idx) => {
            const isTikTok = item.url.includes("tiktok.com");
            return (
              <button
                key={`${item.url}-${idx}`}
                type="button"
                onClick={() => openVideo(item)}
                className="group flex w-full items-start gap-3 text-left rounded-xl p-1.5 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="relative aspect-video w-28 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-slate-900 border border-slate-200/60">
                  {item.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition">
                    <PlayCircle className="h-8 w-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                  </span>
                  <span
                    className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ${
                      isTikTok ? "bg-slate-900/90" : "bg-rose-600/95"
                    }`}
                  >
                    {isTikTok ? "TikTok" : "YouTube"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-rose-600 transition-colors line-clamp-3 leading-snug">
                    {item.title}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-slate-500">
          Chưa có video trong mục này.
        </p>
      )}

      {(youtubeChannelUrl || tiktokChannelUrl) && (
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          {youtubeChannelUrl && (
            <a
              href={youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition"
            >
              <span>Kênh YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {tiktokChannelUrl && (
            <a
              href={tiktokChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              <span>Kênh TikTok</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-label={activeVideo?.title || "Video review"}
        onClose={() => setActiveVideo(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeVideo();
        }}
        className="fixed inset-0 m-auto w-[min(920px,94vw)] max-w-none overflow-hidden rounded-2xl bg-slate-950 p-0 text-white backdrop:bg-black/75"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
          <h4 className="text-xs sm:text-sm font-bold line-clamp-1">
            {activeVideo?.title}
          </h4>
          <button
            type="button"
            onClick={closeVideo}
            aria-label="Đóng video"
            className="rounded-lg p-1.5 hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {activeVideo && getEmbedUrl(activeVideo.url) && (
          <iframe
            key={activeVideo.url}
            src={getEmbedUrl(activeVideo.url)!}
            title={activeVideo.title}
            className="aspect-video w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {activeVideo && (
          <div className="px-4 py-2.5 flex items-center justify-between text-xs bg-slate-900">
            <span className="text-slate-400">Nguồn video review thực tế</span>
            <a
              href={activeVideo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold underline"
            >
              Mở trên nền tảng gốc →
            </a>
          </div>
        )}
      </dialog>
    </div>
  );
}

