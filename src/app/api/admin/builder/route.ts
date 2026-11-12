import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getLandingPageList, writeLandingPage } from '@/server/services/site-builder.service';

async function GETHandler(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const rawPage = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const rawLimit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;
  const page = Math.max(1, Number.isFinite(rawPage) ? Math.trunc(rawPage) : 1);
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 20));
  const status = url.searchParams.get('status') || undefined;

  return mediaAdmin(request, false, (env) =>
    getLandingPageList(env.DB, {
      q,
      page,
      limit,
      status,
      excludeHome: url.searchParams.get('excludeHome') === 'true',
    })
  );
}

async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async (env) =>
    writeLandingPage(env, null, await request.json())
  );
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
