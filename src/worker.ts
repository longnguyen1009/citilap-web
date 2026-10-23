import app from 'vinext/server/fetch-handler';
import { isImageOptimizationPath } from 'vinext/server/image-optimization';
import { runSchedules } from './server/services/cms-schedule.service';
import { serveLibraryImage, type MediaEnvironment } from './server/services/media-library.service';
import { mediaFailure } from './server/media-http';

const worker = {
  ...app,
  async fetch(request: Request, env: MediaEnvironment & { ASSETS: { fetch(request: Request): Promise<Response> } }, ctx: unknown) {
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
    return app.fetch(request, env, ctx);
  },
  async scheduled(_event: unknown, env: MediaEnvironment) {
    await runSchedules(env);
  },
};

export default worker;
