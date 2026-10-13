import { mediaAdmin } from '@/server/media-http';
import { listBrands, writeBrand } from '@/server/services/brand.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const status = url.searchParams.get('status') || 'ALL';
  return mediaAdmin(request, false, env => listBrands(env.DB, { q, status }));
}

export async function POST(request: Request) {
  return mediaAdmin(request, true, async env => writeBrand(env, null, await request.json()));
}
