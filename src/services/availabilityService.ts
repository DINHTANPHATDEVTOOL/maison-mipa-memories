// ==============================================================================
// Maison MIPA Memories - Real Availability Engine
// Evaluates studio room availability, duration, opening hours, and active bookings
// Supports adjacent slots (e.g. 10:00-11:00 and 11:00-12:00) and frees cancelled slots.
// ==============================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Booking } from '../types';

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
 * Extracts minutes from ISO timestamp or time string
 */
export function parseBookingRangeMinutes(
  date: string,
  booking: { bookingDate?: string; startTime?: string; endTime?: string; startAt?: string; endAt?: string; booking_status?: string; bookingStatus?: string; studioId?: string; studio_room_id?: string }
): { start: number; end: number } | null {
  // If ISO timestamps are present
  if (booking.startAt && booking.endAt) {
    const startDate = new Date(booking.startAt);
    const endDate = new Date(booking.endAt);
    const startM = startDate.getHours() * 60 + startDate.getMinutes();
    const endM = endDate.getHours() * 60 + endDate.getMinutes();
    return { start: startM, end: endM };
  }

  // Fallback to bookingDate + startTime / endTime
  if (booking.startTime && booking.endTime) {
    return {
      start: timeToMinutes(booking.startTime),
      end: timeToMinutes(booking.endTime),
    };
  }

  return null;
}

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
        const isNotCancelled = b.bookingStatus !== 'CANCELLED';
        return matchesStudio && matchesDate && isNotCancelled;
      })
      .map(b => parseBookingRangeMinutes(date, b))
      .filter((range): range is { start: number; end: number } => range !== null);
  }

  const openingMinutes = STUDIO_CONFIG.OPENING_HOUR * 60 + STUDIO_CONFIG.OPENING_MINUTE;
  const closingMinutes = STUDIO_CONFIG.CLOSING_HOUR * 60 + STUDIO_CONFIG.CLOSING_MINUTE;

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

    if (hasConflict) {
      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'BOOKED',
        reason: 'Phòng đã có lịch đặt trong khung giờ này',
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

/**
 * Generates available slots for a given date, studio room, and session duration.
 * Calls the backend-authoritative get_studio_booked_slots RPC to detect active bookings
 * across all users without privacy leaks, and dims out booked slots.
 */
export async function getAvailableSlots(params: AvailabilityParams): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured()) {
    return getAvailableSlotsSync(params);
  }

  const { date, studioId, durationMinutes, existingBookings } = params;
  const safeDuration = Math.max(30, durationMinutes || 60);
  let bookedRanges: Array<{ startMs: number; endMs: number }> = [];

  try {
    // 1. Fetch authoritative booked intervals from PostgreSQL RPC (SECURITY DEFINER)
    const { data, error } = await supabase.rpc('get_studio_booked_slots', {
      p_studio_room_id: studioId,
      p_date: date,
    });

    if (!error && Array.isArray(data)) {
      bookedRanges = data
        .map((b: { start_at: string; end_at: string }) => ({
          startMs: new Date(b.start_at).getTime(),
          endMs: new Date(b.end_at).getTime(),
        }))
        .filter(r => !isNaN(r.startMs) && !isNaN(r.endMs));
    } else if (error) {
      // Fallback to direct query if RPC is temporarily unavailable
      const startOfDay = `${date}T00:00:00+07:00`;
      const endOfDay = `${date}T23:59:59+07:00`;

      const { data: bData } = await supabase
        .from('bookings')
        .select('start_at, end_at, booking_status')
        .eq('studio_room_id', studioId)
        .neq('booking_status', 'CANCELLED')
        .gte('start_at', startOfDay)
        .lte('start_at', endOfDay);

      if (bData && Array.isArray(bData)) {
        bookedRanges = bData.map(b => ({
          startMs: new Date(b.start_at).getTime(),
          endMs: new Date(b.end_at).getTime(),
        }));
      }
    }
  } catch (err) {
    console.warn('Availability loading error, using local fallback:', err);
    return getAvailableSlotsSync(params);
  }

  // 2. Also incorporate any local in-memory bookings passed in params
  if (existingBookings && existingBookings.length > 0) {
    const memRanges = existingBookings
      .filter(b => {
        const matchesStudio = b.studioId === studioId;
        const matchesDate = b.bookingDate === date || (b.startAt && b.startAt.startsWith(date));
        const isNotCancelled = b.bookingStatus !== 'CANCELLED';
        return matchesStudio && matchesDate && isNotCancelled;
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

    if (hasConflict) {
      slots.push({
        time: startStr,
        endTime: endStr,
        label: `${startStr} - ${endStr}`,
        status: 'BOOKED',
        reason: 'Khung giờ này đã có khách đặt lịch',
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
