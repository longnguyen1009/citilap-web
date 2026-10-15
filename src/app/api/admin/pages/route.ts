import { mediaAdmin } from '@/server/media-http';
import { pageList, writePage } from '@/server/services/page.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;

  return mediaAdmin(request, false, env =>
    pageList(env.DB, {
      q,
      page,
      limit,
    })
  );
}

export async function POST(request: Request) {
  return mediaAdmin(request, true, async env => writePage(env, null, await request.json()));
}
