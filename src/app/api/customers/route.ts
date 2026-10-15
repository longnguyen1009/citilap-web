import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listCustomers } from '@/server/services/customer.service';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const source = searchParams.get('source');
    const page = Math.min(Math.max(Number(searchParams.get('page') || 1), 1), 10000);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 1), 100);

    if (!Number.isInteger(page) || !Number.isInteger(limit) || (search && search.length > 100)) {
      return NextResponse.json({ success: false, error: 'Invalid query' }, { status: 400 });
    }

    const result = await listCustomers({ search, tier, source, page, limit });

    return NextResponse.json(
      {
        success: true,
        data: result.customers,
        pagination: result.pagination,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
}
