import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { markNotificationAsRead } from '@/server/services/notification.service';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const updated = await markNotificationAsRead(params.id);

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
