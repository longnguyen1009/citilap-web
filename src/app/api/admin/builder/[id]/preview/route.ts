import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getPreviewLandingPage } from '@/server/services/site-builder.service';
import { landingPageDocumentSchema, type LandingPageDocument } from '@/contracts/cms/site-builder';

type Context = { params: Promise<{ id: string }> };

async function POSTHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async (env) => {
    let documentOverride: LandingPageDocument | undefined;
    const text = await request.text();
    if (text.trim()) {
      const body: unknown = JSON.parse(text);
      documentOverride = landingPageDocumentSchema.parse(
        body && typeof body === 'object' && 'document' in body ? body.document : body
      );
    }

    return getPreviewLandingPage(env.DB, id, documentOverride);
  });
}

export const POST = withAdminContext(POSTHandler);
