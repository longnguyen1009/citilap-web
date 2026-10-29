import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listContactSubmissions } from '@/server/services/contact.service';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.min(Math.max(Number(searchParams.get('page') || 1), 1), 10000);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    if (!Number.isInteger(page) || !Number.isInteger(limit) || (search && search.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'Tham số truy vấn không hợp lệ.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await listContactSubmissions({ status, search, page, limit });

    return NextResponse.json(
      {
        success: true,
        data: result.contacts,
        pagination: result.pagination,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[AdminContactsAPI] Failed to fetch contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách liên hệ từ cơ sở dữ liệu.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export const GET = withAdminContext(GETHandler);
