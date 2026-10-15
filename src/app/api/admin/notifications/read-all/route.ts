import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { markAllNotificationsAsRead } from '@/server/services/notification.service';

export async function POST(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const result = await markAllNotificationsAsRead();
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
