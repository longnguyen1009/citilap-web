import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { authenticatedAdmin, requireAdmin } from '@/lib/auth';
import { listPersonalNotifications } from '@/server/services/notification.service';
import { mediaEnvironment } from '@/server/media-http';

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const onlyUnread = searchParams.get('unread') === 'true';

    const result = await listPersonalNotifications((await mediaEnvironment()).DB, authenticatedAdmin(request).id, limit, onlyUnread);

    return NextResponse.json(
      {
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[AdminNotificationsAPI] Failed to fetch notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể lấy danh sách thông báo' },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
