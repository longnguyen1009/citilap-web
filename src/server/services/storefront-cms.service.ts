import 'server-only';
import { cache } from 'react';

import { cachedJson } from '@/server/cache/kv-cache';

import { mediaEnvironment } from '@/server/media-http';
import { MediaError } from '@/server/services/media-library.service';
import { publicNavigation, publicCollection } from '@/server/services/navigation.service';
import { publicStudio } from '@/server/services/product-studio.service';

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

export const getCachedHotSaleCampaigns = cache(async () => {
  return cachedJson('public-hot-sale-campaigns', PUBLIC_CMS_TTL_SECONDS, async () => {
    const { getHotSaleCampaigns } = await import('@/server/services/hot-sale.service');
    return getHotSaleCampaigns();
  });
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

