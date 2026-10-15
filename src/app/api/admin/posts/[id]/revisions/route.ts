import { mediaAdmin } from '@/server/media-http';
import { listPostRevisions } from '@/server/services/post.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, env => listPostRevisions(env.DB, id));
}
