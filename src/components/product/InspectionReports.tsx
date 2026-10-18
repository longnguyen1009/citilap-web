import Link from 'next/link';
import { mediaEnvironment } from '@/server/media-http';
import { publicInspections } from '@/server/services/inspection.service';

export default async function InspectionReports({ productId, variantId }: { productId: string; variantId: string | null }) {
  const { DB } = await mediaEnvironment();
  const reports = await publicInspections(DB, productId, variantId);
  if (!reports.length) return null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-label="Hồ sơ kiểm tra từng máy">
    <h2 className="text-xl font-bold text-slate-900">Hồ sơ kiểm tra từng máy</h2>
    <p className="mt-2 text-sm text-slate-600">Hồ sơ chỉ áp dụng cho mã máy ghi bên dưới. Yêu cầu xác nhận đúng máy trước khi mua; gửi yêu cầu không giữ hàng.</p>
    <div className="mt-4 space-y-4">{reports.map(report => <article key={report.publicCode} className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">Máy {report.publicCode}</h3>
      {report.isDemo === 1 && <p className="mt-2 font-semibold text-amber-800">Dữ liệu kiểm định mẫu — chưa đo trên máy thật. Ảnh chỉ minh họa.</p>}
      <p className="mt-2 text-sm text-slate-500">Kiểm tra: {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(report.checkedAt))}</p>
      <dl className="mt-3 space-y-3 text-sm">{[
        ['Ngoại hình', report.appearance], ['Kết quả kiểm tra', report.checks],
        ['Sức khỏe pin', report.batteryHealth === null ? 'Chưa có kết quả đo' : `${report.batteryHealth}% dung lượng sạc đầy / thiết kế; không phải thời gian sử dụng`],
        ['Điểm cần lưu ý', report.limitations || 'Chưa ghi nhận; cần kiểm tra trực tiếp'], ['Bảo hành', report.warranty],
      ].map(([label, value]) => <div key={label}><dt className="font-semibold text-slate-700">{label}</dt><dd className="mt-1 whitespace-pre-line text-slate-600">{value}</dd></div>)}</dl>
      <Link className="mt-4 inline-block font-semibold text-blue-700 underline" href={`/lien-he?intent=appointment&product=${encodeURIComponent(productId)}&unit=${encodeURIComponent(report.publicCode)}`}>Hẹn xem máy này</Link>
    </article>)}</div>
  </section>;
}
