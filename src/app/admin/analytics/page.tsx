import Link from 'next/link';
import { mediaEnvironment } from '@/server/media-http';
import {
  Eye,
  Search,
  ShoppingCart,
  CreditCard,
  PhoneCall,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { PageHeader, AdminCard } from '@/components/admin/ui';

interface MetricRow {
  day: string;
  event: string;
  count: number;
}

const PAGE_SIZE = 50;

const EVENT_CONFIG: Record<
  string,
  { label: string; description: string; icon: typeof Eye; color: string; badge: string }
> = {
  page_view: {
    label: 'Xem trang chung',
    description: 'Lượt mở trang chủ, danh mục hoặc tin tức',
    icon: Layers,
    color: 'text-slate-600 bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  },
  view_item: {
    label: 'Xem chi tiết sản phẩm',
    description: 'Khách hàng truy cập trang sản phẩm (PDP)',
    icon: Eye,
    color: 'text-blue-600 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  search: {
    label: 'Tìm kiếm có kết quả',
    description: 'Khách nhập từ khóa tìm sản phẩm',
    icon: Search,
    color: 'text-sky-600 bg-sky-50',
    badge: 'bg-sky-100 text-sky-700',
  },
  search_empty: {
    label: 'Tìm kiếm không có hàng',
    description: 'Từ khóa tìm kiếm trả về 0 sản phẩm',
    icon: Search,
    color: 'text-amber-600 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
  },
  compare: {
    label: 'Mở bảng so sánh',
    description: 'Khách đưa sản phẩm vào so sánh cấu hình',
    icon: Layers,
    color: 'text-indigo-600 bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  add_to_cart: {
    label: 'Thêm vào giỏ hàng',
    description: 'Bấm nút "Thêm vào giỏ" hoặc chọn cấu hình',
    icon: ShoppingCart,
    color: 'text-emerald-600 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  begin_checkout: {
    label: 'Mở trang thanh toán',
    description: 'Khách chuyển từ giỏ hàng sang form đặt hàng',
    icon: CreditCard,
    color: 'text-violet-600 bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',
  },
  order_requested: {
    label: 'Đặt hàng thành công',
    description: 'Gửi đơn hàng hoàn tất về hệ thống',
    icon: Sparkles,
    color: 'text-pink-600 bg-pink-50',
    badge: 'bg-pink-100 text-pink-700',
  },
  contact_click: {
    label: 'Bấm gọi / Chat Zalo',
    description: 'Bấm vào hotline, nút Zalo hoặc Messenger',
    icon: PhoneCall,
    color: 'text-teal-600 bg-teal-50',
    badge: 'bg-teal-100 text-teal-700',
  },
  appointment_requested: {
    label: 'Đặt hẹn xem máy',
    description: 'Khách gửi form hẹn trải nghiệm máy tại cửa hàng',
    icon: Calendar,
    color: 'text-orange-600 bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; page?: string }>;
}) {
  const sp = (await searchParams) || {};
  const range = ['7d', '30d', '90d', 'all'].includes(String(sp.range)) ? String(sp.range) : '30d';
  const daysOffset = range === '7d' ? '-6 days' : range === '90d' ? '-89 days' : '-29 days';
  const rangeLabel =
    range === '7d' ? '7 ngày' : range === '90d' ? '90 ngày' : range === 'all' ? 'Toàn thời gian' : '30 ngày';

  const parsedPage = Number.parseInt(String(sp.page ?? '1'), 10);
  const requestedPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const eventTotals: Record<string, number> = {};
  let grandTotal = 0;
  let totalRecords = 0;
  let totalDays = 0;
  let maxDayCount = 1;
  let totalPages = 1;
  let currentPage = 1;
  let offset = 0;
  let results: MetricRow[] = [];
  let dbFailed = false;

  try {
    const { DB } = await mediaEnvironment();
    const summaryRow = await (
      range === 'all'
        ? DB.prepare(
            'SELECT COUNT(*) AS totalRecords, COUNT(DISTINCT day) AS totalDays, COALESCE(MAX(count), 1) AS maxCount FROM StorefrontMetric'
          )
        : DB.prepare(
            `SELECT COUNT(*) AS totalRecords, COUNT(DISTINCT day) AS totalDays, COALESCE(MAX(count), 1) AS maxCount FROM StorefrontMetric WHERE day>=date('now','+7 hours',?)`
          ).bind(daysOffset)
    ).first<{ totalRecords: number; totalDays: number; maxCount: number }>();

    const { results: eventRows } = await (
      range === 'all'
        ? DB.prepare('SELECT event, COALESCE(SUM(count), 0) AS count FROM StorefrontMetric GROUP BY event')
        : DB.prepare(
            `SELECT event, COALESCE(SUM(count), 0) AS count FROM StorefrontMetric WHERE day>=date('now','+7 hours',?) GROUP BY event`
          ).bind(daysOffset)
    ).all<{ event: string; count: number }>();

    for (const r of eventRows) {
      const c = Number(r.count) || 0;
      eventTotals[r.event] = (eventTotals[r.event] || 0) + c;
      grandTotal += c;
    }

    totalRecords = Number(summaryRow?.totalRecords ?? 0);
    totalDays = Number(summaryRow?.totalDays ?? 0);
    maxDayCount = Math.max(1, Number(summaryRow?.maxCount ?? 1));
    totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    currentPage = Math.min(requestedPage, totalPages);
    offset = (currentPage - 1) * PAGE_SIZE;

    const { results: pageRows } = await (
      range === 'all'
        ? DB.prepare(
            'SELECT day,event,count FROM StorefrontMetric ORDER BY day DESC,count DESC,event ASC LIMIT ? OFFSET ?'
          ).bind(PAGE_SIZE, offset)
        : DB.prepare(
            `SELECT day,event,count FROM StorefrontMetric WHERE day>=date('now','+7 hours',?) ORDER BY day DESC,count DESC,event ASC LIMIT ? OFFSET ?`
          ).bind(daysOffset, PAGE_SIZE, offset)
    ).all<MetricRow>();

    results = pageRows;
  } catch {
    dbFailed = true;
  }

  const rangeSelector = (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
      {[
        { key: '7d', label: '7 ngày' },
        { key: '30d', label: '30 ngày' },
        { key: '90d', label: '90 ngày' },
        { key: 'all', label: 'Tất cả' },
      ].map((opt) => (
        <Link
          key={opt.key}
          href={`/admin/analytics?range=${opt.key}`}
          className={`px-2.5 py-1 rounded-md transition font-semibold ${
            range === opt.key
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );

  if (dbFailed) {
    const retryHref = `/admin/analytics?range=${range}${requestedPage > 1 ? `&page=${requestedPage}` : ''}`;
    return (
      <div className="space-y-3">
        <PageHeader title={`Thống kê Storefront (${rangeLabel})`} actions={rangeSelector} />
        <div
          role="alert"
          className="p-6 sm:p-8 bg-red-50/70 border border-red-200 rounded-xl text-center max-w-xl mx-auto my-8"
        >
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-red-900 mb-1.5">Không thể tải dữ liệu thống kê</h3>
          <p className="text-xs sm:text-sm text-red-700 mb-6 leading-relaxed">
            Đã xảy ra lỗi khi truy vấn dữ liệu thống kê Storefront cho khoảng thời gian ({rangeLabel}). Vui lòng thử lại.
          </p>
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Thử lại
          </Link>
        </div>
      </div>
    );
  }

  const viewsCount = eventTotals['view_item'] || 0;
  const searchCount = (eventTotals['search'] || 0) + (eventTotals['search_empty'] || 0);
  const cartCount = eventTotals['add_to_cart'] || 0;
  const checkoutCount = eventTotals['begin_checkout'] || 0;
  const orderCount = eventTotals['order_requested'] || 0;
  const contactCount = (eventTotals['contact_click'] || 0) + (eventTotals['appointment_requested'] || 0);

  // Conversion rates
  const viewToCartRate = viewsCount > 0 ? ((cartCount / viewsCount) * 100).toFixed(1) : '0';
  const cartToOrderRate = cartCount > 0 ? ((orderCount / cartCount) * 100).toFixed(1) : '0';

  // Unique days on current page
  const pageDaysCount = new Set(results.map((r) => r.day)).size;

  return (
    <div className="space-y-3">
      {/* Page Header */}
      <PageHeader
        title={`Thống kê Storefront (${rangeLabel})`}
        badge={
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {grandTotal.toLocaleString('vi-VN')} tương tác
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              CVR Giỏ→Đơn: {cartToOrderRate}%
            </span>
          </div>
        }
        actions={rangeSelector}
      />

      {/* Compact KPI & Funnel Strip */}
      <div className="grid grid-cols-5 gap-2.5">
        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">1. Xem SP (PDP)</div>
            <div className="text-base font-bold text-slate-900">{viewsCount.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-blue-600 font-medium">
              {grandTotal > 0 ? ((viewsCount / grandTotal) * 100).toFixed(1) : 0}% tổng lượt
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">2. Thêm vào giỏ</div>
            <div className="text-base font-bold text-emerald-700">{cartCount.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-emerald-600 font-medium">{viewToCartRate}% từ xem SP</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">3. Mở thanh toán</div>
            <div className="text-base font-bold text-violet-700">{checkoutCount.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-violet-600 font-medium">
              {cartCount > 0 ? ((checkoutCount / cartCount) * 100).toFixed(1) : 0}% từ giỏ hàng
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">4. Chốt đơn & Tư vấn</div>
            <div className="text-base font-bold text-pink-700">{(orderCount + contactCount).toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-slate-500 font-medium">
              {orderCount} đơn · {contactCount} gọi/Zalo
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tìm kiếm từ khóa</div>
            <div className="text-base font-bold text-slate-900">{searchCount.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-amber-600 font-medium">
              0 kết quả: {(eventTotals['search_empty'] || 0).toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Tables */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left: Summary by Event Type (5 cols) */}
        <div className="col-span-5">
          <AdminCard title="Tổng hợp theo hành vi" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">Sự kiện</th>
                    <th className="py-2.5 px-3 text-right">Lượt</th>
                    <th className="py-2.5 px-3.5 text-right">Tỉ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(EVENT_CONFIG).map(([evtKey, cfg]) => {
                    const count = eventTotals[evtKey] || 0;
                    const pct = grandTotal > 0 ? ((count / grandTotal) * 100).toFixed(1) : '0';
                    const IconComponent = cfg.icon;

                    return (
                      <tr key={evtKey} className="hover:bg-slate-50/80 transition" title={cfg.description}>
                        <td className="py-2 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${cfg.color}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-800">{cfg.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {count.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3.5 text-right text-slate-500 font-mono text-[11px]">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        {/* Right: Daily Breakdown Table (7 cols) */}
        <div className="col-span-7">
          <AdminCard
            title={`Chi tiết theo ngày (${totalDays.toLocaleString('vi-VN')} ngày có phát sinh)`}
            bodyClassName="p-0"
          >
            {results.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {range === 'all'
                  ? `Chưa có dữ liệu thống kê nào được ghi nhận (${rangeLabel}).`
                  : `Chưa có dữ liệu thống kê nào được ghi nhận trong ${rangeLabel} qua.`}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="admin-table w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3.5">Ngày (GMT+7)</th>
                      <th className="py-2.5 px-3.5">Hành vi</th>
                      <th className="py-2.5 px-3.5 text-right">Lượt</th>
                      <th className="py-2.5 px-3.5 w-28">Mức độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((row) => {
                      const cfg = EVENT_CONFIG[row.event] || {
                        label: row.event,
                        badge: 'bg-slate-100 text-slate-700',
                      };
                      const barWidth = Math.max(4, Math.round((row.count / maxDayCount) * 100));

                      return (
                        <tr key={`${row.day}-${row.event}`} className="hover:bg-blue-50/30 transition">
                          <td className="py-2 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {row.day}
                          </td>
                          <td className="py-2 px-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2 px-3.5 text-right font-bold text-slate-900 font-mono text-[11px]">
                            {row.count.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3.5">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between gap-2 flex-wrap">
              <span>
                {totalRecords === 0
                  ? '0 bản ghi · 0 ngày (GMT+7)'
                  : `Hiển thị ${(offset + 1).toLocaleString('vi-VN')}–${(offset + results.length).toLocaleString('vi-VN')} / ${totalRecords.toLocaleString('vi-VN')} bản ghi (${results.length} bản ghi · ${pageDaysCount} ngày trang này / tổng ${totalDays.toLocaleString('vi-VN')} ngày GMT+7)`}
              </span>
              <div className="flex items-center gap-2">
                {totalPages > 1 && (
                  <nav aria-label="Phân trang chi tiết theo ngày" className="inline-flex items-center gap-1.5">
                    {currentPage > 1 ? (
                      <Link
                        href={`/admin/analytics?range=${range}&page=${currentPage - 1}`}
                        className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold transition"
                      >
                        Trang trước
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                      >
                        Trang trước
                      </span>
                    )}
                    <span className="font-semibold text-slate-700 px-1">
                      Trang {currentPage}/{totalPages}
                    </span>
                    {currentPage < totalPages ? (
                      <Link
                        href={`/admin/analytics?range=${range}&page=${currentPage + 1}`}
                        className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold transition"
                      >
                        Trang sau
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                      >
                        Trang sau
                      </span>
                    )}
                  </nav>
                )}
                <span>Ghi nhận ẩn danh theo lượt thao tác trình duyệt (First-party telemetry)</span>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
