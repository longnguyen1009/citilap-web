import app from 'vinext/server/fetch-handler';
import { isImageOptimizationPath } from 'vinext/server/image-optimization';
import { runSchedules } from './server/services/cms-schedule.service';
import { serveLibraryImage, type MediaEnvironment } from './server/services/media-library.service';
import { mediaFailure } from './server/media-http';

const worker = {
  ...app,
  async fetch(request: Request, env: MediaEnvironment & { ASSETS: { fetch(request: Request): Promise<Response> } }, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    try {
    const url = new URL(request.url);
    const library = url.pathname.match(/^\/api\/library\/([a-zA-Z0-9-]+)$/);
    if (request.method === 'GET' && library && url.searchParams.get('size') === 'thumb' && url.searchParams.get('v') === '2') {
      const cache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
      const key = new Request(url.toString());
      const hit = await cache?.match(key);
      if (hit) return hit;
      const response = await serveLibraryImage(env, library[1], request).catch(mediaFailure);
      if (cache && response.status === 200 && response.headers.get('Cache-Control')?.includes('immutable')) {
        ctx.waitUntil(cache.put(key, response.clone()));
      }
      return response;
    }
    if (isImageOptimizationPath(new URL(request.url).pathname)) {
      // Vinext reads image sources through ASSETS; library images live in R2.
      const assets = { async fetch(source: Request) {
        const match = new URL(source.url).pathname.match(/^\/api\/library\/([a-zA-Z0-9-]+)$/);
        if (!match) return env.ASSETS.fetch(source);
        try { return await serveLibraryImage(env, match[1], source); }
        catch (error) { return mediaFailure(error); }
      } };
      return app.fetch(request, { ...env, ASSETS: assets }, ctx);
    }
      // Preserve Vinext's HTML/RSC cache policy, including private/no-store responses.
      return await app.fetch(request, env, ctx);
    } catch (fatalError) {
      console.error('[Worker Fatal Error]', fatalError);
      return new Response('Hệ thống tạm thời bận. Vui lòng thử lại sau giây lát.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  },
  async scheduled(_event: unknown, env: MediaEnvironment) {
    try {
      await runSchedules(env);
    } catch (schedError) {
      console.error('[Worker Cron Error] runSchedules failed:', schedError);
    }
  },
};

export default worker;
