'use client';

import { useEffect } from 'react';
import { Zap, X, AlertCircle, AlertTriangle, Archive, Copy } from 'lucide-react';
import { type CampaignPickerTarget } from '@/components/admin/products/CampaignProductPicker';
import CampaignItemsTable from './CampaignItemsTable';
import {
  type CampaignData,
  type CampaignItemForm,
  isoToDatetimeLocalGmt7,
  datetimeLocalGmt7ToIso,
} from './types';

interface CampaignFormModalProps {
  open: boolean;
  editingCampaign: CampaignData | null;
  nowMs: number;
  formName: string;
  formDescription: string;
  formEnabled: boolean;
  formStartLocal: string;
  formEndLocal: string;
  durationHours: string;
  formItems: CampaignItemForm[];
  formRevision: number;
  saving: boolean;
  formError: string | null;
  onClose: () => void;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeEnabled: (v: boolean) => void;
  onChangeStartLocal: (v: string) => void;
  onChangeEndLocal: (v: string) => void;
  onChangeDurationHours: (v: string) => void;
  onAddEmptyItem: () => void;
  onPickerAddItems: (targets: CampaignPickerTarget[]) => void;
  onRemoveItem: (index: number) => void;
  onChangeItem: (index: number, field: keyof CampaignItemForm, value: string) => void;
  onApplyBulkDiscountPct: (pct: number) => void;
  onSave: (enabled?: boolean) => void;
  onCloneCampaign: (campaign: CampaignData) => void;
}

export default function CampaignFormModal({
  open,
  editingCampaign,
  nowMs,
  formName,
  formDescription,
  formEnabled,
  formStartLocal,
  formEndLocal,
  durationHours,
  formItems,
  formRevision,
  saving,
  formError,
  onClose,
  onChangeName,
  onChangeDescription,
  onChangeEnabled,
  onChangeStartLocal,
  onChangeEndLocal,
  onChangeDurationHours,
  onAddEmptyItem,
  onPickerAddItems,
  onRemoveItem,
  onChangeItem,
  onApplyBulkDiscountPct,
  onSave,
  onCloneCampaign,
}: CampaignFormModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById('campaign-editor');
    dialog?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]'
        ),
      ];
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isArchived = editingCampaign?.status === 'ARCHIVED';
  const isCurrentlyActive = Boolean(
    editingCampaign &&
      editingCampaign.status === 'PUBLISHED' &&
      nowMs >= new Date(editingCampaign.startAt).getTime() &&
      nowMs < new Date(editingCampaign.endAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="campaign-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-editor-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 id="campaign-editor-title" className="font-bold text-slate-900 text-sm">
              {editingCampaign
                ? isArchived
                  ? `Xem chiến dịch đã lưu trữ: ${editingCampaign.name}`
                  : `Sửa chiến dịch: ${editingCampaign.name}`
                : 'Tạo chiến dịch mới'}
            </h2>
            {editingCampaign && (
              <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                rev #{formRevision}
              </span>
            )}
          </div>
          <button
            aria-label="Đóng trình sửa chiến dịch"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-grow text-xs">
          {/* Archived Read-only Banner */}
          {isArchived && editingCampaign && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4 shrink-0 text-slate-600" />
                <div>
                  <strong className="font-bold">Chiến dịch đã lưu trữ (Chỉ xem):</strong> Chiến dịch đã lưu trữ không thể chỉnh sửa hoặc xuất bản lại. Hãy nhân bản để tạo chiến dịch mới.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCloneCampaign(editingCampaign)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Nhân bản chiến dịch</span>
              </button>
            </div>
          )}

          {/* Active Live Campaign Warning Banner */}
          {isCurrentlyActive && !isArchived && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-bold">Cảnh báo — Chiến dịch đang diễn ra trực tiếp trên Storefront!</strong>
                <p className="mt-0.5 text-amber-800">
                  Chiến dịch này đang áp dụng giá Flash Sale cho khách hàng ngay lúc này. Mọi thay đổi khi lưu sẽ lập tức cập nhật giá bán và giới hạn suất trên Storefront.
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chiến dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={isArchived}
                value={formName}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="VD: Flash Sale Cuối Tuần"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="sm:col-span-4 pt-5">
              <label
                className={`flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-900 ${
                  isArchived ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={isArchived}
                  checked={formEnabled}
                  onChange={(e) => onChangeEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span>Bật trên homepage</span>
              </label>
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả ngắn
              </label>
              <input
                type="text"
                disabled={isArchived}
                value={formDescription}
                onChange={(e) => onChangeDescription(e.target.value)}
                placeholder="Ghi chú hoặc mô tả ngắn cho chương trình (tuỳ chọn)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Quick Date/Time & Full Datetime-local */}
          <fieldset
            disabled={isArchived}
            className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 p-3 sm:grid-cols-4 bg-slate-50/50 disabled:opacity-65"
          >
            <legend className="px-1.5 text-[11px] font-bold text-slate-700">
              Chọn nhanh khung giờ trong ngày (GMT+7)
            </legend>
            <label className="text-[11px] font-semibold text-slate-600">
              Ngày sale
              <input
                type="date"
                value={formStartLocal.slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) {
                    onChangeStartLocal(`${e.target.value}T${formStartLocal.slice(11) || '10:00'}`);
                    onChangeEndLocal(`${e.target.value}T${formEndLocal.slice(11) || '12:00'}`);
                    onChangeDurationHours('');
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-600">
              Bắt đầu
              <input
                type="time"
                value={formStartLocal.slice(11)}
                onChange={(e) => {
                  onChangeStartLocal(`${formStartLocal.slice(0, 10)}T${e.target.value}`);
                  onChangeDurationHours('');
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-600">
              Kết thúc
              <input
                type="time"
                value={formEndLocal.slice(11)}
                onChange={(e) => {
                  const datePart = formEndLocal.slice(0, 10) || formStartLocal.slice(0, 10);
                  onChangeEndLocal(`${datePart}T${e.target.value}`);
                  onChangeDurationHours('');
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </label>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">
                Số giờ chạy
              </label>
              <input
                type="number"
                min="0.25"
                max="8760"
                step="0.25"
                value={durationHours}
                placeholder="VD: 2, 6, 24"
                onChange={(e) => {
                  const value = e.target.value;
                  onChangeDurationHours(value);
                  const hours = Number(value);
                  if (formStartLocal && Number.isFinite(hours) && hours > 0 && hours <= 8760) {
                    onChangeEndLocal(
                      isoToDatetimeLocalGmt7(
                        new Date(
                          new Date(datetimeLocalGmt7ToIso(formStartLocal)).getTime() +
                            hours * 3600000
                        ).toISOString()
                      )
                    );
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-normal"
              />
            </div>
            <div className="sm:col-span-4 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold">Tăng nhanh kết thúc:</span>
              {[
                { label: '2 giờ', h: 2 },
                { label: '4 giờ', h: 4 },
                { label: '8 giờ', h: 8 },
                { label: '24 giờ (1 ngày)', h: 24 },
                { label: '3 ngày', h: 72 },
                { label: '7 ngày', h: 168 },
              ].map(({ label, h }) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    if (!formStartLocal) return;
                    onChangeDurationHours(String(h));
                    const endIso = new Date(
                      new Date(datetimeLocalGmt7ToIso(formStartLocal)).getTime() + h * 3600000
                    ).toISOString();
                    onChangeEndLocal(isoToDatetimeLocalGmt7(endIso));
                  }}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-[11px] font-medium text-slate-700 transition cursor-pointer"
                >
                  +{label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Thời điểm bắt đầu (GMT+7) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                disabled={isArchived}
                value={formStartLocal}
                onChange={(e) => {
                  onChangeStartLocal(e.target.value);
                  const hours = Number(durationHours);
                  if (
                    e.target.value &&
                    durationHours &&
                    Number.isFinite(hours) &&
                    hours >= 0.25 &&
                    hours <= 8760
                  ) {
                    onChangeEndLocal(
                      isoToDatetimeLocalGmt7(
                        new Date(
                          new Date(datetimeLocalGmt7ToIso(e.target.value)).getTime() +
                            hours * 3600000
                        ).toISOString()
                      )
                    );
                  }
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Thời điểm kết thúc (GMT+7) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                disabled={isArchived}
                value={formEndLocal}
                onChange={(e) => {
                  onChangeDurationHours('');
                  onChangeEndLocal(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Items Table */}
          <CampaignItemsTable
            items={formItems}
            readOnly={isArchived}
            onAddEmptyRow={onAddEmptyItem}
            onPickerAdd={onPickerAddItems}
            onRemoveRow={onRemoveItem}
            onChangeRow={onChangeItem}
            onApplyBulkDiscountPct={onApplyBulkDiscountPct}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition cursor-pointer"
            >
              {isArchived ? 'Đóng' : 'Hủy'}
            </button>
            {editingCampaign && !isArchived && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onCloneCampaign(editingCampaign)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Nhân bản</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isArchived && editingCampaign ? (
              <button
                type="button"
                onClick={() => onCloneCampaign(editingCampaign)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Nhân bản chiến dịch thành bản nháp mới</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu & Tắt'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Đang xử lý...' : 'Lưu chiến dịch'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
