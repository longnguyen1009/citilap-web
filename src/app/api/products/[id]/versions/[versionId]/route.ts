import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { versionId } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version) return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...version, parsedData: typeof version.data === "string" ? JSON.parse(version.data) : version.data } });
  } catch (error) {
    console.error("Failed to load version:", error);
    return NextResponse.json({ success: false, error: "Không thể tải version" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version || version.productId !== id) return NextResponse.json({ success: false, error: "Version không tồn tại" }, { status: 404 });
    const snapshot = JSON.parse(version.data);
    await prisma.product.update({ where: { id }, data: { name: snapshot.name, description: snapshot.description, price: snapshot.price, images: snapshot.images, stock: snapshot.stock, categoryId: snapshot.categoryId } });
    return NextResponse.json({ success: true, message: "Đã khôi phục version" });
  } catch (error) {
    console.error("Failed to restore version:", error);
    return NextResponse.json({ success: false, error: "Không thể khôi phục version" }, { status: 500 });
  }
}
