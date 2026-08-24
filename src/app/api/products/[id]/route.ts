import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) return NextResponse.json({ success: false, error: "Không tìm thấy sản phẩm" }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ success: false, error: "Không thể tải sản phẩm" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa sản phẩm" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
        images: typeof data.images === "string" ? data.images : JSON.stringify(data.images || []),
        stock: Number(data.stock || 0),
        status: data.status || "active",
        specs: data.specs ? (typeof data.specs === "string" ? data.specs : JSON.stringify(data.specs)) : null,
        tags: data.tags || "",
        categoryId: data.categoryId,
      },
    });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật sản phẩm" }, { status: 500 });
  }
}
