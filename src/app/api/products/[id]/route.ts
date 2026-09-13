import { NextResponse } from "next/server";
import { mockProducts } from "@/lib/mock-data";

const hasDatabase = !!process.env.DATABASE_URL;

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
function toBooleanFlag(value: unknown, fallback = false): boolean { if (value === undefined || value === null) return fallback; return Boolean(value); }
function toNullableIso(value: unknown): string | null { const text = toNullableString(value); if (!text) return null; const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
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
    const price = Number(raw?.price);
    const originalValue = raw?.originalPrice as number | string | null | undefined;
    const originalPrice = originalValue === null || originalValue === undefined || originalValue === "" ? null : Number(originalValue);
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
      stock, image: raw.image ? String(raw.image).trim() : null, status: raw.status === "draft" ? "draft" : "active",
    });
  }
  return { variants };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) {
      const product = mockProducts.find((p) => p.id === id);
      if (!product) return NextResponse.json({ success: false, error: "Không tìm thấy sản phẩm" }, { status: 404 });
      return NextResponse.json({ success: true, data: { ...product, variants: [] } });
    }
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findUnique({ where: { id }, include: { category: true, variants: { orderBy: { createdAt: "asc" } } } });
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
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
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
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    const name = String(data.name || "").trim();
    const slug = String(data.slug || "").trim();
    const price = Number(data.price);
    const originalPrice = data.originalPrice === null || data.originalPrice === undefined || data.originalPrice === "" ? null : Number(data.originalPrice);
    const stock = Number(data.stock ?? 0);
    const minOrderQty = Math.max(1, Number(data.minOrderQty ?? 1));
    const maxOrderRaw = toNullableNumber(data.maxOrderQty);
    const maxOrderQty = maxOrderRaw === null ? null : Math.max(minOrderQty, Math.round(maxOrderRaw));
    const variantResult = normalizeVariants(data.variants);
    if (!name || !slug || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) || !data.categoryId || variantResult.error) {
      return NextResponse.json({ success: false, error: variantResult.error || "Dữ liệu sản phẩm không hợp lệ" }, { status: 400 });
    }
    const variants = variantResult.variants;
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name, slug, description: String(data.description || ""), contentHtml: toNullableString(data.contentHtml),
          brand: toNullableString(data.brand), model: toNullableString(data.model), series: toNullableString(data.series),
          warranty: toNullableString(data.warranty), condition: toNullableString(data.condition), origin: toNullableString(data.origin),
          seoTitle: toNullableString(data.seoTitle), seoDescription: toNullableString(data.seoDescription), canonicalSlug: toNullableString(data.canonicalSlug),
          isFeatured: toBooleanFlag(data.isFeatured), isNewArrival: toBooleanFlag(data.isNewArrival), isFlashSale: toBooleanFlag(data.isFlashSale), isBestSeller: toBooleanFlag(data.isBestSeller),
          allowBackorder: toBooleanFlag(data.allowBackorder), minOrderQty, maxOrderQty, lowestPrice30d: toNullableNumber(data.lowestPrice30d),
          publishAt: toNullableIso(data.publishAt), unpublishAt: toNullableIso(data.unpublishAt),
          price, originalPrice,
          images: typeof data.images === "string" ? data.images : JSON.stringify(data.images || []), stock,
          status: data.status === "draft" || data.status === "archived" ? data.status : "active",
          specs: data.specs ? (typeof data.specs === "string" ? data.specs : JSON.stringify(data.specs)) : null,
          tags: data.tags == null ? "" : String(data.tags), categoryId: String(data.categoryId),
        },
      });
      if (variants) {
        const keepIds = variants.filter((v) => v.id).map((v) => v.id as string);
        await tx.productVariant.deleteMany({ where: { productId: id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } });
        for (const variant of variants) {
          const { id: variantId, ...variantData } = variant;
          if (variantId) await tx.productVariant.update({ where: { id: variantId }, data: variantData });
          else await tx.productVariant.create({ data: { product: { connect: { id } }, sku: variantData.sku, name: variantData.name, options: variantData.options, price: variantData.price, originalPrice: variantData.originalPrice, stock: variantData.stock, image: variantData.image, status: variantData.status } });
        }
      }
      await saveEditLog(tx, id, "update_product", { name, slug, status: updated.status, categoryId: updated.categoryId, price, originalPrice });
      return tx.product.findUnique({ where: { id: updated.id }, include: { category: true, variants: { orderBy: { createdAt: "asc" } } } });
    });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to update product:", error);
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "Slug hoặc SKU đã tồn tại" : "Không thể cập nhật sản phẩm";
    return NextResponse.json({ success: false, error: message }, { status: message.includes("đã tồn tại") ? 409 : 500 });
  }
}
