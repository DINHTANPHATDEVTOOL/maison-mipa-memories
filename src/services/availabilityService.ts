// ==============================================================================
// Maison MIPA Memories - Real Availability Engine
// Evaluates studio room availability, duration, opening hours, and active bookings
// Supports adjacent slots (e.g. 10:00-11:00 and 11:00-12:00) and frees cancelled slots.
// ==============================================================================
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type { Booking } from '../types';

export class AvailabilityUnavailableError extends Error {
  constructor(message: string = 'Không thể xác minh lịch trống lúc này từ hệ thống.') {
    super(message);
    this.name = 'AvailabilityUnavailableError';
  }
}

export interface TimeSlot {
  time: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  label: string; // 'HH:mm - HH:mm'
  status: 'AVAILABLE' | 'BOOKED' | 'LIMITED';
  reason?: string;
  tag?: string;
}

export interface AvailabilityParams {
  date: string; // 'YYYY-MM-DD'
  studioId: string;
  durationMinutes: number; // Package duration + addons duration
  existingBookings?: Booking[];
}

// Configurable Business Hours
export const STUDIO_CONFIG = {
  OPENING_HOUR: 9, // 09:00
  OPENING_MINUTE: 0,
  CLOSING_HOUR: 19, // 19:00
  CLOSING_MINUTE: 0,
  SLOT_STEP_MINUTES: 30, // Slot generation interval
  BUFFER_MINUTES: 0, // Zero buffer enables clean back-to-back adjacent slots
};

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 * Adjacent intervals [10:00, 11:00) and [11:00, 12:00) DO NOT overlap.
 */
export function isIntervalOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Helper to convert "HH:mm" to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Helper to convert minutes from midnight to "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Helper to get current date and time in Asia/Ho_Chi_Minh
 */
export function getNowVn(): { dateStr: string; minutesNow: number } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return {
      dateStr: `${y}-${m}-${d}`,
      minutesNow: hour * 60 + minute,
    };
  } catch {
    const now = new Date();
    return {
      dateStr: now.toISOString().split('T')[0],
      minutesNow: now.getHours() * 60 + now.getMinutes(),
    };
  }
}

/**
 * Extracts minutes from ISO timestamp or time string
 */
export function parseBookingRangeMinutes(
  date: string,
  booking: { bookingDate?: string; startTime?: string; endTime?: string; startAt?: string; endAt?: string; booking_status?: string; bookingStatus?: string; studioId?: string; studio_room_id?: string }
): { start: number; end: number } | null {
  // Prefer literal startTime / endTime if present (guaranteed local studio time)
  if (booking.startTime && booking.endTime) {
    return {
      start: timeToMinutes(booking.startTime),
      end: timeToMinutes(booking.endTime),
    };
  }

  // If ISO timestamps are present
  if (booking.startAt && booking.endAt) {
    const startDate = new Date(booking.startAt);
    const endDate = new Date(booking.endAt);
    const startM = startDate.getHours() * 60 + startDate.getMinutes();
    const endM = endDate.getHours() * 60 + endDate.getMinutes();
    return { start: startM, end: endM };
  }

  return null;
}

export const OCCUPIED_BOOKING_STATUSES = [
  'CONFIRMED',
  'CHECKED_IN',
  'SHOOTING',
  'SHOOT_COMPLETED',
  'EDITING',
  'READY_FOR_REVIEW',
  'DELIVERED',
  'DEPOSIT_PAID', // Legacy confirmed deposit
];

/**
 * Synchronous availability evaluation (used for offline mode, initial state, and test runner)
 */
export function getAvailableSlotsSync(params: AvailabilityParams): TimeSlot[] {
  const { date, studioId, durationMinutes, existingBookings } = params;
  const safeDuration = Math.max(30, durationMinutes || 60);

  let activeBookingsForStudio: Array<{ start: number; end: number }> = [];

  if (existingBookings && existingBookings.length > 0) {
    activeBookingsForStudio = existingBookings
      .filter(b => {
        const matchesStudio = b.studioId === studioId;
        const matchesDate = b.bookingDate === date || (b.startAt && b.startAt.startsWith(date));
        const isOccupied = OCCUPIED_BOOKING_STATUSES.includes(b.bookingStatus);
        return matchesStudio && matchesDate && isOccupied;
      })
      .map(b => parseBookingRangeMinutes(date, b))
      .filter((range): range is { start: number; end: number } => range !== null);
  }

  const openingMinutes = STUDIO_CONFIG.OPENING_HOUR * 60 + STUDIO_CONFIG.OPENING_MINUTE;
  const closingMinutes = STUDIO_CONFIG.CLOSING_HOUR * 60 + STUDIO_CONFIG.CLOSING_MINUTE;
  const nowVn = getNowVn();

  const slots: TimeSlot[] = [];

  for (
    let candidateStart = openingMinutes;
    candidateStart + safeDuration <= closingMinutes;
    candidateStart += STUDIO_CONFIG.SLOT_STEP_MINUTES
  ) {
    const candidateEnd = candidateStart + safeDuration;
    const startStr = minutesToTime(candidateStart);
    const endStr = minutesToTime(candidateEnd);

    // Overlap check against all active non-cancelled bookings
    const hasConflict = activeBookingsForStudio.some(existing =>
      isIntervalOverlapping(candidateStart, candidateEnd, existing.start, existing.end)
    );

    const isPastToday = (date === nowVn.dateStr) && (candidateStart <= nowVn.minutesNow);

    if (hasConflict || isPastToday) {
      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'BOOKED',
        reason: isPastToday
          ? 'Khung giờ này đã qua trong ngày'
          : 'Phòng đã có lịch đặt trong khung giờ này',
      });
    } else {
      let tag: string | undefined;
      if (candidateStart === 13 * 60 + 30) {
        tag = 'Khung giờ vàng';
      } else if (candidateStart === 10 * 60) {
        tag = 'Ánh sáng tự nhiên đẹp';
      }

      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'AVAILABLE',
        tag,
      });
    }
  }

  return slots;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveStudioRoomUuid(studioIdOrSlug: string): Promise<string> {
  if (!studioIdOrSlug) {
    throw new AvailabilityUnavailableError('Chưa chọn phòng studio.');
  }
  if (UUID_REGEX.test(studioIdOrSlug)) {
    return studioIdOrSlug;
  }

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('studio_rooms')
      .select('id')
      .or(`slug.eq.${studioIdOrSlug},code.eq.${studioIdOrSlug}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error resolving studio room UUID:', error.message);
      throw new AvailabilityUnavailableError(`Không thể tra cứu phòng studio: ${error.message}`);
    }

    if (data?.id && UUID_REGEX.test(data.id)) {
      return data.id;
    }

    throw new AvailabilityUnavailableError(`Phòng studio "${studioIdOrSlug}" không tồn tại trên hệ thống.`);
  }

  // Demo mode seed aliases allowed only in explicit demo mode
  if (isDemoModeEnabled()) {
    if (studioIdOrSlug === 'room_01' || studioIdOrSlug === 'ROOM_01' || studioIdOrSlug === 'std_room_01') {
      return 'f0000000-0000-0000-0000-000000000001';
    }
    if (studioIdOrSlug === 'room_02' || studioIdOrSlug === 'ROOM_02' || studioIdOrSlug === 'std_room_02') {
      return 'f0000000-0000-0000-0000-000000000002';
    }
    if (studioIdOrSlug === 'garden' || studioIdOrSlug === 'GARDEN' || studioIdOrSlug === 'std_garden') {
      return 'f0000000-0000-0000-0000-000000000003';
    }
  }

  throw new AvailabilityUnavailableError(`Phòng studio "${studioIdOrSlug}" không hợp lệ.`);
}

/**
 * Generates available slots for a given date, studio room, and session duration.
 * Calls the backend-authoritative get_studio_booked_slots RPC to detect active bookings
 * across all users without privacy leaks, and dims out booked slots.
 *
 * Strictly fail-closed in production:
 * If Supabase is configured, authoritative backend check is mandatory.
 * RPC errors, network errors, or malformed data will throw AvailabilityUnavailableError.
 */
export async function getAvailableSlots(params: AvailabilityParams): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured()) {
    if (isDemoModeEnabled()) {
      return getAvailableSlotsSync(params);
    }
    throw new AvailabilityUnavailableError('Hệ thống cơ sở dữ liệu chưa được kích hoạt.');
  }

  const { date, studioId, durationMinutes, existingBookings } = params;
  const safeDuration = Math.max(30, durationMinutes || 60);
  let bookedRanges: Array<{ startMs: number; endMs: number }> = [];

  const resolvedStudioId = await resolveStudioRoomUuid(studioId);

  // 1. Fetch authoritative booked intervals from PostgreSQL RPC (SECURITY DEFINER)
  const { data, error } = await supabase.rpc('get_studio_booked_slots', {
    p_studio_room_id: resolvedStudioId,
    p_date: date,
  });

  if (error) {
    console.error('get_studio_booked_slots RPC error:', error.message);
    throw new AvailabilityUnavailableError(`Không thể kiểm tra lịch trống: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new AvailabilityUnavailableError('Dữ liệu lịch trống từ máy chủ không hợp lệ.');
  }

  for (const row of data) {
    if (!row || typeof row !== 'object') {
      throw new AvailabilityUnavailableError('Dữ liệu lịch trống từ máy chủ không hợp lệ.');
    }
    if (!row.start_at || !row.end_at) {
      throw new AvailabilityUnavailableError('Dữ liệu lịch trống từ máy chủ không hợp lệ.');
    }
    const startMs = new Date(row.start_at).getTime();
    const endMs = new Date(row.end_at).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new AvailabilityUnavailableError('Dữ liệu lịch trống từ máy chủ không hợp lệ.');
    }
    bookedRanges.push({ startMs, endMs });
  }

  // 2. Also incorporate any local in-memory bookings passed in params
  if (existingBookings && existingBookings.length > 0) {
    const memRanges = existingBookings
      .filter(b => {
        const matchesStudio = b.studioId === studioId;
        const matchesDate = b.bookingDate === date || (b.startAt && b.startAt.startsWith(date));
        const isOccupied = OCCUPIED_BOOKING_STATUSES.includes(b.bookingStatus);
        return matchesStudio && matchesDate && isOccupied;
      })
      .map(b => {
        if (b.startAt && b.endAt) {
          return {
            startMs: new Date(b.startAt).getTime(),
            endMs: new Date(b.endAt).getTime(),
          };
        }
        if (b.startTime && b.endTime) {
          return {
            startMs: new Date(`${date}T${b.startTime}:00+07:00`).getTime(),
            endMs: new Date(`${date}T${b.endTime}:00+07:00`).getTime(),
          };
        }
        return null;
      })
      .filter((r): r is { startMs: number; endMs: number } => r !== null && !isNaN(r.startMs));

    bookedRanges.push(...memRanges);
  }

  const openingMinutes = STUDIO_CONFIG.OPENING_HOUR * 60 + STUDIO_CONFIG.OPENING_MINUTE;
  const closingMinutes = STUDIO_CONFIG.CLOSING_HOUR * 60 + STUDIO_CONFIG.CLOSING_MINUTE;
  const nowVn = getNowVn();

  const slots: TimeSlot[] = [];

  for (
    let candidateStart = openingMinutes;
    candidateStart + safeDuration <= closingMinutes;
    candidateStart += STUDIO_CONFIG.SLOT_STEP_MINUTES
  ) {
    const candidateEnd = candidateStart + safeDuration;
    const startStr = minutesToTime(candidateStart);
    const endStr = minutesToTime(candidateEnd);

    const candidateStartMs = new Date(`${date}T${startStr}:00+07:00`).getTime();
    const candidateEndMs = new Date(`${date}T${endStr}:00+07:00`).getTime();

    // Overlap check against all active non-cancelled bookings
    const hasConflict = bookedRanges.some(existing =>
      candidateStartMs < existing.endMs && candidateEndMs > existing.startMs
    );

    const isPastToday = (date === nowVn.dateStr) && (candidateStart <= nowVn.minutesNow);

    if (hasConflict || isPastToday) {
      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'BOOKED',
        reason: isPastToday
          ? 'Khung giờ này đã qua trong ngày'
          : 'Khung giờ này đã có khách đặt lịch',
      });
    } else {
      let tag: string | undefined;
      if (candidateStart === 13 * 60 + 30) {
        tag = 'Khung giờ vàng';
      } else if (candidateStart === 10 * 60) {
        tag = 'Ánh sáng tự nhiên đẹp';
      }

      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'AVAILABLE',
        tag,
      });
    }
  }

  return slots;
}
