import { BUILD_ID, bumpCmsVersion, cmsVersion, type KvLike } from './kv-cache';

/**
 * Edge HTML cache for anonymous visitors on a few public pages.
 *
 * Fresh for 60s, then served stale (stale-while-revalidate) for up to 5 min while a background render refreshes it.
 * Never used for admins, non-GET, RSC/prefetch requests or pages with query strings.
 */
const CACHEABLE_PATHS = new Set(['/']);
const FRESH_MS = 60_000;
const STORE_TTL_SECONDS = 300;

/** Public mutations that must not invalidate the cache (checkout, contact form, metrics, ...). */
const MUTATION_PREFIXES = ['/api/admin/', '/api/products', '/api/categories', '/api/settings', '/api/upload'];

interface HtmlEntry { html: string; at: number; contentType: string }

export function isCacheableHtmlRequest(request: Request, url: URL): boolean {
  if (request.method !== 'GET' || url.search || !CACHEABLE_PATHS.has(url.pathname)) return false;
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
  if (!kv) return;
  try { await bumpCmsVersion(kv); } catch (error) { console.error('[cache] version bump failed', error); }
}

function respond(entry: HtmlEntry, state: 'HIT' | 'STALE'): Response {
  return new Response(entry.html, {
    status: 200,
    headers: {
      'content-type': entry.contentType,
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-citilap-cache': state,
      'x-citilap-cache-age': String(Math.round((Date.now() - entry.at) / 1000)),
    },
  });
}

async function store(kv: KvLike, key: string, response: Response): Promise<void> {
  const contentType = response.headers.get('content-type') || '';
  if (response.status !== 200 || !contentType.includes('text/html') || response.headers.has('set-cookie')) return;
  const entry: HtmlEntry = { html: await response.text(), at: Date.now(), contentType };
  await kv.put(key, JSON.stringify(entry), { expirationTtl: STORE_TTL_SECONDS });
}

export async function serveCachedHtml(
  kv: KvLike,
  url: URL,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  render: () => Promise<Response>,
): Promise<Response> {
  let key: string;
  try {
    key = `citilap:html:${BUILD_ID}:${await cmsVersion(kv)}:${url.pathname}`;
    const entry = (await kv.get(key, { type: 'json' })) as HtmlEntry | null;
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
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

