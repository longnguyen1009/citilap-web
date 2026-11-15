'use client';

import { useId, useState } from 'react';
import {
  isoToVnDateDisplay,
  isoToVnTimeDisplay,
  parseVnDateInput,
  parseVnTimeInput,
  vnDateTimeToIso,
} from '@/lib/flash-sale-schedule';

interface VnDateFieldProps {
  label?: string;
  ariaLabel?: string;
  value: string; // DD/MM/YYYY or partial typed string
  onChange: (nextDisplay: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function VnDateField({
  label,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'VD: 15/11/2026',
}: VnDateFieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [touchedInvalid, setTouchedInvalid] = useState(false);

  const displayed = focused ? draft : value;

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (touchedInvalid && parseVnDateInput(raw)) {
      setTouchedInvalid(false);
    }
    const parsed = parseVnDateInput(raw);
    if (parsed && /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(raw.trim())) {
      onChange(parsed.display);
    } else {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      setTouchedInvalid(required);
      onChange('');
      return;
    }
    const parsed = parseVnDateInput(trimmed);
    if (parsed) {
      setTouchedInvalid(false);
      setDraft(parsed.display);
      onChange(parsed.display);
    } else {
      setTouchedInvalid(true);
    }
  };

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        required={required}
        value={displayed}
        placeholder={placeholder}
        aria-invalid={touchedInvalid || undefined}
        aria-describedby={touchedInvalid ? errId : undefined}
        onFocus={() => {
          setFocused(true);
          setDraft(value);
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
          touchedInvalid
            ? 'border-rose-400 focus:ring-rose-500'
            : 'border-slate-200 focus:ring-blue-500'
        }`}
      />
      {touchedInvalid && (
        <p id={errId} className="mt-1 text-[10px] text-rose-600">
          Nhập dạng DD/MM/YYYY (VD: 15/11/2026)
        </p>
      )}
    </div>
  );
}

interface VnTimeFieldProps {
  label?: string;
  ariaLabel?: string;
  value: string; // HH:mm
  onChange: (nextDisplay: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function VnTimeField({
  label,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = '10:00',
}: VnTimeFieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [touchedInvalid, setTouchedInvalid] = useState(false);

  const displayed = focused ? draft : value;

  const handleChange = (raw: string) => {
    setDraft(raw);
    const parsed = parseVnTimeInput(raw);
    if (parsed && touchedInvalid) setTouchedInvalid(false);
    if (parsed && /^\d{1,2}:\d{2}$/.test(raw.trim())) {
      onChange(parsed.display);
    } else {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      setTouchedInvalid(required);
      onChange('');
      return;
    }
    const parsed = parseVnTimeInput(trimmed);
    if (parsed) {
      setTouchedInvalid(false);
      setDraft(parsed.display);
      onChange(parsed.display);
    } else {
      setTouchedInvalid(true);
    }
  };

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        required={required}
        value={displayed}
        placeholder={placeholder}
        aria-invalid={touchedInvalid || undefined}
        aria-describedby={touchedInvalid ? errId : undefined}
        onFocus={() => {
          setFocused(true);
          setDraft(value);
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
          touchedInvalid
            ? 'border-rose-400 focus:ring-rose-500'
            : 'border-slate-200 focus:ring-blue-500'
        }`}
      />
      {touchedInvalid && (
        <p id={errId} className="mt-1 text-[10px] text-rose-600">
          Nhập giờ 24h (VD: 10:00, 14h30)
        </p>
      )}
    </div>
  );
}

interface VnIsoPairFieldProps {
  title: string;
  isoValue: string;
  onChangeIso: (nextIso: string) => void;
  disabled?: boolean;
  defaultTime?: string;
}

/**
 * Direct-typeable Vietnam (GMT+7) Date + 24h Time pair bound to an ISO UTC string.
 * Replaces native `<input type="datetime-local">` (which shows AM/PM and blocks direct typing).
 */
export function VnIsoPairField({
  title,
  isoValue,
  onChangeIso,
  disabled = false,
  defaultTime = '00:00',
}: VnIsoPairFieldProps) {
  const [partialDate, setPartialDate] = useState<string | null>(null);
  const [partialTime, setPartialTime] = useState<string | null>(null);

  const resolvedDate = partialDate ?? isoToVnDateDisplay(isoValue);
  const resolvedTime =
    partialTime ?? (isoValue ? isoToVnTimeDisplay(isoValue) || defaultTime : defaultTime);

  const commit = (nextDate: string, nextTime: string) => {
    if (!nextDate.trim()) {
      onChangeIso('');
      return;
    }
    const iso = vnDateTimeToIso(nextDate, nextTime || defaultTime);
    if (iso) {
      onChangeIso(iso);
      setPartialDate(null);
      setPartialTime(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="grid grid-cols-5 gap-1.5">
        <div className="col-span-3">
          <VnDateField
            ariaLabel={`${title} ngày (DD/MM/YYYY)`}
            value={resolvedDate}
            placeholder="DD/MM/YYYY"
            disabled={disabled}
            onChange={(d) => {
              setPartialDate(d);
              commit(d, resolvedTime);
            }}
          />
        </div>
        <div className="col-span-2">
          <VnTimeField
            ariaLabel={`${title} giờ (24h)`}
            value={resolvedTime || defaultTime}
            placeholder="HH:mm"
            disabled={disabled}
            onChange={(t) => {
              setPartialTime(t);
              commit(resolvedDate, t);
            }}
          />
        </div>
      </div>
    </div>
  );
}
