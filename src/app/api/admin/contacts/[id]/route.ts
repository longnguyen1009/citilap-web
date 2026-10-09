import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { updateContactSubmissionStatus } from '@/server/services/contact.service';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const body = await request.json();

    const rawStatus = String(body?.status || '').trim().toUpperCase();
    if (rawStatus !== 'PENDING' && rawStatus !== 'HANDLED') {
      return NextResponse.json(
        { success: false, error: 'Trạng thái không hợp lệ. Chỉ chấp nhận PENDING hoặc HANDLED.' },
        { status: 400 }
      );
    }

    const updated = await updateContactSubmissionStatus(params.id, rawStatus as 'PENDING' | 'HANDLED');

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message === 'CONTACT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu liên hệ' }, { status: 404 });
    }
    console.error('[AdminContactsAPI] Failed to update contact status:', error);
    return NextResponse.json({ success: false, error: 'Lỗi cập nhật trạng thái liên hệ' }, { status: 500 });
  }
}
