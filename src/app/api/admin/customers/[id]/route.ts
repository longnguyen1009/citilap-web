import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getCustomerDetail } from '@/server/services/customer.service';

async function GETHandler(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const detail = await getCustomerDetail(params.id);
    if (!detail) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy hồ sơ khách hàng' }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, data: detail },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[AdminCustomerDetail] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải chi tiết khách hàng' }, { status: 500 });
  }
}

export const GET = withAdminContext(GETHandler);
