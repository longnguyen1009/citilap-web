import { prisma, getD1Database, getPrismaClient, type PrismaClient } from "@/lib/prisma";
import { mediaEnvironment } from '../media-http';
import { readSearchPage } from './search-read-model';
import {catalogBatches} from './catalog-batches';
import { categoryHref } from '../../lib/category-paths';
import { getAccessoryTypeBySlug } from '@/config/accessory-taxonomy';
import { catalogNeedTag } from '../../lib/catalog-needs';
import { productHref } from '../../lib/product-paths';
import { searchIntent } from '@/contracts/catalog/search-intent';
import { getProductImageUrl } from "@/infra/cloudflare/r2/storage";
import {
  type HomepageProduct,
  type FacetOption,
  categoryProductScope,
  parseRamGb,
  parseStorageGb,
  normalizeStorageBucket,
  matchesRamBucket,
  matchesStorageBucket,
  deriveCpuSeries,
  deriveGpuSeries,
  matchesCpuFilter,
  matchesGpuFilter,
  extractVariantCondition,
  parsePublishedSpecMap,
  enrichPublishedVariants,
} from "./catalog.service";
import { calculateEffectivePrice, getStorefrontPricingContext, type PriceEvaluationContext } from "./pricing.service";

export interface SearchFilterOptions {
  inStock?: boolean;
  type?: string;
  tag?: string[];
  query?: string;
  brand?: string | string[];
  category?: string | string[];
  condition?: string | string[];
  connection?: string | string[];
  power?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  cpu?: string | string[];
  gpu?: string | string[];
  ram?: number | number[];
  storage?: number | number[];
  year?: string | string[];
  sort?: "relevance" | "price-asc" | "price-desc" | "newest" | "featured" | "best-selling";
  page?: number;
  limit?: number;
}

export interface SearchFacets {
  connections?: FacetOption[];
  powers?: FacetOption[];
  tags?: FacetOption[];
  years?: FacetOption[];
  categories: FacetOption[];
  brands: FacetOption[];
  conditions: FacetOption[];
  cpuSeries: FacetOption[];
  gpuSeries: FacetOption[];
  ramOptions: FacetOption<number>[];
  storageOptions: FacetOption<number>[];
  priceRange: { min: number; max: number };
}

export interface SearchResult {
  query: string;
  products: HomepageProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacets;
}

export interface SearchSuggestionItem {
  href?: string;
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  specsSummary?: string;
  brand?: string;
  category?: string;
  categorySlug?: string;
}

export interface SearchSuggestionsResult {
  query: string;
  products: SearchSuggestionItem[];
  brands: Array<{ id: string; name: string; slug: string }>;
  categories: Array<{ id: string; name: string; slug: string; href?: string }>;
  totalMatches: number;
}

type ProductDbRowWithRelations = {
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
  cpu?: string | null;
  cpuSeries?: string | null;
  gpu?: string | null;
  gpuSeries?: string | null;
  ram?: string | null;
  ramGb?: number | null;
  storage?: string | null;
  storageGb?: number | null;
  display?: string | null;
  specs?: string | null;
  tags?: string | null;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  createdAt: Date;
  isFlashSale?: boolean;
  studio?: {published:string|null}|null;
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
    stock: number;
    image?: string | null;
    cpu?: string | null;
    gpu?: string | null;
    ram?: string | null;
    storage?: string | null;
    display?: string | null;
    status: string;
    options?: string | null;
  }>;
};

/**
 * Sanitizes and extracts clean tokens from search input.
 * Strips dangerous control chars while preserving Vietnamese accented characters.
 */
export function normalizeSearchQuery(raw: string): { cleanQuery: string; tokens: string[] } {
  if (!raw || typeof raw !== "string") {
    return { cleanQuery: "", tokens: [] };
  }

  // Max 100 characters limit
  const trimmed = raw.slice(0, 100).trim();
  // Strip control characters & SQL comment sequences
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F;]|--|\/\*|\*\//g, " ").replace(/\s+/g, " ").trim();

  if (!sanitized) {
    return { cleanQuery: "", tokens: [] };
  }

  const tokens = sanitized
    .toLowerCase()
    .split(" ")
    .filter((t) => t.length > 0);

  return { cleanQuery: sanitized, tokens };
}

/**
 * Resolves the primary image URL for a product, favoring R2 ProductImage metadata.
 */
function resolvePrimaryImageUrl(row: Pick<ProductDbRowWithRelations, 'images' | 'productImages'>): string | null {
  if (row.productImages && row.productImages.length > 0) {
    const sorted = [...row.productImages].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.sortOrder - b.sortOrder;
    });
    const first = sorted[0];
    const url = getProductImageUrl(first?.r2Key, first?.url);
    if (url) return url;
  }

  if (row.images) {
    try {
      const parsed = JSON.parse(row.images);
      const first = Array.isArray(parsed) ? parsed[0] : row.images;
      if (typeof first === "string" && (first.startsWith("http://") || first.startsWith("https://") || first.startsWith("/"))) {
        return first;
      }
    } catch {
      if (typeof row.images === "string" && (row.images.startsWith("http://") || row.images.startsWith("https://"))) {
        return row.images;
      }
    }
  }

  return null;
}

/**
 * Evaluates variants to find the exact matching representative SKU for the search context.
 * Guarantees that searching e.g. "RTX 4060" displays the 4060 variant's price, specs, and SKU link.
 */
function resolveRepresentativeVariant(
  product: ProductDbRowWithRelations,
  tokens: string[],
  specFilters?: {
    ram?: number[];
    storage?: number[];
    gpu?: string[];
    cpu?: string[];
    minPrice?: number;
    maxPrice?: number;
  }
) {
    const activeVariants = (product.variants || []).filter((v) => ['ACTIVE','active'].includes(v.status));

  if (activeVariants.length === 0) {
    const basePrice = Math.round(Number(product.price) || 0);
    const baseOrigPrice = product.originalPrice ? Math.round(Number(product.originalPrice)) : null;
    const baseDiscount =
      baseOrigPrice && baseOrigPrice > basePrice
        ? `-${Math.round((1 - basePrice / baseOrigPrice) * 100)}%`
        : undefined;

    return {
      variant: undefined,
      sku: undefined,
      variantId: undefined,
      price: basePrice,
      originalPrice: baseOrigPrice,
      discount: baseDiscount,
      stock: product.stock,
      specs: {
        cpu: product.cpu || "",
        gpu: product.gpu || "",
        ram: product.ram || "",
        ssd: product.storage || "",
        display: product.display || "",
      },
    };
  }

  // Score each variant based on tokens and active filters
  let bestVariant = activeVariants[0];
  let highestScore = -1;

  for (const v of activeVariants) {
    let score = 0;
    const vSku = v.sku.toLowerCase();
    const vName = v.name.toLowerCase();
    const vGpu = (v.gpu || "").toLowerCase();
    const vRam = (v.ram || "").toLowerCase();
    const vStorage = (v.storage || "").toLowerCase();
    const vCpu = (v.cpu || "").toLowerCase();

    // 1. Check spec filters match
    if (specFilters?.ram && specFilters.ram.length > 0) {
      if (matchesRamBucket(v.ram, specFilters.ram)) score += 50;
    }
    if (specFilters?.storage && specFilters.storage.length > 0) {
      if (matchesStorageBucket(v.storage, specFilters.storage)) score += 50;
    }
    if (specFilters?.gpu && specFilters.gpu.length > 0) {
      if (matchesGpuFilter(v.gpu, product.gpuSeries, specFilters.gpu)) score += 50;
    }
    if (specFilters?.cpu && specFilters.cpu.length > 0) {
      if (matchesCpuFilter(v.cpu, product.cpuSeries, specFilters.cpu)) score += 50;
    }

    // 2. Check price filters match
    if (specFilters?.minPrice !== undefined && v.price < specFilters.minPrice) {
      score -= 100;
    }
    if (specFilters?.maxPrice !== undefined && v.price > specFilters.maxPrice) {
      score -= 100;
    }

    // 3. Check query tokens match on this specific variant
    for (const t of tokens) {
      if (vSku === t) score += 100;
      else if (vSku.includes(t)) score += 60;

      if (vGpu.includes(t)) score += 40;
      if (vRam.includes(t)) score += 40;
      if (vStorage.includes(t)) score += 40;
      if (vCpu.includes(t)) score += 40;
      if (vName.includes(t)) score += 30;
    }

    if (score > highestScore) {
      highestScore = score;
      bestVariant = v;
    }
  }

  const vPrice = Math.round(Number(bestVariant.price) || 0);
  const vOrigPrice = bestVariant.originalPrice ? Math.round(Number(bestVariant.originalPrice)) : null;
  const vDiscount =
    vOrigPrice && vOrigPrice > vPrice ? `-${Math.round((1 - vPrice / vOrigPrice) * 100)}%` : undefined;

  return {
    variant: bestVariant,
    sku: bestVariant.sku,
    variantId: bestVariant.id,
    price: vPrice,
    originalPrice: vOrigPrice,
    discount: vDiscount,
    stock: bestVariant.stock,
    specs: {
      cpu: bestVariant.cpu || product.cpu || "",
      gpu: bestVariant.gpu || product.gpu || "",
      ram: bestVariant.ram || product.ram || "",
      ssd: bestVariant.storage || product.storage || "",
      display: bestVariant.display || product.display || "",
    },
  };
}

/**
 * Calculates deterministic relevance score for sorting search results.
 */
function calculateProductRelevanceScore(
  product: ProductDbRowWithRelations,
  cleanQuery: string,
  tokens: string[]
): number {
  if (!cleanQuery || tokens.length === 0) return 0;

  let score = 0;
  const q = cleanQuery.toLowerCase();
  const name = product.name.toLowerCase();
  const model = (product.model || "").toLowerCase();
  const series = (product.series || "").toLowerCase();
  const brand = (product.brandRel?.name || product.brand || "").toLowerCase();
  const category = (product.category?.name || "").toLowerCase();
  const cpu = (product.cpu || "").toLowerCase();
  const gpu = (product.gpu || "").toLowerCase();
  const tags = (product.tags || "").toLowerCase();
  const desc = product.description.toLowerCase();

  // 1. Exact match on variant SKU
  const hasExactSku = (product.variants || []).some(
    (v) => v.status === "ACTIVE" && v.sku.toLowerCase() === q
  );
  if (hasExactSku) score += 1000;

  // 2. Exact or prefix match on product name
  if (name === q) score += 800;
  else if (name.startsWith(q)) score += 600;
  else if (name.includes(q)) score += 400;

  // 3. Multi-token match across product fields
  let allTokensInName = true;
  for (const t of tokens) {
    let tokenMatched = false;
    if (name.includes(t)) {
      score += 100;
      tokenMatched = true;
    } else {
      allTokensInName = false;
    }

    if (model.includes(t) || series.includes(t)) {
      score += 80;
      tokenMatched = true;
    }
    if (brand.includes(t)) {
      score += 60;
      tokenMatched = true;
    }
    if (category.includes(t)) {
      score += 50;
      tokenMatched = true;
    }
    if (gpu.includes(t) || cpu.includes(t)) {
      score += 50;
      tokenMatched = true;
    }
    if (tags.includes(t)) {
      score += 30;
      tokenMatched = true;
    }
    if (desc.includes(t)) {
      score += 20;
      tokenMatched = true;
    }

    // Check variant match
    const variantMatches = (product.variants || []).some(
      (v) =>
        v.status === "ACTIVE" &&
        (v.sku.toLowerCase().includes(t) ||
          v.name.toLowerCase().includes(t) ||
          (v.gpu && v.gpu.toLowerCase().includes(t)) ||
          (v.ram && v.ram.toLowerCase().includes(t)) ||
          (v.storage && v.storage.toLowerCase().includes(t)))
    );
    if (variantMatches) {
      score += 50;
      tokenMatched = true;
    }

    if (tokenMatched) score += 20;
  }

  if (allTokensInName && tokens.length > 1) {
    score += 150;
  }

  // Merchandising tie-break boost
  if (product.isFeatured) score += 10;
  if (product.isBestSeller) score += 10;

  return score;
}

/**
 * Searches products in Cloudflare D1 with multi-keyword tokenization,
 * variant matching, server-side filtering, deterministic ranking, and pagination.
 */
function productReleaseYears(row: { name: string; model?: string | null; specs?: string | null }) {
  let explicit = '';
  try {
    const specs = JSON.parse(row.specs || '{}');
    explicit = String(specs?.['Năm ra mắt'] || specs?.['Năm sản xuất'] || specs?.year || '').trim();
  } catch { /* Legacy malformed specs still permit the name/model fallback. */ }
  if (explicit) return /^(19|20)\d{2}$/.test(explicit) ? [explicit] : [];
  return [...new Set(`${row.name} ${row.model || ''}`.match(/\b(?:19|20)\d{2}\b/g) || [])];
}

export async function searchProducts(
  options: SearchFilterOptions,
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<SearchResult> {
  if (client !== prisma || pricingContext) return computeSearchProducts(options, client, pricingContext, at);
  const db = getD1Database() ?? (await mediaEnvironment()).DB;
  const boundClient = getPrismaClient(db);
  const result = await readSearchPage(db, options, at, async () => computeSearchProducts(options, boundClient, await getStorefrontPricingContext(db, at), at, true));
  return { ...result, products: await searchImages(result.products, boundClient) };
}

async function computeSearchProducts(
  options: SearchFilterOptions,
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date(),
  allResults = false
): Promise<SearchResult> {
  const context = pricingContext ?? await getStorefrontPricingContext(undefined, at);
  const { cleanQuery } = normalizeSearchQuery(options.query || "");
  const intent = searchIntent(cleanQuery);
  const { tokens } = normalizeSearchQuery(intent.query);
  if (intent.maxPrice !== undefined) options = { ...options, maxPrice: Math.min(options.maxPrice ?? intent.maxPrice, intent.maxPrice) };

  // 1. Build parameterized WHERE clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: { in: ["ACTIVE", "active"] },
    deletedAt: null, NOT: { studio: { is: { published: null } } },
  };

  const andConditions: unknown[] = [];

  // Multi-token search: pre-filter with up to 2 tokens in SQL (staying well within D1's 100 bind variable limit),
  // while all tokens are strictly verified against published product & variant fields in memory below.
  if (tokens.length > 0) {
    for (const t of tokens.slice(0, 2)) {
      andConditions.push({
        OR: [
          { name: { contains: t } },
          { slug: { contains: t.normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d') } },
          { model: { contains: t } },
          { series: { contains: t } },
          { brand: { contains: t } },
          { brandRel: { name: { contains: t } } },
          { brandRel: { slug: { contains: t } } },
          { category: { name: { contains: t } } },
          { category: { slug: { contains: t } } },
          { cpu: { contains: t } },
          { cpuSeries: { contains: t } },
          { gpu: { contains: t } },
          { gpuSeries: { contains: t } },
          { ram: { contains: t } },
          { storage: { contains: t } },
          { tags: { contains: t } },
          { description: { contains: t } },
          { specs: { contains: t } },
          { studio: { is: { published: { contains: t } } } },
          {
            variants: {
              some: {
                status: { in: ["ACTIVE", "active"] },
                OR: [
                  { sku: { contains: t } },
                  { name: { contains: t } },
                  { cpu: { contains: t } },
                  { gpu: { contains: t } },
                  { ram: { contains: t } },
                  { storage: { contains: t } },
                ],
              },
            },
          },
        ],
      });
    }
  }

  // Brand filter
  const brandList = options.brand
    ? (Array.isArray(options.brand) ? options.brand : [options.brand]).filter(Boolean)
    : [];
  if (brandList.length > 0) {
    andConditions.push({
      OR: [{ brandRel: { slug: { in: brandList } } }, { brand: { in: brandList } }],
    });
  }

  // Category filter
  const categoryList = options.category
    ? (Array.isArray(options.category) ? options.category : [options.category]).filter(Boolean)
    : [];
  if (categoryList.length > 0) {
    const tree = await client.category.findMany({ select: { id: true, slug: true, parentId: true } });
    const scopes = tree.filter(c => categoryList.includes(c.id) || categoryList.includes(c.slug)).map(c => categoryProductScope(c, tree));
    andConditions.push(scopes.length ? { OR: scopes } : { categoryId: { in: [] } });
  }
  if (options.type) {
    const type = getAccessoryTypeBySlug(options.type);
    const keywords = type?.keywords || [options.type];
    andConditions.push({ OR: [
      { tags: { contains: options.type } }, { series: { contains: options.type } }, { model: { contains: options.type } },
      ...keywords.flatMap(value => [{ name: { contains: value } }, { slug: { contains: value } }]),
    ] });
  }

  // Condition, specs, price & accessory atomic matching
  const conditionList = options.condition
    ? (Array.isArray(options.condition) ? options.condition : [options.condition]).filter(Boolean)
    : [];
  const connectionList = options.connection
    ? (Array.isArray(options.connection) ? options.connection : [options.connection]).filter(Boolean)
    : [];
  const powerList = options.power
    ? (Array.isArray(options.power) ? options.power : [options.power]).filter(Boolean)
    : [];

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
  const yearList = options.year
    ? (Array.isArray(options.year) ? options.year : [options.year]).filter(Boolean)
    : [];

  const hasPriceFilter = options.minPrice !== undefined || options.maxPrice !== undefined;

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // 2. Fetch matched products from D1
  const rawProducts = await catalogBatches((skip,take)=>client.product.findMany({
    skip,take,
    where,
    select: {
      id: true, name: true, slug: true, description: true, brand: true,
      model: true, series: true, warranty: true, condition: true,
      price: true, originalPrice: true, images: true, stock: true, status: true,
      cpu: true, cpuSeries: true, gpu: true, gpuSeries: true,
      ram: true, ramGb: true, storage: true, storageGb: true, display: true,
      tags: true, specs: true, isFeatured: true, isBestSeller: true, isFlashSale: true, createdAt: true,
      studio: {select:{published:true}},
      brandRel: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { status: {in:['ACTIVE','active']} },
        orderBy: { price: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" },{id:'asc'}],
  }));

  // 3. Map products, resolving representative variants and scores
  const specFilterParams = {
    ram: ramList,
    storage: storageList,
    gpu: gpuList,
    cpu: cpuList,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
  };

  let processedProducts: Array<{
    product: HomepageProduct;
    relevanceScore: number;
    createdAt: Date;
    id: string;
    categorySlug?: string;
    brandSlug?: string;
    matchedVariants: Array<{
      id: string;
      sku: string;
      name: string;
      price: number;
      originalPrice?: number | null;
      stock: number;
      cpu: string | null;
      gpu: string | null;
      ram: string | null;
      storage: string | null;
      display: string | null;
      condition: string;
      options?: string | null;
    }>;
  }> = rawProducts.flatMap((row) => {
    const original = row as unknown as ProductDbRowWithRelations;
    const published = original.studio?.published ? JSON.parse(original.studio.published) : null;
    const specMap = parsePublishedSpecMap(published, original.specs);
    if (options.tag?.length) {
      let tags: string[] = [];
      try { tags = original.tags?.startsWith('[') ? JSON.parse(original.tags) : (original.tags || '').split(','); } catch { tags = []; }
      const normalized = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string').map(catalogNeedTag) : [];
      if (!options.tag.every(tag => normalized.includes(catalogNeedTag(tag)))) return [];
    }
    if (yearList.length > 0) {
      if (!yearList.some(year => productReleaseYears(original).includes(year))) return [];
    }
    let availability = published?.availability || 'AVAILABLE';
    const priceFor = (price:number,originalPrice:number|null|undefined,variantId?:string) => calculateEffectivePrice(price,originalPrice ?? null,Boolean(original.isFlashSale),true,context,at,{productId:original.id,variantId,isVariant:!!variantId,variantOriginalPrice:originalPrice ?? null});
    const base = priceFor(original.price,original.originalPrice);

    const originalVariantCount = (original.variants?.length || 0) + (published?.variants?.length || 0);
    const enrichedVars = enrichPublishedVariants(original.variants, published, original)
      .map((v) => {
        const p = priceFor(v.price, v.originalPrice, v.id);
        return {
          ...v,
          price: p.effectivePrice,
          originalPrice: p.compareAtPrice,
          stock: typeof v.stock === "number" ? v.stock : 0,
          status: "ACTIVE",
        };
      })
      .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));

    const effectiveCpu = specMap.CPU || specMap.cpu || original.cpu || null;
    const effectiveGpu = specMap.GPU || specMap.gpu || specMap.VGA || original.gpu || null;
    const effectiveRam = specMap.RAM || specMap.ram || original.ram || null;
    const effectiveStorage = specMap.SSD || specMap["Ổ cứng"] || specMap.ssd || specMap.Storage || original.storage || null;
    const effectiveDisplay = specMap["Màn hình"] || specMap.display || specMap.Screen || original.display || null;

    const dbRow: ProductDbRowWithRelations = {
      ...original,
      cpu: effectiveCpu,
      gpu: effectiveGpu,
      ram: effectiveRam,
      storage: effectiveStorage,
      display: effectiveDisplay,
      price: base.effectivePrice,
      originalPrice: base.compareAtPrice,
      variants: enrichedVars,
    };

    if (originalVariantCount > 0 && !dbRow.variants?.length) availability = 'UNAVAILABLE';

    if (dbRow.variants && dbRow.variants.length > 0) {
      dbRow.variants = dbRow.variants.filter((v) => {
        const vCond = extractVariantCondition(v, null, published?.condition || original.condition || "NEW");
        return (
          matchesRamBucket(v.ram, ramList) &&
          matchesStorageBucket(v.storage, storageList) &&
          matchesGpuFilter(v.gpu, original.gpuSeries, gpuList) &&
          matchesCpuFilter(v.cpu, original.cpuSeries, cpuList) &&
          (options.minPrice === undefined || v.price >= options.minPrice) &&
          (options.maxPrice === undefined || v.price <= options.maxPrice) &&
          (!conditionList.length || conditionList.includes(vCond)) &&
          (!connectionList.length || connectionList.some((c) => (v.options || original.specs || "").includes(c))) &&
          (!powerList.length || powerList.some((c) => (v.options || original.specs || "").includes(c))) &&
          (!options.inStock ||
            (v.stock > 0 &&
              (!published ||
                published.variants?.some(
                  (pv: { id: string; sku?: string; availability?: string }) =>
                    (pv.id === v.id || (pv.sku && pv.sku === v.sku)) &&
                    (!pv.availability || pv.availability === "AVAILABLE")
                ))))
        );
      });
      if (!dbRow.variants.length) return [];
    } else if (originalVariantCount === 0) {
      const baseCond = published?.condition || original.condition || "NEW";
      const baseMatches =
        matchesRamBucket(effectiveRam, ramList) &&
        matchesStorageBucket(effectiveStorage, storageList) &&
        matchesGpuFilter(effectiveGpu, original.gpuSeries, gpuList) &&
        matchesCpuFilter(effectiveCpu, original.cpuSeries, cpuList) &&
        (options.minPrice === undefined || dbRow.price >= options.minPrice) &&
        (options.maxPrice === undefined || dbRow.price <= options.maxPrice) &&
        (!conditionList.length || conditionList.includes(baseCond)) &&
        (!connectionList.length || connectionList.some((c) => (original.specs || "").includes(c))) &&
        (!powerList.length || powerList.some((c) => (original.specs || "").includes(c))) &&
        (!options.inStock || (original.stock > 0 && availability === "AVAILABLE"));
      if (!baseMatches) return [];
    } else {
      // Had variants, all unpublished/unavailable, cannot satisfy any variant filter
      if (
        ramList.length ||
        storageList.length ||
        gpuList.length ||
        cpuList.length ||
        conditionList.length ||
        connectionList.length ||
        powerList.length ||
        hasPriceFilter ||
        options.inStock
      ) {
        return [];
      }
    }

    // Verify query tokens match active product fields or surviving published variants
    if (tokens.length > 0) {
      const baseSearchText = [
        dbRow.name,
        dbRow.slug,
        dbRow.model,
        dbRow.series,
        dbRow.brand,
        dbRow.brandRel?.name,
        dbRow.brandRel?.slug,
        dbRow.category?.name,
        dbRow.category?.slug,
        effectiveCpu,
        deriveCpuSeries(effectiveCpu) ?? (!effectiveCpu ? dbRow.cpuSeries : null),
        effectiveGpu,
        deriveGpuSeries(effectiveGpu) ?? (!effectiveGpu ? dbRow.gpuSeries : null),
        effectiveRam,
        effectiveStorage,
        dbRow.tags,
        dbRow.description,
        dbRow.specs,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
      const baseFolded = fold(baseSearchText);

      const allTokensMatched = tokens.every((t) => {
        const tf = fold(t);
        if (baseSearchText.includes(t) || baseFolded.includes(tf)) return true;
        return (dbRow.variants || []).some((v) => {
          const vText = [v.sku, v.name, v.cpu, v.gpu, v.ram, v.storage].filter(Boolean).join(" ").toLowerCase();
          return vText.includes(t) || fold(vText).includes(tf);
        });
      });
      if (!allTokensMatched) return [];
    }

    const resolvedImage = resolvePrimaryImageUrl(dbRow);
    const rep = resolveRepresentativeVariant(dbRow, tokens, specFilterParams);
    if (options.inStock && (rep.stock <= 0 || availability !== 'AVAILABLE')) return [];
    const relevanceScore = calculateProductRelevanceScore(dbRow, cleanQuery, tokens);

    const brandName = dbRow.brandRel?.name || dbRow.brand || undefined;
    const categoryName = dbRow.category?.name || undefined;
    const categorySlug = dbRow.category?.slug || undefined;
    const repCondition = rep.variant
      ? extractVariantCondition(rep.variant, null, published?.condition || dbRow.condition || "NEW")
      : (published?.condition || dbRow.condition || "NEW");

    const homepageProduct: HomepageProduct = {
      template: published?.template,
      href: productHref({ slug: dbRow.slug, template: published?.template, kind: /phu-kien|linh-kien|chuot|ban-phim/.test(categorySlug || '') ? 'ACCESSORY' : 'LAPTOP' }),
      id: dbRow.id,
      slug: dbRow.slug,
      sku: rep.sku,
      variantId: rep.variantId,
      name: dbRow.name,
      brand: brandName,
      category: categoryName,
      categorySlug,
      model: dbRow.model || undefined,
      series: dbRow.series || undefined,
      condition: repCondition,
      price: rep.price,
      availability,
      originalPrice: rep.originalPrice,
      discount: rep.discount,
      stock: rep.stock,
      warranty: dbRow.warranty || undefined,
      primaryImage: resolvedImage,
      image: resolvedImage,
      specs: rep.specs,
    };

    return [{
      product: homepageProduct,
      relevanceScore,
      createdAt: dbRow.createdAt,
      id: dbRow.id,
      categorySlug,
      brandSlug: dbRow.brandRel?.slug,
      matchedVariants: (dbRow.variants || []).map((v) => ({
        ...v,
        cpu: v.cpu ?? null,
        gpu: v.gpu ?? null,
        ram: v.ram ?? null,
        storage: v.storage ?? null,
        display: v.display ?? null,
        condition: extractVariantCondition(v, null, published?.condition || dbRow.condition || "NEW"),
      })),
    }];
  });

  processedProducts=processedProducts.filter(({product})=>!hasPriceFilter ||
    (['AVAILABLE','PREORDER'].includes(product.availability || '') && product.price>0 &&
    (options.minPrice===undefined || product.price>=options.minPrice) && (options.maxPrice===undefined || product.price<=options.maxPrice)));

  // 4. Sort results
  const sortMode = options.sort || (cleanQuery ? "relevance" : "newest");
  const promoted = new Set(rawProducts.filter(p => sortMode === "featured" ? p.isFeatured : p.isBestSeller).map(p => p.id));

  processedProducts.sort((a, b) => {
    if (sortMode === "featured" || sortMode === "best-selling") {
      return Number(promoted.has(b.id)) - Number(promoted.has(a.id)) || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);
    }
    if (sortMode === "relevance") {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);
    }
    if (sortMode === "price-asc") {
      return Number(!['AVAILABLE','PREORDER'].includes(a.product.availability || ''))-Number(!['AVAILABLE','PREORDER'].includes(b.product.availability || '')) || a.product.price - b.product.price || a.id.localeCompare(b.id);
    }
    if (sortMode === "price-desc") {
      return Number(!['AVAILABLE','PREORDER'].includes(a.product.availability || ''))-Number(!['AVAILABLE','PREORDER'].includes(b.product.availability || '')) || b.product.price - a.product.price || a.id.localeCompare(b.id);
    }
    if (sortMode === "newest") {
      return b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);
    }
    return 0;
  });

  // 5. Build dynamic facets from the matched product pool (counting once per product across matched published variants)
  const brandCountMap = new Map<string, { label: string; count: number }>();
  const tagCounts = new Map<string, number>();
  const categoryCountMap = new Map<string, { label: string; count: number }>();
  const conditionCountMap = new Map<string, { label: string; count: number }>();
  const cpuSeriesCountMap = new Map<string, { label: string; count: number }>();
  const gpuSeriesCountMap = new Map<string, { label: string; count: number }>();
  const ramCountMap = new Map<number, number>();
  const storageCountMap = new Map<number, number>();
  const connectionCounts = new Map<string, number>();
  const powerCounts = new Map<string, number>();
  let minPriceFound = Number.MAX_SAFE_INTEGER;
  let maxPriceFound = 0;

  const shownEntryMap = new Map(processedProducts.map((p) => [p.id, p]));
  const shownProducts = new Map(processedProducts.map((p) => [p.id, p.product]));
  for (const item of rawProducts) {
    const row = item as unknown as ProductDbRowWithRelations;
    const entry = shownEntryMap.get(row.id);
    if (!entry) continue;
    const shown = entry.product;
    const published = row.studio?.published ? JSON.parse(row.studio.published) : null;
    const specMap = parsePublishedSpecMap(published, row.specs);

    // Count each accessory option once per product, across product specs and matched variants.
    for (const [counts, keys] of [[connectionCounts, ['connection','Connection','Chuẩn kết nối','Kết nối']], [powerCounts, ['power','Power','Công suất','Tổng công suất','Chuẩn sạc']]] as const) {
      const values = new Set<string>();
      for (const k of keys) {
        if (typeof specMap[k] === 'string' && specMap[k].trim()) values.add(specMap[k].trim());
      }
      for (const document of [row.specs, ...entry.matchedVariants.map(v => v.options)]) {
        try {
          const data = JSON.parse(document || '{}');
          for (const key of keys) if (typeof data?.[key] === 'string' && data[key].trim()) values.add(data[key].trim());
        } catch { /* Legacy free text has no structured accessory options. */ }
      }
      for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    }
    if (['AVAILABLE','PREORDER'].includes(shown.availability || '')) {minPriceFound=Math.min(minPriceFound,shown.price);maxPriceFound=Math.max(maxPriceFound,shown.price);}

    // Brand
    if (row.brandRel) {
      const cur = brandCountMap.get(row.brandRel.slug) || { label: row.brandRel.name, count: 0 };
      cur.count += 1;
      brandCountMap.set(row.brandRel.slug, cur);
    }

    // Category
    if (row.category) {
      const cur = categoryCountMap.get(row.category.slug) || { label: row.category.name, count: 0 };
      cur.count += 1;
      categoryCountMap.set(row.category.slug, cur);
    }

    // Per-product Set aggregation across matched published variants (or base product)
    const prodConds = new Set<string>();
    const prodCpus = new Set<string>();
    const prodGpus = new Set<string>();
    const prodRams = new Set<number>();
    const prodStorages = new Set<number>();

    if (entry.matchedVariants.length > 0) {
      for (const v of entry.matchedVariants) {
        if (v.condition) prodConds.add(v.condition);
        const cSer = deriveCpuSeries(v.cpu) ?? (!v.cpu ? row.cpuSeries : null);
        if (cSer) prodCpus.add(cSer);
        const gSer = deriveGpuSeries(v.gpu) ?? (!v.gpu ? row.gpuSeries : null);
        if (gSer) prodGpus.add(gSer);
        const rGb = parseRamGb(v.ram);
        if (rGb) prodRams.add(rGb);
        const sGb = parseStorageGb(v.storage);
        if (sGb) prodStorages.add(sGb);
      }
    } else {
      const baseCond = published?.condition || row.condition;
      if (baseCond) prodConds.add(baseCond);
      const baseCpuStr = specMap.CPU || specMap.cpu || row.cpu;
      const cSer = deriveCpuSeries(baseCpuStr) ?? (!baseCpuStr ? row.cpuSeries : null);
      if (cSer) prodCpus.add(cSer);
      const baseGpuStr = specMap.GPU || specMap.gpu || specMap.VGA || row.gpu;
      const gSer = deriveGpuSeries(baseGpuStr) ?? (!baseGpuStr ? row.gpuSeries : null);
      if (gSer) prodGpus.add(gSer);
      const baseRamStr = specMap.RAM || specMap.ram || row.ram;
      const rGb = parseRamGb(baseRamStr) ?? (!baseRamStr ? row.ramGb : null);
      if (rGb) prodRams.add(rGb);
      const baseStorageStr = specMap.SSD || specMap["Ổ cứng"] || specMap.ssd || specMap.Storage || row.storage;
      const sGb = parseStorageGb(baseStorageStr) ?? (!baseStorageStr ? row.storageGb : null);
      if (sGb) prodStorages.add(normalizeStorageBucket(sGb));
    }

    for (const c of prodConds) {
      const cur = conditionCountMap.get(c) || { label: c, count: 0 };
      cur.count += 1;
      conditionCountMap.set(c, cur);
    }
    for (const c of prodCpus) {
      const cur = cpuSeriesCountMap.get(c) || { label: c, count: 0 };
      cur.count += 1;
      cpuSeriesCountMap.set(c, cur);
    }
    for (const g of prodGpus) {
      const cur = gpuSeriesCountMap.get(g) || { label: g, count: 0 };
      cur.count += 1;
      gpuSeriesCountMap.set(g, cur);
    }
    for (const r of prodRams) {
      ramCountMap.set(r, (ramCountMap.get(r) || 0) + 1);
    }
    for (const s of prodStorages) {
      storageCountMap.set(s, (storageCountMap.get(s) || 0) + 1);
    }
  }

  const yearCounts = new Map<string, number>();
  for (const row of rawProducts) {
    if (!shownProducts.has(row.id)) continue;
    const matches = productReleaseYears(row);
    if (matches) {
      for (const y of new Set(matches)) {
        yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
      }
    }
    let tags: unknown;
    try { tags = row.tags?.startsWith('[') ? JSON.parse(row.tags) : (row.tags || '').split(','); } catch { continue; }
    if (!Array.isArray(tags)) continue;
    for (const tag of new Set(tags.filter((t): t is string => typeof t === 'string').map(catalogNeedTag).filter(Boolean))) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const facets: SearchFacets = {
    connections: [...connectionCounts].map(([value,count]) => ({value,label:value,count})).sort((a,b) => b.count-a.count || a.value.localeCompare(b.value)),
    powers: [...powerCounts].map(([value,count]) => ({value,label:value,count})).sort((a,b) => b.count-a.count || a.value.localeCompare(b.value)),
    tags: [...tagCounts].map(([value, count]) => ({ value, label: value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    years: [...yearCounts.entries()].map(([value, count]) => ({ value, label: value, count })).sort((a, b) => b.value.localeCompare(a.value)),
    categories: Array.from(categoryCountMap.entries())
      .map(([value, d]) => ({ value, label: d.label, count: d.count }))
      .sort((a, b) => b.count - a.count),
    brands: Array.from(brandCountMap.entries())
      .map(([value, d]) => ({ value, label: d.label, count: d.count }))
      .sort((a, b) => b.count - a.count),
    conditions: Array.from(conditionCountMap.entries())
      .map(([value, d]) => ({ value, label: d.label, count: d.count }))
      .sort((a, b) => b.count - a.count),
    cpuSeries: Array.from(cpuSeriesCountMap.entries())
      .map(([value, d]) => ({ value, label: d.label, count: d.count }))
      .sort((a, b) => b.count - a.count),
    gpuSeries: Array.from(gpuSeriesCountMap.entries())
      .map(([value, d]) => ({ value, label: d.label, count: d.count }))
      .sort((a, b) => b.count - a.count),
    ramOptions: Array.from(ramCountMap.entries())
      .map(([value, count]) => ({ value, label: `${value}GB`, count }))
      .sort((a, b) => a.value - b.value),
    storageOptions: Array.from(storageCountMap.entries())
      .map(([value, count]) => ({
        value,
        label: value >= 1024 ? `${value / 1024}TB` : `${value}GB`,
        count,
      }))
      .sort((a, b) => a.value - b.value),
    priceRange: {
      min: minPriceFound === Number.MAX_SAFE_INTEGER ? 0 : minPriceFound,
      max: maxPriceFound,
    },
  };

  // 6. Pagination
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(options.limit) || 12));
  const totalCount = processedProducts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const rawPagedList = (allResults ? processedProducts : processedProducts.slice(startIndex, startIndex + pageSize)).map((p) => p.product);
  return {
    query: cleanQuery,
    products: allResults ? rawPagedList : await searchImages(rawPagedList, client),
    totalCount, page, pageSize, totalPages, facets,
  };
}

async function searchImages(rawPagedList: HomepageProduct[], client: PrismaClient) {
  // Fetch image relations only for the visible page (at most 48 D1 parameters).
  const imageRows = rawPagedList.length ? await client.product.findMany({
    where: { id: { in: rawPagedList.map(p => p.id) } },
    select: { id: true, images: true, productImages: {
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1,
    } },
  }) : [];
  const images = new Map(imageRows.map(row => [row.id, resolvePrimaryImageUrl(row)]));
  return rawPagedList.map(product => ({ ...product,
    image: images.get(product.id) ?? product.image,
    primaryImage: images.get(product.id) ?? product.primaryImage,
  }));

}

/**
 * Fast suggestions autocomplete for header search bar.
 * Returns up to 6 products with representative SKU and matching brands/categories.
 */
export async function getSearchSuggestions(
  rawQuery: string,
  limit = 6,
  client: PrismaClient = prisma
): Promise<SearchSuggestionsResult> {
  const { cleanQuery } = normalizeSearchQuery(rawQuery);

  if (!cleanQuery || cleanQuery.length < 2) {
    return {
      query: cleanQuery,
      products: [],
      brands: [],
      categories: [],
      totalMatches: 0,
    };
  }

  // 1. Run search query with limit
  const searchResult = await searchProducts({ query: cleanQuery, limit: Math.min(10, limit) }, client);

  // 2. Map suggestion items
  const products: SearchSuggestionItem[] = searchResult.products.slice(0, limit).map((p) => {
    const specsParts = [p.specs.cpu, p.specs.ram, p.specs.gpu].filter(Boolean);
    const specsSummary = specsParts.length > 0 ? specsParts.join(" · ") : undefined;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      href: p.href,
      sku: p.sku,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.image || p.primaryImage,
      specsSummary,
      brand: p.brand,
      category: p.category,
      categorySlug: p.categorySlug,
    };
  });

  // 3. Find matching Brands (take 3)
  const brands = await client.brand.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: cleanQuery } },
        { slug: { contains: cleanQuery } },
      ],
    },
    select: { id: true, name: true, slug: true },
    take: 3,
  });

  // 4. Find matching Categories (take 3)
  const categories = await client.category.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: cleanQuery } },
        { slug: { contains: cleanQuery } },
      ],
    },
    select: { id: true, name: true, slug: true },
    take: 3,
  });

  const categoryTree = await client.category.findMany({where:{status:'ACTIVE'},select:{id:true,slug:true,parentId:true}});
  return {
    query: cleanQuery,
    products,
    brands,
    categories: categories.map(c => ({...c,href:categoryHref(categoryTree.find(node=>node.id===c.id)!,categoryTree)})),
    totalMatches: searchResult.totalCount,
  };
}
