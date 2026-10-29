import { withAdminContext } from "@/server/admin-request-context";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { youtubeId, tiktokVideoId } from "@/contracts/cms/media";
import { DEFAULT_REVIEW_VIDEOS, type ReviewVideoItem } from "@/contracts/cms/settings";

async function resolveSingleVideo(rawUrl: string): Promise<ReviewVideoItem | null> {
  const trimmed = rawUrl.trim();
  const ytId = youtubeId(trimmed);
  if (ytId) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as { title?: string };
        return {
          title: (data.title || `Video đánh giá YouTube (${ytId})`).slice(0, 200),
          url: canonicalUrl,
          thumbnail,
          platform: "youtube",
        };
      }
    } catch {
      // Fallback if oEmbed is unreachable
    }
    return {
      title: `Video đánh giá YouTube (${ytId})`,
      url: canonicalUrl,
      thumbnail,
      platform: "youtube",
    };
  }

  const tkId = tiktokVideoId(trimmed);
  if (tkId || trimmed.includes("tiktok.com")) {
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmed)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };
        return {
          title: (data.title || `Video TikTok CitiLap (${tkId || "review"})`).slice(0, 200),
          url: trimmed,
          thumbnail: data.thumbnail_url || "/brand/store-photo-01.jpg",
          platform: "tiktok",
        };
      }
    } catch {
      // Fallback if TikTok oEmbed is unreachable
    }
    return {
      title: `Video TikTok CitiLap (${tkId || "review"})`,
      url: trimmed,
      thumbnail: "/brand/store-photo-01.jpg",
      platform: "tiktok",
    };
  }

  return null;
}

async function fetchLatestFromYoutubeChannel(channelUrl: string, limit = 6): Promise<ReviewVideoItem[]> {
  try {
    const targetUrl = channelUrl.endsWith("/videos")
      ? channelUrl
      : `${channelUrl.replace(/\/+$/, "")}/videos`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === "youtube");
    const html = await res.text();
    const ids = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))].slice(
      0,
      limit
    );
    if (ids.length === 0) {
      return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === "youtube");
    }

    const resolved = await Promise.all(
      ids.map((id) => resolveSingleVideo(`https://www.youtube.com/watch?v=${id}`))
    );
    return resolved.filter((item): item is ReviewVideoItem => item !== null);
  } catch {
    return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === "youtube");
  }
}

async function GETHandler(request: Request) {
  const authDenied = await requireAdmin(request);
  if (authDenied) return authDenied;

  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("videoUrl")?.trim() || "";
  const channelUrl = searchParams.get("channelUrl")?.trim() || "";

  if (videoUrl) {
    const item = await resolveSingleVideo(videoUrl);
    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error:
            "URL không hợp lệ. Vui lòng nhập link video YouTube (https://www.youtube.com/watch?v=...) hoặc TikTok (https://www.tiktok.com/@citilapvn/video/...).",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, data: item });
  }

  if (channelUrl) {
    if (channelUrl.includes("tiktok.com")) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === "tiktok"),
        message: "Đã nạp danh sách video TikTok mẫu từ kênh @citilapvn.",
      });
    }
    const items = await fetchLatestFromYoutubeChannel(channelUrl, 6);
    return NextResponse.json({
      success: true,
      data: items,
      message: `Đã lấy ${items.length} video mới nhất từ kênh YouTube.`,
    });
  }

  return NextResponse.json({
    success: true,
    data: DEFAULT_REVIEW_VIDEOS,
  });
}

export const GET = withAdminContext(GETHandler);

