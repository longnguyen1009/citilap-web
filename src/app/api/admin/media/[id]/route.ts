import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { editMedia, mediaDetail } from '@/server/services/media-library.service';
type Context = { params: Promise<{ id: string }> };
async function GETHandler(request: Request, context: Context) {
  return mediaAdmin(request, false, async (env) => mediaDetail(env.DB, (await context.params).id));
}
async function PATCHHandler(request: Request, context: Context) {
  return mediaAdmin(request, true, async (env) => editMedia(env.DB, (await context.params).id, await request.json()));
}

export const GET = withAdminContext(GETHandler);
export const PATCH = withAdminContext(PATCHHandler);
