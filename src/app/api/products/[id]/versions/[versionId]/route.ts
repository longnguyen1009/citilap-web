import { NextResponse } from "next/server";
import { requireAdmin, requireAdminMutation } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const denied = requireAdmin(_request);
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id, versionId } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    if (await prisma.productStudio.findUnique({ where: { productId: id } })) return NextResponse.json({ success: false, error: 'Use Product Studio to edit this product.' }, { status: 409 });

    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version || version.productId !== id) return NextResponse.json({ success: false, error: "Version không tồn tại" }, { status: 404 });
    let snapshot: Record<string, unknown>;
    try { snapshot = JSON.parse(version.data) as Record<string, unknown>; } catch { return NextResponse.json({ success: false, error: "Malformed version snapshot" }, { status: 409 }); }
    if (!snapshot || typeof snapshot.name !== "string" || snapshot.name.length > 200 || typeof snapshot.description !== "string" || snapshot.description.length > 2000 || typeof snapshot.categoryId !== "string" || !Number.isFinite(Number(snapshot.price)) || Number(snapshot.price) < 0 || (snapshot.stock !== undefined && (!Number.isInteger(Number(snapshot.stock)) || Number(snapshot.stock) < 0))) {
      return NextResponse.json({ success: false, error: "Version snapshot schema is invalid" }, { status: 409 });
    }
    const category = await prisma.category.findUnique({ where: { id: snapshot.categoryId as string }, select: { id: true } });
    if (!category) return NextResponse.json({ success: false, error: "Snapshot category not found" }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { name: snapshot.name as string, description: snapshot.description as string, price: Number(snapshot.price), images: typeof snapshot.images === "string" ? snapshot.images : JSON.stringify(snapshot.images ?? []), stock: Number.isInteger(Number(snapshot.stock)) ? Number(snapshot.stock) : 0, categoryId: snapshot.categoryId as string } });
      await tx.productEditLog.create({ data: { productId: id, action: "restore_version", actorName: "Admin", snapshot: JSON.stringify({ versionId }) } });
    });
    return NextResponse.json({ success: true, message: "Đã khôi phục version" });
  } catch (error) {
    console.error("Failed to restore version:", error);
    return NextResponse.json({ success: false, error: "Không thể khôi phục version" }, { status: 500 });
  }
}
