import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listAdminNotifications } from '@/server/services/notification.service';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const onlyUnread = searchParams.get('unread') === 'true';

    const result = await listAdminNotifications({ limit, onlyUnread });

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
