import { BUILD_ID, bumpCmsVersion, cmsVersion, type KvLike } from './kv-cache';

/**
 * Edge HTML cache for anonymous visitors on public storefront pages.
 *
 * Uses L1 (isolate memory + Cloudflare Cache API `caches.default`) and L2 (Workers KV).
 * Fresh for 60s, then served stale (stale-while-revalidate) for up to 5 min while a background render refreshes it.
 * Never used for admins, non-GET, RSC/prefetch requests or pages with query strings.
 */
const CACHEABLE_EXACT_PATHS = new Set([
  '/',
  '/hot-sale',
  '/gioi-thieu',
  '/he-thong-cua-hang',
  '/lien-he',
  '/contact',
  '/cau-hoi-thuong-gap',
  '/huong-dan-mua-hang',
  '/dieu-khoan-mua-hang',
  '/chinh-sach-bao-hanh',
  '/chinh-sach-bao-mat',
  '/chinh-sach-doi-tra',
  '/chinh-sach-van-chuyen',
  '/news',
  '/phan-loai',
  '/category',
  '/collection',
]);

const CACHEABLE_PREFIXES = [
  '/laptop/',
  '/phu-kien/',
  '/product/',
  '/san-pham/',
  '/brand/',
  '/category/',
  '/collection/',
  '/landing/',
  '/news/',
  '/chinh-sach/',
  '/phan-loai/',
];

const NON_CACHEABLE_SINGLE_SEGMENTS = new Set([
  '/admin',
  '/api',
  '/login',
  '/cart',
  '/checkout',
  '/profile',
  '/order-tracking',
  '/wishlist',
  '/so-sanh',
  '/search',
  '/chon-laptop',
]);

const FRESH_MS = 60_000;
const STORE_TTL_SECONDS = 300;
const MEM_HTML_MAX_ENTRIES = 32;

/** Admin / content mutations that invalidate the public cache. */
const MUTATION_PREFIXES = [
  '/api/admin/',
  '/api/products',
  '/api/categories',
  '/api/brands',
  '/api/catalog/',
  '/api/landing/',
  '/api/library/',
  '/api/media/',
  '/api/news',
  '/api/settings',
  '/api/upload',
];

const PRESERVED_HEADER_NAMES = [
  'x-dns-prefetch-control',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'content-security-policy',
  'link',
] as const;

interface HtmlEntry {
  html: string;
  at: number;
  contentType: string;
  headers?: Record<string, string>;
}

const memHtml = new Map<string, HtmlEntry>();

function isCacheablePathname(pathname: string): boolean {
  if (CACHEABLE_EXACT_PATHS.has(pathname)) return true;
  if ( NON_CACHEABLE_SINGLE_SEGMENTS.has(pathname)) return false;
  if (CACHEABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // Single-segment catalog category slugs (e.g. /laptop-gaming, /macbook)
  if (/^\/[a-z0-9-]+$/.test(pathname)) return true;
  return false;
}

export function isCacheableHtmlRequest(request: Request, url: URL): boolean {
  if (request.method !== 'GET' || url.search || !isCacheablePathname(url.pathname)) return false;
  const headers = request.headers;
  const accept = headers.get('accept') || '';
  if (!accept.includes('text/html') || accept.includes('text/x-component')) return false;
  if (headers.get('rsc') || headers.get('next-router-prefetch') || headers.get('purpose') === 'prefetch') return false;
  if ((headers.get('cookie') || '').includes('admin_session')) return false;
  return true;
}

export function invalidatesPublicCache(request: Request, response: Response): boolean {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS' || !response.ok) return false;
  const path = new URL(request.url).pathname;
  return MUTATION_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function invalidatePublicCache(kv: KvLike | undefined): Promise<void> {
  memHtml.clear();
  try { await bumpCmsVersion(kv); } catch (error) { console.error('[cache] version bump failed', error); }
}

function respond(entry: HtmlEntry, state: 'HIT' | 'STALE'): Response {
  const headers = new Headers(entry.headers);
  headers.set('content-type', entry.contentType);
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-citilap-cache', state);
  headers.set('x-citilap-cache-age', String(Math.max(0, Math.round((Date.now() - entry.at) / 1000))));
  return new Response(entry.html, {
    status: 200,
    headers,
  });
}

function edgeCacheRequest(key: string): Request {
  return new Request(`https://cache.citilap.internal/${encodeURIComponent(key)}`);
}

async function store(kv: KvLike | undefined, key: string, response: Response): Promise<void> {
  const contentType = response.headers.get('content-type') || '';
  if (response.status !== 200 || !contentType.includes('text/html') || response.headers.has('set-cookie')) return;
  const preserved: Record<string, string> = {};
  for (const name of PRESERVED_HEADER_NAMES) {
    const val = response.headers.get(name);
    if (val) preserved[name] = val;
  }
  const entry: HtmlEntry = { html: await response.text(), at: Date.now(), contentType, headers: preserved };
  if (memHtml.size >= MEM_HTML_MAX_ENTRIES) {
    const oldest = memHtml.keys().next().value;
    if (oldest) memHtml.delete(oldest);
  }
  memHtml.set(key, entry);
  const serialized = JSON.stringify(entry);
  const edgeCache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
  await Promise.all([
    kv ? kv.put(key, serialized, { expirationTtl: STORE_TTL_SECONDS }).catch(() => undefined) : Promise.resolve(),
    edgeCache
      ? edgeCache
          .put(
            edgeCacheRequest(key),
            new Response(serialized, {
              headers: {
                'content-type': 'application/json',
                'cache-control': `public, max-age=${STORE_TTL_SECONDS}`,
              },
            }),
          )
          .catch(() => undefined)
      : Promise.resolve(),
  ]);
}

async function readCachedEntry(kv: KvLike | undefined, key: string): Promise<HtmlEntry | null> {
  const mem = memHtml.get(key);
  if (mem && Date.now() - mem.at <= STORE_TTL_SECONDS * 1000) {
    return mem;
  }
  const edgeCache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
  if (edgeCache) {
    try {
      const hit = await edgeCache.match(edgeCacheRequest(key));
      if (hit) {
        const entry = (await hit.json()) as HtmlEntry | null;
        if (entry?.html) {
          memHtml.set(key, entry);
          return entry;
        }
      }
    } catch { /* fall through to KV */ }
  }
  if (!kv) return null;
  const entry = (await kv.get(key, { type: 'json' })) as HtmlEntry | null;
  if (entry?.html) {
    memHtml.set(key, entry);
    if (edgeCache) {
      edgeCache
        .put(
          edgeCacheRequest(key),
          new Response(JSON.stringify(entry), {
            headers: {
              'content-type': 'application/json',
              'cache-control': `public, max-age=${STORE_TTL_SECONDS}`,
            },
          }),
        )
        .catch(() => undefined);
    }
    return entry;
  }
  return null;
}

export async function serveCachedHtml(
  kv: KvLike | undefined,
  url: URL,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  render: () => Promise<Response>,
): Promise<Response> {
  let key: string;
  try {
    key = `citilap:html:${BUILD_ID}:${await cmsVersion(kv)}:${url.pathname}`;
    const entry = await readCachedEntry(kv, key);
    if (entry?.html) {
      if (Date.now() - entry.at <= FRESH_MS) return respond(entry, 'HIT');
      ctx.waitUntil(render().then((fresh) => store(kv, key, fresh)).catch(() => undefined));
      return respond(entry, 'STALE');
    }
  } catch (error) {
    console.error('[cache] html read failed', error);
    return render();
  }
  const response = await render();
  ctx.waitUntil(store(kv, key, response.clone()).catch(() => undefined));
  const headers = new Headers(response.headers);
  headers.set('x-citilap-cache', 'MISS');
  const contentType = headers.get('content-type') || '';
  if (response.status === 200 && contentType.includes('text/html') && !headers.has('set-cookie')) {
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

