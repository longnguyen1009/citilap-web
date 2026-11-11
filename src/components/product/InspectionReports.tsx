import Link from 'next/link';
import { ShieldCheck, BatteryCharging, Calendar, CheckCircle2, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
import { getCachedInspections } from '@/server/services/storefront-cms.service';

export default async function InspectionReports({ productId, variantId }: { productId: string; variantId: string | null }) {
  const reports = await getCachedInspections(productId, variantId);
  if (!reports.length) return null;

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5" aria-label="Hồ sơ kiểm tra từng máy">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chứng thư kiểm định 24 bước độc quyền</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            Hồ sơ kiểm tra từng máy ({reports.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hồ sơ chỉ áp dụng cho đúng mã máy ghi bên dưới. Yêu cầu xác nhận đúng mã máy và cấu hình thực tế trước khi mua; gửi yêu cầu không giữ hàng.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map((report) => {
          const battery = report.batteryHealth;
          const batteryColor =
            battery === null
              ? 'bg-slate-300'
              : battery >= 90
              ? 'bg-emerald-500'
              : battery >= 80
              ? 'bg-blue-500'
              : 'bg-amber-500';
          const batteryBadge =
            battery === null
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : battery >= 90
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : battery >= 80
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-amber-50 text-amber-800 border-amber-200';

          return (
            <article
              key={report.publicCode}
              className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5 space-y-4 shadow-2xs"
            >
              {/* Header row: Code + Date + Variant scope */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs sm:text-sm font-black font-mono text-white">
                    #{report.publicCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Kiểm tra:{' '}
                      {new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Ho_Chi_Minh',
                      }).format(new Date(report.checkedAt))}
                    </span>
                  </span>
                </div>

                {variantId && !report.variantId && (
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Hồ sơ cấp dòng máy — chưa gắn riêng biến thể đang chọn
                  </span>
                )}
              </div>

              {report.isDemo === 1 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2 text-xs font-semibold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Dữ liệu kiểm định mẫu — chưa đo trên máy thật. Ảnh chỉ minh họa.</span>
                </div>
              )}

              {variantId && !report.variantId && (
                <p className="text-xs text-slate-600 bg-slate-100/80 rounded-lg px-3 py-2">
                  Chiếc máy #{report.publicCode} được lưu ở cấp dòng sản phẩm chung, chưa định danh riêng theo biến thể cấu hình đang chọn. Vui lòng đối chiếu cấu hình thực tế của mã máy này khi xem máy hoặc đặt mua.
                </p>
              )}

              {/* Battery Health Visual Meter */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-emerald-600" />
                    <span>Sức khỏe Pin thực tế:</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border text-xs ${batteryBadge}`}>
                    {battery === null ? 'Chưa có kết quả đo' : `${battery}% dung lượng sạc đầy / thiết kế`}
                  </span>
                </div>
                {battery !== null && (
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${batteryColor}`}
                      style={{ width: `${Math.max(5, Math.min(100, battery))}%` }}
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  {battery === null
                    ? 'Chưa có kết quả đo dung lượng pin trên hồ sơ này.'
                    : `${battery}% dung lượng sạc đầy / thiết kế; không phải thời gian sử dụng thực tế.`}
                </p>
              </div>

              {/* 2-Column Details Grid */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                  <dt className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Ngoại hình thực tế</span>
                  </dt>
                  <dd className="mt-1.5 whitespace-pre-line text-slate-600 leading-relaxed">
                    {report.appearance}
                  </dd>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                  <dt className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kết quả kiểm tra phần cứng</span>
                  </dt>
                  <dd className="mt-1.5 whitespace-pre-line text-slate-600 leading-relaxed">
                    {report.checks}
                  </dd>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                  <dt className="font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Điểm cần lưu ý</span>
                  </dt>
                  <dd className="mt-1.5 whitespace-pre-line text-slate-600 leading-relaxed">
                    {report.limitations || 'Chưa ghi nhận; cần kiểm tra trực tiếp'}
                  </dd>
                </div>

                <div className="rounded-xl bg-white border border-slate-200/70 p-3.5">
                  <dt className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Chế độ bảo hành áp dụng</span>
                  </dt>
                  <dd className="mt-1.5 whitespace-pre-line text-slate-600 leading-relaxed">
                    {report.warranty}
                  </dd>
                </div>
              </dl>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <Link
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition"
                  href={`/lien-he?intent=appointment&product=${encodeURIComponent(productId)}&unit=${encodeURIComponent(report.publicCode)}`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Hẹn xem máy này (#{report.publicCode})</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-700 transition"
                  href={`/order-tracking?code=${encodeURIComponent(report.publicCode)}`}
                >
                  <span>Xem chứng thư kiểm định (#{report.publicCode})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
