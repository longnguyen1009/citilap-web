import { prisma, type PrismaClient } from "@/lib/prisma";
import {catalogBatches} from './catalog-batches';
import { searchIntent } from '@/contracts/catalog/search-intent';
import { getPublicMediaUrl } from "@/infra/cloudflare/r2/storage";
import {
  type HomepageProduct,
  type FacetOption,
  buildRamClauses,
  buildStorageClauses,
} from "./catalog.service";
import { calculateEffectivePrice, getStorefrontPricingContext, type PriceEvaluationContext } from "./pricing.service";

export interface SearchFilterOptions {
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
  sort?: "relevance" | "price-asc" | "price-desc" | "newest";
  page?: number;
  limit?: number;
}

export interface SearchFacets {
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
  categories: Array<{ id: string; name: string; slug: string }>;
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
function resolvePrimaryImageUrl(row: ProductDbRowWithRelations): string | null {
  if (row.productImages && row.productImages.length > 0) {
    const sorted = [...row.productImages].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.sortOrder - b.sortOrder;
    });
    const first = sorted[0];
    if (first?.r2Key) {
      return getPublicMediaUrl(first.r2Key);
    }
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
      if (specFilters.ram.some((r) => vRam.includes(`${r}gb`))) score += 50;
    }
    if (specFilters?.storage && specFilters.storage.length > 0) {
      if (
        specFilters.storage.some((s) =>
          s >= 1024 ? vStorage.includes(`${s / 1024}tb`) : vStorage.includes(`${s}gb`)
        )
      ) {
        score += 50;
      }
    }
    if (specFilters?.gpu && specFilters.gpu.length > 0) {
      if (specFilters.gpu.some((g) => vGpu.includes(g.toLowerCase()))) score += 50;
    }
    if (specFilters?.cpu && specFilters.cpu.length > 0) {
      if (specFilters.cpu.some((c) => vCpu.includes(c.toLowerCase()))) score += 50;
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
export async function searchProducts(
  options: SearchFilterOptions,
  client: PrismaClient = prisma,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
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

  // Multi-token search: each token must match at least one aspect of the product or its variants
  if (tokens.length > 0) {
    for (const t of tokens) {
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
          {
            variants: {
              some: {
                status: "ACTIVE",
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
    andConditions.push({
      OR: [{ category: { slug: { in: categoryList } } }, { categoryId: { in: categoryList } }],
    });
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

  const hasPriceFilter = options.minPrice !== undefined || options.maxPrice !== undefined;
  const hasSpecFilters = ramList.length > 0 || storageList.length > 0 || gpuList.length > 0;
  const hasAccessoryFilters = connectionList.length > 0 || powerList.length > 0;
  const hasConditionFilter = conditionList.length > 0;

  // CPU filter: Enforced at the Product level (and variant if variant has CPU)
  if (cpuList.length > 0) {
    andConditions.push({
      OR: [
        { cpuSeries: { in: cpuList } },
        { cpu: { in: cpuList } },
        { variants: { some: { status: { in: ["ACTIVE", "active"] }, cpu: { in: cpuList } } } },
      ],
    });
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

    andConditions.push({
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
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // 2. Fetch matched products from D1
  const rawProducts = await catalogBatches((skip,take)=>client.product.findMany({
    skip,take,
    where,
    include: {
      studio: {select:{published:true}},
      brandRel: true,
      category: true,
      productImages: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
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
  }> = rawProducts.flatMap((row) => {
    const original = row as unknown as ProductDbRowWithRelations;
    const published = original.studio?.published ? JSON.parse(original.studio.published) : null;
    let availability = published?.availability || 'AVAILABLE';
    const priceFor = (price:number,originalPrice:number|null|undefined,variantId?:string) => calculateEffectivePrice(price,originalPrice ?? null,Boolean(original.isFlashSale),true,context,at,{productId:original.id,variantId,isVariant:!!variantId,variantOriginalPrice:originalPrice ?? null});
    const base = priceFor(original.price,original.originalPrice);
    const dbRow:ProductDbRowWithRelations = {...original,price:base.effectivePrice,originalPrice:base.compareAtPrice,
      variants:original.variants?.filter(v=>!published || published.variants?.some((pv:{id:string;availability?:string})=>pv.id===v.id && (!pv.availability || ['AVAILABLE','PREORDER'].includes(pv.availability)))).map(v=>{
        const price=priceFor(v.price,v.originalPrice,v.id);
        return {...v,price:price.effectivePrice,originalPrice:price.compareAtPrice};
      }).sort((a,b)=>a.price-b.price || a.id.localeCompare(b.id))};
    if (original.variants?.length && !dbRow.variants?.length) availability='UNAVAILABLE';
    if (dbRow.variants?.length) {
      const matchesCapacity = (text:string|null|undefined, values:number[], storage=false) => !values.length || values.some(n=>{
        const match=(text || '').match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(GB|TB)\b/i);
        return !!match && (Number(match[1])*(match[2].toUpperCase()==='TB'?1024:1)===n || (storage && n===1024 && Number(match[1])===1000));
      });
      dbRow.variants=dbRow.variants.filter(v=>matchesCapacity(v.ram,ramList) && matchesCapacity(v.storage,storageList,true) &&
        (!gpuList.length || gpuList.some(g=>(v.gpu || '').toLowerCase().includes(g.toLowerCase()))) &&
        (!cpuList.length || cpuList.some(c=>(v.cpu || original.cpuSeries || original.cpu || '').toLowerCase().includes(c.toLowerCase()))) &&
        (options.minPrice===undefined || v.price>=options.minPrice) && (options.maxPrice===undefined || v.price<=options.maxPrice) &&
        (!conditionList.length || conditionList.some(c=>(v.options || '').includes(`"condition":"${c}"`))) &&
        (!connectionList.length || connectionList.some(c=>(v.options || '').includes(c))) &&
        (!powerList.length || powerList.some(c=>(v.options || '').includes(c))));
      if (!dbRow.variants.length) return [];
    }
    const resolvedImage = resolvePrimaryImageUrl(dbRow);
    const rep = resolveRepresentativeVariant(dbRow, tokens, specFilterParams);
    const relevanceScore = calculateProductRelevanceScore(dbRow, cleanQuery, tokens);

    const brandName = dbRow.brandRel?.name || dbRow.brand || undefined;
    const categoryName = dbRow.category?.name || undefined;
    const categorySlug = dbRow.category?.slug || undefined;

    const homepageProduct: HomepageProduct = {
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
      condition: dbRow.condition || "NEW",
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
    }];
  });

  processedProducts=processedProducts.filter(({product})=>!hasPriceFilter ||
    (['AVAILABLE','PREORDER'].includes(product.availability || '') && product.price>0 &&
    (options.minPrice===undefined || product.price>=options.minPrice) && (options.maxPrice===undefined || product.price<=options.maxPrice)));

  // 4. Sort results
  const sortMode = options.sort || (cleanQuery ? "relevance" : "newest");

  processedProducts.sort((a, b) => {
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

  // 5. Build dynamic facets from the matched product pool
  const brandCountMap = new Map<string, { label: string; count: number }>();
  const categoryCountMap = new Map<string, { label: string; count: number }>();
  const conditionCountMap = new Map<string, { label: string; count: number }>();
  const cpuSeriesCountMap = new Map<string, { label: string; count: number }>();
  const gpuSeriesCountMap = new Map<string, { label: string; count: number }>();
  const ramCountMap = new Map<number, number>();
  const storageCountMap = new Map<number, number>();
  let minPriceFound = Number.MAX_SAFE_INTEGER;
  let maxPriceFound = 0;

  const shownProducts=new Map(processedProducts.map(p=>[p.id,p.product]));
  for (const item of rawProducts) {
    const row = item as unknown as ProductDbRowWithRelations;
    const shown=shownProducts.get(row.id);
    if (!shown) continue;
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

    // Condition
    if (row.condition) {
      const cur = conditionCountMap.get(row.condition) || { label: row.condition, count: 0 };
      cur.count += 1;
      conditionCountMap.set(row.condition, cur);
    }

    // Specs
    if (row.cpuSeries) {
      const cur = cpuSeriesCountMap.get(row.cpuSeries) || { label: row.cpuSeries, count: 0 };
      cur.count += 1;
      cpuSeriesCountMap.set(row.cpuSeries, cur);
    }
    if (row.gpuSeries) {
      const cur = gpuSeriesCountMap.get(row.gpuSeries) || { label: row.gpuSeries, count: 0 };
      cur.count += 1;
      gpuSeriesCountMap.set(row.gpuSeries, cur);
    }
    if (row.ramGb) {
      ramCountMap.set(row.ramGb, (ramCountMap.get(row.ramGb) || 0) + 1);
    }
    if (row.storageGb) {
      storageCountMap.set(row.storageGb, (storageCountMap.get(row.storageGb) || 0) + 1);
    }
  }

  const facets: SearchFacets = {
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
  const rawPagedList = processedProducts.slice(startIndex, startIndex + pageSize).map((p) => p.product);
  const pagedList = rawPagedList;

  return {
    query: cleanQuery,
    products: pagedList,
    totalCount,
    page,
    pageSize,
    totalPages,
    facets,
  };
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

  return {
    query: cleanQuery,
    products,
    brands,
    categories,
    totalMatches: searchResult.totalCount,
  };
}
