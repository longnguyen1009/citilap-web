import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import {
  updateContactSubmissionStatus,
  getContactSubmissionById,
  ContactStatus,
  ContactConflictError,
  SHARED_CONTACT_ACTOR,
} from '@/server/services/contact.service';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const contact = await getContactSubmissionById(params.id);
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu liên hệ' }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, data: contact },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: unknown) {
    console.error('[AdminContactsAPI] Failed to get contact:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải thông tin liên hệ' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const body = await request.json().catch(() => ({}));

    // CAS: expectedRevision is strictly required and must be an integer >= 0
    if (
      typeof body?.expectedRevision !== 'number' ||
      !Number.isInteger(body.expectedRevision) ||
      body.expectedRevision < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu hoặc sai định dạng expectedRevision (bắt buộc là số nguyên >= 0).',
          code: 'INVALID_REVISION',
        },
        { status: 400 }
      );
    }

    const rawStatus = body?.status !== undefined ? String(body.status).trim().toUpperCase() : undefined;
    if (rawStatus && rawStatus !== 'PENDING' && rawStatus !== 'PROCESSING' && rawStatus !== 'HANDLED') {
      return NextResponse.json(
        { success: false, error: 'Trạng thái không hợp lệ. Chỉ chấp nhận PENDING, PROCESSING hoặc HANDLED.', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Server-enforced actor: completely discard body.actor / body.handledBy
    const updated = await updateContactSubmissionStatus(params.id, {
      expectedRevision: body.expectedRevision,
      status: rawStatus as ContactStatus | undefined,
      internalNote: typeof body?.internalNote === 'string' ? body.internalNote : undefined,
      actor: SHARED_CONTACT_ACTOR,
    });

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: unknown) {
    if (error instanceof ContactConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'CONFLICT',
          currentRevision: error.currentRevision,
        },
        { status: 409 }
      );
    }

    const err = error as { message?: string; code?: string };
    if (err?.message === 'CONTACT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu liên hệ', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (err?.message?.startsWith('INVALID_TRANSITION') || err?.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { success: false, error: err.message || 'Chuyển đổi trạng thái không hợp lệ', code: 'INVALID_TRANSITION' },
        { status: 400 }
      );
    }
    if (err?.code === 'SAME_STATUS_NOOP') {
      return NextResponse.json(
        { success: false, error: 'Không có thay đổi trạng thái hoặc ghi chú mới', code: 'SAME_STATUS_NOOP' },
        { status: 400 }
      );
    }

    console.error('[AdminContactsAPI] Failed to update contact status:', error);
    return NextResponse.json({ success: false, error: 'Lỗi cập nhật trạng thái liên hệ' }, { status: 500 });
  }
}
