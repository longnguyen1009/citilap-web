'use client';
import { useState } from 'react';
import { mediaRequest } from '../media/MediaBrowser';
import type { InspectionInput } from '@/contracts/catalog/inspection';

type Row = Omit<InspectionInput, 'published' | 'expectedUpdatedAt'> & { serialNumber: string; status: string; published: number; updatedAt: string | null; isDemo: number };
export default function InspectionEditor({ productId }: { productId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    setBusy(true); setMessage('');
    try { setRows(await mediaRequest<Row[]>(`/api/admin/products/${productId}/inspections`)); setLoaded(true); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>, row: Row) {
    event.preventDefault(); setBusy(true); setMessage('');
    const data = new FormData(event.currentTarget);
    const day = String(data.get('checkedAt'));
    const payload = { serialUnitId: row.serialUnitId, publicCode: data.get('publicCode'), checkedAt: `${day}T00:00:00+07:00`, batteryHealth: data.get('batteryHealth') === '' ? null : Number(data.get('batteryHealth')), appearance: data.get('appearance'), checks: data.get('checks'), limitations: data.get('limitations'), warranty: data.get('warranty'), published: data.has('published'), expectedUpdatedAt: row.updatedAt };
    try { await mediaRequest(`/api/admin/products/${productId}/inspections`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); await load(); setMessage('Đã lưu hồ sơ kiểm tra.'); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const control = 'mt-1 w-full rounded border border-slate-300 p-2 text-sm';
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-bold">Hồ sơ kiểm tra từng máy</h2><p className="my-2 text-sm text-slate-600">Lưu riêng với nội dung sản phẩm. Chỉ công bố kết quả đã đo; serial nội bộ không xuất hiện trên website.</p>
    <button type="button" disabled={busy} onClick={load} className="rounded border px-3 py-2 text-sm">{busy ? 'Đang xử lý…' : 'Tải hồ sơ máy'}</button>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {loaded && !rows.length && <p className="mt-3 text-sm">Chưa có máy vật lý trong kho cho sản phẩm này.</p>}
    {rows.map(row => <form key={`${row.serialUnitId}-${row.updatedAt}`} onSubmit={event => save(event, row)} className="mt-4 space-y-3 border-t pt-4">
      <fieldset disabled={busy} className="space-y-3">
      <h3 className="font-semibold">{row.serialNumber} · {row.status}{row.isDemo ? ' · Mẫu' : ''}</h3>
      <div className="grid gap-3 md:grid-cols-3"><label className="text-sm">Mã hiển thị công khai<input name="publicCode" className={control} defaultValue={row.publicCode || ''} pattern="[a-zA-Z0-9_-]{2,64}" required /></label><label className="text-sm">Ngày kiểm tra (GMT+7)<input name="checkedAt" type="date" className={control} defaultValue={row.checkedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(row.checkedAt)) : ''} required /></label><label className="text-sm">Sức khỏe pin (%)<input name="batteryHealth" type="number" min="0" max="100" step="1" className={control} defaultValue={row.batteryHealth ?? ''} /></label></div>
      {(['appearance', 'checks', 'limitations', 'warranty'] as const).map((key, index) => <label className="block text-sm" key={key}>{['Ngoại hình', 'Kết quả kiểm tra', 'Điểm cần lưu ý', 'Bảo hành áp dụng'][index]}<textarea name={key} className={control} maxLength={key === 'checks' ? 2000 : 1000} defaultValue={row[key] || ''} required={key !== 'limitations'} /></label>)}
      <label className="flex gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={row.published === 1} />Công bố hồ sơ khi máy còn sẵn hàng</label>
      <button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-white">Lưu hồ sơ máy</button>
      </fieldset>
    </form>)}
  </section>;
}
