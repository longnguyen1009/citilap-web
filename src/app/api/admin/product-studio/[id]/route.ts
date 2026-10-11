import { mediaAdmin } from '@/server/media-http';
import { studioDetail, writeStudio } from '@/server/services/product-studio.service';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { const { id } = await context.params; return mediaAdmin(request, false, env => studioDetail(env.DB, id)); }
export async function PUT(request: Request, context: Context) { const { id } = await context.params; return mediaAdmin(request, true, async env => writeStudio(env, id, await request.json())); }
