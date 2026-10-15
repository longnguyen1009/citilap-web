import { mediaAdmin } from '@/server/media-http';
import { getPreviewLandingPage } from '@/server/services/site-builder.service';
import type { LandingPageDocument } from '@/contracts/cms/site-builder';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async (env) => {
    let documentOverride: LandingPageDocument | undefined;
    try {
      const body = (await request.json()) as any;
      if (body?.document) {
        documentOverride = body.document;
      } else if (body?.schemaVersion === 1) {
        documentOverride = body;
      }
    } catch {
      // No body passed, use existing draft in database
    }

    return getPreviewLandingPage(env.DB, id, documentOverride);
  });
}
