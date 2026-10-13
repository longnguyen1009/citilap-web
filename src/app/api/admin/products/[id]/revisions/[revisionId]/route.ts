import { mediaAdmin } from '@/server/media-http';
import { getProductRevisionSnapshot } from '@/server/services/product-studio.service';

type Context = { params: Promise<{ id: string; revisionId: string }> };

export async function GET(request: Request, context: Context) {
  const { id, revisionId } = await context.params;
  return mediaAdmin(request, false, env => getProductRevisionSnapshot(env.DB, id, parseInt(revisionId, 10)));
}
