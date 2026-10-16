import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminMutation } from "@/lib/auth";
import { mediaEnvironment } from "@/server/media-http";
import {
  getAdminSettings,
  saveAdminSettings,
  SettingsError,
} from "@/server/services/settings.service";
import {
  DEFAULT_ADMIN_SETTINGS,
  type StorefrontSettings,
} from "@/contracts/cms/settings";
import { ZodError } from "zod";

// Backward-compatible exports
export type { StorefrontSettings };
export const DEFAULT_SETTINGS = DEFAULT_ADMIN_SETTINGS;

async function GETHandler(request: Request) {
  const authDenied = await requireAdmin(request);
  if (authDenied) return authDenied;

  try {
    const env = await mediaEnvironment();
    const data = await getAdminSettings(env.DB);
    return NextResponse.json({
      success: true,
      data: {
        revision: data.revision,
        document: data.document,
      },
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

async function POSTHandler(request: Request) {
  const mutationDenied = await requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Dữ liệu yêu cầu không hợp lệ (cần JSON object)." },
        { status: 400 }
      );
    }

    const env = await mediaEnvironment();
    const result = await saveAdminSettings(env.DB, body, "admin");

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cấu hình Storefront thành công!",
      data: {
        revision: result.revision,
        document: result.document,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json(
        { success: false, error: `Dữ liệu không hợp lệ: ${issues}` },
        { status: 400 }
      );
    }
    if (error instanceof SettingsError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Lỗi máy chủ";
    return NextResponse.json(
      { success: false, error: `Không thể lưu cài đặt: ${message}` },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
