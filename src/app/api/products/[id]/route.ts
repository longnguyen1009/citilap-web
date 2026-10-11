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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdminMutation(_request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    if (await prisma.productStudio.findUnique({ where: { productId: id } })) return NextResponse.json({ success: false, error: 'Use Product Studio to edit this product.' }, { status: 409 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa sản phẩm" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    const { prisma } = await import("@/lib/prisma");
    if (await prisma.productStudio.findUnique({ where: { productId: id } })) return NextResponse.json({ success: false, error: 'Use Product Studio to edit this product.' }, { status: 409 });

    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    if (typeof data.categoryId !== "string" || !data.categoryId.trim()) return NextResponse.json({ success: false, error: "Category is invalid" }, { status: 400 });
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existingProduct) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    const requestedStatus = data.status === undefined ? existingProduct.status : String(data.status);
    if (!PRODUCT_STATUSES.has(requestedStatus)) return NextResponse.json({ success: false, error: "Invalid product status" }, { status: 400 });
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    const price = Number(data.price);
    const originalPrice = data.originalPrice === null || data.originalPrice === undefined || data.originalPrice === "" ? null : Number(data.originalPrice);
    const stock = Number(data.stock ?? 0);
    const minOrderQty = Number(data.minOrderQty ?? 1);
    const maxOrderRaw = toNullableNumber(data.maxOrderQty);
    const maxOrderQty = maxOrderRaw === null ? null : maxOrderRaw;
    const variantResult = normalizeVariants(data.variants);
    if (!name || !slug || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(minOrderQty) || minOrderQty < 1 || (maxOrderQty !== null && (!Number.isInteger(maxOrderQty) || maxOrderQty < minOrderQty)) || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) || !data.categoryId || variantResult.error || hasInvalidDate(data.publishAt) || hasInvalidDate(data.unpublishAt) || ["isFeatured", "isNewArrival", "isFlashSale", "isBestSeller", "allowBackorder"].some((field) => !isBooleanLike(data[field]))) {
      return NextResponse.json({ success: false, error: variantResult.error || "Dữ liệu sản phẩm không hợp lệ" }, { status: 400 });
    }
    const publishAt = toNullableIso(data.publishAt);
    const unpublishAt = toNullableIso(data.unpublishAt);
    if (publishAt && unpublishAt && unpublishAt <= publishAt) return NextResponse.json({ success: false, error: "unpublishAt must be after publishAt" }, { status: 400 });
    const category = await prisma.category.findUnique({ where: { id: String(data.categoryId) }, select: { id: true } });
    if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    const variants = variantResult.variants;
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name, slug, description: String(data.description || ""), contentHtml: data.contentHtml == null ? null : sanitizeHtml(String(data.contentHtml)).slice(0, 100000),
          brand: toNullableString(data.brand), model: toNullableString(data.model), series: toNullableString(data.series),
          warranty: toNullableString(data.warranty), condition: toNullableString(data.condition) ?? undefined, origin: toNullableString(data.origin),
          seoTitle: toNullableString(data.seoTitle), seoDescription: toNullableString(data.seoDescription), canonicalSlug: toNullableString(data.canonicalSlug),
          isFeatured: toBooleanFlag(data.isFeatured), isNewArrival: toBooleanFlag(data.isNewArrival), isFlashSale: toBooleanFlag(data.isFlashSale), isBestSeller: toBooleanFlag(data.isBestSeller),
          allowBackorder: toBooleanFlag(data.allowBackorder), minOrderQty, maxOrderQty, lowestPrice30d: data.lowestPrice30d != null ? Math.round(Number(data.lowestPrice30d)) : null,
          publishAt, unpublishAt,
          price: Math.round(price), originalPrice: originalPrice != null ? Math.round(originalPrice) : null,
          images: typeof data.images === "string" ? data.images : JSON.stringify(data.images || []), stock,
          status: requestedStatus,
          specs: data.specs ? (typeof data.specs === "string" ? data.specs : JSON.stringify(data.specs)) : null,
          tags: data.tags == null ? "" : String(data.tags), categoryId: String(data.categoryId),
        },
      });

      if (data.images !== undefined) {
        const rawImages: string[] = Array.isArray(data.images)
          ? data.images
          : typeof data.images === "string"
          ? (() => { try { const p = JSON.parse(data.images); return Array.isArray(p) ? p : [data.images]; } catch { return [data.images]; } })()
          : [];

        if (rawImages.length > 0) {
          const { extractR2Key, getPublicMediaUrl } = await import("@/infra/cloudflare/r2/storage");
          const existingImages = await tx.productImage.findMany({ where: { productId: id } });
          const existingKeyMap = new Map(existingImages.map((img) => [img.r2Key, img]));

          for (let i = 0; i < rawImages.length; i++) {
            const item = String(rawImages[i]).trim();
            if (!item) continue;
            const key = extractR2Key(item);
            const existing = existingKeyMap.get(key);
            if (!existing) {
              await tx.productImage.create({
                data: {
                  productId: id,
                  r2Key: key,
                  url: getPublicMediaUrl(key),
                  sortOrder: i,
                  isPrimary: i === 0,
                },
              });
            } else {
              await tx.productImage.update({
                where: { id: existing.id },
                data: { sortOrder: i, isPrimary: i === 0 },
              });
            }
          }
        }
      }
      if (variants) {
        const keepIds = variants.filter((v) => v.id).map((v) => v.id as string);
        if (keepIds.length) {
          const owned = await tx.productVariant.findMany({ where: { id: { in: keepIds }, productId: id }, select: { id: true } });
          if (owned.length !== keepIds.length) throw new Error("VARIANT_OWNERSHIP");
        }
        await tx.productVariant.deleteMany({ where: { productId: id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } });
        for (const variant of variants) {
          const { id: variantId, ...variantData } = variant;
          if (variantId) {
            const existingVariant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true, productId: true } });
            if (existingVariant && existingVariant.productId === id) {
              await tx.productVariant.update({ where: { id: variantId }, data: variantData });
            }
          } else {
            await tx.productVariant.create({ data: { product: { connect: { id } }, sku: variantData.sku, name: variantData.name, options: variantData.options, price: variantData.price, originalPrice: variantData.originalPrice, stock: variantData.stock, image: variantData.image, status: variantData.status } });
          }
        }
      }
      await saveEditLog(tx, id, "update_product", { name, slug, status: updated.status, categoryId: updated.categoryId, price, originalPrice });
      return tx.product.findUnique({ where: { id: updated.id }, include: { category: true, variants: { orderBy: { createdAt: "asc" } } } });
    });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof Error && error.message === "VARIANT_OWNERSHIP") return NextResponse.json({ success: false, error: "Variant does not belong to this product" }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_BOOLEAN") return NextResponse.json({ success: false, error: "Boolean field is invalid" }, { status: 400 });
    console.error("Failed to update product:", error);
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "Slug hoặc SKU đã tồn tại" : "Không thể cập nhật sản phẩm";
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") return NextResponse.json({ success: false, error: "Slug or SKU already exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
