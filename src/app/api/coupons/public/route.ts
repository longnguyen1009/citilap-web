import { NextResponse } from 'next/server';
import { mediaEnvironment } from '@/server/media-http';
import { listPublicCoupons } from '@/server/services/coupon.service';

export const runtime = 'edge';

export async function GET() {
  try {
    const env = await mediaEnvironment();
    const coupons = await listPublicCoupons(env.DB);
    return NextResponse.json(
      { success: true, data: coupons },
      { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15' } }
    );
  } catch (error) {
    console.error('[PublicCouponsAPI] GET error:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
