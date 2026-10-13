import { NextResponse } from "next/server";
import { requireAdminMutation, isAdminRequest } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize-html";

const hasDatabase = !!process.env.DATABASE_URL;
const PRODUCT_STATUSES = new Set(["ACTIVE", "DRAFT", "ARCHIVED", "INACTIVE", "OUT_OF_STOCK", "active", "draft", "archived"]);

type VariantInput = {
  id?: string;
  sku: string;
  name: string;
  options: Record<string, string> | string;
  price: number;
  originalPrice?: number | null;
  stock?: number;
  image?: string | null;
  status?: string;
};
type NormalizedVariant = { id?: string; sku: string; name: string; options: string; price: number; originalPrice: number | null; stock: number; image: string | null; status: string };

function toNullableString(value: unknown): string | null { if (value === undefined || value === null) return null; const text = String(value).trim(); return text || null; }
function toNullableNumber(value: unknown): number | null { if (value === undefined || value === null || value === '') return null; const num = Number(value); return Number.isFinite(num) ? num : null; }
function isBooleanLike(value: unknown): boolean { return value === undefined || value === null || typeof value === "boolean" || (typeof value === "string" && ["true", "false", "1", "0"].includes(value.trim().toLowerCase())); }
function toBooleanFlag(value: unknown, fallback = false): boolean { if (value === undefined || value === null) return fallback; if (typeof value === "boolean") return value; if (typeof value === "string" && ["true", "1"].includes(value.trim().toLowerCase())) return true; if (typeof value === "string" && ["false", "0"].includes(value.trim().toLowerCase())) return false; throw new Error("INVALID_BOOLEAN"); }
function toNullableIso(value: unknown): string | null { const text = toNullableString(value); if (!text) return null; const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function hasInvalidDate(value: unknown): boolean { return value !== undefined && value !== null && value !== "" && toNullableIso(value) === null; }
function toLimitedSnapshot(value: unknown, maxLength = 4000): string | undefined { if (!value) return undefined; const text = typeof value === "string" ? value : JSON.stringify(value); return text.length > maxLength ? text.slice(0, maxLength) : text; }
type EditLogCreate = { productEditLog: { create: (args: { data: { productId: string; action: string; actorName?: string; snapshot?: string } }) => Promise<unknown> } };
async function saveEditLog(tx: EditLogCreate, productId: string, action: string, snapshot?: Record<string, unknown>) { await tx.productEditLog.create({ data: { productId, action, actorName: "Admin", snapshot: toLimitedSnapshot(snapshot) } }); }
function normalizeVariants(value: unknown): { variants?: NormalizedVariant[]; error?: string } {
  if (value === undefined) return {};
  if (!Array.isArray(value)) return { error: "Danh sách cấu hình không hợp lệ" };
  const seen = new Set<string>();
  const variants: NormalizedVariant[] = [];
  for (const raw of value as VariantInput[]) {
    const sku = String(raw?.sku || "").trim();
    const name = String(raw?.name || "").trim();
    const price = Math.round(Number(raw?.price));
    const originalValue = raw?.originalPrice as number | string | null | undefined;
    const originalPrice = originalValue === null || originalValue === undefined || originalValue === "" ? null : Math.round(Number(originalValue));
    const stock = Number(raw?.stock ?? 0);
    if (!sku || !name || seen.has(sku) || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price))) {
      return { error: `Cấu hình "${name || sku || "không tên"}" không hợp lệ hoặc SKU bị trùng` };
    }
    let options: Record<string, string>;
    try {
      options = typeof raw.options === "string" ? JSON.parse(raw.options) : raw.options || {};
    } catch {
      return { error: `Options của SKU ${sku} phải là JSON hợp lệ` };
    }
    if (!options || typeof options !== "object" || Object.keys(options).length === 0) return { error: `Cấu hình ${sku} cần ít nhất một option` };
    seen.add(sku);
    variants.push({
      ...(raw.id ? { id: String(raw.id) } : {}), sku, name, options: JSON.stringify(options), price, originalPrice,
      stock, image: raw.image ? String(raw.image).trim() : null, status: raw.status === "draft" || raw.status === "DRAFT" ? "DRAFT" : "ACTIVE",
    });
  }
  return { variants };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { createPrismaD1Client } = await import('@/lib/prisma');
    const { mediaEnvironment } = await import('@/server/media-http');
    const prisma = createPrismaD1Client((await mediaEnvironment()).DB);
    const product = await prisma.product.findFirst({
      where: isAdminRequest(_request) ? { id } : { id, status: { in: ["ACTIVE", "active"] } },
      include: {
        category: true,
        variants: {
          where: isAdminRequest(_request) ? undefined : { status: { in: ["ACTIVE", "active"] } },
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdminMutation(request);
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdminMutation(request);
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
