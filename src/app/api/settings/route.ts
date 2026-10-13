import { NextResponse } from "next/server";
import { mediaEnvironment } from "@/server/media-http";
import { getPublicStorefrontSettings, SettingsError } from "@/server/services/settings.service";

export async function GET() {
  try {
    const env = await mediaEnvironment();
    const data = await getPublicStorefrontSettings(env.DB);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof SettingsError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Lỗi máy chủ";
    return NextResponse.json(
      { success: false, error: `Không thể đọc cài đặt: ${message}` },
      { status: 500 }
    );
  }
}
