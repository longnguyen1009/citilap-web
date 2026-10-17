import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import { blankPost, postStudioWriteSchema, postCategoryWriteSchema, RESERVED_SLUGS, type PostDocument } from '../../contracts/cms/post';
import { sanitizeHtml } from '../../lib/sanitize-html';
import { MediaError, mediaDetail, type MediaEnvironment } from './media-library.service';

import { contentAssets } from './content-media.service';

type Studio = { postId: string; revision: number; draft: string; published: string | null };

export interface PostListOptions {
  q?: string;
  categoryId?: string;
  status?: 'ALL' | 'PUBLISHED' | 'DRAFT';
  page?: number;
  limit?: number;
  sort?: 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  revision: number;
  isPublished: boolean;
  hasUnpublishedDraft: boolean;
  category: { id: string; name: string } | null;
  isFeatured: boolean;
  updatedAt: string;
}

/**
 * Server-paginated post list for /admin/posts.
 * Mirrors catalogList's filter/pagination shape from product-studio.service.ts.
 */
export async function postList(db: D1Database, opts: PostListOptions = {}): Promise<{
  items: PostListItem[]; total: number; page: number; limit: number; totalPages: number;
  categories: { id: string; name: string }[];
}> {
  const page = Math.max(1, Math.floor(Number(opts.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(opts.limit) || 20)));
  const offset = (page - 1) * limit;
  const q = String(opts.q || '').trim().slice(0, 200);
  const categoryId = String(opts.categoryId || '').trim();
  const status = String(opts.status || 'ALL').toUpperCase();

  const whereClauses: string[] = ['p.deletedAt IS NULL'];
  const params: (string | number)[] = [];

  if (q) {
    whereClauses.push(`(
      instr(lower(COALESCE(json_extract(s.draft, '$.title'), '')), lower(?)) > 0
      OR instr(lower(p.slug), lower(?)) > 0
      OR p.id = ?
    )`);
    params.push(q, q, q);
  }
  if (categoryId) {
    whereClauses.push("json_extract(s.draft, '$.categoryId') = ?");
    params.push(categoryId);
  }
  if (status === 'PUBLISHED') {
    whereClauses.push('s.published IS NOT NULL');
  } else if (status === 'DRAFT') {
    whereClauses.push('s.published IS NULL');
  }

  const whereSql = whereClauses.join(' AND ');
  const sortCol = opts.sort === 'title' ? "json_extract(s.draft, '$.title')" : 'p.updatedAt';
  const sortOrder = opts.order === 'asc' ? 'ASC' : 'DESC';
  const orderSql = `ORDER BY ${sortCol} ${sortOrder}, p.id DESC`;

  const countSql = `SELECT count(*) AS total FROM Post p LEFT JOIN PostStudio s ON s.postId = p.id WHERE ${whereSql}`;
  const countRow = await (params.length ? db.prepare(countSql).bind(...params) : db.prepare(countSql)).first<{ total: number }>();
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const itemsSql = `
    SELECT
      p.id, p.slug, p.updatedAt, p.categoryId,
      c.name AS categoryName,
      s.revision, s.draft, s.published,
      json_extract(s.draft, '$.title') AS draftTitle,
      json_extract(s.draft, '$.isFeatured') AS draftIsFeatured
    FROM Post p
    LEFT JOIN PostStudio s ON s.postId = p.id
    LEFT JOIN PostCategory c ON c.id = p.categoryId
    WHERE ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `;
  const itemsRows = await db.prepare(itemsSql).bind(...params, limit, offset).all<Record<string, unknown>>();
  const categoriesRes = await db.prepare("SELECT id, name FROM PostCategory WHERE status='ACTIVE' ORDER BY sortOrder, name").all<{ id: string; name: string }>();

  const items: PostListItem[] = (itemsRows.results || []).map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.draftTitle || '(Chưa có tiêu đề)'),
    revision: Number(r.revision ?? 0),
    isPublished: !!r.published,
    hasUnpublishedDraft: !!r.published && !!r.draft && r.draft !== r.published,
    category: r.categoryId ? { id: String(r.categoryId), name: String(r.categoryName || '') } : null,
    isFeatured: !!r.draftIsFeatured,
    updatedAt: String(r.updatedAt),
  }));

  return { items, total, page, limit, totalPages, categories: categoriesRes.results || [] };
}

/**
 * Retrieves editorial detail for a post. GET never mutates the database.
 */
export async function postDetail(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM PostStudio WHERE postId=?').bind(id).first<Studio>();
  if (!row) throw new MediaError('Không tìm thấy bài viết.', 404);
  return { id, revision: row.revision, document: JSON.parse(row.draft) as PostDocument, published: !!row.published };
}

async function assertSlugAvailable(db: D1Database, slug: string, excludePostId: string | null) {
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    throw new MediaError('Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.', 400);
  }
  const existing = await db.prepare(`
    SELECT p.id FROM Post p LEFT JOIN PostStudio s ON s.postId = p.id
    WHERE (p.slug=? OR json_extract(s.published, '$.slug')=?) AND p.deletedAt IS NULL
  `).bind(slug, slug).first<{ id: string }>();
  if (existing && existing.id !== excludePostId) {
    throw new MediaError('Đường dẫn (slug) này đã được dùng cho bài viết khác.', 409);
  }
}

/**
 * Standardized single authoring writer for Post, mirroring writeStudio's revision/
 * concurrency/publish-atomicity invariants from product-studio.service.ts.
 */
export async function writePost(env: MediaEnvironment, id: string | null, input: unknown) {
  const { expectedRevision, action, document: d } = postStudioWriteSchema.parse(input);
  d.contentHtml = sanitizeHtml(d.contentHtml || '');
  const db = env.DB;

  if (d.categoryId && action === 'publish') {
    if (!await db.prepare("SELECT id FROM PostCategory WHERE id=? AND status='ACTIVE'").bind(d.categoryId).first()) {
      throw new MediaError('Chuyên mục không tồn tại hoặc đã ẩn.');
    }
  }


  const existing = id ? await postDetail(db, id).catch((e) => { if (e instanceof MediaError && e.status === 404) return null; throw e; }) : null;
  if (id && !existing) throw new MediaError('Không tìm thấy nội dung.', 404);
  await assertSlugAvailable(db, d.slug, id);
  if ((existing?.revision ?? 0) !== expectedRevision) {
    throw new MediaError('Bài viết đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  }

  const postId = id || crypto.randomUUID();
  const assetIds = action === 'unpublish' ? new Set<string>() : await contentAssets(env, d.contentHtml, [d.coverImage?.assetId, d.seo.ogImageAssetId], action === 'publish');
  if (action === 'publish') {
    if (!d.coverImage) throw new MediaError('Cần có ảnh đại diện trước khi xuất bản.');
    if (!d.contentHtml.trim()) throw new MediaError('Cần có nội dung trước khi xuất bản.');
  }

  const version = expectedRevision + 1;
  const snapshot = JSON.stringify(d);
  const statements = [];

  if (!id) {
    statements.push(db.prepare('INSERT INTO Post(id,slug,categoryId) VALUES(?,?,?)').bind(postId, d.slug, d.categoryId));
  } else if (action === 'publish' || !existing?.published) {
    statements.push(db.prepare('UPDATE Post SET slug=?,categoryId=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?').bind(d.slug, d.categoryId, postId));
  } else {
    statements.push(db.prepare('UPDATE Post SET updatedAt=CURRENT_TIMESTAMP WHERE id=?').bind(postId));
  }

  statements.push(db.prepare('INSERT INTO PostStudio(postId,draft,published) VALUES(?,?,?) ON CONFLICT(postId) DO NOTHING').bind(
    postId, snapshot, action === 'publish' ? snapshot : null
  ));
  statements.push(db.prepare('INSERT INTO PostStudioRevision(postId,revision,document,action,actor) VALUES(?,?,?,?,?)').bind(postId, version, snapshot, action, adminActor()));

  statements.push(db.prepare(`
    UPDATE PostStudio
    SET draft = ?,
        revision = ?,
        published = CASE
          WHEN ? = 'publish' THEN ?
          WHEN ? = 'unpublish' THEN NULL
          ELSE published
        END,
        publishedRevision = CASE WHEN ? = 'publish' THEN ? WHEN ? = 'unpublish' THEN NULL ELSE publishedRevision END,
        publishedAt = CASE WHEN ? = 'publish' THEN COALESCE(publishedAt, CURRENT_TIMESTAMP) ELSE publishedAt END,
        publicUpdatedAt = CASE WHEN ? = 'publish' THEN CURRENT_TIMESTAMP ELSE publicUpdatedAt END,
        updatedAt = CURRENT_TIMESTAMP
    WHERE postId = ?
  `).bind(snapshot, version, action, snapshot, action, action, version, action, action, action, postId));

  for (const assetId of assetIds) {
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'POST_REVISION',?,?)").bind(crypto.randomUUID(), assetId, postId, `${version}:${assetId}`));
  }

  try {
    await db.batch([...statements, ...adminAuditStatements(db, 'post.' + action, postId, 'CMS mutation')]);
  } catch (e) {
    if (e instanceof Error && /POST_STUDIO_CONFLICT|UNIQUE constraint/.test(e.message)) {
      throw new MediaError('Xung đột phiên bản hoặc đường dẫn trùng. Tải lại và kiểm tra dữ liệu.', 409);
    }
    throw e;
  }

  return postDetail(db, postId);
}

/**
 * Archives a post (hidden, not deleted). Keeps revision history intact.
 */
export async function archivePost(env: MediaEnvironment, id: string, expectedRevision: number) {
  const detail = await postDetail(env.DB, id);
  return writePost(env, id, { expectedRevision, action: 'unpublish', document: detail.document });
}
export const unpublishPost = archivePost;

export async function listPostRevisions(db: D1Database, postId: string) {
  const studio = await db.prepare('SELECT revision, published, publishedRevision FROM PostStudio WHERE postId=?').bind(postId).first<{ revision: number; published: string | null; publishedRevision: number | null }>();
  const revs = await db.prepare(`
    SELECT revision, action, actor, createdAt, document
    FROM PostStudioRevision WHERE postId=? ORDER BY revision DESC
  `).bind(postId).all<{ revision: number; action: string; actor: string; createdAt: string; document: string }>();

  const currentRevision = studio?.revision ?? 0;
  const isPublished = !!studio?.published;

  const revisions = (revs.results || []).map((r) => {
    let summary = '';
    try { summary = JSON.parse(r.document).title || 'Bài viết'; } catch { summary = 'Bản ghi revision'; }
    return {
      revision: r.revision,
      action: r.action,
      actor: r.actor,
      createdAt: r.createdAt,
      summary,
      isCurrent: r.revision === currentRevision,
      isPublished: isPublished && r.revision === studio?.publishedRevision,
    };
  });

  return { postId, currentRevision, isPublished, revisions };
}

export async function getPostRevisionSnapshot(db: D1Database, postId: string, revision: number) {
  const rev = await db.prepare('SELECT revision, document FROM PostStudioRevision WHERE postId=? AND revision=?').bind(postId, revision).first<{ revision: number; document: string }>();
  if (!rev) throw new MediaError('Không tìm thấy phiên bản yêu cầu.', 404);
  return { postId, revision: rev.revision, document: JSON.parse(rev.document) as PostDocument };
}

/**
 * Restores a past revision as a new draft revision.
 * INVARIANT: Does NOT overwrite the public published snapshot.
 */
export async function restorePostRevision(env: MediaEnvironment, postId: string, targetRevision: number, expectedRevision: number) {
  const snapshot = await getPostRevisionSnapshot(env.DB, postId, targetRevision);
  const writeResult = await writePost(env, postId, { expectedRevision, action: 'restore', document: snapshot.document });
  return {
    success: true,
    message: `Đã khôi phục phiên bản #${targetRevision} thành bản nháp mới (rev #${writeResult.revision}). Website chưa thay đổi cho đến khi xuất bản.`,
    restoredFromRevision: targetRevision,
    newRevision: writeResult.revision,
    document: snapshot.document,
  };
}

/**
 * Public DTO resolver: resolves strictly the published snapshot. Drafts never leave this boundary.
 */
export async function publicPostBySlug(db: D1Database, slug: string) {
  let row = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Post p JOIN PostStudio s ON s.postId = p.id
    WHERE json_extract(s.published, '$.slug')=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
  `).bind(slug).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();

  if (!row) {
    const alias = await db.prepare(`
      SELECT r.postId FROM PostStudioRevision r
      JOIN Post p ON p.id = r.postId
      JOIN PostStudio s ON s.postId = p.id
      WHERE r.action='publish' AND json_extract(r.document, '$.slug')=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
      ORDER BY r.revision DESC LIMIT 1
    `).bind(slug).first<{ postId: string }>();
    if (alias) {
      row = await db.prepare(`
        SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
        FROM Post p JOIN PostStudio s ON s.postId = p.id
        WHERE p.id=? AND p.deletedAt IS NULL AND s.published IS NOT NULL
      `).bind(alias.postId).first<{ id: string; published: string; updatedAt: string; publishedAt: string }>();
    }
  }

  if (!row) throw new MediaError('Không tìm thấy bài viết đã xuất bản.', 404);
  return toPublicPost(db, row.id, row.published, row.updatedAt, row.publishedAt);
}

export async function publicPostList(db: D1Database, opts: { categoryId?: string; page?: number; limit?: number } = {}) {
  const page = Math.max(1, Math.floor(Number(opts.page) || 1));
  const limit = Math.min(50, Math.max(1, Math.floor(Number(opts.limit) || 12)));
  const offset = (page - 1) * limit;
  const whereClauses = ['p.deletedAt IS NULL', 's.published IS NOT NULL'];
  const params: string[] = [];
  if (opts.categoryId) {
    whereClauses.push("json_extract(s.published, '$.categoryId') = ?");
    params.push(opts.categoryId);
  }
  const whereSql = whereClauses.join(' AND ');

  const countRow = await db.prepare(`SELECT count(*) AS total FROM Post p JOIN PostStudio s ON s.postId=p.id WHERE ${whereSql}`).bind(...params).first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const rows = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Post p JOIN PostStudio s ON s.postId = p.id
    WHERE ${whereSql}
    ORDER BY s.publicUpdatedAt DESC, p.id DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all<{ id: string; published: string; updatedAt: string; publishedAt: string }>();

  const items = [];
  for (const r of rows.results || []) {
    items.push(await toPublicPost(db, r.id, r.published, r.updatedAt, r.publishedAt));
  }
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function publicFeaturedPosts(db: D1Database, limit = 3) {
  const rows = await db.prepare(`
    SELECT p.id, s.published, s.publicUpdatedAt AS updatedAt, s.publishedAt
    FROM Post p JOIN PostStudio s ON s.postId = p.id
    WHERE p.deletedAt IS NULL AND s.published IS NOT NULL AND json_extract(s.published, '$.isFeatured') = 1
    ORDER BY s.publicUpdatedAt DESC, p.id DESC
    LIMIT ?
  `).bind(limit).all<{ id: string; published: string; updatedAt: string; publishedAt: string }>();
  const items = [];
  for (const r of rows.results || []) items.push(await toPublicPost(db, r.id, r.published, r.updatedAt, r.publishedAt));
  return items;
}

async function toPublicPost(db: D1Database, id: string, publishedJson: string, updatedAt: string, publishedAt: string) {
  const d = JSON.parse(publishedJson) as PostDocument;
  let coverImage: { url: string; alt: string } | null = null;
  if (d.coverImage) {
    const { asset } = await mediaDetail(db, d.coverImage.assetId);
    if (asset.url) coverImage = { url: asset.url, alt: d.coverImage.alt };
  }
  let ogImageUrl: string | null = null;
  if (d.seo.ogImageAssetId) {
    const { asset } = await mediaDetail(db, d.seo.ogImageAssetId);
    ogImageUrl = asset.url;
  } else if (coverImage) {
    ogImageUrl = coverImage.url;
  }

  let category: { id: string; name: string; slug: string } | null = null;
  if (d.categoryId) {
    const c = await db.prepare("SELECT id, name, slug FROM PostCategory WHERE id=? AND status='ACTIVE'").bind(d.categoryId).first<{ id: string; name: string; slug: string }>();
    if (c) category = c;
  }

  // Published-only product resolution happens in the storefront page (via the catalog
  // adapter), not here — this service only persists the ordered id list.
  return {
    id,
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    contentHtml: d.contentHtml,
    authorName: d.authorName,
    isFeatured: d.isFeatured,
    category,
    coverImage,
    seo: { title: d.seo.title || d.title, description: d.seo.description || d.excerpt, ogImageUrl },
    relatedProductIds: await publicRelatedIds(db, d.relatedProductIds),
    publishedAt,
    updatedAt,
  };
}

// --- Post categories (distinct from product Category) ---

export async function listPostCategories(db: D1Database, status: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL') {
  const where = status === 'ALL' ? '1=1' : 'status = ?';
  const params = status === 'ALL' ? [] : [status];
  const rows = await db.prepare(`
    SELECT c.*, (SELECT count(*) FROM Post p WHERE p.categoryId = c.id AND p.deletedAt IS NULL) AS postCount
    FROM PostCategory c WHERE ${where} ORDER BY sortOrder, name
  `).bind(...params).all<{ id: string; name: string; slug: string; sortOrder: number; status: string; postCount: number }>();
  return rows.results || [];
}

export async function writePostCategory(db: D1Database, id: string | null, input: unknown) {
  const { document: d, expectedRevision } = postCategoryWriteSchema.parse(input);
  if (!id && expectedRevision !== 0) throw new MediaError('Xung đột phiên bản.', 409);
  const existing = await db.prepare('SELECT id FROM PostCategory WHERE slug=?').bind(d.slug).first<{ id: string }>();
  if (existing && existing.id !== id) throw new MediaError('Đường dẫn (slug) chuyên mục đã được dùng.', 409);

  const categoryId = id || crypto.randomUUID();
  if (!id) {
    await db.prepare('INSERT INTO PostCategory(id,name,slug,sortOrder,status) VALUES(?,?,?,?,?)').bind(categoryId, d.name, d.slug, d.sortOrder, d.status).run();
  } else {
    const result = await db.prepare('UPDATE PostCategory SET name=?,slug=?,sortOrder=?,status=?,revision=revision+1,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND revision=?').bind(d.name, d.slug, d.sortOrder, d.status, categoryId, expectedRevision).run();
    if (!result.meta.changes) throw new MediaError('Chuyên mục không tồn tại hoặc đã thay đổi.', 409);
  }
  return { id: categoryId, ...d, revision: expectedRevision + 1 };
}

export async function deletePostCategory(db: D1Database, id: string) {
  const inUse = await db.prepare("SELECT count(*) AS cnt FROM PostStudioRevision WHERE json_extract(document, '$.categoryId')=?").bind(id).first<{ cnt: number }>();
  if ((inUse?.cnt ?? 0) > 0) {
    throw new MediaError(`Không thể xóa, còn ${inUse!.cnt} bài viết thuộc chuyên mục này. Hãy chuyển sang Ẩn.`, 400);
  }
  await db.prepare('DELETE FROM PostCategory WHERE id=?').bind(id).run();
  return { success: true };
}

export { blankPost };

async function publicRelatedIds(db: D1Database, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.prepare(`SELECT p.id FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.id IN (${ids.map(() => '?').join(',')}) AND p.status='ACTIVE' AND p.deletedAt IS NULL AND (s.productId IS NULL OR s.published IS NOT NULL)`).bind(...ids).all<{id:string}>();
  const allowed = new Set(rows.results.map(r => r.id));
  return ids.filter(id => allowed.has(id));
}
