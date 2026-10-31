import { mediaEnvironment } from '@/server/media-http';
import { catalogState } from '@/server/services/catalog-state';

export async function GET() {
  try {
    return Response.json(await catalogState((await mediaEnvironment()).DB), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Catalog unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
