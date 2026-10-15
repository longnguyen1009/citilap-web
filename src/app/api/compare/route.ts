import { NextRequest, NextResponse } from "next/server";
import { mediaEnvironment } from "@/server/media-http";
import {
  MAX_COMPARE_PRODUCTS,
  type CompareProductItem,
  type CompareSpecRow,
  type CompareApiResponse,
} from "@/contracts/catalog/compare";
import { conditionLabels, attributeTemplateDefinitions } from "@/contracts/cms/product-studio";

export const runtime = "edge";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  images: string | null;
  condition: string;
  brand: string | null;
  warranty: string | null;
  specs: string | null;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  storage: string | null;
  display: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  published: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse<CompareApiResponse>> {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") || "";
  const rawIds = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const uniqueIds = [...new Set(rawIds)];

  if (uniqueIds.length === 0) {
    return NextResponse.json({
      success: false,
      compatible: false,
      groupType: "",
      error: "Vui lòng chọn ít nhất 1 sản phẩm để so sánh.",
      products: [],
      specs: [],
    });
  }

  if (uniqueIds.length > MAX_COMPARE_PRODUCTS) {
    return NextResponse.json(
      {
        success: false,
        compatible: false,
        groupType: "",
        error: `Chỉ có thể so sánh tối đa ${MAX_COMPARE_PRODUCTS} sản phẩm cùng lúc. Vui lòng bỏ bớt sản phẩm trước khi tiếp tục.`,
        products: [],
        specs: [],
      },
      { status: 400 }
    );
  }

  try {
    const { DB } = await mediaEnvironment();

    // Query active public products from D1
    const placeholders = uniqueIds.map(() => "?").join(",");
    const sql = `
      SELECT
        p.id, p.name, p.slug, p.price, p.originalPrice, p.images,
        p.condition, p.brand, p.warranty, p.specs,
        p.cpu, p.gpu, p.ram, p.storage, p.display,
        p.categoryId, c.slug AS categorySlug,
        s.published
      FROM Product p
      LEFT JOIN ProductStudio s ON s.productId = p.id
      LEFT JOIN Category c ON c.id = p.categoryId
      WHERE p.id IN (${placeholders})
        AND p.status = 'ACTIVE'
        AND p.deletedAt IS NULL
        AND (s.published IS NOT NULL OR s.productId IS NULL)
    `;

    const stmt = DB.prepare(sql).bind(...uniqueIds);
    const result = await stmt.all<ProductRow>();
    const rows = result.results || [];

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        compatible: false,
        groupType: "",
        error: "Các sản phẩm đã chọn không tồn tại hoặc đã ngừng kinh doanh.",
        products: [],
        specs: [],
      });
    }

    // Preserve the requested order of IDs
    const rowMap = new Map(rows.map((r) => [r.id, r]));
    const orderedRows = uniqueIds.map((id) => rowMap.get(id)).filter(Boolean) as ProductRow[];

    // Parse product details, determine template & kind
    const products: CompareProductItem[] = [];
    const productSpecsMap = new Map<string, Record<string, string>>();

    for (const row of orderedRows) {
      let productName = row.name;
      let productPrice = row.price;
      let productOriginalPrice = row.originalPrice;
      let productCondition = row.condition || "NEW";
      let productWarranty = row.warranty || undefined;
      let productBrand = row.brand || undefined;
      let primaryImage: string | null = null;

      let template = "LAPTOP";
      let kind = "LAPTOP";
      let parsedSpecs: Record<string, string> = {};

      if (row.published) {
        try {
          const doc = JSON.parse(row.published);
          if (doc.name) productName = doc.name;
          if (typeof doc.price === "number") productPrice = doc.price;
          if (doc.originalPrice !== undefined) productOriginalPrice = doc.originalPrice;
          if (doc.condition) productCondition = doc.condition;
          if (doc.warranty !== undefined) productWarranty = doc.warranty;
          if (doc.brand !== undefined) productBrand = doc.brand;
          if (Array.isArray(doc.images) && doc.images.length > 0 && doc.images[0]) {
            primaryImage = doc.images[0];
          }
          if (doc.template) template = doc.template;
          if (Array.isArray(doc.specs)) {
            for (const s of doc.specs) {
              if (s.key && s.value) parsedSpecs[s.key] = s.value;
            }
          }
        } catch {
          // fallback to row specs
        }
      } else if (row.categorySlug) {
        // Infer template for legacy products from categorySlug
        const cat = row.categorySlug.toLowerCase();
        if (cat.includes("chuot") || cat.includes("mouse")) template = "MOUSE";
        else if (cat.includes("ban-phim") || cat.includes("keyboard")) template = "KEYBOARD";
        else if (cat.includes("tai-nghe") || cat.includes("headphone")) template = "HEADPHONE";
        else if (cat.includes("sac") || cat.includes("charger")) template = "CHARGER";
        else if (cat.includes("hub")) template = "HUB";
        else if (cat.includes("balo") || cat.includes("bag")) template = "BAG";
        else if (cat.includes("man-hinh") || cat.includes("monitor")) template = "MONITOR";
        else if (cat.includes("linh-kien") || cat.includes("phu-kien")) template = "ACCESSORY";
      }

      if (["MOUSE", "KEYBOARD", "HEADPHONE", "CHARGER", "HUB", "BAG", "MONITOR", "ACCESSORY", "TECH"].includes(template)) {
        kind = "ACCESSORY";
      }

      if (Object.keys(parsedSpecs).length === 0 && row.specs) {
        try {
          const raw = JSON.parse(row.specs);
          if (typeof raw === "object" && raw !== null) {
            parsedSpecs = raw as Record<string, string>;
          }
        } catch {
          // ignore
        }
      }

      // Fill in hardware specs if laptop
      if (kind === "LAPTOP") {
        if (row.cpu && !parsedSpecs["CPU"]) parsedSpecs["CPU"] = row.cpu;
        if (row.ram && !parsedSpecs["RAM"]) parsedSpecs["RAM"] = row.ram;
        if (row.storage && !parsedSpecs["SSD"]) parsedSpecs["SSD"] = row.storage;
        if (row.gpu && !parsedSpecs["GPU"]) parsedSpecs["GPU"] = row.gpu;
        if (row.display && !parsedSpecs["Màn hình"]) parsedSpecs["Màn hình"] = row.display;
      }

      // Resolve primary image if not resolved from published doc
      if (!primaryImage && row.images) {
        try {
          const parsed = JSON.parse(row.images);
          if (Array.isArray(parsed) && parsed[0]) primaryImage = parsed[0];
          else if (typeof parsed === "string") primaryImage = parsed;
        } catch {
          if (row.images.startsWith("http")) primaryImage = row.images;
        }
      }

      const cond = productCondition;
      const conditionLabel = conditionLabels[cond as keyof typeof conditionLabels] || cond;

      products.push({
        id: row.id,
        name: productName,
        slug: row.slug,
        price: productPrice,
        originalPrice: productOriginalPrice,
        image: primaryImage,
        kind,
        template,
        brand: productBrand,
        condition: cond,
        conditionLabel,
        warranty: productWarranty,
      });

      productSpecsMap.set(row.id, parsedSpecs);
    }

    // Compatibility rule: All compared products must belong to the same template or compatible group
    const firstTemplate = products[0].template;
    const firstKind = products[0].kind;
    const isIncompatible = products.some((p) => {
      if (firstKind === "LAPTOP") return p.kind !== "LAPTOP";
      return p.template !== firstTemplate;
    });

    if (isIncompatible) {
      return NextResponse.json({
        success: false,
        compatible: false,
        groupType: firstTemplate,
        error: "Không thể so sánh các sản phẩm khác loại với nhau (ví dụ: không thể so sánh Laptop với Chuột trong cùng bảng thông số). Vui lòng chọn các sản phẩm cùng nhóm.",
        products: [],
        specs: [],
      });
    }

    // Collect all spec keys in stable display order
    const allKeysSet = new Set<string>();
    // Pre-insert common specs for laptop
    if (firstKind === "LAPTOP") {
      ["CPU", "RAM", "Ổ cứng", "SSD", "Card đồ họa", "GPU", "Màn hình", "Trọng lượng", "Pin", "Hệ điều hành"].forEach((k) => allKeysSet.add(k));
    }

    for (const specs of productSpecsMap.values()) {
      for (const k of Object.keys(specs)) {
        allKeysSet.add(k);
      }
    }

    const specRows: CompareSpecRow[] = [];

    // Base attributes: Brand, Condition, Warranty
    const baseAttrs: { key: string; label: string; getValue: (p: CompareProductItem) => string }[] = [
      { key: "__brand", label: "Thương hiệu", getValue: (p) => p.brand || "Chưa cập nhật" },
      { key: "__condition", label: "Tình trạng", getValue: (p) => p.conditionLabel || "Chưa cập nhật" },
      { key: "__warranty", label: "Bảo hành", getValue: (p) => p.warranty || "Theo chính sách Citilap" },
    ];

    for (const attr of baseAttrs) {
      const values: Record<string, string> = {};
      const uniqueVals = new Set<string>();
      for (const p of products) {
        const val = attr.getValue(p);
        values[p.id] = val;
        uniqueVals.add(val);
      }
      specRows.push({
        key: attr.key,
        label: attr.label,
        values,
        isDifferent: uniqueVals.size > 1,
      });
    }

    // Exclude attributes explicitly configured with isComparable === false
    const templateDefs = attributeTemplateDefinitions[firstTemplate as keyof typeof attributeTemplateDefinitions] || [];
    const nonComparableKeys = new Set(
      templateDefs.filter((d) => d.isComparable === false).map((d) => d.key)
    );

    for (const key of allKeysSet) {
      if (nonComparableKeys.has(key)) continue;
      const values: Record<string, string> = {};
      const uniqueVals = new Set<string>();
      let hasAnyValue = false;

      for (const p of products) {
        const specs = productSpecsMap.get(p.id) || {};
        const val = specs[key] || "Chưa cập nhật";
        values[p.id] = val;
        if (val !== "Chưa cập nhật") hasAnyValue = true;
        uniqueVals.add(val);
      }

      if (hasAnyValue) {
        specRows.push({
          key,
          label: key,
          values,
          isDifferent: uniqueVals.size > 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      compatible: true,
      groupType: firstTemplate,
      products,
      specs: specRows,
    });
  } catch (error) {
    console.error("[CompareAPI] Error evaluating compare products:", error);
    return NextResponse.json({
      success: false,
      compatible: false,
      groupType: "",
      error: "Không thể tải thông tin so sánh sản phẩm vào lúc này.",
      products: [],
      specs: [],
    });
  }
}
