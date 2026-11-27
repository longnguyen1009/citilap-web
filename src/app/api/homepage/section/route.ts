import { NextRequest, NextResponse } from 'next/server';
import { getPublishedHomepage } from '@/server/services/storefront-cms.service';
import type { ProductCardProduct } from '@/components/product/ProductCard';
import type { ProductGridSectionData } from '@/contracts/cms/site-builder';

function dedupeProducts(products: ProductCardProduct[]): ProductCardProduct[] {
  const seenKeys = new Set<string>();
  const result: ProductCardProduct[] = [];
  for (const product of products) {
    const baseName = (product.name || '')
      .toLowerCase()
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(/\s*[-–|]\s*(bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\s*$/i, '')
      .replace(/\s*\((bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = baseName || String(product.id);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(product);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const sectionId = request.nextUrl.searchParams.get('sectionId')?.trim() || '';

  if (!sectionId) {
    return NextResponse.json({ error: 'Missing sectionId' }, { status: 400 });
  }

  try {
    const homepage = await getPublishedHomepage();
    const section = homepage?.sections?.find((s) => s.id === sectionId);

    if (!section || !section.resolvedProducts?.length) {
      return NextResponse.json(
        { products: [] },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
        },
      );
    }

    const data = section.data as ProductGridSectionData;
    const limit = data?.ruleCriteria?.limit && data.ruleCriteria.limit > 0 ? data.ruleCriteria.limit : 48;
    const products = dedupeProducts(section.resolvedProducts).slice(0, limit);

    return NextResponse.json(
      { products },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    console.error('[api/homepage/section] Failed to load section products:', err);
    return NextResponse.json({ error: 'Unable to load section products' }, { status: 500 });
  }
}
