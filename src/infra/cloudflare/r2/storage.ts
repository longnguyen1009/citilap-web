import type { R2Bucket, R2Object, R2ObjectBody, R2PutOptions } from '@cloudflare/workers-types';
import { randomUUID } from 'node:crypto';

let explicitlyConfiguredBucket: R2Bucket | undefined;

function safeRequire<T>(moduleName: string): T | undefined {
  try {
    const loader = new Function('mod', 'try { return require(mod); } catch { return null; }');
    const mod = loader(moduleName);
    return mod || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Explicitly sets the active R2Bucket instance for dependency injection or testing.
 */
export function setR2Bucket(bucket: R2Bucket): void {
  explicitlyConfiguredBucket = bucket;
}

/**
 * Resolves the active Cloudflare R2 bucket binding (PRODUCT_MEDIA).
 * Priority order:
 * 1. Explicitly passed bucket instance
 * 2. Injected bucket via setR2Bucket()
 * 3. Official Cloudflare Workers nodejs_compat env (cloudflare:workers)
 * 4. Worker global env fallback
 */
export function getR2Bucket(bucket?: R2Bucket): R2Bucket {
  if (bucket) return bucket;
  if (explicitlyConfiguredBucket) return explicitlyConfiguredBucket;

  // 1. Official Cloudflare Workers nodejs_compat env access
  const cf = safeRequire<{ env?: Env }>('cloudflare:workers');
  if (cf?.env?.PRODUCT_MEDIA) return cf.env.PRODUCT_MEDIA;

  // 2. Context global env fallback (when attached to worker global scope)
  const workerGlobalEnv = (globalThis as unknown as { env?: Env }).env;
  if (workerGlobalEnv?.PRODUCT_MEDIA) return workerGlobalEnv.PRODUCT_MEDIA;

  throw new Error(
    'Cloudflare R2 binding PRODUCT_MEDIA not found. Ensure R2 bucket binding is configured in wrangler.jsonc or injected via setR2Bucket().'
  );
}

/**
 * Derives public media URL from an r2Key.
 * - If already an absolute URL (e.g. legacy external image), returns as-is.
 * - If NEXT_PUBLIC_MEDIA_URL is set (e.g. https://media.citilap.vn), returns CDN absolute URL.
 * - Otherwise returns the streaming worker route /api/media/{r2Key} for local and development environments.
 */
export function getPublicMediaUrl(r2Key: string): string {
  if (!r2Key) return '';
  const trimmed = r2Key.trim();

  // If already an absolute URL (legacy external seed or full CDN URL)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Existing public media/library routes are already resolved URLs.
  if (trimmed.startsWith('/api/media/') || trimmed.startsWith('/api/library/')) {
    return trimmed;
  }

  // Configured production custom domain (e.g. https://media.citilap.vn)
  const baseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.MEDIA_BASE_URL;
  if (baseUrl && baseUrl.trim() !== '') {
    return `${baseUrl.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
  }

  // Local development / default streaming route
  return `/api/media/${trimmed.replace(/^\//, '')}`;
}

/**
 * Resolve the public image URL recorded in ProductImage.
 * Imported/seeded products can have a legacy external URL alongside a
 * placeholder R2 key; Studio assets use a library key and /api/library URL.
 * Prefer those explicit usable URLs rather than requesting a missing R2 key.
 */
export function getProductImageUrl(r2Key?: string | null, storedUrl?: string | null): string {
  const url = storedUrl?.trim() || '';
  if (/^https?:\/\//i.test(url) || url.startsWith('/api/library/')) return url;
  if (r2Key?.startsWith('library/')) return '';
  return r2Key ? getPublicMediaUrl(r2Key) : url.startsWith('/api/media/') ? url : '';
}

/**
 * Extracts raw r2Key from a public URL or relative path.
 */
export function extractR2Key(urlOrKey: string): string {
  if (!urlOrKey) return '';
  const trimmed = urlOrKey.trim();

  const mediaPrefix = '/api/media/';
  if (trimmed.startsWith(mediaPrefix)) {
    return trimmed.slice(mediaPrefix.length);
  }

  const baseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.MEDIA_BASE_URL;
  if (baseUrl && trimmed.startsWith(baseUrl)) {
    return trimmed.slice(baseUrl.length).replace(/^\//, '');
  }

  return trimmed;
}

/**
 * Generates predictable, randomized namespaced R2 key for a product image.
 * Format: products/{productId}/{uuid}.{ext}
 * Or: products/{productId}/variants/{variantId}/{uuid}.{ext}
 */
export function generateProductMediaKey(productId: string, ext: string, variantId?: string): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  const uuid = randomUUID();
  if (variantId) {
    return `products/${productId}/variants/${variantId}/${uuid}.${cleanExt}`;
  }
  return `products/${productId}/${uuid}.${cleanExt}`;
}

/**
 * Generates temporary namespaced R2 key when product has not yet been created.
 * Format: tmp/products/{uploadId}/{uuid}.{ext}
 */
export function generateTempMediaKey(uploadId: string, ext: string): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  const uuid = randomUUID();
  return `tmp/products/${uploadId}/${uuid}.${cleanExt}`;
}

// Allowed MIME types and magic-byte signatures
export const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface DetectedImage {
  ext: 'jpg' | 'png' | 'webp';
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Inspects buffer magic bytes / file signatures to verify authenticity.
 * Whitelists JPEG, PNG, and WebP only.
 */
export function detectImageSignature(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: RIFF (bytes 0..3) + WEBP (bytes 8..11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Lightweight dimension extraction without native C++ dependencies like sharp.
 */
export function extractImageDimensions(buffer: Buffer, ext: string): { width: number; height: number } | null {
  try {
    if (ext === 'png' && buffer.length >= 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (ext === 'webp' && buffer.length >= 30) {
      const kind = buffer.toString('ascii', 12, 16);
      if (kind === 'VP8X') {
        return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
      }
    }
    if (ext === 'jpg') {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        offset += 2 + length;
      }
    }
  } catch {
    // Non-critical: dimensions remain null if header is non-standard
  }
  return null;
}

/**
 * R2 Storage Operations
 */
export async function putMediaObject(
  key: string,
  data: ArrayBuffer | Uint8Array | string,
  options?: R2PutOptions,
  bucket?: R2Bucket
): Promise<R2Object> {
  const r2 = getR2Bucket(bucket);
  const result = await r2.put(key, data, options);
  if (!result) {
    throw new Error(`Failed to put object in R2 for key: ${key}`);
  }
  return result;
}

export async function getMediaObject(key: string, bucket?: R2Bucket): Promise<R2ObjectBody | null> {
  const r2 = getR2Bucket(bucket);
  return r2.get(key);
}

export async function headMediaObject(key: string, bucket?: R2Bucket): Promise<R2Object | null> {
  const r2 = getR2Bucket(bucket);
  return r2.head(key);
}

export async function deleteMediaObject(key: string, bucket?: R2Bucket): Promise<void> {
  const r2 = getR2Bucket(bucket);
  await r2.delete(key);
}
