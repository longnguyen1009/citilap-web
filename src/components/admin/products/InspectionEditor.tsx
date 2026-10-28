'use client';
import { useState } from 'react';
import { mediaRequest } from '../media/MediaBrowser';
import type { InspectionInput } from '@/contracts/catalog/inspection';

type Row = Omit<InspectionInput, 'published' | 'expectedUpdatedAt'> & {
  serialNumber: string;
  status: string;
  published: number;
  updatedAt: string | null;
  isDemo: number;
};

export default function InspectionEditor({ productId }: { productId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setBusy(true);
    setMessage('');
    try {
      setRows(await mediaRequest<Row[]>(`/api/admin/products/${productId}/inspections`));
      setLoaded(true);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>, row: Row) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const day = String(data.get('checkedAt'));
    const payload = {
      serialUnitId: row.serialUnitId,
      publicCode: data.get('publicCode'),
      checkedAt: `${day}T00:00:00+07:00`,
      batteryHealth: data.get('batteryHealth') === '' ? null : Number(data.get('batteryHealth')),
      appearance: data.get('appearance'),
      checks: data.get('checks'),
      limitations: data.get('limitations'),
      warranty: data.get('warranty'),
      published: data.has('published'),
      expectedUpdatedAt: row.updatedAt,
    };
    try {
      await mediaRequest(`/api/admin/products/${productId}/inspections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await load();
      setMessage('Đã lưu hồ sơ kiểm tra.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const control = 'mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs';
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Hồ sơ kiểm tra từng máy</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lưu riêng với nội dung sản phẩm. Chỉ công bố kết quả đã đo; serial nội bộ không xuất hiện trên website.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={load}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
        >
          {busy ? 'Đang tải…' : 'Tải danh sách máy'}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs text-blue-700 font-medium">
          {message}
        </p>
      )}
      {loaded && !rows.length && (
        <p className="mt-3 text-xs text-slate-500">Chưa có máy vật lý trong kho cho sản phẩm này.</p>
      )}
      {rows.map(row => (
        <form
          key={`${row.serialUnitId}-${row.updatedAt}`}
          onSubmit={event => save(event, row)}
          className="mt-4 space-y-2.5 border-t border-slate-200 pt-3"
        >
          <fieldset disabled={busy} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 font-mono">
                {row.serialNumber} · {row.status}
                {row.isDemo ? ' · Mẫu' : ''}
              </h3>
              <div className="flex items-center gap-3">
                {row.published === 1 && row.publicCode && row.status === 'AVAILABLE' && (
                  <a
                    href={`/order-tracking?code=${encodeURIComponent(row.publicCode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Xem chứng thư ↗
                  </a>
                )}
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" name="published" defaultChecked={row.published === 1} />
                  Công khai
                </label>
              </div>
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">
                Mã công khai
                <input
                  name="publicCode"
                  className={control}
                  defaultValue={row.publicCode || ''}
                  pattern="[a-zA-Z0-9_-]{2,64}"
                  required
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Ngày kiểm tra
                <input
                  name="checkedAt"
                  type="date"
                  className={control}
                  defaultValue={
                    row.checkedAt
                      ? new Intl.DateTimeFormat('en-CA', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }).format(new Date(row.checkedAt))
                      : ''
                  }
                  required
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Pin (%)
                <input
                  name="batteryHealth"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={control}
                  defaultValue={row.batteryHealth ?? ''}
                />
              </label>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {(['appearance', 'checks', 'limitations', 'warranty'] as const).map((key, index) => (
                <label className="block text-xs font-medium text-slate-600" key={key}>
                  {['Ngoại hình', 'Kết quả kiểm tra', 'Lưu ý', 'Bảo hành'][index]}
                  <textarea
                    rows={2}
                    name={key}
                    className={control}
                    maxLength={key === 'checks' ? 2000 : 1000}
                    defaultValue={row[key] || ''}
                    required={key !== 'limitations'}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                disabled={busy}
                className="rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Lưu hồ sơ
              </button>
            </div>
          </fieldset>
        </form>
      ))}
    </section>
  );
}
