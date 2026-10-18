import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import { advisorSchema } from '@/contracts/catalog/advisor';
import { adviseLaptops } from '@/server/services/advisor.service';

export const metadata = { title: 'Chọn laptop theo nhu cầu | CitiLap', alternates: { canonical: 'https://citilap.vn/chon-laptop' }, robots: { index: false, follow: true } };

export default async function LaptopAdvisor({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const parsed = advisorSchema.safeParse(query);
  const input = parsed.success ? parsed.data : advisorSchema.parse({});
  let results: Awaited<ReturnType<typeof adviseLaptops>> = [];
  let error = parsed.success ? '' : 'Thông tin lựa chọn không hợp lệ. Ngân sách từ 5 đến 200 triệu đồng.';
  if (parsed.success) {
    try { results = await adviseLaptops(input); }
    catch { error = 'Chưa tải được danh sách máy. Vui lòng thử lại hoặc liên hệ tư vấn.'; }
  }
  const control = 'mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900';
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <div><p className="text-sm font-semibold text-blue-700">CitiLap tư vấn cấu hình</p><h1 className="mt-2 text-3xl font-bold">Chọn laptop theo nhu cầu</h1><p className="mt-3 text-slate-600">Chọn ngân sách và công việc. Xem tối đa 3 máy cùng lý do phù hợp và điểm cần cân nhắc.</p></div>
    <form action="/chon-laptop" className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold">Ngân sách tối đa (VND)<input className={control} name="budget" type="number" min="5000000" max="200000000" step="100000" defaultValue={input.budget} required /></label>
      <label className="text-sm font-semibold">Nhu cầu chính<select name="need" className={control} defaultValue={input.need}><option value="office">Văn phòng / học tập / lập trình</option><option value="gaming">Gaming</option><option value="creator">Đồ họa / dựng video / CAD</option></select></label>
      <label className="text-sm font-semibold">Tình trạng<select name="condition" className={control} defaultValue={input.condition}><option value="any">Mới hoặc đã sử dụng</option><option value="NEW">Máy mới</option><option value="USED">Đã sử dụng / Like New</option></select></label>
      <label className="text-sm font-semibold">Mang đi thường xuyên<select name="portable" className={control} defaultValue={input.portable}><option value="any">Không giới hạn trọng lượng</option><option value="yes">Máy tối đa 1,6 kg</option></select></label>
      <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white sm:col-span-2 lg:col-span-4">Tìm máy phù hợp</button>
    </form>
    <p className="text-sm text-slate-600">Gợi ý theo cấu hình đã công bố, RAM từ 16GB. Không phải cam kết FPS, pin hay tương thích phần mềm. Giá được kiểm tra lại khi đặt hàng.</p>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : results.length ? <div className="grid gap-6 md:grid-cols-3">{results.map(({ product, reasons, limitation }) => <section key={product.id} className="min-w-0 space-y-3"><ProductCard product={product} /><div className="rounded-xl border border-slate-200 p-4 text-sm"><h2 className="font-bold">Vì sao có trong gợi ý?</h2><ul className="mt-2 list-disc space-y-1 pl-5">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="mt-3 text-amber-900"><strong>Cân nhắc: </strong>{limitation}</p></div></section>)}</div> : <p className="rounded-xl bg-amber-50 p-5">Chưa có máy đáp ứng đủ lựa chọn. Thử đổi tiêu chí hoặc nhờ tư vấn; ngân sách không được tự tăng.</p>}
    <Link href="/lien-he" className="inline-block font-semibold text-blue-700 underline">Cần kiểm tra phần mềm cụ thể? Gửi yêu cầu tư vấn</Link>
  </div>;
}
