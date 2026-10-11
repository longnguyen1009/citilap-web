import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { mediaEditSchema, mediaQuerySchema, videoSchema, youtubeId, type MediaAssetDto, type MediaUsageDto } from '../../contracts/cms/media';
import { detectImageSignature, extractImageDimensions } from '../../infra/cloudflare/r2/storage';

export interface MediaEnvironment { DB: D1Database; PRODUCT_MEDIA: R2Bucket }
export class MediaError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
type Row = Omit<MediaAssetDto, 'url' | 'usageCount'> & { storageKey: string | null; externalId: string | null };
export const PAGE_SIZE = 24;
const fields = 'a.*,(SELECT count(*) FROM MediaUsage u WHERE u.assetId=a.id) AS usageCount';
function dto(row: Row & { usageCount: number }): MediaAssetDto {
  const { storageKey, externalId, ...rest } = row;
  const url = row.provider === 'YOUTUBE' ? `https://www.youtube.com/watch?v=${externalId}` :
    storageKey?.startsWith('library/') ? `/api/library/${encodeURIComponent(row.id)}` :
      storageKey && /^(products|brand)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/.test(storageKey) && !storageKey.includes('..')
        ? `/api/media/${storageKey}` : null;
  return { ...rest, url };
}
export async function getAsset(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM MediaAsset WHERE id=?').bind(id).first<Row>();
  if (!row) throw new MediaError('Không tìm thấy tệp.', 404);
  return row;
}
export async function listMedia(db: D1Database, input: unknown) {
  const query = mediaQuerySchema.parse(input);
  const where = "a.state=? AND (?='ALL' OR a.kind=?) AND (instr(lower(a.name),lower(?))>0 OR instr(lower(a.alt),lower(?))>0)";
  const args = [query.state, query.kind, query.kind, query.q, query.q];
  const count = await db.prepare(`SELECT count(*) AS total FROM MediaAsset a WHERE ${where}`).bind(...args).first<{ total: number }>();
  const total = count?.total || 0;
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = await db.prepare(`SELECT ${fields} FROM MediaAsset a WHERE ${where} ORDER BY a.createdAt DESC,a.id DESC LIMIT ? OFFSET ?`)
    .bind(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE).all<Row & { usageCount: number }>();
  return { items: rows.results.map(dto), total, page, pageSize: PAGE_SIZE };
}
export async function mediaDetail(db: D1Database, id: string) {
  const row = await getAsset(db, id);
  const usages = await db.prepare('SELECT ownerType,ownerId,slot FROM MediaUsage WHERE assetId=? ORDER BY ownerType,ownerId LIMIT 100').bind(id).all<MediaUsageDto>();
  const count = await db.prepare('SELECT count(*) AS n FROM MediaUsage WHERE assetId=?').bind(id).first<{ n: number }>();
  return { asset: dto({ ...row, usageCount: count?.n || 0 }), usages: usages.results };
}
export async function editMedia(db: D1Database, id: string, input: unknown) {
  const data = mediaEditSchema.parse(input);
  await getAsset(db, id);
  // Atomic compare-and-swap; DB trigger also protects simultaneous usage creation.
  try {
    const result = await db.prepare(`UPDATE MediaAsset SET name=?,alt=?,caption=?,state=?,revision=revision+1,updatedAt=?
      WHERE id=? AND revision=?`).bind(data.name, data.alt, data.caption, data.state, new Date().toISOString(), id, data.revision).run();
    if (!result.meta.changes) throw new MediaError('Tệp đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  } catch (error) {
    if (error instanceof Error && error.message.includes('MEDIA_IN_USE')) throw new MediaError('Tệp đang được sử dụng, không thể ẩn khỏi thư viện.', 409);
    throw error;
  }
  return mediaDetail(db, id);
}
export async function uploadLibraryImage(env: MediaEnvironment, file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new MediaError('Ảnh phải có dung lượng từ 1 byte đến 5 MB.', 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageSignature(buffer);
  if (!detected || (file.type && file.type !== detected.mime)) throw new MediaError('Chỉ nhận JPEG, PNG, WebP có nội dung và loại tệp khớp nhau.', 415);
  const dim = extractImageDimensions(buffer, detected.ext);
  if (dim && (dim.width < 1 || dim.height < 1 || dim.width * dim.height > 40_000_000)) throw new MediaError('Ảnh vượt quá 40 megapixel hoặc không hợp lệ.');
  const id = crypto.randomUUID();
  const key = `library/${id}.${detected.ext}`;
  const result = await env.PRODUCT_MEDIA.put(key, buffer, { httpMetadata: { contentType: detected.mime } });
  if (!result) throw new MediaError('Không thể tải ảnh lên bộ lưu trữ.', 503);
  try {
    await env.DB.prepare(`INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size,width,height)
      VALUES(?,'IMAGE','R2',?,?,?,?,?,?)`).bind(id, key, file.name.slice(0, 180) || 'Ảnh mới', detected.mime, file.size, dim?.width ?? null, dim?.height ?? null).run();
  } catch (error) {
    // R2/D1 cannot share a transaction. Compensate only our newly generated object.
    await env.PRODUCT_MEDIA.delete(key).catch(() => console.error('Media cleanup pending', id));
    throw error;
  }
  return mediaDetail(env.DB, id);
}
export async function addVideo(db: D1Database, input: unknown) {
  const data = videoSchema.parse(input);
  const externalId = youtubeId(data.url);
  if (!externalId) throw new MediaError('Nhập liên kết HTTPS YouTube hợp lệ.');
  const id = crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO MediaAsset(id,kind,provider,externalId,name) VALUES(?,'VIDEO','YOUTUBE',?,?)").bind(id, externalId, data.name).run();
  const row = await db.prepare("SELECT id FROM MediaAsset WHERE provider='YOUTUBE' AND externalId=?").bind(externalId).first<{ id: string }>();
  return mediaDetail(db, row!.id);
}
export async function serveLibraryImage(env: MediaEnvironment, id: string, request: Request) {
  const row = await getAsset(env.DB, id);
  // Archiving is library organization, not revocation; existing public links remain valid.
  if (row.provider !== 'R2' || !row.storageKey?.startsWith('library/')) throw new MediaError('Không tìm thấy ảnh.', 404);
  const object = await env.PRODUCT_MEDIA.get(row.storageKey);
  if (!object) throw new MediaError('Không tìm thấy ảnh trong bộ lưu trữ.', 404);
  const headers = { 'Content-Type': row.mimeType || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600', ETag: object.httpEtag };
  if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body as unknown as ReadableStream, { headers });
}

export async function attachProductImage(env: MediaEnvironment, assetId: string, productId: string) {
  const asset = await getAsset(env.DB, assetId);
  if (asset.state !== 'READY' || asset.kind !== 'IMAGE' || !asset.storageKey || !dto({ ...asset, usageCount: 0 }).url) throw new MediaError('Ảnh chưa sẵn sàng để sử dụng.');
  if (!await env.PRODUCT_MEDIA.head(asset.storageKey)) throw new MediaError('File ảnh chưa tồn tại trong R2.', 404);
  if (!await env.DB.prepare('SELECT id FROM Product WHERE id=?').bind(productId).first()) throw new MediaError('Không tìm thấy sản phẩm.', 404);
  const imageId = `library-${productId}-${assetId}`;
  // Trigger enforces usage tracking and unarchives under concurrent attachment.
  await env.DB.prepare(`INSERT OR IGNORE INTO ProductImage(id,productId,r2Key,url,mimeType,size,width,height,alt,sortOrder,isPrimary)
    SELECT ?,?,?,?,?,?,?,?,?,coalesce((SELECT max(sortOrder)+1 FROM ProductImage WHERE productId=?),0),
      CASE WHEN EXISTS(SELECT 1 FROM ProductImage WHERE productId=?) THEN 0 ELSE 1 END
    FROM MediaAsset WHERE id=? AND state='READY'`).bind(imageId, productId, asset.storageKey, dto({ ...asset, usageCount: 0 }).url,
      asset.mimeType, asset.size, asset.width, asset.height, asset.alt, productId, productId, assetId).run();
  if (!await env.DB.prepare('SELECT id FROM ProductImage WHERE id=?').bind(imageId).first()) throw new MediaError('Ảnh vừa bị ẩn. Tải lại thư viện.', 409);
  return mediaDetail(env.DB, assetId);
}
