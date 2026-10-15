import { getAsset, mediaDetail, MediaError, type MediaEnvironment } from './media-library.service';

/** Resolve actual Media Library URLs; retain usages for every saved revision. */
export async function contentAssets(env: MediaEnvironment, html: string, references: (string | null | undefined)[], publishing: boolean) {
  const ids = new Set(references.filter((id): id is string => !!id));
  for (const match of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const src = match[1];
    let pathname = '';
    try {
      const url = new URL(src, 'https://citilap.internal');
      const isInternal =
        url.origin === 'https://citilap.internal' ||
        ['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.hostname.endsWith('citilap.vn');
      if (!isInternal) continue;
      pathname = url.pathname;
    } catch {
      continue;
    }

    if (pathname.startsWith('/api/library/')) {
      const assetId = decodeURIComponent(pathname.slice('/api/library/'.length));
      if (assetId) ids.add(assetId);
    } else if (pathname.startsWith('/api/media/')) {
      const key = decodeURIComponent(pathname.slice('/api/media/'.length));
      const asset = await env.DB.prepare('SELECT id FROM MediaAsset WHERE storageKey=?').bind(key).first<{id:string}>();
      if (!asset) {
        if (publishing) throw new MediaError('Ảnh nội dung không tồn tại trong thư viện.');
        continue;
      }
      ids.add(asset.id);
    }
  }
  for (const id of ids) {
    const asset = await getAsset(env.DB, id);
    const detail = await mediaDetail(env.DB, id);
    if (asset.kind !== 'IMAGE' || asset.state !== 'READY' || !detail.asset.url) throw new MediaError('Ảnh chưa sẵn sàng.');
    if (publishing && (!asset.storageKey || !await env.PRODUCT_MEDIA.head(asset.storageKey))) throw new MediaError('Không tìm thấy ảnh trên R2.');
  }
  return ids;
}
