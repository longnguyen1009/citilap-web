import 'server-only';

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

export function getPublishedNavigation() {
  return publishedOrNull(async () => publicNavigation((await mediaEnvironment()).DB));
}

export function getPublishedStudio(slug: string) {
  return publishedOrNull(async () => publicStudio((await mediaEnvironment()).DB, slug));
}

export async function getPublishedCollection(slug: string) {
  return publishedOrNull(async () => publicCollection((await mediaEnvironment()).DB, slug));
}

export async function getPublishedCollectionList() {
  return publishedOrNull(async () => {
    const { publicCollectionList } = await import('@/server/services/navigation.service');
    return publicCollectionList((await mediaEnvironment()).DB);
  });
}

export async function getPublishedHomepage() {
  return publishedOrNull(async () => {
    const { getPublicHomepage } = await import('@/server/services/site-builder.service');
    return getPublicHomepage((await mediaEnvironment()).DB);
  });
}

export async function getPublishedLandingPage(slug: string) {
  return publishedOrNull(async () => {
    const { getPublicLandingPage } = await import('@/server/services/site-builder.service');
    return getPublicLandingPage((await mediaEnvironment()).DB, slug);
  });
}

export async function getStorefrontSettings() {
  return publishedOrNull(async () => {
    const { getPublicStorefrontSettings } = await import('@/server/services/settings.service');
    return getPublicStorefrontSettings((await mediaEnvironment()).DB);
  });
}

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

