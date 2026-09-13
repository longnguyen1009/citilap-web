import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        parentId: data.parentId || null,
      },
    });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật danh mục" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
