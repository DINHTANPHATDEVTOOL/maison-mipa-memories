// ==============================================================================
// Maison MIPA Memories — Centralized Business Time Utility
// Canonical Timezone: Asia/Ho_Chi_Minh (UTC+7)
// Timezone-independent calendar and shift calculation across all runners & browsers
// ==============================================================================

export const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type ShiftType = 'MORNING' | 'AFTERNOON';

export interface VietnamWallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm
  isWeekend: boolean;
}

/**
 * Helper to convert HH:mm or HH:mm:ss to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formats minutes from midnight to HH:mm
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Resolves a date input (string, Date, timestamp) into exact Vietnam Wall Clock components
 * Guaranteed to produce the exact same date & time regardless of machine's local timezone.
 */
export function toVietnamWallClock(dateInput: string | Date = new Date()): VietnamWallClock {
  // 1. Pure date string without time: 'YYYY-MM-DD'
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [yearStr, monthStr, dayStr] = dateInput.trim().split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Using UTC noon to calculate dayOfWeek prevents any timezone edge boundary overflow
    const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = utcNoon.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      second: 0,
      dayOfWeek,
      dateString: `${yearStr}-${monthStr}-${dayStr}`,
      timeString: '00:00',
      isWeekend,
    };
  }

  // 2. Full Date object, timestamp number, or ISO string with time
  let dateObj: Date;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (typeof dateInput === 'string') {
    // If string has date + time without timezone, assume Asia/Ho_Chi_Minh (+07:00)
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) && !trimmed.includes('Z') && !/[+-]\d{2}/.test(trimmed.slice(10))) {
      dateObj = new Date(trimmed + '+07:00');
    } else {
      dateObj = new Date(trimmed);
    }
  } else {
    dateObj = new Date();
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  // Use Intl.DateTimeFormat with target timezone Asia/Ho_Chi_Minh
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = dtf.formatToParts(dateObj);
  let year = 2026;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    else if (p.type === 'month') month = parseInt(p.value, 10);
    else if (p.type === 'day') day = parseInt(p.value, 10);
    else if (p.type === 'hour') hour = parseInt(p.value, 10);
    else if (p.type === 'minute') minute = parseInt(p.value, 10);
    else if (p.type === 'second') second = parseInt(p.value, 10);
  }

  // Handle midnight 24 hour12: false quirks in some JS engines
  if (hour === 24) hour = 0;

  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = utcNoon.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    dateString,
    timeString,
    isWeekend,
  };
}

/**
 * Returns Vietnam calendar date in YYYY-MM-DD format
 */
export function getBusinessDate(dateInput?: string | Date): string {
  return toVietnamWallClock(dateInput).dateString;
}

/**
 * Returns Vietnam wall-clock time in HH:mm format
 */
export function getBusinessTime(dateInput?: string | Date): string {
  return toVietnamWallClock(dateInput).timeString;
}

/**
 * Returns Vietnam day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getBusinessDayOfWeek(dateInput: string | Date): number {
  return toVietnamWallClock(dateInput).dayOfWeek;
}

/**
 * Returns true if date is Saturday or Sunday in Vietnam calendar
 */
export function isBusinessWeekend(dateInput: string | Date): boolean {
  return toVietnamWallClock(dateInput).isWeekend;
}

/**
 * Returns ISO string with Vietnam +07:00 offset representation
 */
export function getBusinessIsoDate(dateInput?: string | Date): string {
  const clock = toVietnamWallClock(dateInput);
  return `${clock.dateString}T${clock.timeString}:${String(clock.second).padStart(2, '0')}+07:00`;
}

/**
 * Validates whether a booking slot falls within studio operating hours:
 * - Weekday (Monday - Friday): 08:30 — 19:00
 * - Weekend (Saturday - Sunday): 08:00 — 20:30
 *
 * Deterministic and timezone-independent across all machines.
 */
export function isWithinOperatingHours(
  bookingDate: string,
  startTime: string,
  endTime: string
): { valid: boolean; reason?: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const clock = toVietnamWallClock(bookingDate);
  const isWeekend = clock.isWeekend;

  const openingMinutes = isWeekend ? 8 * 60 : 8 * 60 + 30; // 08:00 weekend vs 08:30 weekday
  const closingMinutes = isWeekend ? 20 * 60 + 30 : 19 * 60; // 20:30 weekend vs 19:00 weekday

  if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
    const hoursDesc = isWeekend ? 'Cuối tuần: 08:00 - 20:30' : 'Ngày thường: 08:30 - 19:00';
    return {
      valid: false,
      reason: `Khung giờ đã chọn (${startTime} - ${endTime}) nằm ngoài giờ mở cửa của studio (${hoursDesc}). Vui lòng chọn khung giờ trong giờ hoạt động.`,
    };
  }

  return { valid: true };
}

/**
 * Determines whether a given time falls into MORNING or AFTERNOON shift
 * Canonical Shift Rules:
 * - MORNING: 08:00 <= time < 13:00
 * - AFTERNOON: 13:00 <= time <= 19:00
 *
 * Guaranteed to evaluate in Asia/Ho_Chi_Minh wall-clock time regardless of runner TZ.
 */
export function determineShiftFromTime(timeString: string): ShiftType {
  if (!timeString) return 'MORNING';

  let hour = 9;
  let minute = 0;

  if (timeString.includes('T')) {
    const clock = toVietnamWallClock(timeString);
    hour = clock.hour;
    minute = clock.minute;
  } else if (timeString.includes(':')) {
    const parts = timeString.trim().split(':');
    hour = parseInt(parts[0], 10);
    minute = parseInt(parts[1] || '0', 10);
  }

  const totalMinutes = hour * 60 + minute;
  const shiftBoundaryMinutes = 13 * 60; // 13:00

  return totalMinutes < shiftBoundaryMinutes ? 'MORNING' : 'AFTERNOON';
}
