import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
    const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : "";
    const slug = typeof data.slug === "string" ? data.slug.trim().slice(0, 140) : "";
    const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Không tìm thấy danh mục" }, { status: 404 });
    if (!name || !SLUG_RE.test(slug)) return NextResponse.json({ success: false, error: "Tên hoặc slug danh mục không hợp lệ" }, { status: 400 });
    const parentId = data.parentId == null || data.parentId === "" ? null : typeof data.parentId === "string" ? data.parentId.trim() : "__invalid__";
    if (parentId === "__invalid__") return NextResponse.json({ success: false, error: "Invalid parentId" }, { status: 400 });
    if (parentId === id) return NextResponse.json({ success: false, error: "Danh mục không thể là cha của chính nó" }, { status: 400 });
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) return NextResponse.json({ success: false, error: "Danh mục cha không tồn tại" }, { status: 400 });
    }

    if (parentId) {
      let cursor: string | null = parentId;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === id) return NextResponse.json({ success: false, error: "Category hierarchy cycle" }, { status: 400 });
        seen.add(cursor);
        const row: { parentId: string | null } | null = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
        cursor = row?.parentId ?? null;
      }
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: data.description ? String(data.description).slice(0, 500) : null,
        image: data.image ? String(data.image).slice(0, 500) : null,
        parentId,
      },
    });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: false, error: "Category name or slug already exists" }, { status: 409 });
    }
    console.error("Failed to update category:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật danh mục" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(_request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

    const { prisma } = await import("@/lib/prisma");
    const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, subCategories: true } } } });
    if (!category) return NextResponse.json({ success: false, error: "Không tìm thấy danh mục" }, { status: 404 });
    if (category._count.products > 0 || category._count.subCategories > 0) return NextResponse.json({ success: false, error: "Danh mục vẫn còn dữ liệu liên quan" }, { status: 409 });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa danh mục" }, { status: 500 });
  }
}
