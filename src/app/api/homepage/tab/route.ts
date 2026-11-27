import { NextRequest, NextResponse } from 'next/server';
import { getPublishedHomepage } from '@/server/services/storefront-cms.service';

export async function GET(request: NextRequest) {
  const sectionId = request.nextUrl.searchParams.get('sectionId')?.trim() || '';
  const tabId = request.nextUrl.searchParams.get('tabId')?.trim() || '';

  if (!sectionId || !tabId) {
    return NextResponse.json(
      { error: 'Missing sectionId or tabId' },
      { status: 400 },
    );
  }

  try {
    const homepage = await getPublishedHomepage();
    const section = homepage?.sections?.find((s) => s.id === sectionId);
    const tab = section?.resolvedTabs?.find((t) => t.id === tabId);

    if (!tab) {
      return NextResponse.json(
        { products: [] },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=30, s-maxage=30',
          },
        },
      );
    }

    return NextResponse.json(
      { products: tab.products ?? [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    console.error('[api/homepage/tab] Failed to load tab products:', err);
    return NextResponse.json(
      { error: 'Unable to load tab products' },
      { status: 500 },
    );
  }
}
