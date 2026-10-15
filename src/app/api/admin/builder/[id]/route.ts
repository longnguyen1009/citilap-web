import { mediaAdmin } from '@/server/media-http';
import { getLandingPageDetail, writeLandingPage } from '@/server/services/site-builder.service';
import { MediaError } from '@/server/services/media-library.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, (env) => getLandingPageDetail(env.DB, id));
}

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async (env) => writeLandingPage(env, id, await request.json()));
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async (env) => {
    if (id === 'home') {
      throw new MediaError('Không thể xóa trang chủ duy nhất.', 400);
    }
    const page = await getLandingPageDetail(env.DB, id);
    if (page.isHome) {
      throw new MediaError('Không thể xóa trang chủ duy nhất.', 400);
    }

    await env.DB.prepare('UPDATE LandingPage SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
    return { success: true, message: 'Đã xóa landing page.' };
  });
}
