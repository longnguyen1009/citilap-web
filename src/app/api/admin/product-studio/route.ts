import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { studioList, writeStudio } from '@/server/services/product-studio.service';
async function GETHandler(request: Request) { return mediaAdmin(request, false, env => studioList(env.DB, new URL(request.url).searchParams.get('q') || '')); }
async function POSTHandler(request: Request) { return mediaAdmin(request, true, async env => writeStudio(env, null, await request.json())); }

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
