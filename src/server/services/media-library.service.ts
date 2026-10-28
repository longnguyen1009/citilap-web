import { adminAuditStatements } from '../admin-context';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import {
  googleDriveFileId,
  mediaEditSchema,
  mediaQuerySchema,
  tiktokVideoId,
  videoSchema,
  youtubeId,
  type MediaAssetDto,
  type MediaAssetType,
  type MediaFilterKind,
  type MediaUsageDto,
} from '../../contracts/cms/media';
import { detectImageSignature, extractImageDimensions } from '../../infra/cloudflare/r2/storage';

export interface MediaEnvironment { DB: D1Database; PRODUCT_MEDIA: R2Bucket }
export class MediaError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
type Row = Omit<MediaAssetDto, 'url' | 'usageCount' | 'assetType' | 'embedUrl' | 'thumbnailUrl'> & {
  storageKey: string | null;
  externalId: string | null;
};
export const PAGE_SIZE = 24;
const fields = 'a.*,(SELECT count(*) FROM MediaUsage u WHERE u.assetId=a.id) AS usageCount';

function resolveMediaPresentation(row: Row): {
  assetType: MediaAssetType;
  url: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
} {
  const { storageKey, externalId, mimeType, provider, kind } = row;
  const libraryUrl = storageKey?.startsWith('library/')
    ? `/api/library/${encodeURIComponent(row.id)}`
    : storageKey && /^(products|brand)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg)$/.test(storageKey) && !storageKey.includes('..')
      ? `/api/media/${storageKey}`
      : null;

  if (provider === 'YOUTUBE' && externalId) {
    return {
      assetType: 'YOUTUBE',
      url: `https://www.youtube.com/watch?v=${externalId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${externalId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${externalId}/hqdefault.jpg`,
    };
  }

  if (mimeType === 'video/tiktok' || externalId?.startsWith('tiktok:')) {
    const vid = externalId?.replace(/^tiktok:/, '') || '';
    return {
      assetType: 'TIKTOK',
      url: vid ? `https://www.tiktok.com/@tiktok/video/${vid}` : null,
      embedUrl: vid ? `https://www.tiktok.com/player/v1/${vid}` : null,
      thumbnailUrl: null,
    };
  }

  if (externalId?.startsWith('gdrive:')) {
    const fileId = externalId.slice('gdrive:'.length);
    const isPdf = mimeType === 'application/pdf';
    return {
      assetType: isPdf ? 'PDF' : 'GDRIVE',
      url: `https://drive.google.com/file/d/${fileId}/view`,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileId}=w640`,
    };
  }

  if (mimeType === 'application/pdf') {
    const pdfUrl = libraryUrl || (externalId?.startsWith('https://') ? externalId : null);
    return {
      assetType: 'PDF',
      url: pdfUrl,
      embedUrl: pdfUrl,
      thumbnailUrl: null,
    };
  }

  if (mimeType === 'image/svg+xml') {
    const svgUrl = libraryUrl || (externalId?.startsWith('https://') ? externalId : null);
    return {
      assetType: 'SVG',
      url: svgUrl,
      embedUrl: null,
      thumbnailUrl: svgUrl,
    };
  }

  if (kind === 'VIDEO') {
    return {
      assetType: 'VIDEO_FILE',
      url: libraryUrl,
      embedUrl: libraryUrl,
      thumbnailUrl: null,
    };
  }

  const imageUrl = libraryUrl || (externalId?.startsWith('https://') ? externalId : null);
  return {
    assetType: 'IMAGE',
    url: imageUrl,
    embedUrl: null,
    thumbnailUrl: imageUrl,
  };
}

function dto(row: Row & { usageCount: number }): MediaAssetDto {
  const { storageKey, externalId, ...rest } = row;
  void storageKey;
  void externalId;
  const presentation = resolveMediaPresentation(row);
  return { ...rest, ...presentation };
}

function buildKindFilterSql(kind: MediaFilterKind): { clause: string; bindings: string[] } {
  switch (kind) {
    case 'ALL':
      return { clause: '1=1', bindings: [] };
    case 'IMAGE':
      return { clause: "a.kind='IMAGE' AND coalesce(a.mimeType,'') != 'application/pdf'", bindings: [] };
    case 'SVG':
      return { clause: "a.mimeType='image/svg+xml'", bindings: [] };
    case 'VIDEO':
      return { clause: "a.kind='VIDEO'", bindings: [] };
    case 'YOUTUBE':
      return { clause: "a.provider='YOUTUBE'", bindings: [] };
    case 'TIKTOK':
      return { clause: "a.mimeType='video/tiktok'", bindings: [] };
    case 'GDRIVE':
      return { clause: "a.externalId LIKE 'gdrive:%'", bindings: [] };
    case 'PDF':
      return { clause: "a.mimeType='application/pdf'", bindings: [] };
  }
}

export async function getAsset(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM MediaAsset WHERE id=?').bind(id).first<Row>();
  if (!row) throw new MediaError('Không tìm thấy tệp.', 404);
  return row;
}
export async function listMedia(db: D1Database, input: unknown) {
  const query = mediaQuerySchema.parse(input);
  const kindFilter = buildKindFilterSql(query.kind);
  const where = `a.state=? AND (${kindFilter.clause}) AND (instr(lower(a.name),lower(?))>0 OR instr(lower(a.alt),lower(?))>0)`;
  const args = [query.state, ...kindFilter.bindings, query.q, query.q];
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
    const [result] = await db.batch([db.prepare(`UPDATE MediaAsset SET name=?,alt=?,caption=?,state=?,revision=revision+1,updatedAt=?
      WHERE id=? AND revision=?`).bind(data.name, data.alt, data.caption, data.state, new Date().toISOString(), id, data.revision), ...adminAuditStatements(db, 'media.update', id, 'Media metadata updated', null, 'order', { changed: true, before: data.revision, after: data.revision + 1 })]);
    if (!result.meta.changes) throw new MediaError('Tệp đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  } catch (error) {
    if (error instanceof Error && error.message.includes('MEDIA_IN_USE')) throw new MediaError('Tệp đang được sử dụng, không thể ẩn khỏi thư viện.', 409);
    throw error;
  }
  return mediaDetail(db, id);
}

function sanitizeSvgBuffer(buffer: Buffer): { sanitized: Buffer<ArrayBuffer>; width: number | null; height: number | null } {
  const raw = buffer.toString('utf8');
  if (!/<svg[\s>]/i.test(raw) || !/<\/svg\s*>/i.test(raw)) {
    throw new MediaError('Tệp SVG không hợp lệ.', 415);
  }
  const cleaned = raw
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!ENTITY[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script[^>]*\/?>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<object[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript|data:text\/html)[^"]*"|'\s*(?:javascript|data:text\/html)[^']*')/gi, '');

  const svgTag = /<svg\b[^>]*>/i.exec(cleaned)?.[0] || '';
  const wMatch = /\bwidth\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/i.exec(svgTag);
  const hMatch = /\bheight\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/i.exec(svgTag);
  const vbMatch = /\bviewBox\s*=\s*["']\s*-?\d+(?:\.\d+)?[\s,]+\s*-?\d+(?:\.\d+)?[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)\s*["']/i.exec(svgTag);
  const width = wMatch ? Math.round(Number(wMatch[1])) : vbMatch ? Math.round(Number(vbMatch[1])) : null;
  const height = hMatch ? Math.round(Number(hMatch[1])) : vbMatch ? Math.round(Number(vbMatch[2])) : null;
  return {
    sanitized: Buffer.from(cleaned, 'utf8'),
    width: width && width > 0 ? width : null,
    height: height && height > 0 ? height : null,
  };
}

function detectVideoSignature(buffer: Buffer, mimeType: string): { mime: string; ext: string } | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    if (mimeType === 'video/quicktime') return { mime: 'video/quicktime', ext: 'mov' };
    if (mimeType === 'video/mp4') return { mime: 'video/mp4', ext: 'mp4' };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3 &&
    mimeType === 'video/webm'
  ) {
    return { mime: 'video/webm', ext: 'webm' };
  }
  return null;
}

export async function uploadLibraryImage(env: MediaEnvironment, file: File) {
  if (!file.size) throw new MediaError('Tệp tải lên không được rỗng.', 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();

  let kind: 'IMAGE' | 'VIDEO' = 'IMAGE';
  let key = '';
  let mime = '';
  let uploadBuffer = buffer;
  let width: number | null = null;
  let height: number | null = null;

  if (file.type === 'image/svg+xml') {
    if (file.size > 2 * 1024 * 1024) throw new MediaError('Ảnh SVG tối đa 2 MB.', 413);
    const svg = sanitizeSvgBuffer(buffer);
    uploadBuffer = svg.sanitized;
    width = svg.width;
    height = svg.height;
    mime = 'image/svg+xml';
    key = `library/${id}.svg`;
  } else if (file.type === 'application/pdf') {
    if (file.size > 20 * 1024 * 1024) throw new MediaError('Tệp PDF tối đa 20 MB.', 413);
    const isPdf =
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d;
    if (!isPdf) throw new MediaError('Chỉ nhận tệp PDF hợp lệ.', 415);
    mime = 'application/pdf';
    key = `library/${id}.pdf`;
  } else if (['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
    if (file.size > 50 * 1024 * 1024) throw new MediaError('Video tải lên tối đa 50 MB.', 413);
    const detectedVideo = detectVideoSignature(buffer, file.type);
    if (!detectedVideo) throw new MediaError('Chỉ nhận video MP4, WebM, MOV có nội dung hợp lệ.', 415);
    kind = 'VIDEO';
    mime = detectedVideo.mime;
    key = `library/${id}.${detectedVideo.ext}`;
  } else {
    if (file.size > 5 * 1024 * 1024) throw new MediaError('Ảnh phải có dung lượng từ 1 byte đến 5 MB.', 413);
    const detected = detectImageSignature(buffer);
    if (!detected || (file.type && file.type !== detected.mime)) {
      throw new MediaError('Chỉ nhận JPEG, PNG, WebP, SVG, Video (MP4/WebM/MOV) hoặc PDF hợp lệ.', 415);
    }
    const dim = extractImageDimensions(buffer, detected.ext);
    if (dim && (dim.width < 1 || dim.height < 1 || dim.width * dim.height > 40_000_000)) {
      throw new MediaError('Ảnh vượt quá 40 megapixel hoặc không hợp lệ.');
    }
    width = dim?.width ?? null;
    height = dim?.height ?? null;
    mime = detected.mime;
    key = `library/${id}.${detected.ext}`;
  }

  const result = await env.PRODUCT_MEDIA.put(key, uploadBuffer, { httpMetadata: { contentType: mime } });
  if (!result) throw new MediaError('Không thể tải tệp lên bộ lưu trữ.', 503);
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size,width,height)
      VALUES(?,?,'R2',?,?,?,?,?,?)`).bind(
        id,
        kind,
        key,
        file.name.slice(0, 180) || 'Tệp mới',
        mime,
        uploadBuffer.length,
        width,
        height,
      ),
      ...adminAuditStatements(env.DB, 'media.upload', id, 'Media uploaded'),
    ]);
  } catch (error) {
    // R2/D1 cannot share a transaction. Compensate only our newly generated object.
    await env.PRODUCT_MEDIA.delete(key).catch(() => console.error('Media cleanup pending', id));
    throw error;
  }
  return mediaDetail(env.DB, id);
}

function isSafeHttpsUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port;
  } catch {
    return false;
  }
}

export async function addVideo(db: D1Database, input: unknown) {
  const data = videoSchema.parse(input);
  const mediaKind = data.mediaKind || 'AUTO';

  let kind: 'IMAGE' | 'VIDEO' = 'VIDEO';
  let provider: 'YOUTUBE' | 'LEGACY' = 'YOUTUBE';
  let externalId: string | null = null;
  let mimeType: string | null = null;

  const yt = (mediaKind === 'AUTO' || mediaKind === 'YOUTUBE') ? youtubeId(data.url) : null;
  const tt = (mediaKind === 'AUTO' || mediaKind === 'TIKTOK') ? tiktokVideoId(data.url) : null;
  const gd = (mediaKind === 'AUTO' || mediaKind.startsWith('GDRIVE')) ? googleDriveFileId(data.url) : null;

  if (yt) {
    kind = 'VIDEO';
    provider = 'YOUTUBE';
    externalId = yt;
    mimeType = 'video/youtube';
  } else if (tt) {
    kind = 'VIDEO';
    provider = 'LEGACY';
    externalId = `tiktok:${tt}`;
    mimeType = 'video/tiktok';
  } else if (gd) {
    provider = 'LEGACY';
    externalId = `gdrive:${gd}`;
    if (mediaKind === 'GDRIVE_VIDEO') {
      kind = 'VIDEO';
      mimeType = 'video/gdrive';
    } else if (mediaKind === 'GDRIVE_PDF') {
      kind = 'IMAGE';
      mimeType = 'application/pdf';
    } else {
      kind = 'IMAGE';
      mimeType = 'image/gdrive';
    }
  } else if (
    isSafeHttpsUrl(data.url) &&
    (mediaKind === 'PDF_URL' || (mediaKind === 'AUTO' && /\.pdf(?:$|\?)/i.test(data.url)))
  ) {
    kind = 'IMAGE';
    provider = 'LEGACY';
    externalId = data.url;
    mimeType = 'application/pdf';
  } else if (
    isSafeHttpsUrl(data.url) &&
    (mediaKind === 'SVG_URL' || (mediaKind === 'AUTO' && /\.svg(?:$|\?)/i.test(data.url)))
  ) {
    kind = 'IMAGE';
    provider = 'LEGACY';
    externalId = data.url;
    mimeType = 'image/svg+xml';
  } else {
    throw new MediaError('Nhập liên kết HTTPS hợp lệ (YouTube, TikTok, Google Drive, PDF hoặc SVG).');
  }

  const id = crypto.randomUUID();
  await db.batch([
    db.prepare(
      'INSERT OR IGNORE INTO MediaAsset(id,kind,provider,externalId,name,mimeType) VALUES(?,?,?,?,?,?)',
    ).bind(id, kind, provider, externalId, data.name, mimeType),
    ...adminAuditStatements(db, 'media.create', id, 'External media added', null, 'order', { changed: true }),
  ]);
  const row = await db
    .prepare('SELECT id FROM MediaAsset WHERE provider=? AND externalId=?')
    .bind(provider, externalId)
    .first<{ id: string }>();
  return mediaDetail(db, row!.id);
}

export async function serveLibraryImage(env: MediaEnvironment, id: string, request: Request) {
  const row = await getAsset(env.DB, id);
  // Archiving is library organization, not revocation; existing public links remain valid.
  if (row.provider !== 'R2' || !row.storageKey?.startsWith('library/')) throw new MediaError('Không tìm thấy tệp.', 404);
  const object = await env.PRODUCT_MEDIA.get(row.storageKey);
  if (!object) throw new MediaError('Không tìm thấy tệp trong bộ lưu trữ.', 404);
  const headers: Record<string, string> = {
    'Content-Type': row.mimeType || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600',
    ETag: object.httpEtag,
  };
  if (row.mimeType === 'image/svg+xml') {
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox";
  }
  if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body as unknown as ReadableStream, { headers });
}

export async function attachProductImage(env: MediaEnvironment, assetId: string, productId: string) {
  const asset = await getAsset(env.DB, assetId);
  if (asset.state !== 'READY' || asset.kind !== 'IMAGE' || asset.mimeType === 'application/pdf' || !asset.storageKey || !dto({ ...asset, usageCount: 0 }).url) throw new MediaError('Ảnh chưa sẵn sàng để sử dụng.');
  if (!await env.PRODUCT_MEDIA.head(asset.storageKey)) throw new MediaError('File ảnh chưa tồn tại trong R2.', 404);
  if (!await env.DB.prepare('SELECT id FROM Product WHERE id=?').bind(productId).first()) throw new MediaError('Không tìm thấy sản phẩm.', 404);
  const imageId = `library-${productId}-${assetId}`;
  // Trigger enforces usage tracking and unarchives under concurrent attachment.
  await env.DB.batch([env.DB.prepare(`INSERT OR IGNORE INTO ProductImage(id,productId,r2Key,url,mimeType,size,width,height,alt,sortOrder,isPrimary)
    SELECT ?,?,?,?,?,?,?,?,?,coalesce((SELECT max(sortOrder)+1 FROM ProductImage WHERE productId=?),0),
      CASE WHEN EXISTS(SELECT 1 FROM ProductImage WHERE productId=?) THEN 0 ELSE 1 END
    FROM MediaAsset WHERE id=? AND state='READY'`).bind(imageId, productId, asset.storageKey, dto({ ...asset, usageCount: 0 }).url,
      asset.mimeType, asset.size, asset.width, asset.height, asset.alt, productId, productId, assetId), ...adminAuditStatements(env.DB, 'media.attach', assetId, 'Image attached', null, 'order', { changed: true })]);
  if (!await env.DB.prepare('SELECT id FROM ProductImage WHERE id=?').bind(imageId).first()) throw new MediaError('Ảnh vừa bị ẩn. Tải lại thư viện.', 409);
  return mediaDetail(env.DB, assetId);
}
