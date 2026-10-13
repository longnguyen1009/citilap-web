import { mediaAdmin } from '@/server/media-http';
import { listProductRevisions } from '@/server/services/product-studio.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, env => listProductRevisions(env.DB, id));
}
