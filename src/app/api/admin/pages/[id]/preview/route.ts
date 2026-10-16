import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { pageDetail } from '@/server/services/page.service';

type Context = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async env => {
    return pageDetail(env.DB, id);
  });
}

export const GET = withAdminContext(GETHandler);
