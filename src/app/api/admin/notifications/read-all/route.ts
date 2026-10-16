import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { authenticatedAdmin, requireAdminMutation } from '@/lib/auth';
import { markPersonalNotificationsRead } from '@/server/services/notification.service';
import { mediaEnvironment } from '@/server/media-http';

async function POSTHandler(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const result = await markPersonalNotificationsRead((await mediaEnvironment()).DB, authenticatedAdmin(request).id);
    return NextResponse.json(
      { success: true, count: result.count },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[AdminNotificationsAPI] Failed to mark all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể đánh dấu tất cả là đã đọc' },
      { status: 500 }
    );
  }
}

export const POST = withAdminContext(POSTHandler);
