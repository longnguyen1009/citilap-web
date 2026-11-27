import 'server-only';
import { cache } from 'react';

import { cachedJson } from '@/server/cache/kv-cache';

import { mediaEnvironment } from '@/server/media-http';
import { MediaError } from '@/server/services/media-library.service';
import { publicNavigation, publicCollection } from '@/server/services/navigation.service';
import { publicStudio } from '@/server/services/product-studio.service';
import { DEFAULT_FLASH_SALE_PRE_SHOW_HOURS, getNextHotSaleBoundaryMs } from '@/lib/flash-sale-schedule';

export type ProductPublicationClassification =
  | { kind: 'NOT_FOUND' }
  | { kind: 'DELETED' }
  | { kind: 'LEGACY_ACTIVE'; productId: string; slug: string }
  | { kind: 'LEGACY_INACTIVE'; productId: string; slug: string; status: string }
  | { kind: 'CMS_PUBLISHED'; productId: string; slug: string; revision: number }
  | { kind: 'CMS_NOT_PUBLIC'; productId: string; slug: string; revision: number; reason: 'DRAFT_OR_UNPUBLISHED' | 'INACTIVE_STATUS' };

interface PublicationRow {
  id: string;
  slug: string;
  productStatus: string;
  deletedAt: string | null;
  studioProductId: string | null;
  studioPublished: string | null;
  studioRevision: number | null;
}

export interface PublicationLookupOptions {
  lookupType?: 'auto' | 'id' | 'slug';
  explicitDb?: import('@cloudflare/workers-types').D1Database;
}

/**
 * Classifies product publication state across D1 Product and ProductStudio tables.
 * Fails closed on draft/unpublished CMS items (CMS_NOT_PUBLIC) so they never regress to legacy catalog.
 * Priority rule: supports explicit lookupType ('id' | 'slug' | 'auto').
 * In 'auto' mode, exact slug match precedes legacy ID match to prevent ambiguous identity collisions.
 * Infrastructure errors (503 / connection errors) surface rather than swallowing into null.
 */
export async function classifyProductPublication(
  identifier: string,
  optionsOrDb?: PublicationLookupOptions | import('@cloudflare/workers-types').D1Database
): Promise<ProductPublicationClassification> {
  const options: PublicationLookupOptions =
    optionsOrDb && 'prepare' in optionsOrDb
      ? { lookupType: 'auto', explicitDb: optionsOrDb }
      : (optionsOrDb as PublicationLookupOptions) || { lookupType: 'auto' };

  const db = options.explicitDb || (await mediaEnvironment()).DB;
  const lookupType = options.lookupType || 'auto';

  let query: string;
  let params: string[];

  if (lookupType === 'id') {
    query = `SELECT
        p.id,
        p.slug,
        p.status AS productStatus,
        p.deletedAt,
        s.productId AS studioProductId,
        s.published AS studioPublished,
        s.revision AS studioRevision
      FROM Product p
      LEFT JOIN ProductStudio s ON s.productId = p.id
      WHERE p.id = ?
      LIMIT 1`;
    params = [identifier];
  } else if (lookupType === 'slug') {
    query = `SELECT
        p.id,
        p.slug,
        p.status AS productStatus,
        p.deletedAt,
        s.productId AS studioProductId,
        s.published AS studioPublished,
        s.revision AS studioRevision
      FROM Product p
      LEFT JOIN ProductStudio s ON s.productId = p.id
      WHERE p.slug = ?
      LIMIT 1`;
    params = [identifier];
  } else {
    query = `SELECT
        p.id,
        p.slug,
        p.status AS productStatus,
        p.deletedAt,
        s.productId AS studioProductId,
        s.published AS studioPublished,
        s.revision AS studioRevision
      FROM Product p
      LEFT JOIN ProductStudio s ON s.productId = p.id
      WHERE (p.slug = ? OR p.id = ?)
      ORDER BY CASE WHEN p.slug = ? THEN 0 ELSE 1 END
      LIMIT 1`;
    params = [identifier, identifier, identifier];
  }

  const stmt = db.prepare(query);
  const bound = params.length === 1 ? stmt.bind(params[0]) : stmt.bind(params[0], params[1], params[2]);
  const row = await bound.first<PublicationRow>();

  if (!row) {
    return { kind: 'NOT_FOUND' };
  }

  if (row.deletedAt !== null) {
    return { kind: 'DELETED' };
  }

  const isProductActive = ['ACTIVE', 'active'].includes(row.productStatus);

  // If managed by CMS ProductStudio
  if (row.studioProductId !== null) {
    const revision = row.studioRevision ?? 0;
    if (!row.studioPublished) {
      return {
        kind: 'CMS_NOT_PUBLIC',
        productId: row.id,
        slug: row.slug,
        revision,
        reason: 'DRAFT_OR_UNPUBLISHED',
      };
    }

    if (!isProductActive) {
      return {
        kind: 'CMS_NOT_PUBLIC',
        productId: row.id,
        slug: row.slug,
        revision,
        reason: 'INACTIVE_STATUS',
      };
    }

    return {
      kind: 'CMS_PUBLISHED',
      productId: row.id,
      slug: row.slug,
      revision,
    };
  }

  // Pure legacy catalog product (not yet authored in CMS ProductStudio)
  if (isProductActive) {
    return { kind: 'LEGACY_ACTIVE', productId: row.id, slug: row.slug };
  }

  return {
    kind: 'LEGACY_INACTIVE',
    productId: row.id,
    slug: row.slug,
    status: row.productStatus,
  };
}

/** Only clean 404s (not authored/not published) return null. Infrastructure errors (503) surface. */
async function publishedOrNull<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof MediaError && error.status === 404) return null;
    throw error;
  }
}

/** Public CMS reads are cached in KV for 60s; admin publishes invalidate them (see bumpCmsVersion). */
const PUBLIC_CMS_TTL_SECONDS = 60;

export const getPublishedNavigation = cache(() => {
  return cachedJson('public-navigation', PUBLIC_CMS_TTL_SECONDS, () =>
    publishedOrNull(async () => publicNavigation((await mediaEnvironment()).DB)));
});

export const getPublishedStudio = cache((slug: string) => {
  return cachedJson(`public-studio:${slug}`, PUBLIC_CMS_TTL_SECONDS, () =>
    publishedOrNull(async () => publicStudio((await mediaEnvironment()).DB, slug)));
});

export async function getPublishedCollection(slug: string) {
  return cachedJson(`public-collection:${slug}`, PUBLIC_CMS_TTL_SECONDS, () =>
    publishedOrNull(async () => publicCollection((await mediaEnvironment()).DB, slug)));
}

export async function getPublishedCollectionList() {
  return cachedJson('public-collections', PUBLIC_CMS_TTL_SECONDS, () =>
    publishedOrNull(async () => {
      const { publicCollectionList } = await import('@/server/services/navigation.service');
      return publicCollectionList((await mediaEnvironment()).DB);
    }));
}

export const getPublishedHomepage = cache(async () => {
  return cachedJson('public-homepage', PUBLIC_CMS_TTL_SECONDS, () => publishedOrNull(async () => {
    const { getPublicHomepage } = await import('@/server/services/site-builder.service');
    return getPublicHomepage((await mediaEnvironment()).DB);
  }));
});

export async function getPublishedLandingPage(slug: string) {
  return cachedJson(`public-landing:${slug}`, PUBLIC_CMS_TTL_SECONDS, () =>
    publishedOrNull(async () => {
      const { getPublicLandingPage } = await import('@/server/services/site-builder.service');
      return getPublicLandingPage((await mediaEnvironment()).DB, slug);
    }));
}

export const getStorefrontSettings = cache(async () => {
  return cachedJson('public-settings', PUBLIC_CMS_TTL_SECONDS, () => publishedOrNull(async () => {
    const { getPublicStorefrontSettings } = await import('@/server/services/settings.service');
    return getPublicStorefrontSettings((await mediaEnvironment()).DB);
  }));
});

export const getCachedActiveCategories = cache(async () => {
  return cachedJson('public-categories', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getActiveCategories } = await import('@/server/services/catalog.service');
    return getActiveCategories();
  });
});

export const getCachedActiveBrands = cache(async () => {
  return cachedJson('public-brands', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getActiveBrands } = await import('@/server/services/catalog.service');
    return getActiveBrands();
  });
});

export const getCachedCatalogState = cache(async (now = Date.now()) => {
  const { catalogState } = await import('@/server/services/catalog-state');
  const { DB } = await mediaEnvironment();
  const cached = await cachedJson('public-catalog-state', PUBLIC_CMS_TTL_SECONDS, () => catalogState(DB, now));
  if (cached.nextChange !== null && cached.nextChange <= now) {
    return catalogState(DB, now);
  }
  return { ...cached, serverTime: now };
});

export const getCachedHotSaleCampaigns = cache(async (now = Date.now()) => {
  const settings = await getStorefrontSettings().catch(() => null);
  const preShowHours = settings?.flashSalePreShowHours ?? DEFAULT_FLASH_SALE_PRE_SHOW_HOURS;
  const cached = await cachedJson('public-hot-sale-campaigns-v4', PUBLIC_CMS_TTL_SECONDS, async () => {
    const fetchNow = Date.now();
    const { getHotSaleCampaigns } = await import('@/server/services/hot-sale.service');
    const campaigns = await getHotSaleCampaigns(undefined, new Date(fetchNow));
    return {
      campaigns,
      nextBoundary: getNextHotSaleBoundaryMs(campaigns, fetchNow, preShowHours),
    };
  });
  if (cached.nextBoundary !== null && cached.nextBoundary <= now) {
    const { getHotSaleCampaigns } = await import('@/server/services/hot-sale.service');
    return getHotSaleCampaigns(undefined, new Date(now));
  }
  return cached.campaigns;
});

export const getCachedHomepageCatalog = cache(async () => {
  return cachedJson('public-homepage-catalog', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getHomepageCatalog } = await import('@/server/services/catalog.service');
    return getHomepageCatalog();
  });
});

export const getCachedProductPublication = cache(async (identifier: string, lookupType: 'auto' | 'id' | 'slug' = 'auto') => {
  return cachedJson(`public-pub:${lookupType}:${identifier}`, PUBLIC_CMS_TTL_SECONDS, () =>
    classifyProductPublication(identifier, { lookupType }));
});

export const getCachedProductDetail = cache(async (slug: string, sku?: string) => {
  return cachedJson(`public-product-detail:${slug}:${sku || ''}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getProductDetail } = await import('@/server/services/catalog.service');
    return getProductDetail(slug, sku);
  });
});

export const getCachedPricingContext = cache(async () => {
  return cachedJson('public-pricing-context', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getStorefrontPricingContext } = await import('@/server/services/pricing.service');
    const ctx = await getStorefrontPricingContext(undefined, new Date());
    if (ctx.activeCampaign?.items instanceof Map) {
      return {
        ...ctx,
        activeCampaign: {
          ...ctx.activeCampaign,
          items: Object.fromEntries(ctx.activeCampaign.items),
        },
      };
    }
    return ctx;
  });
});

export const getCachedProductReviews = cache(async (names: string[]) => {
  const key = [...new Set(names.filter(Boolean))].sort().join('|');
  return cachedJson(`public-reviews:${key}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { listApprovedProductReviews } = await import('@/server/services/contact.service');
    return listApprovedProductReviews(names);
  });
});

/** Published post by slug (null when missing). Deduped between generateMetadata and the page. */
export const getCachedPublicPost = cache(async (slug: string) => {
  return cachedJson(`public-post:${slug}`, PUBLIC_CMS_TTL_SECONDS, () => publishedOrNull(async () => {
    const { publicPostBySlug } = await import('@/server/services/post.service');
    return publicPostBySlug((await mediaEnvironment()).DB, slug);
  }));
});

export const getCachedPublicPostList = cache(async (categoryId: string | undefined, page: number, limit: number) => {
  return cachedJson(`public-post-list:${categoryId || ''}:p${page}:l${limit}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { publicPostList } = await import('@/server/services/post.service');
    return publicPostList((await mediaEnvironment()).DB, { categoryId, page, limit });
  });
});

export const getCachedPublicPostCategories = cache(async () => {
  return cachedJson('public-post-categories', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { listPostCategories } = await import('@/server/services/post.service');
    return listPostCategories((await mediaEnvironment()).DB, 'ACTIVE');
  });
});

export async function enrichPostsWithPrimaryProduct<
  T extends {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    authorName: string;
    publishedAt: string;
    isFeatured: boolean;
    coverImage: { url: string; alt: string; thumbnailUrl?: string } | null;
    category: { id: string; name: string; slug: string } | null;
    relatedProductIds?: string[];
  },
>(
  posts: T[],
  totalCount?: number,
  pageOffset = 0,
): Promise<import('@/lib/customer-experience').CustomerExperienceCardItem[]> {
  const firstProductIds = [
    ...new Set(
      posts
        .map((p) => p.relatedProductIds?.[0])
        .filter((id): id is string => Boolean(id && id.trim())),
    ),
  ];

  const productMap = new Map<string, { id: string; name: string; slug: string }>();
  if (firstProductIds.length > 0) {
    try {
      const { DB } = await mediaEnvironment();
      const placeholders = firstProductIds.map(() => '?').join(',');
      const res = await DB.prepare(
        `SELECT id, name, slug FROM Product WHERE id IN (${placeholders}) AND status IN ('ACTIVE', 'active') AND deletedAt IS NULL`,
      )
        .bind(...firstProductIds)
        .all<{ id: string; name: string; slug: string }>();
      for (const row of res.results || []) {
        productMap.set(row.id, row);
      }
    } catch {
      // Non-fatal: cards still render cleanly without product chips
    }
  }

  const baseTotal = typeof totalCount === 'number' && totalCount > 0 ? totalCount : posts.length;
  return posts.map((post, idx) => {
    const firstId = post.relatedProductIds?.[0];
    const entryNum = Math.max(1, baseTotal - (pageOffset + idx));
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      authorName: post.authorName,
      publishedAt: post.publishedAt,
      isFeatured: post.isFeatured,
      coverImage: post.coverImage,
      category: post.category,
      relatedProduct: firstId ? productMap.get(firstId) ?? null : null,
      entryNumber: entryNum,
    };
  });
}

export const getCachedCustomerExperiencePosts = cache(async (limit = 3) => {
  return cachedJson(`public-customer-experience:l${limit}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const {
      CUSTOMER_EXPERIENCE_BASE_PATH,
      isCustomerExperienceCategory,
    } = await import('@/lib/customer-experience');

    const categories = await getCachedPublicPostCategories().catch(() => []);
    const expCategory = categories.find((c) => isCustomerExperienceCategory(c)) ?? null;

    let rawList = expCategory
      ? await getCachedPublicPostList(expCategory.id, 1, limit).catch(() => null)
      : null;

    let isFallbackFromAllNews = false;
    if (!rawList || rawList.items.length === 0) {
      rawList = await getCachedPublicPostList(undefined, 1, limit).catch(() => null);
      isFallbackFromAllNews = true;
    }

    const rawItems = rawList?.items ?? [];
    const total = rawList?.total ?? rawItems.length;
    const items = await enrichPostsWithPrimaryProduct(rawItems, total, 0);

    return {
      category: expCategory
        ? { id: expCategory.id, name: expCategory.name, slug: expCategory.slug }
        : null,
      viewAllHref: CUSTOMER_EXPERIENCE_BASE_PATH,
      total,
      isFallbackFromAllNews,
      items,
    };
  });
});

/**
 * Related products, cached with their raw prices. Callers must re-apply live pricing
 * (`applyPricingToHomepageProducts` is idempotent) so campaign boundaries stay exact.
 */
export const getCachedRelatedProducts = cache(async (
  productId: string,
  categoryId: string | null | undefined,
  brandId: string | null | undefined,
  limit: number,
  manualIds: string[] = [],
) => {
  const key = `public-related:${productId}:${categoryId || ''}:${brandId || ''}:${limit}:${manualIds.join(',')}`;
  return cachedJson(key, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getRelatedProducts } = await import('@/server/services/catalog.service');
    return getRelatedProducts(productId, categoryId, brandId, limit, manualIds);
  });
});

export const getCachedInspections = cache(async (productId: string, variantId: string | null) => {
  return cachedJson(`public-inspections:${productId}:${variantId || ''}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { publicInspections } = await import('@/server/services/inspection.service');
    return publicInspections((await mediaEnvironment()).DB, productId, variantId);
  });
});

export const getCachedSystemPageResolution = cache(async (pageType: import('@/contracts/cms/page').PageType) => {
  return cachedJson(`public-sys-page:${pageType}`, PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getSystemPageResolution } = await import('@/server/services/page.service');
    return getSystemPageResolution((await mediaEnvironment()).DB, pageType);
  });
});

export const getCachedPublicPage = cache(async (slug: string) => {
  return cachedJson(`public-page:${slug}`, PUBLIC_CMS_TTL_SECONDS, () => publishedOrNull(async () => {
    const { publicPageBySlug } = await import('@/server/services/page.service');
    return publicPageBySlug((await mediaEnvironment()).DB, slug);
  }));
});

export const getCachedBrandWithProducts = cache(async (slug: string) => {
  return cachedJson(`public-brand:${slug}`, PUBLIC_CMS_TTL_SECONDS, () => publishedOrNull(async () => {
    const { publicBrandWithProducts } = await import('@/server/services/brand.service');
    return publicBrandWithProducts((await mediaEnvironment()).DB, slug);
  }));
});

export function classifyProductPublicationById(
  productId: string,
  explicitDb?: import('@cloudflare/workers-types').D1Database
) {
  return classifyProductPublication(productId, { lookupType: 'id', explicitDb });
}

export function classifyProductPublicationBySlug(
  slug: string,
  explicitDb?: import('@cloudflare/workers-types').D1Database
) {
  return classifyProductPublication(slug, { lookupType: 'slug', explicitDb });
}

