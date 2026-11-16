'use client';

import { useId, useState } from 'react';
import {
  isoToVnDateDisplay, isoToVnTimeDisplay, parseVnDateInput,
  parseVnTimeInput, vnDateTimeToIso,
} from '@/lib/flash-sale-schedule';

interface ScheduleFieldProps {
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500';

/** Calendar values use Vietnam time, independently of the device timezone. */
export function VnDateField({ label, ariaLabel, value, onChange, disabled, required }: ScheduleFieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      {label && <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">{label}{required && ' *'}</label>}
      <input id={id} type="date" lang="vi" aria-label={ariaLabel || label || 'Ngày'}
        min="2000-01-01" max="2100-12-31" required={required} disabled={disabled}
        value={parseVnDateInput(value)?.dayKey ?? ''}
        onChange={(e) => onChange(parseVnDateInput(e.target.value)?.display ?? '')}
        className={inputClass} />
    </div>
  );
}

export function VnTimeField({ label, ariaLabel, value, onChange, disabled, required }: ScheduleFieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      {label && <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">{label}{required && ' *'}</label>}
      <input id={id} type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} required={required} disabled={disabled}
        aria-label={ariaLabel || label || 'Giờ Việt Nam (24h)'}
        aria-invalid={Boolean(value && !parseVnTimeInput(value))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { const parsed = parseVnTimeInput(value); if (parsed) onChange(parsed.display); }}
        className={inputClass} />
    </div>
  );
}

interface VnIsoPairFieldProps {
  title: string;
  isoValue: string;
  onChangeIso: (value: string) => void;
  disabled?: boolean;
  defaultTime?: string;
}

export function VnIsoPairField({ title, isoValue, onChangeIso, disabled, defaultTime = '00:00' }: VnIsoPairFieldProps) {
  const [date, setDate] = useState(() => isoToVnDateDisplay(isoValue));
  const [time, setTime] = useState(() => isoToVnTimeDisplay(isoValue) || defaultTime);
  const [previousIso, setPreviousIso] = useState(isoValue);
  if (previousIso !== isoValue) {
    setPreviousIso(isoValue);
    setDate(isoToVnDateDisplay(isoValue));
    setTime(isoToVnTimeDisplay(isoValue) || defaultTime);
  }
  const commit = (nextDate: string, nextTime: string) => {
    const nextIso = vnDateTimeToIso(nextDate, nextTime);
    setPreviousIso(nextIso);
    onChangeIso(nextIso);
  };
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-600">{title} · Giờ Việt Nam (UTC+7)</div>
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <VnDateField ariaLabel={`${title} ngày`} value={date} disabled={disabled}
          onChange={(next) => { setDate(next); commit(next, time); }} />
        <VnTimeField ariaLabel={`${title} giờ (24h)`} value={time} disabled={disabled}
          onChange={(next) => { setTime(next); commit(date, next); }} />
      </div>
    </div>
  );
}
