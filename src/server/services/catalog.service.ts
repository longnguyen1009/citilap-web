import { prisma, type PrismaClient } from "@/lib/prisma";
import {catalogBatches} from './catalog-batches';
import { getProductImageUrl, getPublicMediaUrl } from "@/infra/cloudflare/r2/storage";
import { ACCESSORY_TYPES, getAccessoryTypeBySlug } from "@/config/accessory-taxonomy";
import { normalizeVnd, calculateEffectivePrice, getStorefrontPricingContext, type PriceEvaluationContext } from "./pricing.service";

/**
 * Standardized Homepage & Card Product Data Contract (STORE-05)
 * All fields are sourced from Cloudflare D1 and Cloudflare R2 media metadata.
 */
export interface HomepageProduct {
  availability?: string;
  id: string;
  slug: string;
  sku?: string;
  variantId?: string;
  name: string;
  brand?: string;
  category?: string;
  categorySlug?: string;
  model?: string;
  series?: string;
  condition: string; // Stable codes: "NEW", "LIKE_NEW", "USED", "REFURBISHED", "LIQUIDATION"
  rawPrice?: number;
  rawOriginalPrice?: number | null;
  price: number; // Integer VND
  originalPrice?: number | null; // Integer VND
  oldPrice?: number | null;
  discount?: string; // Formatted badge discount string e.g. "-14%"
  isFlashSale?: boolean;
  isOnSale?: boolean;
  stock: number; // Transitional aggregate inventory
  warranty?: string;
  primaryImage: string | null;
  // Compatibility field for ProductCard component
  image: string | null;
  specs: {
    cpu?: string;
    ram?: string;
    ssd?: string;
    gpu?: string;
    display?: string;
  };
}

export interface ProductDetailVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  storage: string | null;
  display: string | null;
  image: string | null;
  options?: Record<string, string>;
}

export interface ProductDetailImage {
  id: string;
  r2Key: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  alt: string | null;
  variantId?: string | null;
}

export interface ProductDetailSpecItem {
  label: string;
  value: string;
}

export interface ProductDetailSpecGroup {
  group: string;
  items: ProductDetailSpecItem[];
}

export interface ProductDetailData {
  id: string;
  slug: string;
  canonicalSlug: string;
  name: string;
  brand: string | null;
  brandSlug: string | null;
  brandId: string | null;
  category: string | null;
  categorySlug: string | null;
  categoryId: string;
  model: string | null;
  series: string | null;
  warranty: string | null;
  condition: string;
  conditionLabel: string;
  origin: string | null;

  basePrice: number;
  baseOriginalPrice: number | null;
  baseStock: number;

  selectedVariantId: string | null;
  selectedSku: string | null;
  selectedVariantName: string | null;
  price: number;
  originalPrice: number | null;
  discount?: string;
  isFlashSale?: boolean;
  stock: number;

  specs: {
    cpu: string;
    gpu: string;
    ram: string;
    ssd: string;
    display: string;
    screenSize?: number | null;
    refreshRate?: number | null;
  };
  fullSpecs: ProductDetailSpecGroup[];

  description: string;
  shortDescription: string | null;
  contentHtml: string | null;

  images: ProductDetailImage[];
  primaryImageUrl: string | null;

  variants: ProductDetailVariant[];

  seoTitle: string | null;
  seoDescription: string | null;
}

export interface HomepageCatalogData {
  featured: HomepageProduct[];
  newArrivals: HomepageProduct[];
  gaming: HomepageProduct[];
  ultrabook: HomepageProduct[];
  workstation: HomepageProduct[];
  bestSelling: HomepageProduct[];
  likeNew: HomepageProduct[];
  accessories: HomepageProduct[];
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  subCategories?: CategorySummary[];
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  productCount: number;
}

export interface CategoryFilterOptions {
  categorySlug?: string;
  brand?: string | string[];
  condition?: string | string[];
  accessoryType?: string | string[];
  type?: string | string[];
  connection?: string | string[];
  power?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  cpu?: string | string[];
  gpu?: string | string[];
  ram?: number | number[];
  storage?: number | number[];
  sort?: "newest" | "price-asc" | "price-desc" | "featured" | "best-selling";
  page?: number;
  limit?: number;
}

export interface FacetOption<T = string> {
  value: T;
  label: string;
  count: number;
}

export interface CategoryFilteredResult {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
  } | null;
  products: HomepageProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    brands: FacetOption[];
    conditions: FacetOption[];
    accessoryTypes?: FacetOption[];
    connections?: FacetOption[];
    powers?: FacetOption[];
    cpuSeries: FacetOption[];
    gpuSeries: FacetOption[];
    ramOptions: FacetOption<number>[];
    storageOptions: FacetOption<number>[];
    priceRange: { min: number; max: number };
  };
}

type ProductDbRow = {
  studio?: {published:string|null}|null;
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  brand?: string | null;
  model?: string | null;
  series?: string | null;
  warranty?: string | null;
  condition: string;
  price: number;
  originalPrice?: number | null;
  images: string;
  stock: number;
  status: string;
  isFlashSale?: boolean | number;
  cpu?: string | null;
  gpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  display?: string | null;
  specs?: string | null;
  tags?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  brandRel?: { id: string; name: string; slug: string } | null;
  productImages?: Array<{
    id: string;
    r2Key: string;
    url?: string | null;
    isPrimary: boolean;
    sortOrder: number;
    alt?: string | null;
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    ram?: string | null;
    storage?: string | null;
    gpu?: string | null;
    options?: string | null;
  }>;
};

/**
 * Normalizes RAM search criteria to avoid substring collision (e.g. 16GB matching 116GB).
 */
export function buildRamClauses(ramInput: number | number[]) {
  const ramList = Array.isArray(ramInput) ? ramInput : [ramInput];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clauses: any[] = [];
  for (const r of ramList) {
    clauses.push(
      { ram: { startsWith: `${r}GB` } },
      { ram: { startsWith: `${r} GB` } },
      { ram: { contains: ` ${r}GB` } },
      { ram: { contains: ` ${r} GB` } },
      { ram: { equals: `${r}GB` } },
      { ram: { equals: `${r}` } }
    );
  }
  return clauses;
}

/**
 * Normalizes Storage search criteria (e.g. 1024GB matching 1TB, 1024GB, 1000GB).
 */
export function buildStorageClauses(storageInput: number | number[]) {
  const storageList = Array.isArray(storageInput) ? storageInput : [storageInput];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clauses: any[] = [];
  for (const s of storageList) {
    if (s >= 1024) {
      const tb = s / 1024;
      clauses.push(
        { storage: { startsWith: `${tb}TB` } },
        { storage: { startsWith: `${tb} TB` } },
        { storage: { contains: ` ${tb}TB` } },
        { storage: { contains: ` ${tb} TB` } },
        { storage: { startsWith: `${s}GB` } },
        { storage: { startsWith: `${s} GB` } },
        { storage: { contains: ` ${s}GB` } },
        { storage: { contains: ` ${s} GB` } }
      );
      if (s === 1024) {
        clauses.push(
          { storage: { startsWith: "1000GB" } },
          { storage: { startsWith: "1000 GB" } },
          { storage: { contains: " 1000GB" } },
          { storage: { contains: " 1000 GB" } }
        );
      }
    } else {
      clauses.push(
        { storage: { startsWith: `${s}GB` } },
        { storage: { startsWith: `${s} GB` } },
        { storage: { contains: ` ${s}GB` } },
        { storage: { contains: ` ${s} GB` } },
        { storage: { equals: `${s}GB` } },
        { storage: { equals: `${s}` } }
      );
    }
  }
  return clauses;
}

export interface ActiveFilterContext {
  cpu?: string[];
  gpu?: string[];
  minPrice?: number;
  maxPrice?: number;
  ram?: number[];
  storage?: number[];
  condition?: string[];
  connection?: string[];
  power?: string[];
}

/**
 * Normalizes D1 database product record into the standard HomepageProduct data contract.
 * When an active filter is provided, dynamically resolves the lowest priced variant that matches
 * the filter criteria so that card prices and specs remain 100% faithful to customer intent.
 */
export function mapD1ProductToHomepageProduct(
  row: ProductDbRow,
  activeFilter?: ActiveFilterContext,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): HomepageProduct & { matchesFilter: boolean } {
  const published = row.studio?.published ? JSON.parse(row.studio.published) : null;
  const effectiveVariantPrice = (v: NonNullable<ProductDbRow['variants']>[number]) => calculateEffectivePrice(v.price,v.originalPrice ?? null,Boolean(row.isFlashSale),true,pricingContext,at,{productId:row.id,variantId:v.id,isVariant:true,variantOriginalPrice:v.originalPrice ?? null}).effectivePrice;
  const originalVariantCount = row.variants?.length || 0;
  row = {...row, variants:row.variants?.filter(v=>!published || published.variants?.some((pv:{id:string;availability?:string})=>pv.id===v.id && (!pv.availability || ['AVAILABLE','PREORDER'].includes(pv.availability))))
    .sort((a,b)=>effectiveVariantPrice(a)-effectiveVariantPrice(b) || a.id.localeCompare(b.id))};
  // 1. Resolve primary image from ProductImage table (metadata for Cloudflare R2)
  let resolvedImage: string | null = null;

  if (row.productImages && row.productImages.length > 0) {
    // Priority order: 1) isPrimary = true, 2) lowest sortOrder
    const sortedImages = [...row.productImages].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.sortOrder - b.sortOrder;
    });

    const chosen = sortedImages[0];
    resolvedImage = getProductImageUrl(chosen?.r2Key, chosen?.url);
  }

  // Fallback to legacy Product.images JSON field only if no ProductImage relation found
  if (!resolvedImage && row.images) {
    try {
      const parsed = JSON.parse(row.images);
      const first = Array.isArray(parsed) ? parsed[0] : row.images;
      if (typeof first === "string" && (first.startsWith("http://") || first.startsWith("https://") || first.startsWith("/"))) {
        resolvedImage = first;
      }
    } catch {
      if (typeof row.images === "string" && (row.images.startsWith("http://") || row.images.startsWith("https://"))) {
        resolvedImage = row.images;
      }
    }
  }

  // 2. Resolve specs from normalized columns (cpu, ram, storage, gpu, display)
  let specsObj: Record<string, string> = {};
  if (row.specs) {
    try {
      const parsed = JSON.parse(row.specs);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        specsObj = parsed;
      }
    } catch {}
  }

  // Resolve matching variant based on active filter context (strict variant-level price & spec alignment)
  let chosenVariant = row.variants && row.variants.length > 0 ? row.variants[0] : undefined;
  let matchesFilter = !originalVariantCount || !!row.variants?.length;

  if (activeFilter && row.variants && row.variants.length > 0) {
    const matched = row.variants.find((v) => {
      if (activeFilter.cpu?.length && !activeFilter.cpu.some(cpu => ((v as {cpu?:string|null}).cpu || row.cpu || '').toLowerCase().includes(cpu.toLowerCase()))) return false;
      if (activeFilter.gpu?.length && !activeFilter.gpu.some(gpu => (v.gpu || '').toLowerCase().includes(gpu.toLowerCase()))) return false;
      if (activeFilter.minPrice !== undefined && effectiveVariantPrice(v) < activeFilter.minPrice) return false;
      if (activeFilter.maxPrice !== undefined && effectiveVariantPrice(v) > activeFilter.maxPrice) return false;
      if (activeFilter.ram && activeFilter.ram.length > 0) {
        const vRam = v.ram || "";
        const matchesRam = activeFilter.ram.some(
          (r) =>
            vRam.startsWith(`${r}GB`) ||
            vRam.startsWith(`${r} GB`) ||
            vRam.includes(` ${r}GB`) ||
            vRam.includes(` ${r} GB`) ||
            vRam === `${r}GB` ||
            vRam === `${r}`
        );
        if (!matchesRam) return false;
      }
      if (activeFilter.storage && activeFilter.storage.length > 0) {
        const vStorage = v.storage || "";
        const matchesStorage = activeFilter.storage.some((s) => {
          if (s >= 1024) {
            const tb = s / 1024;
            return (
              vStorage.includes(`${tb}TB`) ||
              vStorage.includes(`${tb} TB`) ||
              vStorage.includes(`${s}GB`) ||
              vStorage.includes("1000GB")
            );
          }
          return (
            vStorage.startsWith(`${s}GB`) ||
            vStorage.startsWith(`${s} GB`) ||
            vStorage.includes(` ${s}GB`) ||
            vStorage.includes(` ${s} GB`) ||
            vStorage === `${s}GB` ||
            vStorage === `${s}`
          );
        });
        if (!matchesStorage) return false;
      }
      if (activeFilter.condition && activeFilter.condition.length > 0) {
        const opts = v.options || "";
        const matchesCond = activeFilter.condition.some((c) => opts.includes(`"condition":"${c}"`));
        if (!matchesCond) return false;
      }
      if (activeFilter.connection && activeFilter.connection.length > 0) {
        const opts = v.options || "";
        const matchesConn = activeFilter.connection.some((conn) => opts.includes(`"connection":"${conn}"`));
        if (!matchesConn) return false;
      }
      if (activeFilter.power && activeFilter.power.length > 0) {
        const opts = v.options || "";
        const matchesPow = activeFilter.power.some((pow) => opts.includes(`"power":"${pow}"`));
        if (!matchesPow) return false;
      }
      return true;
    });
    if (matched) {
      chosenVariant = matched;
    } else matchesFilter = false;
  }

  const cpu = (chosenVariant as { cpu?: string | null })?.cpu || row.cpu || specsObj.CPU || specsObj.cpu || "";
  const ram = chosenVariant?.ram || row.ram || specsObj.RAM || specsObj.ram || "";
  const ssd = chosenVariant?.storage || row.storage || specsObj.SSD || specsObj.ssd || specsObj.Storage || "";
  const gpu = chosenVariant?.gpu || row.gpu || specsObj.GPU || specsObj.gpu || specsObj.VGA || "";
  const display = row.display || specsObj["Màn hình"] || specsObj.display || specsObj.Screen || "";

  // 3. Integer money values (VND integer number faithful to chosen variant)
  const isVariant = Boolean(chosenVariant);
  const rawPrice = chosenVariant ? normalizeVnd(chosenVariant.price) : normalizeVnd(row.price);
  const rawOriginalPrice = isVariant
    ? (chosenVariant?.originalPrice !== null && chosenVariant?.originalPrice !== undefined ? normalizeVnd(chosenVariant.originalPrice) : null)
    : (row.originalPrice !== null && row.originalPrice !== undefined ? normalizeVnd(row.originalPrice) : null);

  const resolved = calculateEffectivePrice(
    rawPrice,
    rawOriginalPrice,
    Boolean(row.isFlashSale),
    true,
    pricingContext,
    at,
    {
      productId: row.id,
      variantId: chosenVariant?.id,
      isVariant,
      variantOriginalPrice: rawOriginalPrice,
    }
  );

  // 4. Normalized brand and category relations
  const brandName = row.brandRel?.name || row.brand || undefined;
  const categoryName = row.category?.name || undefined;
  const categorySlug = row.category?.slug || undefined;

  return {
    id: row.id,
    matchesFilter,
    availability: originalVariantCount && !row.variants?.length ? 'UNAVAILABLE' : published?.availability || 'AVAILABLE',
    slug: row.slug,
    sku: chosenVariant?.sku,
    variantId: chosenVariant?.id,
    name: row.name,
    brand: brandName,
    category: categoryName,
    categorySlug,
    model: row.model || undefined,
    series: row.series || undefined,
    condition: row.condition || "NEW",
    rawPrice,
    rawOriginalPrice,
    price: resolved.effectivePrice,
    originalPrice: resolved.compareAtPrice,
    oldPrice: resolved.compareAtPrice,
    discount: resolved.discountPercent ? `-${resolved.discountPercent}%` : undefined,
    isFlashSale: Boolean(row.isFlashSale),
    isOnSale: resolved.isOnSale,
    stock: typeof row.stock === "number" ? row.stock : 0,
    warranty: row.warranty || undefined,
    primaryImage: resolvedImage,
    image: resolvedImage,
    specs: {
      cpu,
      ram,
      ssd,
      gpu,
      display,
    },
  };
}

const defaultInclude = {
  studio: {select:{published:true}},
  category: {
    select: { id: true, name: true, slug: true },
  },
  brandRel: {
    select: { id: true, name: true, slug: true },
  },
  productImages: {
    orderBy: [
      { isPrimary: "desc" as const },
      { sortOrder: "asc" as const },
    ],
  },
  variants: {
    where: { status: { in: ["ACTIVE", "active"] } },
    select: { id: true, sku: true, name: true, price: true, originalPrice: true, cpu: true, ram: true, storage: true, gpu: true, options: true },
    orderBy: { price: "asc" as const },
  },
};

function isPrismaClient(val: unknown): val is PrismaClient {
  return Boolean(val && typeof val === "object" && typeof (val as PrismaClient).product?.findMany === "function");
}

function resolveClientAndPricing(
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt?: Date
): {
  client: PrismaClient;
  pricingContext?: PriceEvaluationContext | null;
  at: Date;
} {
  if (isPrismaClient(clientOrContext)) {
    return {
      client: clientOrContext,
      pricingContext: (contextOrAt instanceof Date ? undefined : contextOrAt) as PriceEvaluationContext | null | undefined,
      at: (contextOrAt instanceof Date ? contextOrAt : (maybeAt instanceof Date ? maybeAt : new Date())),
    };
  }

  return {
    client: prisma,
    pricingContext: (clientOrContext as PriceEvaluationContext | null | undefined),
    at: (contextOrAt instanceof Date ? contextOrAt : (maybeAt instanceof Date ? maybeAt : new Date())),
  };
}

/**
 * Fetches featured products directly from D1.
 */
export async function getFeaturedProducts(
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        isFeatured: true,
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error("[CatalogService] Failed to query featured products from D1:", error);
    throw error;
  }
}

/**
 * Fetches new arrival products directly from D1.
 */
export async function getNewArrivals(
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        isNewArrival: true,
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error("[CatalogService] Failed to query new arrivals from D1:", error);
    throw error;
  }
}

/**
 * Fetches flash sale products directly from D1.
 */
export async function getFlashSaleProducts(
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        isFlashSale: true,
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error("[CatalogService] Failed to query flash sale products from D1:", error);
    throw error;
  }
}

/**
 * Fetches products in a specific category by category slug directly from D1.
 */
export async function getCategoryProducts(
  categorySlug: string,
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        category: { slug: categorySlug },
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error(`[CatalogService] Failed to query products for category '${categorySlug}' from D1:`, error);
    throw error;
  }
}

/**
 * Fetches like-new and certified used laptop products directly from D1.
 */
export async function getLikeNewProducts(
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        condition: { in: ["LIKE_NEW", "USED", "REFURBISHED", "LIQUIDATION"] },
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error("[CatalogService] Failed to query like-new products from D1:", error);
    throw error;
  }
}

/**
 * Fetches best-selling products directly from D1.
 */
export async function getBestSellingProducts(
  limit = 10,
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageProduct[]> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const rows = await client.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        isBestSeller: true,
      },
      include: defaultInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
  } catch (error) {
    console.error("[CatalogService] Failed to query best-selling products from D1:", error);
    throw error;
  }
}

/**
 * Parallel optimized retrieval for all Homepage sections to avoid waterfall requests.
 */
export async function getHomepageCatalog(
  clientOrContext?: PrismaClient | PriceEvaluationContext | null,
  contextOrAt?: PriceEvaluationContext | Date | null,
  maybeAt: Date = new Date()
): Promise<HomepageCatalogData> {
  const { client, pricingContext, at } = resolveClientAndPricing(clientOrContext, contextOrAt, maybeAt);
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const [
      featured,
      newArrivals,
      gaming,
      ultrabook,
      workstation,
      bestSelling,
      likeNew,
      accessories,
    ] = await Promise.all([
      getFeaturedProducts(10, client, context, at),
      getNewArrivals(10, client, context, at),
      getCategoryProducts("laptop-gaming", 10, client, context, at),
      getCategoryProducts("laptop-van-phong", 10, client, context, at),
      getCategoryProducts("laptop-do-hoa", 10, client, context, at),
      getBestSellingProducts(10, client, context, at),
      getLikeNewProducts(10, client, context, at),
      getCategoryProducts("linh-kien", 10, client, context, at),
    ]);

    return {
      featured,
      newArrivals,
      gaming,
      ultrabook,
      workstation,
      bestSelling,
      likeNew,
      accessories,
    };
  } catch (error) {
    console.error("[CatalogService] Failed to retrieve homepage catalog from D1:", error);
    throw error;
  }
}

/**
 * Fetches all active categories ordered by sortOrder.
 */
export async function getActiveCategories(client: PrismaClient = prisma): Promise<CategorySummary[]> {
  try {
    const rows = await client.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: { status: { in: ["ACTIVE", "active"] } },
            },
          },
        },
      },
    });

    return rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      productCount: cat._count.products,
    }));
  } catch (error) {
    console.error("[CatalogService] Failed to query active categories from D1:", error);
    throw error;
  }
}

/**
 * Fetches single category by slug with product count.
 */
export async function getCategoryBySlug(slug: string, client: PrismaClient = prisma): Promise<CategorySummary | null> {
  try {
    const cat = await client.category.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        _count: {
          select: {
            products: {
              where: { status: { in: ["ACTIVE", "active"] } },
            },
          },
        },
      },
    });

    if (!cat) return null;

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      productCount: cat._count.products,
    };
  } catch (error) {
    console.error(`[CatalogService] Failed to query category by slug '${slug}' from D1:`, error);
    throw error;
  }
}

/**
 * Fetches all active brands ordered alphabetically with product count.
 */
export async function getActiveBrands(client: PrismaClient = prisma): Promise<BrandSummary[]> {
  try {
    const rows = await client.brand.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: { status: { in: ["ACTIVE", "active"] } },
            },
          },
        },
      },
    });

    return rows.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      productCount: brand._count.products,
    }));
  } catch (error) {
    console.error("[CatalogService] Failed to query active brands from D1:", error);
    throw error;
  }
}

const conditionDisplayLabels: Record<string, string> = {
  NEW: "Mới 100%",
  LIKE_NEW: "Like New (99%)",
  USED: "Đã qua sử dụng",
  REFURBISHED: "Refurbished",
  LIQUIDATION: "Hàng thanh lý",
};

/**
 * Executes server-side filtering, sorting, pagination, and facet aggregation for Category listings.
 * 100% Cloudflare D1 native without JavaScript array mock fallback.
 */
export async function getCategoryFilteredProducts(
  options: CategoryFilterOptions,
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<CategoryFilteredResult> {
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    // 1. Resolve category if slug is provided
    let category: CategorySummary | null = null;
    const effectiveSlug = options.categorySlug || (options as { slug?: string }).slug;
    if (effectiveSlug) {
      category = await getCategoryBySlug(effectiveSlug, client);
      if (!category) {
        return {
          category: null,
          products: [],
          totalCount: 0,
          page: options.page || 1,
          pageSize: options.limit || 12,
          totalPages: 0,
          facets: {
            brands: [],
            conditions: [],
            cpuSeries: [],
            gpuSeries: [],
            ramOptions: [],
            storageOptions: [],
            priceRange: { min: 0, max: 0 },
          },
        };
      }
    }

    // 2. Build parameterized Prisma where clause for D1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null, NOT: { studio: { is: { published: null } } },
      status: { in: ["ACTIVE", "active"] },
    };

    if (category) {
      if (category.slug === "laptop-cu") {
        where.OR = [
          { categoryId: category.id },
          { condition: { in: ["LIKE_NEW", "USED", "REFURBISHED", "LIQUIDATION"] } },
        ];
      } else {
        where.categoryId = category.id;
      }
    }

    // Brand filter
    const brandList = options.brand
      ? (Array.isArray(options.brand) ? options.brand : [options.brand]).filter(Boolean)
      : [];
    if (brandList.length > 0) {
      const brandClauses = [
        { brandRel: { slug: { in: brandList } } },
        { brand: { in: brandList } },
      ];
      if (where.OR) {
        where.AND = [
          ...(where.AND || []),
          { OR: brandClauses },
        ];
      } else {
        where.OR = brandClauses;
      }
    }

    // Condition filter (stable codes: NEW, LIKE_NEW, USED, ...)
    const conditionList = options.condition
      ? (Array.isArray(options.condition) ? options.condition : [options.condition]).filter(Boolean)
      : [];

    // Accessory Subtype Filter (for linh-kien or general accessory taxonomy)
    const rawType = options.accessoryType || options.type;
    const typeList = rawType
      ? (Array.isArray(rawType) ? rawType : [rawType]).filter(Boolean)
      : [];

    if (typeList.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typeClauses: any[] = [];
      for (const tSlug of typeList) {
        const typeItem = getAccessoryTypeBySlug(tSlug);
        if (typeItem) {
          typeClauses.push({ tags: { contains: typeItem.slug } });
          typeClauses.push({ series: { contains: typeItem.slug } });
          typeClauses.push({ model: { contains: typeItem.slug } });
          for (const kw of typeItem.keywords) {
            typeClauses.push({ name: { contains: kw } });
            typeClauses.push({ slug: { contains: kw } });
          }
        } else {
          typeClauses.push({ tags: { contains: tSlug } });
          typeClauses.push({ series: { contains: tSlug } });
          typeClauses.push({ name: { contains: tSlug } });
          typeClauses.push({ slug: { contains: tSlug } });
        }
      }

      if (typeClauses.length > 0) {
        if (where.OR) {
          where.AND = [...(where.AND || []), { OR: typeClauses }];
        } else {
          where.OR = typeClauses;
        }
      }
    }

    // Specs, variant & price atomic matching
    const ramList = options.ram
      ? (Array.isArray(options.ram) ? options.ram : [options.ram]).map(Number).filter((n) => !isNaN(n))
      : [];
    const storageList = options.storage
      ? (Array.isArray(options.storage) ? options.storage : [options.storage]).map(Number).filter((n) => !isNaN(n))
      : [];
    const cpuList = options.cpu
      ? (Array.isArray(options.cpu) ? options.cpu : [options.cpu]).filter(Boolean)
      : [];
    const gpuList = options.gpu
      ? (Array.isArray(options.gpu) ? options.gpu : [options.gpu]).filter(Boolean)
      : [];
    const connectionList = options.connection
      ? (Array.isArray(options.connection) ? options.connection : [options.connection]).filter(Boolean)
      : [];
    const powerList = options.power
      ? (Array.isArray(options.power) ? options.power : [options.power]).filter(Boolean)
      : [];

    const hasPriceFilter = options.minPrice !== undefined || options.maxPrice !== undefined;
    const hasSpecFilters = ramList.length > 0 || storageList.length > 0 || gpuList.length > 0;
    const hasAccessoryFilters = connectionList.length > 0 || powerList.length > 0;
    const hasConditionFilter = conditionList.length > 0;

    // CPU filter: Enforced at the Product level (and variant if variant has CPU)
    if (cpuList.length > 0) {
      const cpuClauses = [
        { cpuSeries: { in: cpuList } },
        { cpu: { in: cpuList } },
        { variants: { some: { status: { in: ["ACTIVE", "active"] }, cpu: { in: cpuList } } } },
      ];
      if (where.OR) {
        where.AND = [...(where.AND || []), { OR: cpuClauses }];
      } else {
        where.OR = cpuClauses;
      }
    }

    // Atomic Variant vs Legacy Product filtering:
    if (hasPriceFilter || hasSpecFilters || hasAccessoryFilters || hasConditionFilter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantMatch: any = { status: { in: ["ACTIVE", "active"] } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseMatch: any = {};

      // 2. RAM alignment
      if (ramList.length > 0) {
        baseMatch.ramGb = { in: ramList };
        const ramClauses = buildRamClauses(ramList);
        variantMatch.OR = ramClauses;
      }

      // 3. Storage alignment
      if (storageList.length > 0) {
        baseMatch.storageGb = { in: storageList };
        const storageClauses = buildStorageClauses(storageList);
        if (variantMatch.OR) {
          const prev = variantMatch.OR;
          delete variantMatch.OR;
          variantMatch.AND = [...(variantMatch.AND || []), { OR: prev }, { OR: storageClauses }];
        } else {
          variantMatch.OR = storageClauses;
        }
      }

      // 4. GPU alignment
      if (gpuList.length > 0) {
        baseMatch.gpuSeries = { in: gpuList };
        const gpuClauses = gpuList.map((g) => ({ gpu: { contains: g } }));
        if (variantMatch.OR) {
          const prev = variantMatch.OR;
          delete variantMatch.OR;
          variantMatch.AND = [...(variantMatch.AND || []), { OR: prev }, { OR: gpuClauses }];
        } else {
          variantMatch.OR = gpuClauses;
        }
      }

      // 5. Condition alignment on variant options & base product
      if (hasConditionFilter) {
        baseMatch.condition = { in: conditionList };
        const condClauses = conditionList.map((c) => ({
          options: { contains: `"condition":"${c}"` },
        }));
        if (variantMatch.OR) {
          const prev = variantMatch.OR;
          delete variantMatch.OR;
          variantMatch.AND = [...(variantMatch.AND || []), { OR: prev }, { OR: condClauses }];
        } else {
          variantMatch.OR = condClauses;
        }
      }

      // 6. Accessory options (connection, power)
      if (connectionList.length > 0) {
        const baseConnClauses = connectionList.map((conn) => ({
          specs: { contains: conn },
        }));
        if (baseMatch.OR) {
          const prevBase = baseMatch.OR;
          delete baseMatch.OR;
          baseMatch.AND = [...(baseMatch.AND || []), { OR: prevBase }, { OR: baseConnClauses }];
        } else {
          baseMatch.OR = baseConnClauses;
        }

        const connClauses = connectionList.map((conn) => ({
          OR: [
            { options: { contains: `"connection":"${conn}"` } },
            { options: { contains: `"Kết nối":"${conn}"` } },
            { options: { contains: conn } },
          ],
        }));
        if (variantMatch.OR) {
          const prev = variantMatch.OR;
          delete variantMatch.OR;
          variantMatch.AND = [...(variantMatch.AND || []), { OR: prev }, { OR: connClauses }];
        } else {
          variantMatch.OR = connClauses;
        }
      }

      if (powerList.length > 0) {
        const basePowerClauses = powerList.map((p) => ({
          specs: { contains: p },
        }));
        if (baseMatch.OR) {
          const prevBase = baseMatch.OR;
          delete baseMatch.OR;
          baseMatch.AND = [...(baseMatch.AND || []), { OR: prevBase }, { OR: basePowerClauses }];
        } else {
          baseMatch.OR = basePowerClauses;
        }

        const powerClauses = powerList.map((p) => ({
          OR: [
            { options: { contains: `"power":"${p}"` } },
            { options: { contains: `"Công suất":"${p}"` } },
            { options: { contains: p } },
          ],
        }));
        if (variantMatch.OR) {
          const prev = variantMatch.OR;
          delete variantMatch.OR;
          variantMatch.AND = [...(variantMatch.AND || []), { OR: prev }, { OR: powerClauses }];
        } else {
          variantMatch.OR = powerClauses;
        }
      }

      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            // Branch 1: Variant-backed products (evaluated atomically on the SAME active variant)
            {
              variants: {
                some: variantMatch,
              },
            },
            // Branch 2: Legacy products without active variants (evaluated on Product level)
            {
              variants: {
                none: { status: { in: ["ACTIVE", "active"] } },
              },
              ...baseMatch,
            },
          ],
        },
      ];
    }

    // 3. Sorting configuration with stable secondary tie-breaker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = [{ createdAt: "desc" }, { id: "asc" }];
    if (options.sort === "price-asc") {
      orderBy = [{ price: "asc" }, { id: "asc" }];
    } else if (options.sort === "price-desc") {
      orderBy = [{ price: "desc" }, { id: "asc" }];
    } else if (options.sort === "featured") {
      orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    } else if (options.sort === "best-selling") {
      orderBy = [{ isBestSeller: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    }

    // 4. Pagination
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.max(1, Math.min(50, Number(options.limit) || 12));
    const skip = (page - 1) * pageSize;

    // 5. Parallel D1 retrieval for count, paged rows, and category facets
    const [rows, facetPool] = await Promise.all([
      catalogBatches((skip,take)=>client.product.findMany({
        where,
        include: defaultInclude,
        orderBy,
        skip,take,
      })),
      catalogBatches((skip,take)=>client.product.findMany({
        skip,take,orderBy:{id:'asc'},
        where: category
          ? {
              status: { in: ["ACTIVE", "active"] },
              deletedAt: null, NOT: { studio: { is: { published: null } } },
              ...(category.slug === "laptop-cu"
                ? {
                    OR: [
                      { categoryId: category.id },
                      { condition: { in: ["LIKE_NEW", "USED", "REFURBISHED", "LIQUIDATION"] } },
                    ],
                  }
                : { categoryId: category.id }),
            }
          : { status: { in: ["ACTIVE", "active"] }, deletedAt: null, NOT: { studio: { is: { published: null } } } },
        select: {
          name: true,
          slug: true,
          tags: true,
          series: true,
          brand: true,
          brandRel: { select: { id: true, name: true, slug: true } },
          condition: true,
          cpuSeries: true,
          gpuSeries: true,
          ramGb: true,
          storageGb: true,
          price: true,
          specs: true,
          variants: {
            where: { status: { in: ["ACTIVE", "active"] } },
            select: { options: true, price: true },
          },
        },
      })),
    ]);

    // 6. Aggregate facet options from the category's active catalog
    const brandMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    const conditionMap = new Map<string, number>();
    const cpuMap = new Map<string, number>();
    const gpuMap = new Map<string, number>();
    const ramMap = new Map<number, number>();
    const storageMap = new Map<number, number>();
    const connectionMap = new Map<string, number>();
    const powerMap = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const p of facetPool) {
      if (typeof p.price === "number") {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (p.brandRel) {
        const existing = brandMap.get(p.brandRel.slug) || {
          id: p.brandRel.id,
          name: p.brandRel.name,
          slug: p.brandRel.slug,
          count: 0,
        };
        existing.count++;
        brandMap.set(p.brandRel.slug, existing);
      } else if (p.brand) {
        const slug = p.brand.toLowerCase();
        const existing = brandMap.get(slug) || { id: slug, name: p.brand, slug, count: 0 };
        existing.count++;
        brandMap.set(slug, existing);
      }
      if (p.condition) {
        conditionMap.set(p.condition, (conditionMap.get(p.condition) || 0) + 1);
      }
      if (p.cpuSeries) {
        cpuMap.set(p.cpuSeries, (cpuMap.get(p.cpuSeries) || 0) + 1);
      }
      if (p.gpuSeries) {
        gpuMap.set(p.gpuSeries, (gpuMap.get(p.gpuSeries) || 0) + 1);
      }
      if (p.ramGb) {
        ramMap.set(p.ramGb, (ramMap.get(p.ramGb) || 0) + 1);
      }
      if (p.storageGb) {
        storageMap.set(p.storageGb, (storageMap.get(p.storageGb) || 0) + 1);
      }

      // Extract specs JSON for accessory options
      let pSpecs: Record<string, string> = {};
      if (p.specs) {
        try {
          const parsed = JSON.parse(p.specs);
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) pSpecs = parsed;
        } catch {}
      }

      const specConn = pSpecs["Chuẩn kết nối"] || pSpecs["Kết nối"] || pSpecs.connection || pSpecs.Connection;
      if (specConn) connectionMap.set(specConn, (connectionMap.get(specConn) || 0) + 1);

      const specPower = pSpecs["Công suất"] || pSpecs["Tổng công suất"] || pSpecs["Chuẩn sạc"] || pSpecs.power || pSpecs.Power;
      if (specPower) powerMap.set(specPower, (powerMap.get(specPower) || 0) + 1);

      if (p.variants) {
        for (const v of p.variants) {
          if (v.options) {
            try {
              const vOpts = JSON.parse(v.options);
              const vConn = vOpts.connection || vOpts.Connection || vOpts["Chuẩn kết nối"] || vOpts["Kết nối"];
              if (vConn && vConn !== specConn) {
                connectionMap.set(vConn, (connectionMap.get(vConn) || 0) + 1);
              }
              const vPwr = vOpts.power || vOpts.Power || vOpts["Công suất"];
              if (vPwr && vPwr !== specPower) {
                powerMap.set(vPwr, (powerMap.get(vPwr) || 0) + 1);
              }
            } catch {}
          }
        }
      }
    }

    const accessoryTypeMap = new Map<string, number>();
    if (category?.slug === "linh-kien") {
      for (const p of facetPool) {
        for (const typeItem of ACCESSORY_TYPES) {
          const matchSlug =
            (p.tags && p.tags.includes(typeItem.slug)) ||
            (p.series && p.series.toLowerCase().includes(typeItem.slug.toLowerCase())) ||
            typeItem.keywords.some(
              (kw) =>
                (p.name && p.name.toLowerCase().includes(kw.toLowerCase())) ||
                (p.slug && p.slug.toLowerCase().includes(kw.toLowerCase()))
            );
          if (matchSlug) {
            accessoryTypeMap.set(typeItem.slug, (accessoryTypeMap.get(typeItem.slug) || 0) + 1);
          }
        }
      }
    }

    const accessoryTypeFacets: FacetOption[] =
      category?.slug === "linh-kien"
        ? ACCESSORY_TYPES.map((t) => ({
            value: t.slug,
            label: t.name,
            count: accessoryTypeMap.get(t.slug) || 0,
          }))
        : [];

    const brandFacets: FacetOption[] = Array.from(brandMap.values())
      .map((b) => ({ value: b.slug, label: b.name, count: b.count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const conditionFacets: FacetOption[] = Array.from(conditionMap.entries())
      .map(([code, count]) => ({
        value: code,
        label: conditionDisplayLabels[code] || code,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const connectionFacets: FacetOption[] = Array.from(connectionMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    const powerFacets: FacetOption[] = Array.from(powerMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    const cpuFacets: FacetOption[] = Array.from(cpuMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    const gpuFacets: FacetOption[] = Array.from(gpuMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    const ramFacets: FacetOption<number>[] = Array.from(ramMap.entries())
      .map(([value, count]) => ({ value, label: `${value}GB`, count }))
      .sort((a, b) => a.value - b.value);

    const storageFacets: FacetOption<number>[] = Array.from(storageMap.entries())
      .map(([value, count]) => ({
        value,
        label: value >= 1024 ? `${value / 1024}TB` : `${value}GB`,
        count,
      }))
      .sort((a, b) => a.value - b.value);

    const activeFilter: ActiveFilterContext = {
      cpu: cpuList,
      gpu: gpuList,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      ram: ramList,
      storage: storageList,
      condition: conditionList,
      connection: connectionList,
      power: powerList,
    };

    // ponytail: resolve matched rows in memory; add indexed effective-price projection when catalog size requires it.
    const products = rows.map(r=>mapD1ProductToHomepageProduct(r as unknown as ProductDbRow,activeFilter,context,at)).filter(p=>
      p.matchesFilter && (!hasPriceFilter || (['AVAILABLE','PREORDER'].includes(p.availability || '') && p.price>0 &&
      (options.minPrice===undefined || p.price>=options.minPrice) && (options.maxPrice===undefined || p.price<=options.maxPrice))));
    if(options.sort==='price-asc' || options.sort==='price-desc') products.sort((a,b)=>
      Number(!['AVAILABLE','PREORDER'].includes(a.availability || ''))-Number(!['AVAILABLE','PREORDER'].includes(b.availability || '')) ||
      (options.sort==='price-asc'?a.price-b.price:b.price-a.price) || a.id.localeCompare(b.id));
    const totalCount=products.length;
    return {
      category,
      products: products.slice(skip,skip+pageSize),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      facets: {
        brands: brandFacets,
        conditions: conditionFacets,
        accessoryTypes: accessoryTypeFacets,
        connections: connectionFacets,
        powers: powerFacets,
        cpuSeries: cpuFacets,
        gpuSeries: gpuFacets,
        ramOptions: ramFacets,
        storageOptions: storageFacets,
        priceRange: {
          min: minPrice === Infinity ? 0 : minPrice,
          max: maxPrice,
        },
      },
    };
  } catch (error) {
    console.error("[CatalogService] Failed to execute getCategoryFilteredProducts on D1:", error);
    throw error;
  }
}

/**
 * Fetches full product details from Cloudflare D1 for the Product Detail Page (PDP).
 * Supports lookup by slug or legacy ID with backward compatibility.
 * Resolves selected variant dynamically by SKU or variantId.
 * Only returns ACTIVE products (returns null for non-existent, DRAFT or ARCHIVED products).
 */
export async function getProductDetail(
  identifier: string,
  selectedVariantParam?: string,
  client: PrismaClient = prisma
): Promise<ProductDetailData | null> {
  if (!identifier || !identifier.trim()) return null;

  try {
    const product = await client.product.findFirst({
      where: {
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        OR: [{ slug: identifier }, { id: identifier }],
        status: { in: ["ACTIVE", "active"] },
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brandRel: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          where: { status: { in: ["ACTIVE", "active"] } },
          orderBy: { price: "asc" },
        },
        productImages: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
          ],
        },
      },
    });

    if (!product) return null;

    // 1. Resolve selected variant if any
    let activeVariant = product.variants.find(
      (v) => v.id === selectedVariantParam || v.sku === selectedVariantParam
    );
    if (selectedVariantParam && !activeVariant) return null;
    if (!activeVariant && product.variants.length > 0) {
      activeVariant = product.variants[0];
    }

    // 2. Resolve pricing & stock according to selected variant vs base product
    const basePrice = Math.round(Number(product.price) || 0);
    const baseOriginalPrice = product.originalPrice ? Math.round(Number(product.originalPrice)) : null;
    const baseStock = typeof product.stock === "number" ? product.stock : 0;

    const activePrice = activeVariant ? Math.round(Number(activeVariant.price) || 0) : basePrice;
    const activeOriginalPrice = activeVariant
      ? (activeVariant.originalPrice ? Math.round(Number(activeVariant.originalPrice)) : null)
      : baseOriginalPrice;

    const activeDiscount =
      activeOriginalPrice && activeOriginalPrice > activePrice
        ? `-${Math.round((1 - activePrice / activeOriginalPrice) * 100)}%`
        : undefined;

    const activeStock = activeVariant
      ? (typeof activeVariant.stock === "number" ? activeVariant.stock : 0)
      : baseStock;

    // 3. Resolve specifications
    let parsedSpecs: Record<string, string> = {};
    if (product.specs) {
      try {
        const p = JSON.parse(product.specs);
        if (typeof p === "object" && p !== null && !Array.isArray(p)) {
          parsedSpecs = p;
        }
      } catch {}
    }

    const baseCpu = product.cpu || parsedSpecs.CPU || parsedSpecs.cpu || "";
    const baseGpu = product.gpu || parsedSpecs.GPU || parsedSpecs.gpu || parsedSpecs.VGA || "";
    const baseRam = product.ram || parsedSpecs.RAM || parsedSpecs.ram || "";
    const baseStorage = product.storage || parsedSpecs.SSD || parsedSpecs.ssd || parsedSpecs.Storage || "";
    const baseDisplay = product.display || parsedSpecs["Màn hình"] || parsedSpecs.display || parsedSpecs.Screen || "";

    const activeCpu = activeVariant?.cpu || baseCpu;
    const activeGpu = activeVariant?.gpu || baseGpu;
    const activeRam = activeVariant?.ram || baseRam;
    const activeStorage = activeVariant?.storage || baseStorage;
    const activeDisplay = activeVariant?.display || baseDisplay;

    // Build structured full specifications table
    const fullSpecs: ProductDetailSpecGroup[] = [];

    const cpuItems: ProductDetailSpecItem[] = [];
    if (activeCpu) cpuItems.push({ label: "Model CPU", value: activeCpu });
    if (product.cpuSeries) cpuItems.push({ label: "Dòng CPU", value: product.cpuSeries });
    if (parsedSpecs["Số nhân"] || parsedSpecs.cores) cpuItems.push({ label: "Số nhân / luồng", value: parsedSpecs["Số nhân"] || parsedSpecs.cores });
    if (parsedSpecs["Tốc độ tối đa"] || parsedSpecs.speed) cpuItems.push({ label: "Xung nhịp tối đa", value: parsedSpecs["Tốc độ tối đa"] || parsedSpecs.speed });
    if (cpuItems.length > 0) fullSpecs.push({ group: "Bộ xử lý (CPU)", items: cpuItems });

    const memItems: ProductDetailSpecItem[] = [];
    if (activeRam) memItems.push({ label: "Dung lượng RAM", value: activeRam });
    if (parsedSpecs["Loại RAM"] || parsedSpecs.ramType) memItems.push({ label: "Chuẩn RAM", value: parsedSpecs["Loại RAM"] || parsedSpecs.ramType });
    if (parsedSpecs["Số khe RAM"] || parsedSpecs.ramSlots) memItems.push({ label: "Khả năng nâng cấp RAM", value: parsedSpecs["Số khe RAM"] || parsedSpecs.ramSlots });
    if (activeStorage) memItems.push({ label: "Ổ cứng", value: activeStorage });
    if (parsedSpecs["Nâng cấp ổ cứng"] || parsedSpecs.storageSlots) memItems.push({ label: "Khe cắm ổ cứng", value: parsedSpecs["Nâng cấp ổ cứng"] || parsedSpecs.storageSlots });
    if (memItems.length > 0) fullSpecs.push({ group: "Bộ nhớ & Lưu trữ", items: memItems });

    const gpuItems: ProductDetailSpecItem[] = [];
    if (activeGpu) gpuItems.push({ label: "Card đồ họa (GPU)", value: activeGpu });
    if (product.gpuSeries) gpuItems.push({ label: "Dòng GPU", value: product.gpuSeries });
    if (parsedSpecs.vram || parsedSpecs["VRAM"]) gpuItems.push({ label: "Bộ nhớ đồ họa (VRAM)", value: parsedSpecs.vram || parsedSpecs["VRAM"] });
    if (gpuItems.length > 0) fullSpecs.push({ group: "Đồ họa & Màn hình", items: gpuItems });

    const displayItems: ProductDetailSpecItem[] = [];
    if (activeDisplay) displayItems.push({ label: "Thông số màn hình", value: activeDisplay });
    if (product.screenSize) displayItems.push({ label: "Kích thước màn hình", value: `${product.screenSize} inch` });
    if (product.refreshRate) displayItems.push({ label: "Tần số quét", value: `${product.refreshRate} Hz` });
    if (parsedSpecs["Độ phủ màu"] || parsedSpecs.colorGamut) displayItems.push({ label: "Độ phủ màu", value: parsedSpecs["Độ phủ màu"] || parsedSpecs.colorGamut });
    if (parsedSpecs["Độ sáng"] || parsedSpecs.brightness) displayItems.push({ label: "Độ sáng", value: parsedSpecs["Độ sáng"] || parsedSpecs.brightness });
    if (displayItems.length > 0) fullSpecs.push({ group: "Màn hình hiển thị", items: displayItems });

    const physicalItems: ProductDetailSpecItem[] = [];
    if (parsedSpecs.weight || parsedSpecs["Khối lượng"] || parsedSpecs["Trọng lượng"]) {
      physicalItems.push({ label: "Trọng lượng", value: parsedSpecs.weight || parsedSpecs["Khối lượng"] || parsedSpecs["Trọng lượng"] });
    }
    if (parsedSpecs.dimensions || parsedSpecs["Kích thước"]) {
      physicalItems.push({ label: "Kích thước (Dài x Rộng x Dày)", value: parsedSpecs.dimensions || parsedSpecs["Kích thước"] });
    }
    if (parsedSpecs.battery || parsedSpecs["Pin"]) {
      physicalItems.push({ label: "Dung lượng pin", value: parsedSpecs.battery || parsedSpecs["Pin"] });
    }
    if (parsedSpecs.material || parsedSpecs["Chất liệu"]) {
      physicalItems.push({ label: "Chất liệu vỏ", value: parsedSpecs.material || parsedSpecs["Chất liệu"] });
    }
    if (physicalItems.length > 0) fullSpecs.push({ group: "Thiết kế & Pin", items: physicalItems });

    const generalItems: ProductDetailSpecItem[] = [
      { label: "Thương hiệu", value: product.brandRel?.name || product.brand || "Đang cập nhật" },
    ];
    if (product.series) generalItems.push({ label: "Dòng sản phẩm", value: product.series });
    if (product.model) generalItems.push({ label: "Model / Mã máy", value: product.model });
    if (activeVariant?.sku) generalItems.push({ label: "SKU phiên bản", value: activeVariant.sku });
    generalItems.push({ label: "Tình trạng máy", value: conditionDisplayLabels[product.condition] || product.condition });
    if (product.warranty) generalItems.push({ label: "Chế độ bảo hành", value: product.warranty });
    if (product.origin) generalItems.push({ label: "Xuất xứ", value: product.origin });
    if (parsedSpecs.os || parsedSpecs["HĐH"] || parsedSpecs["Hệ điều hành"]) {
      generalItems.push({ label: "Hệ điều hành", value: parsedSpecs.os || parsedSpecs["HĐH"] || parsedSpecs["Hệ điều hành"] });
    }
    fullSpecs.push({ group: "Thông tin chung & Bảo hành", items: generalItems });

    // 4. Resolve Images from ProductImage (metadata for Cloudflare R2)
    const images: ProductDetailImage[] = [];
    if (product.productImages && product.productImages.length > 0) {
      for (const img of product.productImages) {
        const publicUrl = getProductImageUrl(img.r2Key, img.url);
        if (publicUrl) {
          images.push({
            id: img.id,
            r2Key: img.r2Key,
            url: publicUrl,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
            alt: img.alt || product.name,
            variantId: img.variantId,
          });
        }
      }
    }

    // Fallback to legacy Product.images JSON only if no ProductImage
    if (images.length === 0 && product.images) {
      try {
        const parsed = JSON.parse(product.images);
        const arr = Array.isArray(parsed) ? parsed : [product.images];
        arr.forEach((uri: string, idx: number) => {
          if (typeof uri === "string" && uri.trim()) {
            images.push({
              id: `legacy-${idx}`,
              r2Key: "",
              url: uri.trim(),
              isPrimary: idx === 0,
              sortOrder: idx + 1,
              alt: `${product.name} hình ${idx + 1}`,
            });
          }
        });
      } catch {}
    }

    // Determine primary image
    let primaryImageUrl: string | null = null;
    if (activeVariant?.image) {
      primaryImageUrl = activeVariant.image.startsWith("http") || activeVariant.image.startsWith("/")
        ? activeVariant.image
        : getPublicMediaUrl(activeVariant.image);
    } else {
      const primaryImg = images.find((i) => i.isPrimary) || images[0];
      primaryImageUrl = primaryImg ? primaryImg.url : null;
    }

    // 5. Map Variants
    const variants: ProductDetailVariant[] = product.variants.map((v) => {
      let opts: Record<string, string> = {};
      if (v.options) {
        try {
          const p = JSON.parse(v.options);
          if (typeof p === "object" && p !== null) opts = p;
        } catch {}
      }
      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: Math.round(Number(v.price) || 0),
        originalPrice: v.originalPrice ? Math.round(Number(v.originalPrice)) : null,
        stock: typeof v.stock === "number" ? v.stock : 0,
        cpu: v.cpu,
        gpu: v.gpu,
        ram: v.ram,
        storage: v.storage,
        display: v.display,
        image: v.image ? getPublicMediaUrl(v.image) : null,
        options: opts,
      };
    });

    const canonicalSlug = product.canonicalSlug || product.slug || product.id;

    return {
      id: product.id,
      slug: product.slug,
      canonicalSlug,
      name: product.name,
      brand: product.brandRel?.name || product.brand || null,
      brandSlug: product.brandRel?.slug || null,
      brandId: product.brandId || null,
      category: product.category?.name || null,
      categorySlug: product.category?.slug || null,
      categoryId: product.categoryId,
      model: product.model || null,
      series: product.series || null,
      warranty: product.warranty || "12 tháng chính hãng",
      condition: product.condition || "NEW",
      conditionLabel: conditionDisplayLabels[product.condition] || product.condition,
      origin: product.origin || null,

      basePrice,
      baseOriginalPrice,
      baseStock,

      selectedVariantId: activeVariant?.id || null,
      selectedSku: activeVariant?.sku || null,
      selectedVariantName: activeVariant?.name || null,
      price: activePrice,
      originalPrice: activeOriginalPrice,
      discount: activeDiscount,
      isFlashSale: Boolean(product.isFlashSale),
      stock: activeStock,

      specs: {
        cpu: activeCpu,
        gpu: activeGpu,
        ram: activeRam,
        ssd: activeStorage,
        display: activeDisplay,
        screenSize: product.screenSize,
        refreshRate: product.refreshRate,
      },
      fullSpecs,

      description: product.description,
      shortDescription: product.shortDescription || null,
      contentHtml: product.contentHtml || null,

      images,
      primaryImageUrl,

      variants,

      seoTitle: product.seoTitle || null,
      seoDescription: product.seoDescription || null,
    };
  } catch (error) {
    console.error("[CatalogService] Failed to getProductDetail on D1:", error);
    throw error;
  }
}

/**
/**
 * Fetches related products from D1.
 * Prioritizes manually curated relatedProductIds (preserving manual order, public only).
 * Falls back to category/brand if manual items are fewer than limit.
 */
export async function getRelatedProducts(
  productId: string,
  categoryId?: string | null,
  brandId?: string | null,
  limit = 4,
  manualIdsOrClient: string[] | PrismaClient = [],
  clientParam: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<HomepageProduct[]> {
  try {
    const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
    const isArrayManual = Array.isArray(manualIdsOrClient);
    const manualIds = isArrayManual ? manualIdsOrClient : [];
    const client = isArrayManual ? clientParam : (manualIdsOrClient as PrismaClient);

    const validManualIds = [...new Set((manualIds || []).filter((id) => id && id !== productId))].slice(0, limit);
    let resolvedManual: HomepageProduct[] = [];

    if (validManualIds.length > 0) {
      const manualRows = await client.product.findMany({
        where: {
          id: { in: validManualIds },
          status: { in: ["ACTIVE", "active"] },
          deletedAt: null, NOT: { studio: { is: { published: null } } },
        },
        include: defaultInclude,
      });

      const manualMap = new Map(
        manualRows.map((r) => [r.id, mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at)])
      );

      resolvedManual = validManualIds
        .map((id) => manualMap.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }

    if (resolvedManual.length >= limit) {
      return resolvedManual.slice(0, limit);
    }

    // Top up with category/brand fallbacks if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orConditions: any[] = [];
    if (categoryId) orConditions.push({ categoryId });
    if (brandId) orConditions.push({ brandId });

    if (orConditions.length === 0) return resolvedManual;

    const excludedIds = [productId, ...resolvedManual.map((m) => m.id)];
    const fallbackRows = await client.product.findMany({
      where: {
        id: { notIn: excludedIds },
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null, NOT: { studio: { is: { published: null } } },
        OR: orConditions,
      },
      include: defaultInclude,
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
      take: limit - resolvedManual.length,
    });

    const fallbackProducts = fallbackRows.map((r) =>
      mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at)
    );

    return [...resolvedManual, ...fallbackProducts];
  } catch (error) {
    console.error("[CatalogService] Failed to getRelatedProducts on D1:", error);
    throw error;
  }
}

/**
 * Resolves a list of product IDs into HomepageProduct DTOs preserving the original order,
 * strictly filtering out non-published, archived, or deleted products.
 */
export async function resolveProductsByIds(
  productIds: string[],
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<HomepageProduct[]> {
  const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
  const uniqueIds = [...new Set((productIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const map = new Map<string,HomepageProduct>();
  for(let offset=0;offset<uniqueIds.length;offset+=80) {
    const rows=await client.product.findMany({
      where:{id:{in:uniqueIds.slice(offset,offset+80)},status:{in:['ACTIVE','active']},deletedAt:null,NOT:{studio:{is:{published:null}}}},
      include:defaultInclude,
    });
    for(const row of rows) map.set(row.id,mapD1ProductToHomepageProduct(row as unknown as ProductDbRow,undefined,context,at));
  }

  return uniqueIds
    .map((id) => map.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/**
 * Resolves products by rule criteria (category, brand, productType, tag, availability, sort, limit).
 * Always published-only and stable ordering.
 */
export async function resolveProductsByCriteria(
  criteria: {
    productType?: "all" | "laptop" | "accessory";
    categoryId?: string | null;
    brandId?: string | null;
    tag?: "all" | "isFeatured" | "isNewArrival" | "isBestSeller";
    availability?: "all" | "AVAILABLE" | "PREORDER" | "CONTACT";
    sort?: "newest" | "price-asc" | "price-desc" | "name-asc" | "best-selling";
    limit?: number;
  },
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<HomepageProduct[]> {
  const context = pricingContext ?? (await getStorefrontPricingContext(undefined, at));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: { in: ["ACTIVE", "active"] },
    deletedAt: null, NOT: { studio: { is: { published: null } } },
  };

  if (criteria.productType === "accessory") {
    where.category = { slug: { in: ["linh-kien", "phu-kien"] } };
  } else if (criteria.productType === "laptop") {
    where.category = { slug: { notIn: ["linh-kien", "phu-kien"] } };
  }

  if (criteria.categoryId) {
    where.categoryId = criteria.categoryId;
  }

  if (criteria.brandId) {
    where.brandId = criteria.brandId;
  }

  if (criteria.tag === "isFeatured") {
    where.isFeatured = true;
  } else if (criteria.tag === "isNewArrival") {
    where.isNewArrival = true;
  } else if (criteria.tag === "isBestSeller") {
    where.isBestSeller = true;
  }

  if (criteria.availability && criteria.availability !== "all") {
    const studios = await client.productStudio.findMany({ select: { productId: true, published: true } });
    const matching = studios.filter(s => {
      try { return s.published && JSON.parse(s.published).availability === criteria.availability; }
      catch { return false; }
    }).map(s => s.productId);
    // Legacy products without Studio use the existing AVAILABLE contract, never stock.
    where.OR = [{ id: { in: matching } }, ...(criteria.availability === "AVAILABLE" ? [{ studio: { is: null } }] : [])];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  if (criteria.sort === "price-asc") {
    orderBy = { price: "asc" };
  } else if (criteria.sort === "price-desc") {
    orderBy = { price: "desc" };
  } else if (criteria.sort === "name-asc") {
    orderBy = { name: "asc" };
  } else if (criteria.sort === "best-selling") {
    orderBy = [{ isBestSeller: "desc" }, { createdAt: "desc" }];
  } else {
    orderBy = { createdAt: "desc" };
  }

  const limit = Math.min(48, Math.max(1, criteria.limit || 12));

  const rows = await client.product.findMany({
    where,
    include: defaultInclude,
    orderBy,
    take: limit,
  });

  return rows.map((r) => mapD1ProductToHomepageProduct(r as unknown as ProductDbRow, undefined, context, at));
}


