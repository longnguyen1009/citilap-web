import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminMutation } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const denied = await requireAdmin(_request);
  if (denied) return denied;
  try {
    const { id, versionId } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version || version.productId !== id) return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    let parsedData: unknown;
    try { parsedData = JSON.parse(version.data); } catch { return NextResponse.json({ success: false, error: "Malformed version snapshot" }, { status: 500 }); }
    return NextResponse.json({ success: true, data: { ...version, parsedData } });
  } catch (error) {
    console.error("Failed to load version:", error);
    return NextResponse.json({ success: false, error: "Không thể tải version" }, { status: 500 });
  }
}

async function PATCHHandler(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: 'Khôi phục version legacy đã ngừng hoạt động. Vui lòng sử dụng cơ chế Revision của CMS tại /admin/products.',
    },
    { status: 409 }
  );
}

export const GET = withAdminContext(GETHandler);
export const PATCH = withAdminContext(PATCHHandler);
