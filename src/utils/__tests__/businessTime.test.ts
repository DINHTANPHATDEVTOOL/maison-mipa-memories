import { describe, it, expect } from 'vitest';
import {
  toVietnamWallClock,
  getBusinessDate,
  getBusinessTime,
  getBusinessDayOfWeek,
  isBusinessWeekend,
  isWithinOperatingHours,
  determineShiftFromTime,
  timeToMinutes,
  minutesToTime,
} from '../businessTime';

describe('Centralized Business Time (Asia/Ho_Chi_Minh)', () => {
  it('correctly resolves pure date strings independent of runtime timezone', () => {
    // 2026-09-21 is Monday
    const monday = toVietnamWallClock('2026-09-21');
    expect(monday.year).toBe(2026);
    expect(monday.month).toBe(9);
    expect(monday.day).toBe(21);
    expect(monday.dayOfWeek).toBe(1); // Monday
    expect(monday.isWeekend).toBe(false);

    // 2026-09-20 is Sunday
    const sunday = toVietnamWallClock('2026-09-20');
    expect(sunday.dayOfWeek).toBe(0); // Sunday
    expect(sunday.isWeekend).toBe(true);

    // 2026-09-26 is Saturday
    const saturday = toVietnamWallClock('2026-09-26');
    expect(saturday.dayOfWeek).toBe(6); // Saturday
    expect(saturday.isWeekend).toBe(true);
  });

  it('correctly parses ISO strings with +07:00 and UTC Z timestamps to Vietnam wall-clock', () => {
    // 2026-09-20T15:00:00+07:00 is 15:00 in Vietnam
    const vnTime = toVietnamWallClock('2026-09-20T15:00:00+07:00');
    expect(vnTime.hour).toBe(15);
    expect(vnTime.minute).toBe(0);
    expect(vnTime.timeString).toBe('15:00');

    // 2026-09-20T08:00:00Z is 15:00 in Vietnam (8 + 7)
    const utcTime = toVietnamWallClock('2026-09-20T08:00:00Z');
    expect(utcTime.hour).toBe(15);
    expect(utcTime.minute).toBe(0);
    expect(utcTime.timeString).toBe('15:00');

    // Cross-midnight: 2026-09-20T17:30:00Z is 2026-09-21 00:30 in Vietnam
    const midnightTime = toVietnamWallClock('2026-09-20T17:30:00Z');
    expect(midnightTime.dateString).toBe('2026-09-21');
    expect(midnightTime.timeString).toBe('00:30');
    expect(midnightTime.dayOfWeek).toBe(1); // Monday in Vietnam!
  });

  describe('isWithinOperatingHours', () => {
    it('enforces Weekday rules (08:30 — 19:00)', () => {
      // 2026-09-21 is Monday
      expect(isWithinOperatingHours('2026-09-21', '08:00', '10:00').valid).toBe(false);
      expect(isWithinOperatingHours('2026-09-21', '08:30', '10:30').valid).toBe(true);
      expect(isWithinOperatingHours('2026-09-21', '17:00', '19:00').valid).toBe(true);
      expect(isWithinOperatingHours('2026-09-21', '18:00', '19:30').valid).toBe(false);
    });

    it('enforces Weekend rules (08:00 — 20:30)', () => {
      // 2026-09-20 is Sunday
      expect(isWithinOperatingHours('2026-09-20', '07:30', '09:30').valid).toBe(false);
      expect(isWithinOperatingHours('2026-09-20', '08:00', '10:00').valid).toBe(true);
      expect(isWithinOperatingHours('2026-09-20', '18:00', '20:30').valid).toBe(true);
      expect(isWithinOperatingHours('2026-09-20', '19:00', '21:00').valid).toBe(false);
    });
  });

  describe('determineShiftFromTime', () => {
    it('classifies simple HH:mm times', () => {
      expect(determineShiftFromTime('08:00')).toBe('MORNING');
      expect(determineShiftFromTime('09:30')).toBe('MORNING');
      expect(determineShiftFromTime('12:59')).toBe('MORNING');
      expect(determineShiftFromTime('13:00')).toBe('AFTERNOON');
      expect(determineShiftFromTime('15:00')).toBe('AFTERNOON');
      expect(determineShiftFromTime('18:59')).toBe('AFTERNOON');
    });

    it('classifies ISO timestamps in Vietnam timezone regardless of runner TZ', () => {
      expect(determineShiftFromTime('2026-09-20T10:00:00+07:00')).toBe('MORNING');
      expect(determineShiftFromTime('2026-09-20T12:59:00+07:00')).toBe('MORNING');
      expect(determineShiftFromTime('2026-09-20T13:00:00+07:00')).toBe('AFTERNOON');
      expect(determineShiftFromTime('2026-09-20T15:00:00+07:00')).toBe('AFTERNOON');
      // UTC representation of Vietnam 15:00 is 08:00Z
      expect(determineShiftFromTime('2026-09-20T08:00:00Z')).toBe('AFTERNOON');
    });
  });

  describe('time utilities', () => {
    it('converts time to minutes and vice-versa', () => {
      expect(timeToMinutes('08:30')).toBe(510);
      expect(minutesToTime(510)).toBe('08:30');
      expect(timeToMinutes('19:00')).toBe(1140);
      expect(minutesToTime(1140)).toBe('19:00');
    });
  });
});
