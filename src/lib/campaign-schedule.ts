import { addDaysToVnDate, diffVnDaysInclusive, parseVnTimeInput, toVnDateTimeParts, vnDateTimeToIso } from './flash-sale-schedule';

export interface CampaignWindow { startAt: string; endAt: string }
export interface DailyCampaignSchedule {
  mode: 'daily_slots';
  startDate: string;
  endDate: string;
  slots: Array<{ startTime: string; endTime: string }>;
}

export function buildCampaignWindows(schedule: DailyCampaignSchedule): CampaignWindow[] {
  const days = diffVnDaysInclusive(schedule.startDate, schedule.endDate);
  if (!days || days > 60) throw new Error('Lịch mỗi ngày phải nằm trong khoảng 1–60 ngày.');
  if (!schedule.slots.length || schedule.slots.length > 12) throw new Error('Chọn từ 1 đến 12 khung giờ mỗi ngày.');
  const slots = schedule.slots.map(slot => {
    const start = parseVnTimeInput(slot.startTime), end = parseVnTimeInput(slot.endTime);
    if (!start || !end || start.display >= end.display) throw new Error('Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
    return { startTime: start.display, endTime: end.display };
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].startTime < slots[i - 1].endTime) throw new Error('Các khung giờ mỗi ngày không được trùng nhau.');
  }
  return Array.from({ length: days }, (_, day) => {
    const date = addDaysToVnDate(schedule.startDate, day)!;
    return slots.map(slot => ({ startAt: vnDateTimeToIso(date.dayKey, slot.startTime), endAt: vnDateTimeToIso(date.dayKey, slot.endTime) }));
  }).flat();
}

export function getCampaignWindows(campaign: { startAt: string | Date; endAt: string | Date; scheduleJson?: string | null }): CampaignWindow[] {
  if (campaign.scheduleJson) {
    // Invalid stored schedules fail closed instead of applying all-day discounts.
    try { return JSON.parse(campaign.scheduleJson) as CampaignWindow[]; } catch { return []; }
  }
  return [{ startAt: new Date(campaign.startAt).toISOString(), endAt: new Date(campaign.endAt).toISOString() }];
}

export function readDailyCampaignSchedule(scheduleJson?: string | null): DailyCampaignSchedule | null {
  if (!scheduleJson) return null;
  const windows = getCampaignWindows({ scheduleJson, startAt: '', endAt: '' });
  if (!windows.length) return null;
  const slots = new Map<string, { startTime: string; endTime: string }>();
  for (const window of windows) {
    const startTime = toVnDateTimeParts(window.startAt)!.timeDisplay;
    const endTime = toVnDateTimeParts(window.endAt)!.timeDisplay;
    slots.set(`${startTime}-${endTime}`, { startTime, endTime });
  }
  return { mode: 'daily_slots', startDate: toVnDateTimeParts(windows[0].startAt)!.dayKey,
    endDate: toVnDateTimeParts(windows.at(-1)!.endAt)!.dayKey, slots: [...slots.values()] };
}

export function getCampaignPhase(campaign: { status: string; startAt: string; endAt: string; schedule?: DailyCampaignSchedule | null }, nowMs: number) {
  if (campaign.status !== 'PUBLISHED') return 'inactive';
  const windows = campaign.schedule ? buildCampaignWindows(campaign.schedule) : [campaign];
  if (windows.some(w => Date.parse(w.startAt) <= nowMs && nowMs < Date.parse(w.endAt))) return 'active';
  return windows.some(w => Date.parse(w.startAt) > nowMs) ? 'upcoming' : 'inactive';
}
