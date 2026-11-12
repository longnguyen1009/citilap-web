"use client";

import React from "react";
import Link from "next/link";
import { Share2, Video, Plus, RefreshCw, Trash2 } from "lucide-react";
import { inputCls, labelCls, type SettingsTabProps } from "./settings-helpers";

interface BannersVideosSettingsTabProps extends SettingsTabProps {
  quickVideoUrl: string;
  setQuickVideoUrl: (v: string) => void;
  fetchingVideos: boolean;
  handleAddVideoByUrl: () => Promise<void>;
  handleFetchChannelVideos: (channelUrl: string) => Promise<void>;
}

export function BannersVideosSettingsTab({
  settings,
  update,
  quickVideoUrl,
  setQuickVideoUrl,
  fetchingVideos,
  handleAddVideoByUrl,
  handleFetchChannelVideos,
}: BannersVideosSettingsTabProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
        <div>
          <p className="font-bold text-slate-900">
            Lưu ý: Bố cục Trang chủ hiện được quản lý trực tiếp trong Trình dựng trang
          </p>
          <p className="text-slate-600 mt-0.5">
            Các thông số Hero Banner bên dưới đóng vai trò dữ liệu mặc định/dự phòng. Để thay đổi các khối Slider, Banner, Video Review và Lưới sản phẩm đang hiển thị ngoài Trang chủ, hãy mở Trình dựng trang chủ.
          </p>
        </div>
        <Link
          href="/admin/builder/home"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shrink-0 shadow-2xs transition"
        >
          Mở Bố cục Trang chủ →
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-800">Hero Banner chính (Dự phòng)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className={labelCls}>Badge nhãn nhỏ</label>
            <input
              type="text"
              value={settings.heroBadge}
              onChange={(e) => update("heroBadge", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Tiêu đề chính</label>
            <input
              type="text"
              value={settings.heroTitle}
              onChange={(e) => update("heroTitle", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Từ khóa Highlight</label>
            <input
              type="text"
              value={settings.heroHighlight}
              onChange={(e) => update("heroHighlight", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="md:col-span-3">
            <label className={labelCls}>Slogan phụ</label>
            <input
              type="text"
              value={settings.heroSlogan}
              onChange={(e) => update("heroSlogan", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Ảnh nền Hero trên PC (URL)</label>
            <input
              type="text"
              value={settings.heroBgImage}
              onChange={(e) => update("heroBgImage", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Ảnh nền Hero riêng trên Smartphone SP (URL)</label>
            <input
              type="text"
              value={settings.heroMobileBgImage || ""}
              onChange={(e) => update("heroMobileBgImage", e.target.value)}
              placeholder="/brand/citilap-hero-mobile.webp"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Nút CTA - Tên</label>
            <input
              type="text"
              value={settings.heroCtaPrimaryText}
              onChange={(e) => update("heroCtaPrimaryText", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Nút CTA - Liên kết</label>
            <input
              type="text"
              value={settings.heroCtaPrimaryLink}
              onChange={(e) => update("heroCtaPrimaryLink", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
          <h3 className="font-bold text-xs text-slate-800">Banner phụ 1 (Trái)</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Tiêu đề</label>
              <input
                type="text"
                value={settings.subBanner1Title}
                onChange={(e) => update("subBanner1Title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phụ đề</label>
              <input
                type="text"
                value={settings.subBanner1Subtitle}
                onChange={(e) => update("subBanner1Subtitle", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Link đích</label>
              <input
                type="text"
                value={settings.subBanner1Link}
                onChange={(e) => update("subBanner1Link", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Link ảnh</label>
              <input
                type="text"
                value={settings.subBanner1Image}
                onChange={(e) => update("subBanner1Image", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
          <h3 className="font-bold text-xs text-slate-800">Banner phụ 2 (Phải)</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Tiêu đề</label>
              <input
                type="text"
                value={settings.subBanner2Title}
                onChange={(e) => update("subBanner2Title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phụ đề</label>
              <input
                type="text"
                value={settings.subBanner2Subtitle}
                onChange={(e) => update("subBanner2Subtitle", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Link đích</label>
              <input
                type="text"
                value={settings.subBanner2Link}
                onChange={(e) => update("subBanner2Link", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Link ảnh</label>
              <input
                type="text"
                value={settings.subBanner2Image}
                onChange={(e) => update("subBanner2Image", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3.5">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-blue-600" /> Mạng xã hội &amp; Kênh Video
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className={labelCls}>Facebook</label>
            <input
              type="text"
              value={settings.facebookUrl}
              onChange={(e) => update("facebookUrl", e.target.value)}
              placeholder="https://www.facebook.com/citilap"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kênh TikTok (@citilapvn)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={settings.tiktokUrl}
                onChange={(e) => update("tiktokUrl", e.target.value)}
                placeholder="https://www.tiktok.com/@citilapvn"
                className={inputCls}
              />
              <button
                type="button"
                disabled={fetchingVideos || !settings.tiktokUrl}
                onClick={() => void handleFetchChannelVideos(settings.tiktokUrl)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-[11px] cursor-pointer"
                title="Nạp video mẫu từ kênh TikTok"
              >
                Lấy video
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Kênh YouTube (tạm dùng ThinkView hoặc kênh riêng)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={settings.youtubeUrl}
                onChange={(e) => update("youtubeUrl", e.target.value)}
                placeholder="https://www.youtube.com/@thinkview/videos"
                className={inputCls}
              />
              <button
                type="button"
                disabled={fetchingVideos || !settings.youtubeUrl}
                onClick={() => void handleFetchChannelVideos(settings.youtubeUrl)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-[11px] cursor-pointer"
                title="Lấy các video mới nhất từ kênh YouTube"
              >
                Lấy mới nhất
              </button>
            </div>
          </div>
        </div>

        {/* Quản lý danh sách Video Review YouTube & TikTok */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-rose-600" /> Danh sách Video Review (YouTube &amp; TikTok)
              </h4>
              <p className="text-[11px] text-slate-500">
                Hiển thị trên Trang chủ và cột bên trang Tin tức. Bạn có thể dán trực tiếp link video YouTube hoặc TikTok để tự động lấy tiêu đề &amp; ảnh thu nhỏ, hoặc tự nhập từng ô.
              </p>
            </div>
            <button
              type="button"
              disabled={(settings.reviewVideos || []).length >= 12}
              onClick={() =>
                update("reviewVideos", [
                  ...(settings.reviewVideos || []),
                  {
                    title: "Video đánh giá Laptop CitiLap",
                    url: "https://www.youtube.com/watch?v=KsQTEyLOC6M",
                    thumbnail: "https://i.ytimg.com/vi/KsQTEyLOC6M/hqdefault.jpg",
                    platform: "youtube",
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng trống
            </button>
          </div>

          {/* Quick URL input box */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={quickVideoUrl}
              onChange={(e) => setQuickVideoUrl(e.target.value)}
              placeholder="Dán URL video YouTube (https://www.youtube.com/watch?v=...) hoặc TikTok (https://www.tiktok.com/@citilapvn/video/...)"
              className={inputCls}
            />
            <button
              type="button"
              disabled={!quickVideoUrl.trim() || fetchingVideos}
              onClick={() => void handleAddVideoByUrl()}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer"
            >
              {fetchingVideos ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lấy...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Lấy thông tin &amp; Thêm
                </>
              )}
            </button>
          </div>

          {/* Editable video list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(settings.reviewVideos || []).map((video, idx) => {
              const patchVideo = (patch: Partial<typeof video>) => {
                const next = (settings.reviewVideos || []).map((v, i) =>
                  i === idx ? { ...v, ...patch } : v
                );
                update("reviewVideos", next);
              };
              return (
                <div
                  key={`${video.url}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        video.url.includes("tiktok.com") || video.platform === "tiktok"
                          ? "bg-slate-900 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {video.url.includes("tiktok.com") || video.platform === "tiktok"
                        ? "TikTok"
                        : "YouTube"}{" "}
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "reviewVideos",
                          (settings.reviewVideos || []).filter((_, i) => i !== idx)
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  </div>
                  <div>
                    <label className={labelCls}>Tiêu đề video</label>
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) => patchVideo({ title: e.target.value })}
                      placeholder="Nhập tiêu đề hiển thị..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>URL Video (YouTube hoặc TikTok)</label>
                    <input
                      type="text"
                      value={video.url}
                      onChange={(e) =>
                        patchVideo({
                          url: e.target.value,
                          platform: e.target.value.includes("tiktok.com") ? "tiktok" : "youtube",
                        })
                      }
                      placeholder="https://www.youtube.com/watch?v=... hoặc https://www.tiktok.com/@citilapvn/video/..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>URL Ảnh Thumbnail</label>
                    <input
                      type="text"
                      value={video.thumbnail || ""}
                      onChange={(e) => patchVideo({ thumbnail: e.target.value })}
                      placeholder="https://i.ytimg.com/vi/.../hqdefault.jpg hoặc /brand/store-photo-01.webp"
                      className={inputCls}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
