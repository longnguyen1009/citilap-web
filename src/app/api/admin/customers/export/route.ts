import { requireAdmin } from '@/lib/auth';
import { getAllCustomersForExport } from '@/server/services/customer.service';
import { createCsvResponse } from '@/lib/csv-export';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const source = searchParams.get('source');

    const customers = await getAllCustomersForExport({ search, tier, source });

    const headers = [
      'Mã khách hàng',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'Nguồn khách hàng',
      'Phân hạng',
      'Số đơn hàng',
      'Tổng giá trị đơn không hủy (VND)',
      'Đơn hàng gần nhất',
      'Ngày tham gia / tạo đơn đầu',
    ];

    const rows = customers.map((c) => [
      c.id,
      c.name || '',
      c.phone || '',
      c.email || '',
      c.sourceLabel,
      c.tier,
      c.totalOrders,
      c.nonCancelledTotal ?? c.totalSpend,
      c.lastOrder ? new Date(c.lastOrder).toLocaleString('vi-VN') : '',
      new Date(c.createdAt).toLocaleString('vi-VN'),
    ]);

    const filename = `khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    return createCsvResponse(headers, rows, filename);
  } catch (error) {
    console.error('[ExportCustomers] Failed to export customers:', error);
    return new Response('Không thể xuất danh sách khách hàng', { status: 500 });
  }
}
