import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: true, data: [] });
    const { prisma } = await import("@/lib/prisma");
    const versions = await prisma.productVersion.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("Failed to load versions:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    const snapshot = data.snapshot || null;
    if (!snapshot) return NextResponse.json({ success: false, error: "Không có dữ liệu version" }, { status: 400 });

    const last = await prisma.productVersion.findFirst({ where: { productId: id }, orderBy: { version: "desc" }, select: { version: true } });
    const nextVersion = (last?.version || 0) + 1;

    const version = await prisma.productVersion.create({ data: { productId: id, version: nextVersion, data: typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot) } });
    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error) {
    console.error("Failed to create version:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo version" }, { status: 500 });
  }
}
