import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { authenticatedAdmin, requireAdminMutation } from '@/lib/auth';
import { markPersonalNotificationsRead } from '@/server/services/notification.service';
import { mediaEnvironment } from '@/server/media-http';

async function PATCHHandler(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const updated = await markPersonalNotificationsRead((await mediaEnvironment()).DB, authenticatedAdmin(request).id, params.id);

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[AdminNotificationsAPI] Failed to mark notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật thông báo' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminContext(PATCHHandler);
