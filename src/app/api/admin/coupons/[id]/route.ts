import { NextResponse } from 'next/server';
import { withAdminContext } from '@/server/admin-request-context';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import { getCouponById, updateCoupon, deleteCoupon, CouponError } from '@/server/services/coupon.service';
import { ZodError } from 'zod';

export const runtime = 'edge';

async function GETHandler(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const env = await mediaEnvironment();
    const coupon = await getCouponById(env.DB, id);
    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy mã giảm giá.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: coupon }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[AdminCouponsAPI] GET by id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải mã giảm giá.' }, { status: 500 });
  }
}

async function PUTHandler(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    const env = await mediaEnvironment();
    const updated = await updateCoupon(env.DB, id, body);
    return NextResponse.json({ success: true, data: updated });
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
    console.error('[AdminCouponsAPI] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Không thể cập nhật mã giảm giá.' }, { status: 500 });
  }
}

async function DELETEHandler(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const env = await mediaEnvironment();
    await deleteCoupon(env.DB, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    console.error('[AdminCouponsAPI] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Không thể xóa mã giảm giá.' }, { status: 500 });
  }
}

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
export const DELETE = withAdminContext(DELETEHandler);
