/**
 * Location-agnostic Vietnam (Asia/Ho_Chi_Minh, fixed UTC+7) schedule utilities
 * for Flash Sale admin inputs and storefront multi-day / auto-visibility logic.
 */

export const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_FLASH_SALE_PRE_SHOW_HOURS = 2;

export interface VnDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayKey: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM/YYYY
  shortDateDisplay: string; // DD/MM
  timeDisplay: string; // HH:mm (24h)
}

export interface VnDateValue {
  year: number;
  month: number;
  day: number;
  dayKey: string; // YYYY-MM-DD
  display: string; // DD/MM/YYYY
}

export interface VnTimeValue {
  hour: number;
  minute: number;
  display: string; // HH:mm
}

export interface DailyTimeSlotPreset {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

export const FLASH_SALE_TIME_SLOT_PRESETS: readonly DailyTimeSlotPreset[] = [
  { id: '09-11', label: '09h - 11h', startTime: '09:00', endTime: '11:00' },
  { id: '10-12', label: '10h - 12h', startTime: '10:00', endTime: '12:00' },
  { id: '12-14', label: '12h - 14h', startTime: '12:00', endTime: '14:00' },
  { id: '14-16', label: '14h - 16h', startTime: '14:00', endTime: '16:00' },
  { id: '20-22', label: '20h - 22h', startTime: '20:00', endTime: '22:00' },
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

/** Converts an ISO string or epoch ms into explicit GMT+7 (Asia/Ho_Chi_Minh) calendar parts. */
export function toVnDateTimeParts(value: string | number | Date): VnDateTimeParts | null {
  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value || '');
  if (!Number.isFinite(ms)) return null;
  const shifted = new Date(ms + VN_UTC_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    year,
    month,
    day,
    hour,
    minute,
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
    dateDisplay: `${pad2(day)}/${pad2(month)}/${year}`,
    shortDateDisplay: `${pad2(day)}/${pad2(month)}`,
    timeDisplay: `${pad2(hour)}:${pad2(minute)}`,
  };
}

export function getVnTodayParts(nowMs: number = Date.now()): VnDateTimeParts {
  return toVnDateTimeParts(nowMs) as VnDateTimeParts;
}

/**
 * Parses directly typed Vietnam dates cleanly:
 * - DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - YYYY-MM-DD (ISO calendar)
 * - DDMMYYYY (8 digits)
 * - DD/MM or D/M (infers current GMT+7 year)
 */
export function parseVnDateInput(raw: string, referenceNowMs: number = Date.now()): VnDateValue | null {
  const text = raw.trim();
  if (!text) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const vnFullMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (vnFullMatch) {
      day = Number(vnFullMatch[1]);
      month = Number(vnFullMatch[2]);
      year = Number(vnFullMatch[3]);
    } else {
      const compactMatch = text.match(/^(\d{2})(\d{2})(\d{4})$/);
      if (compactMatch) {
        day = Number(compactMatch[1]);
        month = Number(compactMatch[2]);
        year = Number(compactMatch[3]);
      } else {
        const shortMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})$/);
        if (!shortMatch) return null;
        day = Number(shortMatch[1]);
        month = Number(shortMatch[2]);
        year = getVnTodayParts(referenceNowMs).year;
      }
    }
  }

  if (!isValidCalendarDate(year, month, day)) return null;
  return {
    year,
    month,
    day,
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
    display: `${pad2(day)}/${pad2(month)}/${year}`,
  };
}

/**
 * Parses directly typed 24-hour Vietnam times cleanly:
 * - "10:00", "9:30", "10h", "10h30", "10", "1000", "2359"
 */
export function parseVnTimeInput(raw: string): VnTimeValue | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  let hour = -1;
  let minute = 0;

  const colonOrHMatch = text.match(/^(\d{1,2})\s*(?::|h)\s*(\d{1,2})?$/);
  if (colonOrHMatch) {
    hour = Number(colonOrHMatch[1]);
    minute = colonOrHMatch[2] !== undefined ? Number(colonOrHMatch[2]) : 0;
  } else if (/^\d{1,2}$/.test(text)) {
    hour = Number(text);
    minute = 0;
  } else if (/^\d{4}$/.test(text)) {
    hour = Number(text.slice(0, 2));
    minute = Number(text.slice(2, 4));
  } else {
    return null;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return {
    hour,
    minute,
    display: `${pad2(hour)}:${pad2(minute)}`,
  };
}

/** Converts GMT+7 date input + 24h time input to a UTC ISO string (`...Z`). */
export function vnDateTimeToIso(
  dateInput: string,
  timeInput: string,
  referenceNowMs: number = Date.now()
): string {
  const parsedDate = parseVnDateInput(dateInput, referenceNowMs);
  const parsedTime = parseVnTimeInput(timeInput);
  if (!parsedDate || !parsedTime) return '';
  const utcMs =
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedTime.hour, parsedTime.minute, 0) -
    VN_UTC_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

export function isoToVnDateDisplay(iso: string): string {
  return toVnDateTimeParts(iso)?.dateDisplay ?? '';
}

export function isoToVnTimeDisplay(iso: string): string {
  return toVnDateTimeParts(iso)?.timeDisplay ?? '';
}

/** Adds signed integer days to a GMT+7 calendar date (`YYYY-MM-DD` or `DD/MM/YYYY`). */
export function addDaysToVnDate(dateInput: string, deltaDays: number): VnDateValue | null {
  const parsed = parseVnDateInput(dateInput);
  if (!parsed || !Number.isFinite(deltaDays)) return null;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + Math.trunc(deltaDays)));
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return {
    year,
    month,
    day,
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
    display: `${pad2(day)}/${pad2(month)}/${year}`,
  };
}

/** Returns inclusive number of Vietnam calendar days between two dates (e.g. same date = 1). */
export function diffVnDaysInclusive(startDateInput: string, endDateInput: string): number | null {
  const start = parseVnDateInput(startDateInput);
  const end = parseVnDateInput(endDateInput);
  if (!start || !end) return null;
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const diff = Math.round((endUtc - startUtc) / DAY_MS) + 1;
  return diff >= 1 ? diff : null;
}

/** Enumerates Vietnam calendar dayKeys (`YYYY-MM-DD`) covered by `[startAt, endAt)`. */
export function enumerateVnDayKeys(startIso: string, endIso: string, maxDays = 60): string[] {
  const startMs = Date.parse(startIso || '');
  const endMs = Date.parse(endIso || '');
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    const fallback = toVnDateTimeParts(startIso);
    return fallback ? [fallback.dayKey] : [];
  }
  const startParts = toVnDateTimeParts(startMs);
  // Subtract 1ms so exact 00:00:00 GMT+7 end boundary stays on the previous calendar day.
  const endParts = toVnDateTimeParts(Math.max(startMs, endMs - 1));
  if (!startParts || !endParts) return [];

  const result: string[] = [];
  let cursor = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const endDayUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  while (cursor <= endDayUtc && result.length < maxDays) {
    const d = new Date(cursor);
    result.push(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`);
    cursor += DAY_MS;
  }
  return result;
}

export function formatVnDayKeyLabel(dayKey: string): string {
  const parts = dayKey.split('-');
  if (parts.length !== 3) return dayKey;
  return `${parts[2]}/${parts[1]}`;
}

export function formatVnTimeShort(isoOrTime: string): string {
  const timeStr = isoOrTime.includes('T')
    ? (toVnDateTimeParts(isoOrTime)?.timeDisplay ?? '')
    : (parseVnTimeInput(isoOrTime)?.display ?? isoOrTime);
  if (!timeStr) return '';
  return timeStr.endsWith(':00') ? `${Number(timeStr.slice(0, 2))}h` : timeStr;
}

/**
 * Selects up to `limit` (default 2) nearest present/future Vietnam calendar days (`YYYY-MM-DD`).
 * Past days (< today GMT+7) are dropped unless no present/future days remain.
 */
export function selectNearestPresentOrFutureDays(
  dayKeys: string[],
  nowMs: number = Date.now(),
  limit = 2
): string[] {
  const todayKey = getVnTodayParts(nowMs).dayKey;
  const uniqueSorted = [...new Set(dayKeys.filter(Boolean))].sort();
  const currentOrFuture = uniqueSorted.filter((d) => d >= todayKey);
  if (currentOrFuture.length > 0) {
    return currentOrFuture.slice(0, limit);
  }
  return uniqueSorted.slice(-limit);
}

/**
 * Auto-show / auto-hide visibility window check on Homepage.
 * Example with preShowHours = 2 and slot 12:00-14:00:
 * - Visible starting 10:00 (counts down "Bắt đầu sau:" to 12:00)
 * - Active 12:00-14:00 (counts down "Kết thúc trong:" to 14:00)
 * - Hidden at >= 14:00 (returns false)
 */
export function isCampaignSlotInAutoShowWindow(
  startAtIso: string,
  endAtIso: string,
  nowMs: number = Date.now(),
  preShowHours: number = DEFAULT_FLASH_SALE_PRE_SHOW_HOURS
): boolean {
  const startMs = Date.parse(startAtIso || '');
  const endMs = Date.parse(endAtIso || '');
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
  if (nowMs >= endMs) return false;
  const safeLeadHours = Number.isFinite(preShowHours) && preShowHours >= 0 ? preShowHours : DEFAULT_FLASH_SALE_PRE_SHOW_HOURS;
  const showFromMs = startMs - safeLeadHours * 3600000;
  return nowMs >= showFromMs;
}

/**
 * Computes the next timestamp (epoch ms) when homepage auto-visibility or active pricing changes
 * for a list of campaigns, or `null` if no upcoming boundary exists.
 */
export function getNextHotSaleBoundaryMs(
  campaigns: Array<{ startAt: string; endAt: string }>,
  nowMs: number = Date.now(),
  preShowHours: number = DEFAULT_FLASH_SALE_PRE_SHOW_HOURS
): number | null {
  const safeLeadHours = Number.isFinite(preShowHours) && preShowHours >= 0 ? preShowHours : DEFAULT_FLASH_SALE_PRE_SHOW_HOURS;
  const leadMs = safeLeadHours * 3600000;
  let earliest = Infinity;
  for (const c of campaigns) {
    const startMs = Date.parse(c.startAt || '');
    const endMs = Date.parse(c.endAt || '');
    for (const candidate of [startMs - leadMs, startMs, endMs]) {
      if (Number.isFinite(candidate) && candidate > nowMs && candidate < earliest) {
        earliest = candidate;
      }
    }
  }
  return Number.isFinite(earliest) ? earliest : null;
}
