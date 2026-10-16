import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { studioDetail, writeStudio } from '@/server/services/product-studio.service';
type Context = { params: Promise<{ id: string }> };
async function GETHandler(request: Request, context: Context) { const { id } = await context.params; return mediaAdmin(request, false, env => studioDetail(env.DB, id)); }
async function PUTHandler(request: Request, context: Context) { const { id } = await context.params; return mediaAdmin(request, true, async env => writeStudio(env, id, await request.json())); }

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
