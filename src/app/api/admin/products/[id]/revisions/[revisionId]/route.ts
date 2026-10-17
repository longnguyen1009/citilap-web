import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getProductRevisionSnapshot } from '@/server/services/product-studio.service';

type Context = { params: Promise<{ id: string; revisionId: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id, revisionId } = await context.params;
  return mediaAdmin(request, false, env => getProductRevisionSnapshot(env.DB, id, parseInt(revisionId, 10)));
}

export const GET = withAdminContext(GETHandler);
