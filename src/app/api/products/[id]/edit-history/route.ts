import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(_request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    const logs = await prisma.productEditLog.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Failed to load edit history:", error);
    return NextResponse.json({ success: false, error: "Failed to load edit history" }, { status: 500 });
  }
}

export const GET = withAdminContext(GETHandler);
