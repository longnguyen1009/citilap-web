import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { postDetail } from '@/server/services/post.service';

type Context = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async env => {
    return postDetail(env.DB, id);
  });
}

export const GET = withAdminContext(GETHandler);
