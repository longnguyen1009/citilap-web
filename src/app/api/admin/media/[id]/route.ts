import { mediaAdmin } from '@/server/media-http';
import { editMedia, mediaDetail } from '@/server/services/media-library.service';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return mediaAdmin(request, false, async (env) => mediaDetail(env.DB, (await context.params).id));
}
export async function PATCH(request: Request, context: Context) {
  return mediaAdmin(request, true, async (env) => editMedia(env.DB, (await context.params).id, await request.json()));
}
