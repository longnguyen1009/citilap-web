import { mediaAdmin } from '@/server/media-http';
import { pageDetail, writePage, archivePage } from '@/server/services/page.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, env => pageDetail(env.DB, id));
}

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => writePage(env, id, await request.json()));
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => {
    let expectedRevision = 0;
    try {
      const body = await request.json();
      expectedRevision = Number(body.expectedRevision ?? 0);
    } catch {
      const url = new URL(request.url);
      expectedRevision = Number(url.searchParams.get('expectedRevision') ?? 0);
    }
    return archivePage(env, id, expectedRevision);
  });
}
