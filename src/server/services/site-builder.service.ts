import { cmsMutationBatch } from '../cms-schedule-context';
import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import {
  landingPageStudioWriteSchema,
  defaultHomepageSections,
  type LandingPageDocument,
  type SectionItem,
} from '../../contracts/cms/site-builder';
import { RESERVED_SLUGS } from '../../contracts/cms/post';
import { MediaError, type MediaEnvironment } from './media-library.service';
import { contentAssets } from './content-media.service';
import {
  resolveProductsByIds,
  resolveProductsByCriteria,
  getActiveCategories,
  getActiveBrands,
  type HomepageProduct,
} from './catalog.service';
import { publicPostList } from './post.service';
import { publicCollection } from './navigation.service';
import { getPublicMediaUrl } from '../../infra/cloudflare/r2/storage';
import { getStorefrontPricingContext } from './pricing.service';
import { getPrismaClient } from '../../lib/prisma';
import { canonicalCategoryPath } from '../../lib/category-paths';

export interface LandingPageListItem {
  id: string;
  slug: string;
  name: string;
  isHome: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  revision: number;
  publishedRevision: number | null;
  hasUnpublishedDraft: boolean;
  updatedAt: string;
}

interface StudioRow {
  pageId: string;
  revision: number;
  draft: string;
  published: string | null;
  publishedRevision: number | null;
  publishedAt: string | null;
  updatedAt: string;
}

export async function bootstrapHomepage(db: D1Database) {
  const existing = await db
    .prepare("SELECT id, status FROM LandingPage WHERE id = 'home' AND deletedAt IS NULL")
    .first<{ id: string; status: string }>();

  if (existing) {
    const studio = await db
      .prepare("SELECT revision, publishedRevision FROM LandingPageStudio WHERE pageId = 'home'")
      .first<{ revision: number; publishedRevision: number | null }>();

    return {
      status: 'SKIPPED',
      message: 'Homepage already initialized. Preserving existing content.',
      revision: studio?.revision ?? 1,
      publishedRevision: studio?.publishedRevision,
    };
  }

  const doc: LandingPageDocument = {
    schemaVersion: 1,
    internalName: 'Trang chủ chính thức',
    title: 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt',
    slug: '',
    seo: {
      title: 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt',
      description: 'CitiLap chuyên cung cấp Laptop Gaming, Ultrabook, Máy Trạm (Workstation) và Like New tuyển chọn kỹ lưỡng. Bảo hành 12 tháng, đổi mới 7 ngày.',
      ogImageAssetId: null,
    },
    sections: defaultHomepageSections(),
  };

  const snapshot = JSON.stringify(doc);
  const now = new Date().toISOString();

  const statements = [
    db
      .prepare(`
        INSERT INTO LandingPage (id, slug, isHome, name, status, createdAt, updatedAt)
        VALUES ('home', '', 1, ?, 'PUBLISHED', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          status = 'PUBLISHED',
          updatedAt = excluded.updatedAt
      `)
      .bind(doc.internalName, now, now),

    db
      .prepare(`
        INSERT OR IGNORE INTO LandingPageStudio (pageId, revision, draft, updatedAt)
        VALUES ('home', 0, ?, ?)
      `)
      .bind(snapshot, now),

    db
      .prepare(`
        INSERT INTO LandingPageRevision (pageId, revision, document, action, actor, createdAt)
        VALUES ('home', 1, ?, 'init', 'system', ?)
      `)
      .bind(snapshot, now),

    db
      .prepare(`
        UPDATE LandingPageStudio
        SET revision = 1,
            publishedRevision = 1,
            draft = ?,
            published = ?,
            publishedAt = ?,
            publicUpdatedAt = ?,
            updatedAt = ?
        WHERE pageId = 'home'
      `)
      .bind(snapshot, snapshot, now, now, now),
  ];

  await cmsMutationBatch(db, [...statements, ...adminAuditStatements(db, 'builder.bootstrap', 'home', 'Homepage initialized')]);

  return {
    status: 'BOOTSTRAPPED',
    message: 'Default homepage successfully initialized and published as revision 1.',
    revision: 1,
    publishedRevision: 1,
    sectionCount: doc.sections.length,
  };
}

export const ensureHomepageBootstrapped = bootstrapHomepage;

export async function getLandingPageList(
  db: D1Database,
  opts: { q?: string; page?: number; limit?: number; status?: string } = {}
) {
  try {
    await ensureHomepageBootstrapped(db);
  } catch (e) {
    console.warn('[SiteBuilder] Auto-bootstrap homepage check:', e);
  }

  const page = Math.max(1, Math.floor(Number(opts.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(opts.limit) || 20)));
  const offset = (page - 1) * limit;
  const q = String(opts.q || '').trim().slice(0, 200);

  const whereClauses: string[] = ['p.deletedAt IS NULL'];
  const params: (string | number)[] = [];

  if (opts.status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(opts.status)) {
    whereClauses.push('p.status = ?');
    params.push(opts.status);
  }

  if (q) {
    whereClauses.push('(instr(lower(p.name), lower(?)) > 0 OR instr(lower(p.slug), lower(?)) > 0)');
    params.push(q, q);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = await db
    .prepare(`SELECT count(*) AS total FROM LandingPage p WHERE ${whereSql}`)
    .bind(...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const rows = await db
    .prepare(`
      SELECT p.id, p.slug, p.isHome, p.name, p.status, p.updatedAt,
             s.revision, s.draft, s.published, s.publishedRevision
      FROM LandingPage p
      LEFT JOIN LandingPageStudio s ON s.pageId = p.id
      WHERE ${whereSql}
      ORDER BY p.isHome DESC, p.updatedAt DESC, p.id DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...params, limit, offset)
    .all<Record<string, unknown>>();

  const items: LandingPageListItem[] = (rows.results || []).map((r) => {
    const isHome = Number(r.isHome) === 1;
    const revision = Number(r.revision ?? 0);
    const publishedRevision = r.publishedRevision != null ? Number(r.publishedRevision) : null;
    const draft = typeof r.draft === 'string' ? r.draft : '';
    const published = typeof r.published === 'string' ? r.published : null;

    return {
      id: String(r.id),
      slug: String(r.slug),
      name: String(r.name),
      isHome,
      status: (r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') || 'DRAFT',
      revision,
      publishedRevision,
      hasUnpublishedDraft: !!published && !!draft && draft !== published,
      updatedAt: String(r.updatedAt),
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getLandingPageDetail(db: D1Database, id: string) {
  if (id === 'home') {
    try {
      await ensureHomepageBootstrapped(db);
    } catch (e) {
      console.warn('[SiteBuilder] Auto-bootstrap homepage check:', e);
    }
  }

  const pageRow = await db
    .prepare('SELECT id, slug, isHome, name, status, updatedAt FROM LandingPage WHERE id = ? AND deletedAt IS NULL')
    .bind(id)
    .first<{ id: string; slug: string; isHome: number; name: string; status: string; updatedAt: string }>();

  if (!pageRow) {
    throw new MediaError('Không tìm thấy trang.', 404);
  }

  const studioRow = await db
    .prepare('SELECT pageId, revision, draft, published, publishedRevision, publishedAt, updatedAt FROM LandingPageStudio WHERE pageId = ?')
    .bind(id)
    .first<StudioRow>();

  if (!studioRow) {
    throw new MediaError('Dữ liệu biên tập của trang chưa được khởi tạo.', 404);
  }

  let document: LandingPageDocument;
  try {
    document = JSON.parse(studioRow.draft);
  } catch {
    throw new MediaError('Dữ liệu JSON bản nháp bị lỗi cú pháp.', 500);
  }

  return {
    id: pageRow.id,
    slug: pageRow.slug,
    name: pageRow.name,
    isHome: Number(pageRow.isHome) === 1,
    status: pageRow.status,
    revision: studioRow.revision,
    publishedRevision: studioRow.publishedRevision,
    publishedAt: studioRow.publishedAt,
    isPublished: Boolean(studioRow.published),
    hasUnpublishedDraft: Boolean(studioRow.published && studioRow.draft && studioRow.draft !== studioRow.published),
    document,
  };
}

async function assertLandingSlugAvailable(db: D1Database, slug: string, isHome: boolean, excludePageId: string | null) {
  if (isHome) return; // Homepage uses empty or 'home' slug and is unique via isHome constraint

  if ((RESERVED_SLUGS as readonly string[]).includes(slug) || slug === 'landing') {
    throw new MediaError('Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.', 400);
  }

  const existing = await db
    .prepare('SELECT id FROM LandingPage WHERE slug = ? AND isHome = 0 AND deletedAt IS NULL')
    .bind(slug)
    .first<{ id: string }>();

  if (existing && existing.id !== excludePageId) {
    throw new MediaError('Đường dẫn (slug) này đã được dùng cho một landing page khác.', 409);
  }
}

export async function writeLandingPage(
  env: MediaEnvironment,
  id: string | null,
  input: unknown,
  actor = 'admin'
) {
  const { expectedRevision, action, document: d } = landingPageStudioWriteSchema.parse(input);
  const db = env.DB;

  const existing = id ? await getLandingPageDetail(db, id).catch((e) => {
    if (e instanceof MediaError && e.status === 404) return null;
    throw e;
  }) : null;

  if (id && !existing) {
    throw new MediaError('Không tìm thấy trang để cập nhật.', 404);
  }

  const isHome = existing ? existing.isHome : d.slug === '' || id === 'home';
  const pageId = id || (isHome ? 'home' : crypto.randomUUID());
  const slug = isHome ? '' : d.slug;

  if ((existing?.revision ?? 0) !== expectedRevision) {
    throw new MediaError('Trang đã được chỉnh sửa ở nơi khác (xung đột phiên bản). Vui lòng tải lại trang trước khi lưu.', 409);
  }

  await assertLandingSlugAvailable(db, slug, isHome, pageId);

  const nextRevision = expectedRevision + 1;
  const snapshot = JSON.stringify(d);

  // Collect referenced asset IDs across all sections
  const assetIds = new Set<string>();
  if (d.seo.ogImageAssetId) assetIds.add(d.seo.ogImageAssetId);
  for (const sec of d.sections) {
    if (sec.type === 'banner' && 'imageAssetId' in sec.data && sec.data.imageAssetId) {
      assetIds.add(sec.data.imageAssetId);
    }
    if (sec.type === 'slider' && 'slides' in sec.data) {
      for (const slide of sec.data.slides) {
        if (slide.imageAssetId) assetIds.add(slide.imageAssetId);
      }
    }
  }

  const statements = [
    // 1. Ensure LandingPage identity exists
    db
      .prepare(`
        INSERT INTO LandingPage(id, slug, isHome, name, status)
        VALUES(?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          name = excluded.name,
          updatedAt = CURRENT_TIMESTAMP
      `)
      .bind(pageId, slug, isHome ? 1 : 0, d.internalName || d.title, action === 'publish' ? 'PUBLISHED' : (existing?.status || 'DRAFT')),

    // 2. Ensure LandingPageStudio row exists
    db
      .prepare(`
        INSERT OR IGNORE INTO LandingPageStudio(pageId, revision, draft)
        VALUES(?, 0, ?)
      `)
      .bind(pageId, snapshot),

    // 3. Append to immutable LandingPageRevision log
    db
      .prepare(`
        INSERT INTO LandingPageRevision(pageId, revision, document, action, actor)
        VALUES(?, ?, ?, ?, ?)
      `)
      .bind(pageId, nextRevision, snapshot, action, adminActor()),

    // 4. Update LandingPageStudio with new draft / publish
    db
      .prepare(`
        UPDATE LandingPageStudio
        SET draft = ?,
            revision = ?,
            published = CASE WHEN ? = 'publish' THEN ? WHEN ? = 'unpublish' THEN NULL ELSE published END,
            publishedRevision = CASE WHEN ? = 'publish' THEN ? WHEN ? = 'unpublish' THEN NULL ELSE publishedRevision END,
            publishedAt = CASE WHEN ? = 'publish' THEN CURRENT_TIMESTAMP WHEN ? = 'unpublish' THEN NULL ELSE publishedAt END,
            publicUpdatedAt = CASE WHEN ? = 'publish' THEN CURRENT_TIMESTAMP ELSE publicUpdatedAt END,
            updatedAt = CURRENT_TIMESTAMP
        WHERE pageId = ?
      `)
      .bind(
        snapshot,
        nextRevision,
        action, snapshot, action,
        action, nextRevision, action,
        action, action,
        action,
        pageId
      ),

    // 5. Update status on LandingPage identity
    db
      .prepare(`
        UPDATE LandingPage
        SET status = CASE WHEN ? = 'publish' THEN 'PUBLISHED' WHEN ? = 'unpublish' THEN 'DRAFT' ELSE status END,
            name = ?,
            slug = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(action, action, d.internalName || d.title, slug, pageId),
  ];

  await contentAssets(env, '', [...assetIds], action === 'publish');
  // Retained draft revisions also protect their images from library cleanup.
  if (action !== 'unpublish') {
    for (const assetId of assetIds) {
      statements.push(
        db
          .prepare(`
            INSERT OR REPLACE INTO MediaUsage(id, assetId, ownerType, ownerId, slot)
            VALUES(?, ?, 'LANDING_PAGE_REVISION', ?, ?)
          `)
          .bind(crypto.randomUUID(), assetId, pageId, `${nextRevision}:${assetId}`)
      );
    }
  }

  try {
    await cmsMutationBatch(db, [...statements, ...adminAuditStatements(db, 'landing.' + action, pageId, 'Landing mutation', null, 'order', {before:expectedRevision,after:nextRevision})]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/LANDING_PAGE_CONFLICT|UNIQUE constraint failed/.test(msg)) {
      throw new MediaError('Xung đột phiên bản: Trang đã được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang.', 409);
    }
    throw new MediaError(`Lỗi khi lưu trang vào cơ sở dữ liệu: ${msg}`, 500);
  }

  return getLandingPageDetail(db, pageId);
}

export async function restoreLandingPageRevision(
  env: MediaEnvironment,
  id: string,
  targetRevision: number,
  expectedRevision: number,
  actor = 'admin'
) {
  const db = env.DB;
  const revRow = await db
    .prepare('SELECT document FROM LandingPageRevision WHERE pageId = ? AND revision = ?')
    .bind(id, targetRevision)
    .first<{ document: string }>();

  if (!revRow) {
    throw new MediaError(`Không tìm thấy phiên bản lịch sử #${targetRevision}.`, 404);
  }

  let restoredDoc: LandingPageDocument;
  try {
    restoredDoc = JSON.parse(revRow.document);
  } catch {
    throw new MediaError('Dữ liệu JSON của phiên bản lịch sử bị lỗi cú pháp.', 500);
  }

  // Restores document as a new DRAFT (does not publish directly)
  return writeLandingPage(
    env,
    id,
    {
      expectedRevision,
      action: 'save',
      document: restoredDoc,
    },
    actor
  );
}

export async function getLandingPageRevisions(db: D1Database, id: string) {
  const rows = await db
    .prepare(`
      SELECT revision, action, actor, createdAt
      FROM LandingPageRevision
      WHERE pageId = ?
      ORDER BY revision DESC
      LIMIT 50
    `)
    .bind(id)
    .all<{ revision: number; action: string; actor: string; createdAt: string }>();

  return rows.results || [];
}

// --- Public Resolvers for StoreFront ---

export interface ResolvedSectionItem extends SectionItem {
  resolvedPosts?: Awaited<ReturnType<typeof publicPostList>>['items'];
  resolvedProducts?: HomepageProduct[];
  resolvedTabs?: { id: string; label: string; href: string; products: HomepageProduct[] }[];
  resolvedCategories?: Awaited<ReturnType<typeof getActiveCategories>>;
  resolvedBrands?: Awaited<ReturnType<typeof getActiveBrands>>;
  resolvedCollection?: Awaited<ReturnType<typeof publicCollection>>;
}

export interface ResolvedPublicPage {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  seo: {
    title: string;
    description: string;
    ogImageUrl: string | null;
  };
  sections: ResolvedSectionItem[];
  publishedAt: string;
  updatedAt: string;
}

export async function resolveSectionsForStorefront(
  db: D1Database,
  sections: SectionItem[]
): Promise<ResolvedSectionItem[]> {
  const client = getPrismaClient(db);
  const [allCategories, redirects] = await Promise.all([
    getActiveCategories(client),
    db.prepare('SELECT source,target FROM CmsRedirect WHERE enabled=1').all<{source:string;target:string}>(),
  ]);
  const aliases = new Map(redirects.results.map(r => [r.source,r.target]));
  const categoryPaths = allCategories.map(c => ({ ...c, href: c.href! }));
  // Normalize published link fields only; retain authored snapshots and unrelated content.
  const publicSections: SectionItem[] = JSON.parse(JSON.stringify(sections,(key,value) => {
    if (typeof value !== 'string' || !/^(href|.*[Ll]ink)$/.test(key) || !value.startsWith('/') || value.startsWith('//')) return value;
    const index = value.search(/[?#]/), path = index < 0 ? value : value.slice(0,index), suffix = index < 0 ? '' : value.slice(index);
    const target = canonicalCategoryPath(path, categoryPaths) || aliases.get(path) || path;
    return (canonicalCategoryPath(target, categoryPaths) || target.replace(/^\/product\//,'/san-pham/')) + suffix;
  }));
  const enabledSections = publicSections.filter((s) => s.enabled);
  // Fail-closed: evaluate pricing context with active campaigns, surfacing infrastructure errors
  const evaluatedAt = new Date();
  const [pricingContext, allBrands, allStudios] = await Promise.all([
    getStorefrontPricingContext(db, evaluatedAt),
    getActiveBrands(client).catch(() => []),
    client.productStudio.findMany({ select: { productId: true, published: true } }).catch(() => []),
  ]);

  const preloadedCatalogMeta = { categories: allCategories, studios: allStudios };

  const resolvedList = await Promise.all(
    enabledSections.map(async (sec) => {
      const resolvedSec: ResolvedSectionItem = { ...sec };
      const data = sec.data;

      if (data.type === 'product_grid') {
        const mainPromise =
          data.sourceMode === 'manual'
            ? resolveProductsByIds(data.manualProductIds, client, pricingContext, evaluatedAt)
            : resolveProductsByCriteria(data.ruleCriteria, client, pricingContext, evaluatedAt, preloadedCatalogMeta);

        const tabsPromise = data.tabs?.length
          ? resolveProductsByIds(
              [...new Set(data.tabs.flatMap((t) => t.productIds))],
              client,
              pricingContext,
              evaluatedAt
            )
          : Promise.resolve(null);

        const [prods, tabProducts] = await Promise.all([mainPromise, tabsPromise]);
        resolvedSec.resolvedProducts = prods;
        if (data.tabs?.length && tabProducts) {
          const byId = new Map(tabProducts.map((p) => [p.id, p]));
          resolvedSec.resolvedTabs = data.tabs.map((t) => ({
            ...t,
            products: t.productIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
          }));
        }
      } else if (data.type === 'news_reviews') {
        const effectiveLimit = data.postIds.length > 0 ? data.limit : Math.max(data.limit || 10, 10);
        const { items } = await publicPostList(db, {
          ids: data.postIds,
          categoryId: data.categoryId || undefined,
          limit: effectiveLimit,
        });
        if (data.postIds.length) items.sort((a, b) => data.postIds.indexOf(a.id) - data.postIds.indexOf(b.id));
        resolvedSec.resolvedPosts = items;
      } else if (data.type === 'featured_collection') {
        try {
          const col = await publicCollection(db, data.collectionId, pricingContext, evaluatedAt);
          resolvedSec.resolvedCollection = col;
        } catch {
          resolvedSec.resolvedCollection = undefined;
        }
      } else if (data.type === 'featured_categories') {
        if (data.categoryIds.length > 0) {
          resolvedSec.resolvedCategories = allCategories.filter((c) => data.categoryIds.includes(c.id));
        } else {
          resolvedSec.resolvedCategories = allCategories.filter((c) => !c.parentId).slice(0, 8);
        }
      } else if (data.type === 'featured_brands') {
        if (data.brandIds.length > 0) {
          resolvedSec.resolvedBrands = allBrands.filter((b) => data.brandIds.includes(b.id));
        } else {
          resolvedSec.resolvedBrands = allBrands.slice(0, 12);
        }
      }

      return resolvedSec;
    })
  );

  return resolvedList;
}

export async function getPublicHomepage(db: D1Database): Promise<ResolvedPublicPage | null> {
  const homeStudio = await db
    .prepare(`
      SELECT s.pageId, s.published, s.publishedAt, s.publicUpdatedAt, s.updatedAt, p.slug
      FROM LandingPage p
      JOIN LandingPageStudio s ON s.pageId = p.id
      WHERE p.isHome = 1 AND p.deletedAt IS NULL AND p.status = 'PUBLISHED' AND s.published IS NOT NULL
    `)
    .first<{ pageId: string; published: string; publishedAt: string; publicUpdatedAt: string; updatedAt: string; slug: string }>();

  if (!homeStudio || !homeStudio.published) {
    return null;
  }

  let doc: LandingPageDocument;
  try {
    doc = JSON.parse(homeStudio.published);
  } catch {
    return null;
  }

  const resolvedSections = await resolveSectionsForStorefront(db, doc.sections);

  return {
    id: homeStudio.pageId,
    slug: '',
    title: doc.title,
    isHome: true,
    seo: {
      title: doc.seo.title,
      description: doc.seo.description,
      ogImageUrl: doc.seo.ogImageAssetId ? getPublicMediaUrl(doc.seo.ogImageAssetId) : null,
    },
    sections: resolvedSections,
    publishedAt: homeStudio.publishedAt || homeStudio.updatedAt,
    updatedAt: homeStudio.publicUpdatedAt || homeStudio.updatedAt,
  };
}

export async function getPublicLandingPage(db: D1Database, slug: string): Promise<ResolvedPublicPage | null> {
  const pageRow = await db
    .prepare(`
      SELECT s.pageId, s.published, s.publishedAt, s.publicUpdatedAt, s.updatedAt, p.slug
      FROM LandingPage p
      JOIN LandingPageStudio s ON s.pageId = p.id
      WHERE p.slug = ? AND p.isHome = 0 AND p.deletedAt IS NULL AND p.status = 'PUBLISHED' AND s.published IS NOT NULL
    `)
    .bind(slug)
    .first<{ pageId: string; published: string; publishedAt: string; publicUpdatedAt: string; updatedAt: string; slug: string }>();

  if (!pageRow || !pageRow.published) {
    return null;
  }

  let doc: LandingPageDocument;
  try {
    doc = JSON.parse(pageRow.published);
  } catch {
    return null;
  }

  const resolvedSections = await resolveSectionsForStorefront(db, doc.sections);

  return {
    id: pageRow.pageId,
    slug: pageRow.slug,
    title: doc.title,
    isHome: false,
    seo: {
      title: doc.seo.title,
      description: doc.seo.description,
      ogImageUrl: doc.seo.ogImageAssetId ? getPublicMediaUrl(doc.seo.ogImageAssetId) : null,
    },
    sections: resolvedSections,
    publishedAt: pageRow.publishedAt || pageRow.updatedAt,
    updatedAt: pageRow.publicUpdatedAt || pageRow.updatedAt,
  };
}

export async function getPreviewLandingPage(
  db: D1Database,
  id: string,
  draftDocumentOverride?: LandingPageDocument
): Promise<ResolvedPublicPage> {
  let doc: LandingPageDocument;
  let isHome = false;
  let slug = '';

  if (draftDocumentOverride) {
    doc = draftDocumentOverride;
    isHome = id === 'home' || doc.slug === '';
    slug = doc.slug;
  } else {
    const detail = await getLandingPageDetail(db, id);
    doc = detail.document;
    isHome = detail.isHome;
    slug = detail.slug;
  }

  const resolvedSections = await resolveSectionsForStorefront(db, doc.sections);

  return {
    id,
    slug,
    title: doc.title,
    isHome,
    seo: {
      title: doc.seo.title,
      description: doc.seo.description,
      ogImageUrl: null,
    },
    sections: resolvedSections,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
