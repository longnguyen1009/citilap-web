import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { listProductRevisions } from '@/server/services/product-studio.service';

type Context = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, env => listProductRevisions(env.DB, id));
}

export const GET = withAdminContext(GETHandler);
