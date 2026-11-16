'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { getCampaignPhase } from '@/lib/campaign-schedule';
import { Zap, X, AlertCircle, AlertTriangle, Archive, Copy, Plus, Trash2, Clock } from 'lucide-react';
import { type CampaignPickerTarget } from '@/components/admin/products/CampaignProductPicker';
import CampaignItemsTable from './CampaignItemsTable';
import {
  type CampaignData,
  type CampaignItemForm,
  type DailySlotForm,
  type ScheduleMode,
} from './types';
import { VnDateField, VnTimeField } from './VnScheduleFields';
import {
  FLASH_SALE_TIME_SLOT_PRESETS,
  addDaysToVnDate,
  getVnTodayParts,
  diffVnDaysInclusive,
  formatVnDayKeyLabel,
  formatVnTimeShort,
  parseVnDateInput,
  parseVnTimeInput,
  vnDateTimeToIso,
} from '@/lib/flash-sale-schedule';

interface CampaignFormModalProps {
  campaignNames: string[];
  open: boolean;
  editingCampaign: CampaignData | null;
  nowMs: number;
  formName: string;
  formDescription: string;
  formEnabled: boolean;
  scheduleMode: ScheduleMode;
  startDateStr: string;
  startTimeStr: string;
  endDateStr: string;
  endTimeStr: string;
  durationDaysStr: string;
  dailySlots: DailySlotForm[];
  formItems: CampaignItemForm[];
  formRevision: number;
  saving: boolean;
  formError: string | null;
  onClose: () => void;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeEnabled: (v: boolean) => void;
  onChangeScheduleMode: (v: ScheduleMode) => void;
  onChangeStartDateStr: (v: string) => void;
  onChangeStartTimeStr: (v: string) => void;
  onChangeEndDateStr: (v: string) => void;
  onChangeEndTimeStr: (v: string) => void;
  onChangeDurationDaysStr: (v: string) => void;
  onChangeDailySlots: (slots: DailySlotForm[]) => void;
  onAddEmptyItem: () => void;
  onPickerAddItems: (targets: CampaignPickerTarget[]) => void;
  onRemoveItem: (index: number) => void;
  onRemoveProduct?: (productId: string) => void;
  onChangeItem: (index: number, field: keyof CampaignItemForm, value: string) => void;
  onApplyBulkDiscountPct: (pct: number) => void;
  onSave: (enabled?: boolean) => void;
  onCloneCampaign: (campaign: CampaignData) => void;
}

export default function CampaignFormModal({
  campaignNames,
  open,
  editingCampaign,
  nowMs,
  formName,
  formDescription,
  formEnabled,
  scheduleMode,
  startDateStr,
  startTimeStr,
  endDateStr,
  endTimeStr,
  durationDaysStr,
  dailySlots,
  formItems,
  formRevision,
  saving,
  formError,
  onClose,
  onChangeName,
  onChangeDescription,
  onChangeEnabled,
  onChangeScheduleMode,
  onChangeStartDateStr,
  onChangeStartTimeStr,
  onChangeEndDateStr,
  onChangeEndTimeStr,
  onChangeDurationDaysStr,
  onChangeDailySlots,
  onAddEmptyItem,
  onPickerAddItems,
  onRemoveItem,
  onRemoveProduct,
  onChangeItem,
  onApplyBulkDiscountPct,
  onSave,
  onCloneCampaign,
}: CampaignFormModalProps) {
  const nameInputId = useId();
  const descInputId = useId();
  const daysInputId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById('campaign-editor');
    dialog?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
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
  }, [open]);

  const effectiveMode: ScheduleMode = scheduleMode;

  const continuousDailySuggestion = useMemo(() => {
    if (effectiveMode !== 'continuous') return null;
    const startDate = parseVnDateInput(startDateStr, nowMs);
    const endDate = parseVnDateInput(endDateStr, nowMs);
    const startT = parseVnTimeInput(startTimeStr);
    const endT = parseVnTimeInput(endTimeStr);
    if (!startDate || !endDate || !startT || !endT) return null;
    if (startDate.dayKey === endDate.dayKey) return null;
    const stMin = startT.hour * 60 + startT.minute;
    const etMin = endT.hour * 60 + endT.minute;
    if (stMin >= etMin) return null;
    if (startT.display === '00:00' && endT.display === '23:59') return null;
    return {
      startTime: startT.display,
      endTime: endT.display,
      startDate: startDate.display,
      endDate: endDate.display,
    };
  }, [effectiveMode, startDateStr, endDateStr, startTimeStr, endTimeStr, nowMs]);

  const schedulePreview = useMemo(() => {
    const startDate = parseVnDateInput(startDateStr, nowMs);
    const endDate = parseVnDateInput(endDateStr, nowMs);
    if (effectiveMode === 'continuous') {
      const startT = parseVnTimeInput(startTimeStr);
      const endT = parseVnTimeInput(endTimeStr);
      if (!startDate || !endDate || !startT || !endT) {
        return { valid: false, text: 'Nhập ngày (DD/MM/YYYY) và giờ 24h (HH:mm) hợp lệ theo giờ Việt Nam.' };
      }
      const startIso = vnDateTimeToIso(startDate.display, startT.display, nowMs);
      const endIso = vnDateTimeToIso(endDate.display, endT.display, nowMs);
      if (!startIso || !endIso || Date.parse(startIso) >= Date.parse(endIso)) {
        return { valid: false, text: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.' };
      }
      const spanDays = diffVnDaysInclusive(startDate.display, endDate.display);
      const isSingleDay = startDate.dayKey === endDate.dayKey;
      return {
        valid: true,
        text: isSingleDay
          ? `Áp dụng: ${startDate.display} từ ${startT.display} → ${endT.display} (Giờ VN)`
          : `Áp dụng liên tục: ${startDate.display} ${startT.display} → ${endDate.display} ${endT.display} (${spanDays} ngày không ngắt · Giờ VN)`,
      };
    }

    if (!startDate || !endDate) {
      return { valid: false, text: 'Nhập Từ ngày và Đến ngày (DD/MM/YYYY) để xem lịch khung giờ.' };
    }
    const dayCount = diffVnDaysInclusive(startDate.display, endDate.display);
    if (!dayCount || dayCount > 60) {
      return { valid: false, text: 'Khoảng ngày phải từ 1 đến 60 ngày (Đến ngày ≥ Từ ngày).' };
    }
    const validSlots = dailySlots.filter((s) => {
      const st = parseVnTimeInput(s.startTime);
      const et = parseVnTimeInput(s.endTime);
      if (!st || !et) return false;
      return st.hour * 60 + st.minute < et.hour * 60 + et.minute;
    });
    if (!validSlots.length) {
      return { valid: false, text: 'Chọn hoặc nhập ít nhất 1 khung giờ hợp lệ (VD: 10:00 → 12:00).' };
    }
    let activeWindowCount = 0;
    const futureDayLabels: string[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = addDaysToVnDate(startDate.display, i);
      if (!d) continue;
      let hasActiveSlotForDay = false;
      for (const s of validSlots) {
        const endIso = vnDateTimeToIso(d.display, parseVnTimeInput(s.endTime)!.display, nowMs);
        if (dayCount === 1 || Date.parse(endIso) > nowMs) {
          activeWindowCount++;
          hasActiveSlotForDay = true;
        }
      }
      if (hasActiveSlotForDay && futureDayLabels.length < 5) {
        futureDayLabels.push(formatVnDayKeyLabel(d.dayKey));
      }
    }
    const slotText = validSlots
      .map((s) => `${formatVnTimeShort(s.startTime)}–${formatVnTimeShort(s.endTime)}`)
      .join(', ');
    if (activeWindowCount === 0) {
      return { valid: false, text: 'Tất cả khung giờ trong khoảng ngày này đều đã qua.' };
    }
    const moreText = activeWindowCount / validSlots.length > 5 ? ', …' : '';
    return {
      valid: true,
      text: `Một chiến dịch · ${activeWindowCount} phiên: ${futureDayLabels.join(', ')}${moreText} · Mỗi ngày: ${slotText} (Storefront hiện 2 ngày gần nhất)`,
    };
  }, [effectiveMode, startDateStr, startTimeStr, endDateStr, endTimeStr, dailySlots, nowMs]);

  if (!open) return null;

  const isArchived = editingCampaign?.status === 'ARCHIVED';
  const isCurrentlyActive = Boolean(
    editingCampaign &&
      getCampaignPhase(editingCampaign, nowMs) === 'active'
  );

  const handleStartDateChange = (nextDate: string) => {
    onChangeStartDateStr(nextDate);
    const parsedStart = parseVnDateInput(nextDate, nowMs);
    const days = Number(durationDaysStr);
    if (parsedStart && Number.isInteger(days) && days >= 1 && days <= 365) {
      const computedEnd = addDaysToVnDate(parsedStart.display, days - 1);
      if (computedEnd) onChangeEndDateStr(computedEnd.display);
      return;
    }
    const span = diffVnDaysInclusive(nextDate, endDateStr);
    onChangeDurationDaysStr(span ? String(span) : '');
  };

  const handleEndDateChange = (nextDate: string) => {
    onChangeEndDateStr(nextDate);
    const span = diffVnDaysInclusive(startDateStr, nextDate);
    onChangeDurationDaysStr(span ? String(span) : '');
  };

  const handleDurationDaysChange = (raw: string) => {
    onChangeDurationDaysStr(raw);
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > 365) return;
    const baseStart = parseVnDateInput(startDateStr, nowMs);
    if (!baseStart) return;
    const nextEnd = addDaysToVnDate(baseStart.display, days - 1);
    if (nextEnd) onChangeEndDateStr(nextEnd.display);
  };

  const applyDailySpanDays = (days: number) => {
    const baseStart =
      parseVnDateInput(startDateStr, nowMs) ||
      parseVnDateInput(getVnTodayParts(nowMs).dayKey);
    if (!baseStart) return;
    const nextEnd = addDaysToVnDate(baseStart.display, days - 1);
    if (!nextEnd) return;
    onChangeStartDateStr(baseStart.display);
    onChangeEndDateStr(nextEnd.display);
    onChangeDurationDaysStr(String(days));
  };

  const convertContinuousToDailySlot = (startTime: string, endTime: string) => {
    onChangeDailySlots([{ startTime, endTime }]);
    onChangeScheduleMode('daily_slots');
  };

  const applyContinuousTimePreset = (startT: string, endT: string) => {
    onChangeStartTimeStr(startT);
    onChangeEndTimeStr(endT);
    const baseStart = parseVnDateInput(startDateStr, nowMs);
    if (baseStart) {
      onChangeEndDateStr(baseStart.display);
      onChangeDurationDaysStr('1');
    }
  };

  const togglePresetSlot = (startTime: string, endTime: string) => {
    const exists = dailySlots.some(
      (s) =>
        parseVnTimeInput(s.startTime)?.display === startTime &&
        parseVnTimeInput(s.endTime)?.display === endTime
    );
    if (exists) {
      if (dailySlots.length === 1) return;
      onChangeDailySlots(
        dailySlots.filter(
          (s) =>
            !(
              parseVnTimeInput(s.startTime)?.display === startTime &&
              parseVnTimeInput(s.endTime)?.display === endTime
            )
        )
      );
    } else {
      onChangeDailySlots([...dailySlots, { startTime, endTime }]);
    }
  };

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
                : 'Tạo chiến dịch Flash Sale'}
            </h2>
            {editingCampaign && (
              <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                rev #{formRevision}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Đóng trình sửa chiến dịch"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-grow text-xs">
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

          {isCurrentlyActive && !isArchived && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-bold">Chiến dịch đang hiển thị trên Storefront</strong>
                <p className="mt-0.5 text-amber-800">
                  Mọi thay đổi về thời gian và danh sách sản phẩm sẽ cập nhật trực tiếp ngoài trang chủ ngay sau khi lưu.
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-8">
              <label htmlFor={nameInputId} className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chiến dịch <span className="text-rose-500">*</span>
              </label>
              <input
                id={nameInputId}
                list={`${nameInputId}-campaigns`}
                type="text"
                disabled={isArchived}
                value={formName}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="VD: Flash Sale Cuối Tuần"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="sm:col-span-4">
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
                <span>Kích hoạt theo lịch</span>
              </label>
            </div>

            <datalist id={`${nameInputId}-campaigns`}>{campaignNames.map(name => <option key={name} value={name} />)}</datalist>
            <p className="sm:col-span-12 text-xs text-slate-500">Chọn tên chiến dịch có sẵn hoặc nhập tên mới. Tạo flashsale chi tiết riêng cho mỗi khung giờ cần danh sách sản phẩm khác nhau.</p>
            <div className="sm:col-span-12">
              <label htmlFor={descInputId} className="block text-xs font-semibold text-slate-700 mb-1">
                Tên / ghi chú flashsale chi tiết
              </label>
              <input
                id={descInputId}
                type="text"
                disabled={isArchived}
                value={formDescription}
                onChange={(e) => onChangeDescription(e.target.value)}
                placeholder="Ghi chú ngắn (tuỳ chọn)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Simplified Single Vietnam GMT+7 Schedule Setup */}
          <fieldset
            disabled={isArchived}
            className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60 space-y-3 disabled:opacity-65"
          >
            <legend className="inline-flex items-center gap-1.5 px-1.5 font-bold text-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Thiết lập thời gian (Giờ Việt Nam · 24h)</span>
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Chọn ngày trên lịch, nhập giờ 24h. Tất cả dùng giờ Việt Nam (UTC+7).
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChangeScheduleMode('daily_slots')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    effectiveMode === 'daily_slots'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo khung giờ mỗi ngày
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScheduleMode('continuous')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    effectiveMode === 'continuous'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chạy một khoảng thời gian
                </button>
              </div>
            </div>

            {effectiveMode === 'continuous' ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 items-start">
                  <VnDateField
                    label="Từ ngày"
                    required
                    disabled={isArchived}
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    placeholder="15/11/2026"
                  />
                  <VnTimeField
                    label="Giờ bắt đầu"
                    required
                    disabled={isArchived}
                    value={startTimeStr}
                    onChange={onChangeStartTimeStr}
                    placeholder="10:00"
                  />
                  <VnDateField
                    label="Đến ngày"
                    required
                    disabled={isArchived}
                    value={endDateStr}
                    onChange={handleEndDateChange}
                    placeholder="16/11/2026"
                  />
                  <VnTimeField
                    label="Giờ kết thúc"
                    required
                    disabled={isArchived}
                    value={endTimeStr}
                    onChange={onChangeEndTimeStr}
                    placeholder="23:59"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-slate-500 mr-0.5">Khung giờ nhanh:</span>
                  {FLASH_SALE_TIME_SLOT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyContinuousTimePreset(preset.startTime, preset.endTime)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <span className="font-semibold text-slate-500 ml-1 mr-0.5">Số ngày (00:00–23:59):</span>
                  {[1, 2, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        applyDailySpanDays(days);
                        onChangeStartTimeStr('00:00');
                        onChangeEndTimeStr('23:59');
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      {days} ngày
                    </button>
                  ))}
                </div>
                {continuousDailySuggestion && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    <span>
                      Đang chọn <strong>chạy liên tục</strong> từ {continuousDailySuggestion.startTime}{' '}
                      {continuousDailySuggestion.startDate} → {continuousDailySuggestion.endTime}{' '}
                      {continuousDailySuggestion.endDate}. Nếu bạn muốn mỗi ngày chỉ chạy trong khung giờ{' '}
                      <strong>
                        {continuousDailySuggestion.startTime}–{continuousDailySuggestion.endTime}
                      </strong>{' '}
                      (và đếm ngược &quot;Bắt đầu sau&quot; trước giờ mở sale):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        convertContinuousToDailySlot(
                          continuousDailySuggestion.startTime,
                          continuousDailySuggestion.endTime
                        )
                      }
                      className="shrink-0 rounded-md bg-amber-600 hover:bg-amber-700 px-2.5 py-1 font-bold text-white transition cursor-pointer"
                    >
                      Chuyển sang khung giờ {continuousDailySuggestion.startTime}–
                      {continuousDailySuggestion.endTime} mỗi ngày
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                  <VnDateField
                    label="Từ ngày"
                    required
                    disabled={isArchived}
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    placeholder="15/11/2026"
                  />
                  <div>
                    <label htmlFor={daysInputId} className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Trong mấy ngày
                    </label>
                    <input
                      id={daysInputId}
                      type="number"
                      min={1}
                      max={60}
                      value={durationDaysStr}
                      onChange={(e) => handleDurationDaysChange(e.target.value)}
                      placeholder="VD: 2"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <VnDateField
                    label="Đến ngày"
                    required
                    disabled={isArchived}
                    value={endDateStr}
                    onChange={handleEndDateChange}
                    placeholder="16/11/2026"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-slate-500 mr-0.5">Số ngày nhanh:</span>
                  {[1, 2, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => applyDailySpanDays(days)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      {days} ngày
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Chọn khung giờ chạy mỗi ngày (24h · Giờ Việt Nam):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeDailySlots([...dailySlots, { startTime: '16:00', endTime: '18:00' }])
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm khung giờ</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {FLASH_SALE_TIME_SLOT_PRESETS.map((preset) => {
                      const active = dailySlots.some(
                        (s) =>
                          parseVnTimeInput(s.startTime)?.display === preset.startTime &&
                          parseVnTimeInput(s.endTime)?.display === preset.endTime
                      );
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => togglePresetSlot(preset.startTime, preset.endTime)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            active
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {dailySlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <VnTimeField
                            ariaLabel={`Khung giờ ${idx + 1} bắt đầu`}
                            value={slot.startTime}
                            onChange={(val) =>
                              onChangeDailySlots(
                                dailySlots.map((item, i) =>
                                  i === idx ? { ...item, startTime: val } : item
                                )
                              )
                            }
                            placeholder="10:00"
                          />
                        </div>
                        <span className="text-slate-400 font-bold">→</span>
                        <div className="flex-1 min-w-0">
                          <VnTimeField
                            ariaLabel={`Khung giờ ${idx + 1} kết thúc`}
                            value={slot.endTime}
                            onChange={(val) =>
                              onChangeDailySlots(
                                dailySlots.map((item, i) =>
                                  i === idx ? { ...item, endTime: val } : item
                                )
                              )
                            }
                            placeholder="12:00"
                          />
                        </div>
                        {dailySlots.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Xóa khung giờ ${idx + 1}`}
                            onClick={() =>
                              onChangeDailySlots(dailySlots.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                schedulePreview.valid
                  ? 'bg-blue-50 text-blue-900 border border-blue-200/80'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/80'
              }`}
            >
              {schedulePreview.text}
            </div>
          </fieldset>

          {/* Items Table */}
          <CampaignItemsTable
            items={formItems}
            readOnly={isArchived}
            onAddEmptyRow={onAddEmptyItem}
            onPickerAdd={onPickerAddItems}
            onRemoveRow={onRemoveItem}
            onRemoveProduct={onRemoveProduct}
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
