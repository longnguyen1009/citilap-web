import { mediaAdmin } from '@/server/media-http';
import { listPostCategories, writePostCategory } from '@/server/services/post.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'ALL') as 'ALL' | 'ACTIVE';
  return mediaAdmin(request, false, env => listPostCategories(env.DB, status));
}

export async function POST(request: Request) {
  return mediaAdmin(request, true, async env => writePostCategory(env.DB, null, await request.json()));
}
