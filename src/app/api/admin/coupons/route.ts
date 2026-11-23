import { NextResponse } from 'next/server';
import { withAdminContext } from '@/server/admin-request-context';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import { listCoupons, createCoupon, CouponError } from '@/server/services/coupon.service';
import { ZodError } from 'zod';

export const runtime = 'edge';

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const env = await mediaEnvironment();
    const coupons = await listCoupons(env.DB);
    return NextResponse.json({ success: true, data: coupons }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[AdminCouponsAPI] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách mã giảm giá.' },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    const env = await mediaEnvironment();
    const created = await createCoupon(env.DB, body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Dữ liệu mã giảm giá không hợp lệ.' },
        { status: 400 }
      );
    }
    if (error instanceof CouponError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    console.error('[AdminCouponsAPI] POST error:', error);
    return NextResponse.json({ success: false, error: 'Không thể tạo mã giảm giá.' }, { status: 500 });
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
