import { NextResponse } from 'next/server';
import { parseSearchParams } from '@/contracts/catalog/search';
import { searchProducts } from '@/server/services/search.service';
import { mediaEnvironment } from '@/server/media-http';
import { getStorefrontPricingContext } from '@/server/services/pricing.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = parseSearchParams(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tham số tìm kiếm không hợp lệ',
          details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    const { data: validParams } = parsed;

    const env = await mediaEnvironment();
    const evaluatedAt = new Date();
    const pricingContext = await getStorefrontPricingContext(env.DB, evaluatedAt);

    const result = await searchProducts(
      validParams,
      undefined,
      pricingContext,
      evaluatedAt
    );

    return NextResponse.json({
      success: true,
      data: result,
    }, {headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('[SearchAPI] Error executing search query:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Có lỗi xảy ra khi xử lý tìm kiếm. Vui lòng thử lại sau.',
      },
      { status: 500 }
    );
  }
}
