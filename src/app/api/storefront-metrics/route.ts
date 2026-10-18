import { z } from 'zod';
import { mediaEnvironment } from '@/server/media-http';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';

const schema = z.object({ event: z.enum(['page_view', 'view_item', 'search', 'search_empty', 'compare', 'add_to_cart', 'begin_checkout', 'order_requested', 'contact_click', 'appointment_requested']) }).strict();
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 100) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  try {
    const rate = await checkRateLimit('storefront-metrics', request, 60, 60);
    if (!rate.allowed) return rateLimitExceededResponse(rate.retryAfter);
    const { DB } = await mediaEnvironment();
    const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    await DB.prepare('INSERT INTO StorefrontMetric(day,event,count) VALUES(?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1').bind(day, parsed.data.event).run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response(null, { status: 503 }); }
}
