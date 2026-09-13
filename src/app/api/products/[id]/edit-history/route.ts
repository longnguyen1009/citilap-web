import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: true, data: [] });
    const { prisma } = await import("@/lib/prisma");
    const logs = await prisma.productEditLog.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Failed to load edit history:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}
