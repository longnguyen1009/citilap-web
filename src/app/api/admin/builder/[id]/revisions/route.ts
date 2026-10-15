import { mediaAdmin } from '@/server/media-http';
import { getLandingPageRevisions } from '@/server/services/site-builder.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, (env) => getLandingPageRevisions(env.DB, id));
}
