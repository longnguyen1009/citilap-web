import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/auth";

async function PATCHHandler(request: Request) {
  const denied = await requireAdminMutation(request);
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

export const PATCH = withAdminContext(PATCHHandler);
