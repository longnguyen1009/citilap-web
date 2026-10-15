import { mediaAdmin } from '@/server/media-http';
import { restorePageRevision } from '@/server/services/page.service';

type Context = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(request: Request, context: Context) {
  const { id, revisionId } = await context.params;
  return mediaAdmin(request, true, async env => {
    const body = await request.json().catch(() => ({}));
    const expectedRevision = Number(body.expectedRevision ?? 0);
    return restorePageRevision(env, id, parseInt(revisionId, 10), expectedRevision);
  });
}
