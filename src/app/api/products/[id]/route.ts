import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdminMutation, isAdminRequest } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize-html";

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { createPrismaD1Client } = await import('@/lib/prisma');
    const { mediaEnvironment } = await import('@/server/media-http');
    const prisma = createPrismaD1Client((await mediaEnvironment()).DB);
    const product = await prisma.product.findFirst({
      where: (await isAdminRequest(_request)) ? { id } : { id, status: { in: ["ACTIVE", "active"] } },
      include: {
        category: true,
        variants: {
          where: (await isAdminRequest(_request)) ? undefined : { status: { in: ["ACTIVE", "active"] } },
          orderBy: { createdAt: "asc" },
        },
        productImages: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!product) return NextResponse.json({ success: false, error: "Không tìm thấy sản phẩm" }, { status: 404 });
    const { id: productId, name, slug, description, contentHtml, brand, model, series, warranty, condition, origin, price, originalPrice, images, stock, specs, tags, category, variants, productImages } = product;
    const { getPublicMediaUrl } = await import("@/infra/cloudflare/r2/storage");
    const activeImages = productImages && productImages.length > 0
      ? JSON.stringify(productImages.map(img => img.url || getPublicMediaUrl(img.r2Key)))
      : images;
    return NextResponse.json({ success: true, data: { id: productId, name, slug, description, contentHtml: contentHtml ? sanitizeHtml(contentHtml) : null, brand, model, series, warranty, condition, origin, price, originalPrice, images: activeImages, stock, specs, tags, category: category ? { id: category.id, name: category.name, slug: category.slug } : null, variants: variants.map(({ id, sku, name, options, price, originalPrice, image }) => ({ id, sku, name, options, price, originalPrice, image })) } });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ success: false, error: "Không thể tải sản phẩm" }, { status: 500 });
  }
}

async function DELETEHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  const { id } = await params;
  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: `Endpoint xóa sản phẩm legacy đã ngừng hoạt động để bảo vệ toàn vẹn lịch sử đơn hàng. Vui lòng sử dụng DELETE /api/admin/products/${id} để lưu trữ/ẩn sản phẩm an toàn.`,
    },
    { status: 409 }
  );
}

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  const { id } = await params;
  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: `Endpoint sửa sản phẩm legacy đã ngừng hoạt động để bảo vệ phiên bản và lịch sử chỉnh sửa CMS. Vui lòng sử dụng PUT /api/admin/products/${id} hoặc giao diện biên tập sản phẩm tại /admin/products/${id}.`,
    },
    { status: 409 }
  );
}

export const GET = withAdminContext(GETHandler);
export const DELETE = withAdminContext(DELETEHandler);
export const PATCH = withAdminContext(PATCHHandler);
