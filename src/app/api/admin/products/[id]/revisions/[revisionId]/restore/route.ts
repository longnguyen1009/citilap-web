import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { restoreProductRevision } from '@/server/services/product-studio.service';

type Context = { params: Promise<{ id: string; revisionId: string }> };

async function POSTHandler(request: Request, context: Context) {
  const { id, revisionId } = await context.params;
  return mediaAdmin(request, true, async env => {
    const body = await request.json().catch(() => ({}));
    const expectedRevision = Number(body.expectedRevision ?? 0);
    return restoreProductRevision(env, id, parseInt(revisionId, 10), expectedRevision);
  });
}

export const POST = withAdminContext(POSTHandler);
