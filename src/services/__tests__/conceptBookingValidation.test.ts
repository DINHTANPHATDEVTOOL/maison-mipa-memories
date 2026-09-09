import { describe, it, expect } from 'vitest';
import { createBookingInMemory } from '../bookingService';
import { DEMO_CONCEPTS } from '../portfolioService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_STUDIO_ROOMS, INITIAL_ADDONS } from '../../mockData';

describe('Concept and Package Booking Validation', () => {
  const validService = INITIAL_SERVICES[0];
  const singleConceptPackage = {
    ...INITIAL_PACKAGES[0],
    conceptsCount: 1,
  };
  const multiConceptPackage = {
    ...INITIAL_PACKAGES[2],
    conceptsCount: 2,
  };
  const activeBookableConcept1 = DEMO_CONCEPTS[0]; // active: true, bookable: true
  const activeBookableConcept2 = DEMO_CONCEPTS[1]; // active: true, bookable: true

  const basePayload = {
    serviceId: validService.id,
    packageId: singleConceptPackage.id,
    studioId: INITIAL_STUDIO_ROOMS[0].id,
    date: '2026-11-20',
    timeSlot: '09:00',
    addonIds: [],
    customerName: 'Nguyễn Thị Hương',
    customerPhone: '0912 345 678',
    customerEmail: 'huong.nguyen@example.com',
  };

  it('successfully creates booking with valid concept within package limit', () => {
    const booking = createBookingInMemory({
      ...basePayload,
      conceptIds: [activeBookableConcept1.id],
    });

    expect(booking).toBeDefined();
    expect(booking.conceptId).toBe(activeBookableConcept1.id);
    expect(booking.conceptIds).toContain(activeBookableConcept1.id);
    expect(booking.conceptName).toBe(activeBookableConcept1.name);
  });

  it('rejects booking when selected concepts exceed package conceptsCount limit', () => {
    expect(() => {
      createBookingInMemory({
        ...basePayload,
        packageId: singleConceptPackage.id, // conceptsCount: 1
        conceptIds: [activeBookableConcept1.id, activeBookableConcept2.id], // 2 concepts
      });
    }).toThrow(/chỉ cho phép tối đa 1 concept/i);
  });

  it('allows multiple concepts when package permits higher conceptsCount', () => {
    const booking = createBookingInMemory({
      ...basePayload,
      date: '2026-11-25',
      timeSlot: '10:00',
      packageId: multiConceptPackage.id, // conceptsCount: 2
      conceptIds: [activeBookableConcept1.id, activeBookableConcept2.id],
    });

    expect(booking.conceptIds).toHaveLength(2);
    expect(booking.conceptIds).toContain(activeBookableConcept1.id);
    expect(booking.conceptIds).toContain(activeBookableConcept2.id);
  });

  it('rejects booking referencing an inactive concept', () => {
    const inactiveConcept = DEMO_CONCEPTS.find(c => !c.active);
    if (inactiveConcept) {
      expect(() => {
        createBookingInMemory({
          ...basePayload,
          conceptIds: [inactiveConcept.id],
        });
      }).toThrow(/hiện đang tạm ngưng hoạt động/i);
    }
  });

  it('rejects booking referencing a non-bookable concept', () => {
    const nonBookableConcept = DEMO_CONCEPTS.find(c => !c.bookable);
    if (nonBookableConcept) {
      expect(() => {
        createBookingInMemory({
          ...basePayload,
          conceptIds: [nonBookableConcept.id],
        });
      }).toThrow(/chưa mở nhận đặt lịch/i);
    }
  });

  it('rejects booking with non-existent concept ID', () => {
    expect(() => {
      createBookingInMemory({
        ...basePayload,
        conceptIds: ['00000000-0000-0000-0000-000000000999'],
      });
    }).toThrow(/không tồn tại trên hệ thống/i);
  });
});
