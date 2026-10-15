import { mediaAdmin } from '@/server/media-http';
import { restoreLandingPageRevision } from '@/server/services/site-builder.service';
import { MediaError } from '@/server/services/media-library.service';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async (env) => {
    const body = await request.json() as { targetRevision?: number; expectedRevision?: number };
    const targetRevision = Number(body?.targetRevision);
    const expectedRevision = Number(body?.expectedRevision);

    if (!Number.isInteger(targetRevision) || targetRevision < 1) {
      throw new MediaError('Phiên bản khôi phục không hợp lệ.', 400);
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw new MediaError('expectedRevision không hợp lệ.', 400);
    }

    return restoreLandingPageRevision(env, id, targetRevision, expectedRevision);
  });
}
