import { withAdminContext } from "@/server/admin-request-context";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_REVIEW_VIDEOS } from "@/contracts/cms/settings";
import {
  resolveSingleVideo,
  fetchLatestYoutubeVideos,
  resolveBatchVideos,
} from "@/server/services/video-reviews.service";

async function GETHandler(request: Request) {
  const authDenied = await requireAdmin(request);
  if (authDenied) return authDenied;

  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("videoUrl")?.trim() || "";
  const channelUrl = searchParams.get("channelUrl")?.trim() || "";
  const limit = Math.min(12, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));

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
        message: "Kênh TikTok có cơ chế bảo mật chống quét tự động. Hãy dán trực tiếp link video TikTok để hệ thống tự lấy tiêu đề & ảnh thu nhỏ chuẩn 100%.",
      });
    }

    const items = await fetchLatestYoutubeVideos(channelUrl, limit);
    return NextResponse.json({
      success: true,
      data: items,
      message: `Đã tự động lấy ${items.length} video mới nhất từ kênh YouTube.`,
    });
  }

  return NextResponse.json({
    success: true,
    data: DEFAULT_REVIEW_VIDEOS,
  });
}

async function POSTHandler(request: Request) {
  const authDenied = await requireAdmin(request);
  if (authDenied) return authDenied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      urls?: string[];
      channelUrl?: string;
      limit?: number;
    };

    if (body.channelUrl) {
      const limit = Math.min(12, Math.max(1, body.limit || 8));
      const items = await fetchLatestYoutubeVideos(body.channelUrl, limit);
      return NextResponse.json({
        success: true,
        data: items,
        message: `Đã đồng bộ ${items.length} video mới nhất từ kênh YouTube.`,
      });
    }

    if (Array.isArray(body.urls) && body.urls.length > 0) {
      const items = await resolveBatchVideos(body.urls);
      return NextResponse.json({
        success: true,
        data: items,
        message: `Đã phân giải thành công ${items.length} video.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Vui lòng cung cấp danh sách URLs hoặc channelUrl." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Lỗi xử lý yêu cầu." },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
