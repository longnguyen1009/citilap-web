import { mediaAdmin } from '@/server/media-http';
import { catalogList, writeStudio, type CatalogListOptions } from '@/server/services/product-studio.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const kind = url.searchParams.get('kind') || 'ALL';
  const categoryId = url.searchParams.get('categoryId') || '';
  const brand = url.searchParams.get('brand') || '';
  const publicationStatus = (url.searchParams.get('publicationStatus') || 'ALL') as CatalogListOptions['publicationStatus'];
  const availability = (url.searchParams.get('availability') || 'ALL') as CatalogListOptions['availability'];
  const minPrice = url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : null;
  const maxPrice = url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : null;
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;
  const sort = (url.searchParams.get('sort') || 'updatedAt') as CatalogListOptions['sort'];
  const order = (url.searchParams.get('order') || 'desc') as CatalogListOptions['order'];

  return mediaAdmin(request, false, env =>
    catalogList(env.DB, {
      q,
      kind,
      categoryId,
      brand,
      publicationStatus,
      availability,
      minPrice,
      maxPrice,
      page,
      limit,
      sort,
      order,
    })
  );
}

export async function POST(request: Request) {
  return mediaAdmin(request, true, async env => writeStudio(env, null, await request.json()));
}
