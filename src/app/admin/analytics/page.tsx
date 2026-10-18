import { mediaEnvironment } from '@/server/media-http';

export default async function AnalyticsPage() {
  const { DB } = await mediaEnvironment();
  const { results } = await DB.prepare("SELECT day,event,count FROM StorefrontMetric WHERE day>=date('now','+7 hours','-29 days') ORDER BY day DESC,event").all<{ day: string; event: string; count: number }>();
  const labels: Record<string, string> = { page_view: 'Xem trang', view_item: 'Xem sản phẩm', search: 'Tìm kiếm', search_empty: 'Tìm kiếm không có kết quả', compare: 'Mở so sánh', add_to_cart: 'Thêm giỏ', begin_checkout: 'Mở checkout', order_requested: 'Gửi đơn thành công', contact_click: 'Bấm gọi / Zalo', appointment_requested: 'Gửi lịch hẹn' };
  return <div className="space-y-4 p-6"><h1 className="text-2xl font-bold">Hành vi mua hàng — 30 ngày</h1><p className="text-sm text-slate-600">Ngày GMT+7. Số lượt thao tác từ trình duyệt đồng ý thống kê; không phải số khách duy nhất, đơn đã xác nhận hoặc doanh thu. Chặn quảng cáo, tải lại trang và lưu lượng tự động có thể ảnh hưởng số liệu.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Ngày</th><th className="p-3">Thao tác</th><th className="p-3">Lượt</th></tr></thead><tbody>{results.map(row => <tr key={`${row.day}-${row.event}`} className="border-t"><td className="p-3">{row.day}</td><td className="p-3">{labels[row.event]}</td><td className="p-3">{row.count}</td></tr>)}</tbody></table></div>{!results.length && <p>Chưa có lượt thống kê được đồng ý ghi nhận.</p>}</div>;
}
