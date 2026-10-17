import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { writePostCategory, deletePostCategory } from '@/server/services/post.service';

type Context = { params: Promise<{ id: string }> };

async function PUTHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => writePostCategory(env.DB, id, await request.json()));
}

async function DELETEHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, env => deletePostCategory(env.DB, id));
}

export const PUT = withAdminContext(PUTHandler);
export const DELETE = withAdminContext(DELETEHandler);
