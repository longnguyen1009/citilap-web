import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { addOrderInternalNote } from '@/server/services/order.service';

async function POSTHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const body = await request.json();

    if (!body || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nội dung ghi chú không được để trống' },
        { status: 400 }
      );
    }

    const note = await addOrderInternalNote(
      params.id,
      body.content
    );

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }
    console.error('Failed to add internal note:', error);
    return NextResponse.json(
      { success: false, error: err?.message || 'Không thể thêm ghi chú' },
      { status: 500 }
    );
  }
}

export const POST = withAdminContext(POSTHandler);
