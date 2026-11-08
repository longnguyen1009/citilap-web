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
    console.error("[api/settings] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Không thể đọc cài đặt. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
