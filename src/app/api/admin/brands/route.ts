import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { listBrands, writeBrand } from '@/server/services/brand.service';

async function GETHandler(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const status = url.searchParams.get('status') || 'ALL';
  return mediaAdmin(request, false, env => listBrands(env.DB, { q, status }));
}

async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async env => writeBrand(env, null, await request.json()));
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
