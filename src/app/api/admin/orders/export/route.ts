import { requireAdmin } from '@/lib/auth';
import { getAllOrdersForExport, ORDER_STATUS_LABELS } from '@/server/services/order.service';
import { createCsvResponse } from '@/lib/csv-export';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const orders = await getAllOrdersForExport({
      status,
      search,
      startDate,
      endDate,
    });

    const headers = [
      'Mã đơn hàng',
      'Ngày tạo',
      'Khách hàng',
      'Số điện thoại',
      'Email',
      'Địa chỉ giao hàng',
      'Trạng thái',
      'Phương thức thanh toán',
      'Tạm tính (VND)',
      'Phí vận chuyển (VND)',
      'Tổng tiền (VND)',
      'Sản phẩm tóm tắt',
      'Ghi chú của khách',
    ];

    const rows = orders.map((o) => {
      const itemsSummary = o.items
        .map((it) => {
          const name = it.productNameSnapshot || it.productName || 'Sản phẩm';
          const variant = it.variantNameSnapshot ? ` (${it.variantNameSnapshot})` : '';
          return `${name}${variant} x${it.quantity}`;
        })
        .join('; ');

      return [
        o.orderNumber || o.id,
        new Date(o.createdAt).toLocaleString('vi-VN'),
        o.customerName,
        o.customerPhone,
        o.customerEmail || '',
        o.shippingAddress || '',
        ORDER_STATUS_LABELS[o.status] || o.status,
        o.paymentMethod,
        o.subtotalAmount,
        o.shippingFee,
        o.totalAmount,
        itemsSummary,
        o.note || '',
      ];
    });

    const filename = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    return createCsvResponse(headers, rows, filename);
  } catch (error) {
    console.error('[ExportOrders] Failed to export orders:', error);
    return new Response('Không thể xuất danh sách đơn hàng', { status: 500 });
  }
}
