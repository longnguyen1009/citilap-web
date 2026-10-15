import { mediaAdmin } from '@/server/media-http';
import { writePostCategory, deletePostCategory } from '@/server/services/post.service';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => writePostCategory(env.DB, id, await request.json()));
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, env => deletePostCategory(env.DB, id));
}
