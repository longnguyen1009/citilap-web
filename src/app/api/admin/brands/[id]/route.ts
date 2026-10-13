import { mediaAdmin } from '@/server/media-http';
import { getBrandDetail, writeBrand, archiveBrand } from '@/server/services/brand.service';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async env => {
    const brand = await getBrandDetail(env.DB, id);
    if (!brand) throw new Error('Không tìm thấy thương hiệu');
    return brand;
  });
}

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => writeBrand(env, id, await request.json()));
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, env => archiveBrand(env.DB, id));
}
