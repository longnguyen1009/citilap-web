import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(_request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    const versions = await prisma.productVersion.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("Failed to load versions:", error);
    return NextResponse.json({ success: false, error: "Failed to load versions" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    const snapshot = data?.snapshot || null;
    if (!snapshot) return NextResponse.json({ success: false, error: "Không có dữ liệu version" }, { status: 400 });

    // Verify product exists to avoid orphan version records
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return NextResponse.json({ success: false, error: "Sản phẩm không tồn tại" }, { status: 404 });
    const snapshotText = typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot);
    if (snapshotText.length > 100000) return NextResponse.json({ success: false, error: "Snapshot too large" }, { status: 400 });
    let parsed: unknown;
    try { parsed = JSON.parse(snapshotText); } catch { return NextResponse.json({ success: false, error: "Snapshot must be valid JSON" }, { status: 400 }); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ success: false, error: "Snapshot must be an object" }, { status: 400 });

    let version;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        version = await prisma.$transaction(async (tx) => {
          const current = await tx.productVersion.findFirst({ where: { productId: id }, orderBy: { version: "desc" }, select: { version: true } });
          return tx.productVersion.create({ data: { productId: id, version: (current?.version || 0) + 1, data: snapshotText } });
        });
        break;
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") || attempt === 2) throw error;
      }
    }
    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error) {
    console.error("Failed to create version:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo version" }, { status: 500 });
  }
}
