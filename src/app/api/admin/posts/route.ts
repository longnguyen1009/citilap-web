import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { postList, writePost, type PostListOptions } from '@/server/services/post.service';

async function GETHandler(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const categoryId = url.searchParams.get('categoryId') || '';
  const status = (url.searchParams.get('status') || 'ALL') as PostListOptions['status'];
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;
  const sort = (url.searchParams.get('sort') || 'updatedAt') as PostListOptions['sort'];
  const order = (url.searchParams.get('order') || 'desc') as PostListOptions['order'];

  return mediaAdmin(request, false, env =>
    postList(env.DB, {
      q,
      categoryId,
      status,
      page,
      limit,
      sort,
      order,
    })
  );
}

async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async env => writePost(env, null, await request.json()));
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
