import { requireAdmin } from '@/lib/auth';
import { getAllContactsForExport } from '@/server/services/contact.service';
import { createCsvResponse } from '@/lib/csv-export';

const CONTACT_STATUS_MAP: Record<string, string> = {
  PENDING: 'Mới',
  PROCESSING: 'Đang xử lý',
  HANDLED: 'Đã xử lý',
};

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const contacts = await getAllContactsForExport({ status, search });

    const headers = [
      'Mã liên hệ',
      'Ngày gửi',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'Nội dung tin nhắn',
      'Trạng thái',
      'Ghi chú nội bộ',
      'Thời gian xử lý',
      'Người xử lý',
    ];

    const rows = contacts.map((c) => [
      c.id,
      new Date(c.createdAt).toLocaleString('vi-VN'),
      c.name,
      c.phone,
      c.email || '',
      c.message || '',
      CONTACT_STATUS_MAP[c.status] || c.status,
      c.internalNote || '',
      c.handledAt ? new Date(c.handledAt).toLocaleString('vi-VN') : '',
      c.handledBy || '',
    ]);

    const filename = `lien-he-${new Date().toISOString().slice(0, 10)}.csv`;
    return createCsvResponse(headers, rows, filename);
  } catch (error) {
    console.error('[ExportContacts] Failed to export contacts:', error);
    return new Response('Không thể xuất danh sách liên hệ', { status: 500 });
  }
}
