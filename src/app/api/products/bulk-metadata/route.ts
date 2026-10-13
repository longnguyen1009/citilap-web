import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;
const BULK_STATUSES = new Set(["active", "draft", "archived"]);

export async function PATCH(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: 'Cập nhật hàng loạt legacy đã ngừng hoạt động. Vui lòng sử dụng giao diện quản lý sản phẩm chuẩn tại /admin/products.',
    },
    { status: 409 }
  );
}
