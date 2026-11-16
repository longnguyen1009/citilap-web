'use client';

import { useId, useRef, useState } from 'react';
import {
  isValidCalendarDate,
  isoToVnDateDisplay,
  isoToVnTimeDisplay,
  parseVnDateInput,
  parseVnTimeInput,
  vnDateTimeToIso,
} from '@/lib/flash-sale-schedule';

const pad2 = (n: number | string) => String(n).padStart(2, '0');

function splitDateSegments(value: string): { day: string; month: string; year: string } {
  const parsed = parseVnDateInput(value);
  if (parsed) {
    return {
      day: pad2(parsed.day),
      month: pad2(parsed.month),
      year: String(parsed.year),
    };
  }
  const m = value.trim().match(/^(\d{0,2})[/.-]?(\d{0,2})[/.-]?(\d{0,4})$/);
  if (m && (m[1] || m[2] || m[3])) {
    return { day: m[1] || '', month: m[2] || '', year: m[3] || '' };
  }
  return { day: '', month: '', year: '' };
}

function splitTimeSegments(value: string): { hour: string; minute: string } {
  const parsed = parseVnTimeInput(value);
  if (parsed) {
    return { hour: pad2(parsed.hour), minute: pad2(parsed.minute) };
  }
  const m = value.trim().match(/^(\d{0,2})[:h.]?(\d{0,2})$/i);
  if (m && (m[1] || m[2])) {
    return { hour: m[1] || '', minute: m[2] || '' };
  }
  return { hour: '', minute: '' };
}

function selectSegmentOnMouseUp(
  e: React.MouseEvent<HTMLInputElement>,
  justFocusedRef: React.MutableRefObject<HTMLInputElement | null>
) {
  if (justFocusedRef.current === e.currentTarget) {
    e.preventDefault();
    justFocusedRef.current = null;
  }
}

interface VnDateFieldProps {
  label?: string;
  ariaLabel?: string;
  value: string; // DD/MM/YYYY
  onChange: (nextDisplay: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

/**
 * Segmented direct-typeable Vietnam date input (`DD / MM / YYYY`).
 * Clicking any segment highlights it cleanly so typing immediately replaces day, month, or year.
 */
export function VnDateField({
  label,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  required = false,
}: VnDateFieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const justFocusedRef = useRef<HTMLInputElement | null>(null);

  const [segments, setSegments] = useState(() => splitDateSegments(value));
  const [prevPropValue, setPrevPropValue] = useState(value);
  const [lastEmittedValue, setLastEmittedValue] = useState(value);
  const [touchedInvalid, setTouchedInvalid] = useState(false);

  if (value !== prevPropValue) {
    setPrevPropValue(value);
    if (value !== lastEmittedValue) {
      setLastEmittedValue(value);
      setSegments(splitDateSegments(value));
      setTouchedInvalid(false);
    }
  }

  const baseName = label || ariaLabel || 'Ngày';

  const tryCommit = (next: { day: string; month: string; year: string }) => {
    if (!next.day && !next.month && !next.year) {
      setLastEmittedValue('');
      onChange('');
      return true;
    }
    if (next.day.length > 0 && next.month.length > 0 && next.year.length === 4) {
      const d = Number(next.day);
      const m = Number(next.month);
      const y = Number(next.year);
      if (isValidCalendarDate(y, m, d)) {
        const display = `${pad2(d)}/${pad2(m)}/${y}`;
        setTouchedInvalid(false);
        setLastEmittedValue(display);
        onChange(display);
        return true;
      }
    }
    return false;
  };

  const updateSegment = (
    part: 'day' | 'month' | 'year',
    raw: string,
    maxLen: number,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = raw.replace(/\D/g, '').slice(0, maxLen);
    const prevLen = segments[part].length;
    const next = { ...segments, [part]: digits };
    setSegments(next);
    if (touchedInvalid) {
      const valid = tryCommit(next);
      if (valid) return;
    } else {
      tryCommit(next);
    }
    if (digits.length === maxLen && digits.length > prevLen && nextRef?.current && !nextRef.current.value) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const normalizeOnBlur = (part: 'day' | 'month' | 'year') => {
    const currentVal = segments[part];
    let normalized = { ...segments };
    if (part === 'day' && currentVal.length === 1 && Number(currentVal) >= 1) {
      normalized = { ...normalized, day: pad2(currentVal) };
    } else if (part === 'month' && currentVal.length === 1 && Number(currentVal) >= 1) {
      normalized = { ...normalized, month: pad2(currentVal) };
    } else if (part === 'year' && currentVal.length === 2) {
      normalized = { ...normalized, year: `20${currentVal}` };
    }
    if (normalized !== segments) {
      setSegments(normalized);
    }

    // Validate only when focus leaves the entire group
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active === dayRef.current || active === monthRef.current || active === yearRef.current) {
        return;
      }
      const allEmpty = !normalized.day && !normalized.month && !normalized.year;
      if (allEmpty) {
        setTouchedInvalid(required);
        setLastEmittedValue('');
        onChange('');
        return;
      }
      const valid = tryCommit(normalized);
      setTouchedInvalid(!valid);
    });
  };

  const handleSegmentKeyDown = (
    part: 'day' | 'month' | 'year',
    e: React.KeyboardEvent<HTMLInputElement>,
    prevRef?: React.RefObject<HTMLInputElement | null>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === '/' || e.key === '-' || e.key === '.') {
      e.preventDefault();
      if (part === 'day' && segments.day.length === 1 && Number(segments.day) >= 1) {
        const next = { ...segments, day: pad2(segments.day) };
        setSegments(next);
        tryCommit(next);
      } else if (part === 'month' && segments.month.length === 1 && Number(segments.month) >= 1) {
        const next = { ...segments, month: pad2(segments.month) };
        setSegments(next);
        tryCommit(next);
      }
      nextRef?.current?.focus();
      nextRef?.current?.select();
      return;
    }

    if (e.key === 'ArrowRight' && nextRef?.current) {
      const el = e.currentTarget;
      if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
        e.preventDefault();
        nextRef.current.focus();
        nextRef.current.select();
      }
    } else if (e.key === 'ArrowLeft' && prevRef?.current) {
      const el = e.currentTarget;
      if (el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault();
        prevRef.current.focus();
        prevRef.current.select();
      }
    } else if (e.key === 'Backspace' && !segments[part] && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
      prevRef.current.select();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const cur = Number(segments[part] || (part === 'year' ? 2026 : 1));
      let updated: string;
      if (part === 'day') {
        const v = ((cur - 1 + delta + 31) % 31) + 1;
        updated = pad2(v);
      } else if (part === 'month') {
        const v = ((cur - 1 + delta + 12) % 12) + 1;
        updated = pad2(v);
      } else {
        const v = Math.min(2100, Math.max(2000, (Number.isFinite(cur) ? cur : 2026) + delta));
        updated = String(v);
      }
      const next = { ...segments, [part]: updated };
      setSegments(next);
      tryCommit(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseVnDateInput(text);
    if (parsed) {
      e.preventDefault();
      const next = {
        day: pad2(parsed.day),
        month: pad2(parsed.month),
        year: String(parsed.year),
      };
      setSegments(next);
      setTouchedInvalid(false);
      setLastEmittedValue(parsed.display);
      onChange(parsed.display);
    }
  };

  const segInputCls =
    'bg-transparent text-center font-mono text-xs text-slate-900 focus:outline-hidden focus:bg-blue-50 focus:text-blue-700 rounded-xs py-0.5 selection:bg-blue-600 selection:text-white disabled:text-slate-500';

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={`${id}-day`} className="block text-[11px] font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div
        role="group"
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={touchedInvalid ? errId : undefined}
        onClick={(e) => {
          if (disabled) return;
          if (e.target === e.currentTarget) {
            dayRef.current?.focus();
            dayRef.current?.select();
          }
        }}
        className={`flex items-center justify-center rounded-lg border px-2 py-1 bg-white transition focus-within:ring-2 ${
          disabled ? 'bg-slate-100 border-slate-200 cursor-not-allowed' : 'cursor-text'
        } ${
          touchedInvalid
            ? 'border-rose-400 focus-within:ring-rose-500'
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/30'
        }`}
      >
        <input
          ref={dayRef}
          id={`${id}-day`}
          type="text"
          inputMode="numeric"
          maxLength={2}
          disabled={disabled}
          required={required}
          aria-label={`${baseName} - Ngày`}
          aria-invalid={touchedInvalid || undefined}
          placeholder="DD"
          value={segments.day}
          onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) justFocusedRef.current = e.currentTarget;
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => selectSegmentOnMouseUp(e, justFocusedRef)}
          onChange={(e) => updateSegment('day', e.target.value, 2, monthRef)}
          onKeyDown={(e) => handleSegmentKeyDown('day', e, undefined, monthRef)}
          onBlur={() => normalizeOnBlur('day')}
          onPaste={handlePaste}
          className={`w-6 ${segInputCls}`}
        />
        <span aria-hidden="true" className="text-slate-400 font-mono text-xs select-none px-0.5">
          /
        </span>
        <input
          ref={monthRef}
          id={`${id}-month`}
          type="text"
          inputMode="numeric"
          maxLength={2}
          disabled={disabled}
          required={required}
          aria-label={`${baseName} - Tháng`}
          aria-invalid={touchedInvalid || undefined}
          placeholder="MM"
          value={segments.month}
          onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) justFocusedRef.current = e.currentTarget;
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => selectSegmentOnMouseUp(e, justFocusedRef)}
          onChange={(e) => updateSegment('month', e.target.value, 2, yearRef)}
          onKeyDown={(e) => handleSegmentKeyDown('month', e, dayRef, yearRef)}
          onBlur={() => normalizeOnBlur('month')}
          onPaste={handlePaste}
          className={`w-6 ${segInputCls}`}
        />
        <span aria-hidden="true" className="text-slate-400 font-mono text-xs select-none px-0.5">
          /
        </span>
        <input
          ref={yearRef}
          id={`${id}-year`}
          type="text"
          inputMode="numeric"
          maxLength={4}
          disabled={disabled}
          required={required}
          aria-label={`${baseName} - Năm`}
          aria-invalid={touchedInvalid || undefined}
          placeholder="YYYY"
          value={segments.year}
          onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) justFocusedRef.current = e.currentTarget;
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => selectSegmentOnMouseUp(e, justFocusedRef)}
          onChange={(e) => updateSegment('year', e.target.value, 4)}
          onKeyDown={(e) => handleSegmentKeyDown('year', e, monthRef)}
          onBlur={() => normalizeOnBlur('year')}
          onPaste={handlePaste}
          className={`w-10 ${segInputCls}`}
        />
      </div>
      {touchedInvalid && (
        <p id={errId} className="mt-1 text-[10px] text-rose-600">
          Nhập ngày hợp lệ DD/MM/YYYY
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

/**
 * Segmented direct-typeable 24-hour Vietnam time input (`HH : mm`).
 * Clicking hour or minute highlights that segment so typing immediately replaces it cleanly.
 */
export function VnTimeField({
  label,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  required = false,
}: VnTimeFieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const justFocusedRef = useRef<HTMLInputElement | null>(null);

  const [segments, setSegments] = useState(() => splitTimeSegments(value));
  const [prevPropValue, setPrevPropValue] = useState(value);
  const [lastEmittedValue, setLastEmittedValue] = useState(value);
  const [touchedInvalid, setTouchedInvalid] = useState(false);

  if (value !== prevPropValue) {
    setPrevPropValue(value);
    if (value !== lastEmittedValue) {
      setLastEmittedValue(value);
      setSegments(splitTimeSegments(value));
      setTouchedInvalid(false);
    }
  }

  const baseName = label || ariaLabel || 'Giờ';

  const tryCommit = (next: { hour: string; minute: string }) => {
    if (!next.hour && !next.minute) {
      setLastEmittedValue('');
      onChange('');
      return true;
    }
    if (next.hour.length > 0 && next.minute.length > 0) {
      const h = Number(next.hour);
      const m = Number(next.minute);
      if (Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const display = `${pad2(h)}:${pad2(m)}`;
        setTouchedInvalid(false);
        setLastEmittedValue(display);
        onChange(display);
        return true;
      }
    }
    return false;
  };

  const updateSegment = (
    part: 'hour' | 'minute',
    raw: string,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    const prevLen = segments[part].length;
    const next = { ...segments, [part]: digits };
    setSegments(next);
    tryCommit(next);
    if (digits.length === 2 && digits.length > prevLen && nextRef?.current && !nextRef.current.value) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const normalizeOnBlur = (part: 'hour' | 'minute') => {
    let normalized = { ...segments };
    if (part === 'hour' && normalized.hour.length === 1) {
      normalized = { ...normalized, hour: pad2(normalized.hour) };
    } else if (part === 'minute') {
      if (normalized.minute.length === 1) {
        normalized = { ...normalized, minute: pad2(normalized.minute) };
      } else if (!normalized.minute && normalized.hour) {
        normalized = { ...normalized, minute: '00' };
      }
    }
    if (normalized !== segments) {
      setSegments(normalized);
    }

    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active === hourRef.current || active === minuteRef.current) {
        return;
      }
      if (!normalized.hour && !normalized.minute) {
        setTouchedInvalid(required);
        setLastEmittedValue('');
        onChange('');
        return;
      }
      if (normalized.hour && !normalized.minute) {
        normalized = { ...normalized, minute: '00' };
        setSegments(normalized);
      }
      const valid = tryCommit(normalized);
      setTouchedInvalid(!valid);
    });
  };

  const handleSegmentKeyDown = (
    part: 'hour' | 'minute',
    e: React.KeyboardEvent<HTMLInputElement>,
    prevRef?: React.RefObject<HTMLInputElement | null>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if ((e.key === ':' || e.key.toLowerCase() === 'h' || e.key === '.') && nextRef?.current) {
      e.preventDefault();
      if (part === 'hour' && segments.hour.length === 1) {
        const next = { ...segments, hour: pad2(segments.hour) };
        setSegments(next);
        tryCommit(next);
      }
      nextRef.current.focus();
      nextRef.current.select();
      return;
    }

    if (e.key === 'ArrowRight' && nextRef?.current) {
      const el = e.currentTarget;
      if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
        e.preventDefault();
        nextRef.current.focus();
        nextRef.current.select();
      }
    } else if (e.key === 'ArrowLeft' && prevRef?.current) {
      const el = e.currentTarget;
      if (el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault();
        prevRef.current.focus();
        prevRef.current.select();
      }
    } else if (e.key === 'Backspace' && !segments[part] && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
      prevRef.current.select();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const cur = Number(segments[part] || 0);
      const max = part === 'hour' ? 24 : 60;
      const v = (cur + delta + max) % max;
      const next = { ...segments, [part]: pad2(v) };
      setSegments(next);
      tryCommit(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseVnTimeInput(text);
    if (parsed) {
      e.preventDefault();
      const next = { hour: pad2(parsed.hour), minute: pad2(parsed.minute) };
      setSegments(next);
      setTouchedInvalid(false);
      setLastEmittedValue(parsed.display);
      onChange(parsed.display);
    }
  };

  const segInputCls =
    'bg-transparent text-center font-mono text-xs text-slate-900 focus:outline-hidden focus:bg-blue-50 focus:text-blue-700 rounded-xs py-0.5 selection:bg-blue-600 selection:text-white disabled:text-slate-500';

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={`${id}-hour`} className="block text-[11px] font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div
        role="group"
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={touchedInvalid ? errId : undefined}
        onClick={(e) => {
          if (disabled) return;
          if (e.target === e.currentTarget) {
            hourRef.current?.focus();
            hourRef.current?.select();
          }
        }}
        className={`flex items-center justify-center rounded-lg border px-2 py-1 bg-white transition focus-within:ring-2 ${
          disabled ? 'bg-slate-100 border-slate-200 cursor-not-allowed' : 'cursor-text'
        } ${
          touchedInvalid
            ? 'border-rose-400 focus-within:ring-rose-500'
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/30'
        }`}
      >
        <input
          ref={hourRef}
          id={`${id}-hour`}
          type="text"
          inputMode="numeric"
          maxLength={2}
          disabled={disabled}
          required={required}
          aria-label={`${baseName} - Giờ`}
          aria-invalid={touchedInvalid || undefined}
          placeholder="HH"
          value={segments.hour}
          onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) justFocusedRef.current = e.currentTarget;
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => selectSegmentOnMouseUp(e, justFocusedRef)}
          onChange={(e) => updateSegment('hour', e.target.value, minuteRef)}
          onKeyDown={(e) => handleSegmentKeyDown('hour', e, undefined, minuteRef)}
          onBlur={() => normalizeOnBlur('hour')}
          onPaste={handlePaste}
          className={`w-6 ${segInputCls}`}
        />
        <span aria-hidden="true" className="text-slate-400 font-mono text-xs select-none px-0.5">
          :
        </span>
        <input
          ref={minuteRef}
          id={`${id}-minute`}
          type="text"
          inputMode="numeric"
          maxLength={2}
          disabled={disabled}
          required={required}
          aria-label={`${baseName} - Phút`}
          aria-invalid={touchedInvalid || undefined}
          placeholder="mm"
          value={segments.minute}
          onMouseDown={(e) => {
            if (document.activeElement !== e.currentTarget) justFocusedRef.current = e.currentTarget;
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => selectSegmentOnMouseUp(e, justFocusedRef)}
          onChange={(e) => updateSegment('minute', e.target.value)}
          onKeyDown={(e) => handleSegmentKeyDown('minute', e, hourRef)}
          onBlur={() => normalizeOnBlur('minute')}
          onPaste={handlePaste}
          className={`w-6 ${segInputCls}`}
        />
      </div>
      {touchedInvalid && (
        <p id={errId} className="mt-1 text-[10px] text-rose-600">
          Nhập giờ 24h (00:00 – 23:59)
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
 * Uses segmented inputs so users can click any segment (day, month, year, hour, minute) and type freely.
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
