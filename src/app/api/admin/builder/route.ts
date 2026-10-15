import { mediaAdmin } from '@/server/media-http';
import { getLandingPageList, writeLandingPage } from '@/server/services/site-builder.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;
  const status = url.searchParams.get('status') || undefined;

  return mediaAdmin(request, false, (env) =>
    getLandingPageList(env.DB, {
      q,
      page,
      limit,
      status,
    })
  );
}

export async function POST(request: Request) {
  return mediaAdmin(request, true, async (env) =>
    writeLandingPage(env, null, await request.json())
  );
}
