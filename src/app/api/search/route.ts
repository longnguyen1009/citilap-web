import { NextResponse } from 'next/server';
import { parseSearchParams } from '@/contracts/catalog/search';
import { searchProducts } from '@/server/services/search.service';
import { getClientIp, hashIp, checkInMemoryRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';

export async function GET(request: Request) {
  // Rate limiting: 60 search requests per minute per IP
  const ip = getClientIp(request);
  const rateLimit = checkInMemoryRateLimit(`rl:search:${hashIp(ip)}`, 60, 60);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfter);
  }

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

    const result = await searchProducts(validParams);

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
