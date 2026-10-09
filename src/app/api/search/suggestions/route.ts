import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSearchSuggestions } from '@/server/services/search.service';
import { getClientIp, hashIp, checkInMemoryRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';

const SuggestionsQuerySchema = z.object({
  q: z.string().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export async function GET(request: Request) {
  // Rate limiting: 60 requests per minute per IP
  const ip = getClientIp(request);
  const rateLimit = checkInMemoryRateLimit(`rl:suggest:${hashIp(ip)}`, 60, 60);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfter);
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = searchParams.get('limit') || '6';

    const parsed = SuggestionsQuerySchema.safeParse({ q, limit });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tham số gợi ý không hợp lệ',
        },
        { status: 400 }
      );
    }

    const { data: valid } = parsed;
    const result = await getSearchSuggestions(valid.q, valid.limit);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[SearchSuggestionsAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tải gợi ý tìm kiếm',
      },
      { status: 500 }
    );
  }
}
