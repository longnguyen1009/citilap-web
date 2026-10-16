import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getLandingPageRevisions } from '@/server/services/site-builder.service';

type Context = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, (env) => getLandingPageRevisions(env.DB, id));
}

export const GET = withAdminContext(GETHandler);
