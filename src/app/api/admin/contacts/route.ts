import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listContactSubmissions } from '@/server/services/contact.service';

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    const result = await listContactSubmissions({ status, search, page, limit });

    return NextResponse.json(
      {
        success: true,
        data: result.contacts,
        pagination: result.pagination,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[AdminContactsAPI] Failed to fetch contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact submissions' },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
