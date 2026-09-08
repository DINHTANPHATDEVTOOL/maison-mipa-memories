import { describe, it, expect } from 'vitest';
import {
  isIntervalOverlapping,
  timeToMinutes,
  minutesToTime,
  getAvailableSlotsSync,
} from '../availabilityService';
import type { Booking } from '../../types';

describe('Availability Engine & Conflict Detection', () => {
  describe('Interval Overlap Logic [start, end)', () => {
    it('detects overlapping intervals correctly', () => {
      // 10:00 (600) - 11:30 (690) overlaps with 11:00 (660) - 12:00 (720)
      expect(isIntervalOverlapping(600, 690, 660, 720)).toBe(true);

      // Enclosed: 10:00 - 12:00 overlaps with 10:30 - 11:30
      expect(isIntervalOverlapping(600, 720, 630, 690)).toBe(true);

      // Identical intervals overlap
      expect(isIntervalOverlapping(600, 720, 600, 720)).toBe(true);
    });

    it('allows adjacent back-to-back intervals without conflict (P0 requirement)', () => {
      // Slot A: 10:00 (600) - 11:00 (660)
      // Slot B: 11:00 (660) - 12:00 (720)
      // Half-open interval [600, 660) and [660, 720) DO NOT overlap!
      expect(isIntervalOverlapping(600, 660, 660, 720)).toBe(false);
      expect(isIntervalOverlapping(660, 720, 600, 660)).toBe(false);
    });

    it('allows separated disjoint intervals', () => {
      // 09:00 - 10:00 and 14:00 - 16:00
      expect(isIntervalOverlapping(540, 600, 840, 960)).toBe(false);
    });
  });

  describe('Time conversion utilities', () => {
    it('converts time strings to minutes and back accurately', () => {
      expect(timeToMinutes('09:00')).toBe(540);
      expect(timeToMinutes('13:30')).toBe(810);
      expect(minutesToTime(540)).toBe('09:00');
      expect(minutesToTime(810)).toBe('13:30');
    });
  });

  describe('Slot generation & Conflict resolution', () => {
    const testStudioId = 'std_room_01';
    const otherStudioId = 'std_room_02';

    it('generates slots within operating hours (09:00 - 19:00)', () => {
      const slots = getAvailableSlotsSync({
        date: '2026-09-10',
        studioId: testStudioId,
        durationMinutes: 60,
        existingBookings: [],
      });

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].time).toBe('09:00');
      const lastSlot = slots[slots.length - 1];
      expect(timeToMinutes(lastSlot.endTime)).toBeLessThanOrEqual(19 * 60);
    });

    it('marks overlapping slot as BOOKED when active booking exists', () => {
      const mockBookings: Booking[] = [
        {
          id: 'bk_1',
          bookingCode: 'MIPA-260910-001',
          customerId: 'cust_1',
          customerName: 'Khách 1',
          customerPhone: '0901234567',
          customerEmail: 'k1@mipa.vn',
          serviceId: 'srv_1',
          serviceName: 'Couple',
          packageId: 'pkg_1',
          packageName: 'Signature',
          packagePrice: 2000000,
          bookingDate: '2026-09-10',
          startTime: '10:00',
          endTime: '11:30',
          studioId: testStudioId,
          studioName: 'Room 01',
          addons: [],
          subtotal: 2000000,
          discount: 0,
          depositAmount: 600000,
          totalAmount: 2000000,
          paymentStatus: 'DEPOSIT_PAID',
          bookingStatus: 'CONFIRMED',
          assignments: [],
          createdAt: '2026-09-10T08:00:00Z',
          updatedAt: '2026-09-10T08:00:00Z',
        },
      ];

      const slots = getAvailableSlotsSync({
        date: '2026-09-10',
        studioId: testStudioId,
        durationMinutes: 60,
        existingBookings: mockBookings,
      });

      // Slot 10:00 - 11:00 overlaps with booking 10:00 - 11:30
      const slot1000 = slots.find(s => s.time === '10:00');
      expect(slot1000?.status).toBe('BOOKED');

      // Slot 10:30 - 11:30 overlaps with booking 10:00 - 11:30
      const slot1030 = slots.find(s => s.time === '10:30');
      expect(slot1030?.status).toBe('BOOKED');

      // Adjacent slot 11:30 - 12:30 does NOT overlap with 10:00 - 11:30
      const slot1130 = slots.find(s => s.time === '11:30');
      expect(slot1130?.status).toBe('AVAILABLE');
    });

    it('liberates slot when a booking is CANCELLED (does NOT block slot)', () => {
      const mockCancelledBookings: Booking[] = [
        {
          id: 'bk_cancelled',
          bookingCode: 'MIPA-260910-002',
          customerId: 'cust_2',
          customerName: 'Khách Huỷ',
          customerPhone: '0909999999',
          customerEmail: 'cancel@mipa.vn',
          serviceId: 'srv_1',
          serviceName: 'Couple',
          packageId: 'pkg_1',
          packageName: 'Signature',
          packagePrice: 2000000,
          bookingDate: '2026-09-10',
          startTime: '14:00',
          endTime: '16:00',
          studioId: testStudioId,
          studioName: 'Room 01',
          addons: [],
          subtotal: 2000000,
          discount: 0,
          depositAmount: 600000,
          totalAmount: 2000000,
          paymentStatus: 'REFUNDED',
          bookingStatus: 'CANCELLED', // Cancelled booking!
          assignments: [],
          createdAt: '2026-09-10T08:00:00Z',
          updatedAt: '2026-09-10T08:00:00Z',
        },
      ];

      const slots = getAvailableSlotsSync({
        date: '2026-09-10',
        studioId: testStudioId,
        durationMinutes: 60,
        existingBookings: mockCancelledBookings,
      });

      // Slot 14:00 - 15:00 MUST remain AVAILABLE because the booking was cancelled
      const slot1400 = slots.find(s => s.time === '14:00');
      expect(slot1400?.status).toBe('AVAILABLE');
    });

    it('does not conflict across different studio rooms', () => {
      const mockBookingsOtherStudio: Booking[] = [
        {
          id: 'bk_room_2',
          bookingCode: 'MIPA-260910-003',
          customerId: 'cust_3',
          customerName: 'Khách Room 2',
          customerPhone: '0903333333',
          customerEmail: 'k3@mipa.vn',
          serviceId: 'srv_1',
          serviceName: 'Couple',
          packageId: 'pkg_1',
          packageName: 'Signature',
          packagePrice: 2000000,
          bookingDate: '2026-09-10',
          startTime: '10:00',
          endTime: '12:00',
          studioId: otherStudioId, // In ROOM 02!
          studioName: 'Room 02',
          addons: [],
          subtotal: 2000000,
          discount: 0,
          depositAmount: 600000,
          totalAmount: 2000000,
          paymentStatus: 'DEPOSIT_PAID',
          bookingStatus: 'CONFIRMED',
          assignments: [],
          createdAt: '2026-09-10T08:00:00Z',
          updatedAt: '2026-09-10T08:00:00Z',
        },
      ];

      // Querying Room 01 when Room 02 is booked:
      const slots = getAvailableSlotsSync({
        date: '2026-09-10',
        studioId: testStudioId,
        durationMinutes: 60,
        existingBookings: mockBookingsOtherStudio,
      });

      const slot1000 = slots.find(s => s.time === '10:00');
      expect(slot1000?.status).toBe('AVAILABLE');
    });
  });
});
