import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getBrandDetail, writeBrand, archiveBrand } from '@/server/services/brand.service';
import { MediaError } from '@/server/services/media-library.service';

type Context = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async env => {
    const brand = await getBrandDetail(env.DB, id);
    if (!brand) throw new MediaError('Không tìm thấy thương hiệu.', 404);
    return brand;
  });
}

async function PUTHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => writeBrand(env, id, await request.json()));
}

async function DELETEHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, true, async env => {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new MediaError('Dữ liệu JSON không hợp lệ.', 400);
    }
    return archiveBrand(env.DB, id, body);
  });
}

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
export const DELETE = withAdminContext(DELETEHandler);
