import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listCustomers } from '@/server/services/customer.service';

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const source = searchParams.get('source');
    const page = Math.min(Math.max(Number(searchParams.get('page') || 1), 1), 10000);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 1), 100);

    if (!Number.isInteger(page) || !Number.isInteger(limit) || (search && search.length > 100)) {
      return NextResponse.json({ success: false, error: 'Tham số truy vấn không hợp lệ.' }, { status: 400 });
    }

    const result = await listCustomers({ search, tier, source, page, limit });

    return NextResponse.json(
      {
        success: true,
        data: result.customers,
        pagination: result.pagination,
        summary: result.summary,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách khách hàng từ cơ sở dữ liệu.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

export const GET = withAdminContext(GETHandler);
