import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { listPostCategories, writePostCategory } from '@/server/services/post.service';

async function GETHandler(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'ALL') as 'ALL' | 'ACTIVE';
  return mediaAdmin(request, false, env => listPostCategories(env.DB, status));
}

async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async env => writePostCategory(env.DB, null, await request.json()));
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
