import { describe, it, expect } from 'vitest';
import {
  determineShiftFromTime,
  registerStaffShifts,
  getStaffRegisteredShifts,
  getAvailableStaffForSlot,
  assignStaffAndSendEmailNotification,
  getStaffEmailNotifications,
  SHIFT_CONFIGS,
} from '../staffSchedulingService';
import {
  createConcept,
  updateConcept,
  deleteConcept,
  createCollection,
  updateCollection,
  deleteCollection,
  getAllConcepts,
  getAllCollections,
} from '../portfolioService';

describe('Staff Shift Scheduling & Email Dispatch Engine', () => {
  it('1. correctly determines shift type based on booking start time', () => {
    expect(determineShiftFromTime('08:00')).toBe('MORNING');
    expect(determineShiftFromTime('09:30')).toBe('MORNING');
    expect(determineShiftFromTime('12:45')).toBe('MORNING');
    expect(determineShiftFromTime('13:00')).toBe('AFTERNOON');
    expect(determineShiftFromTime('14:30')).toBe('AFTERNOON');
    expect(determineShiftFromTime('18:00')).toBe('AFTERNOON');
    expect(determineShiftFromTime('2026-09-20T10:00:00+07:00')).toBe('MORNING');
    expect(determineShiftFromTime('2026-09-20T15:00:00+07:00')).toBe('AFTERNOON');
  });

  it('2. registers morning and afternoon shifts for staff and retrieves them', async () => {
    const testEmployeeId = 'emp_minh';
    const testDate = '2026-10-05';

    // Register both shifts for testDate
    await registerStaffShifts(testEmployeeId, [
      { date: testDate, shiftType: 'MORNING', selected: true },
      { date: testDate, shiftType: 'AFTERNOON', selected: true },
    ]);

    const shifts = await getStaffRegisteredShifts({
      employeeId: testEmployeeId,
      startDate: testDate,
      endDate: testDate,
    });

    expect(shifts.length).toBe(2);
    expect(shifts.some(s => s.shiftType === 'MORNING')).toBe(true);
    expect(shifts.some(s => s.shiftType === 'AFTERNOON')).toBe(true);

    // Unregister afternoon shift
    await registerStaffShifts(testEmployeeId, [
      { date: testDate, shiftType: 'AFTERNOON', selected: false },
    ]);

    const updatedShifts = await getStaffRegisteredShifts({
      employeeId: testEmployeeId,
      startDate: testDate,
      endDate: testDate,
    });

    expect(updatedShifts.length).toBe(1);
    expect(updatedShifts[0].shiftType).toBe('MORNING');
  });

  it('3. getAvailableStaffForSlot correctly matches staff who registered for that shift', async () => {
    const testDate = '2026-10-10';
    // Register emp_minh for MORNING
    await registerStaffShifts('emp_minh', [
      { date: testDate, shiftType: 'MORNING', selected: true },
      { date: testDate, shiftType: 'AFTERNOON', selected: false },
    ]);

    // Query MORNING slot
    const morningCandidates = await getAvailableStaffForSlot({
      date: testDate,
      time: '09:00',
      role: 'PHOTOGRAPHER',
    });

    const minhMorning = morningCandidates.find(c => c.employee.id === 'emp_minh');
    expect(minhMorning).toBeDefined();
    expect(minhMorning?.isRegisteredForShift).toBe(true);
    expect(minhMorning?.shiftType).toBe('MORNING');

    // Query AFTERNOON slot
    const afternoonCandidates = await getAvailableStaffForSlot({
      date: testDate,
      time: '14:00',
      role: 'PHOTOGRAPHER',
    });

    const minhAfternoon = afternoonCandidates.find(c => c.employee.id === 'emp_minh');
    expect(minhAfternoon).toBeDefined();
    expect(minhAfternoon?.isRegisteredForShift).toBe(false);
  });

  it('4. assignStaffAndSendEmailNotification assigns staff and creates email alert', async () => {
    const res = await assignStaffAndSendEmailNotification({
      bookingId: 'book-shift-test-1',
      employeeId: 'emp_minh',
      role: 'PHOTOGRAPHER',
      bookingDetails: {
        bookingCode: 'MIPA-SHIFT-999',
        customerName: 'Nguyễn Thảo Ly',
        customerPhone: '0912 999 888',
        shootDate: '2026-10-15',
        shootTime: '10:00',
        packageName: 'MIPA SIGNATURE',
        studioName: 'Studio Paris 01',
      },
    });

    expect(res.assignment).toBeDefined();
    expect(res.assignment.employeeId).toBe('emp_minh');
    expect(res.assignment.assignmentRole).toBe('PHOTOGRAPHER');

    expect(res.emailNotification).toBeDefined();
    expect(res.emailNotification.bookingCode).toBe('MIPA-SHIFT-999');
    expect(res.emailNotification.toEmail).toBe('minh.photographer@maisonmipa.vn');
    expect(res.emailNotification.subject).toContain('MIPA-SHIFT-999');
    expect(res.emailNotification.body).toContain('Nguyễn Thảo Ly');
    expect(res.emailNotification.body).toContain('Ca Sáng');
    expect(res.emailNotification.status).toBe('SENT');

    // Check staff inbox
    const allEmails = getStaffEmailNotifications('emp_minh');
    expect(allEmails.some(e => e.bookingCode === 'MIPA-SHIFT-999')).toBe(true);
  });
});

describe('Portfolio & Concept Collections CRUD Engine', () => {
  it('5. creates, updates, and deletes Concepts with in-memory persistence', async () => {
    const newConcept = await createConcept({
      name: 'Santorini Sunset Romance',
      slug: 'santorini-sunset-romance',
      description: 'Tone trắng xanh Địa Trung Hải hiện đại & thanh lịch.',
      active: true,
      bookable: true,
      displayOrder: 10,
    });

    expect(newConcept.id).toBeDefined();
    expect(newConcept.name).toBe('Santorini Sunset Romance');

    // Verify concept is in getAllConcepts
    const allConcepts = await getAllConcepts();
    expect(allConcepts.some(c => c.id === newConcept.id)).toBe(true);

    // Update concept
    const updated = await updateConcept(newConcept.id, {
      description: 'Cập nhật bối cảnh hoa giấy tím và hoàng hôn.',
      displayOrder: 5,
    });
    expect(updated.description).toBe('Cập nhật bối cảnh hoa giấy tím và hoàng hôn.');

    // Delete concept
    await deleteConcept(newConcept.id);
    const afterDelete = await getAllConcepts();
    expect(afterDelete.some(c => c.id === newConcept.id)).toBe(false);
  });

  it('6. creates, updates, and deletes Collections with in-memory persistence', async () => {
    const newCol = await createCollection({
      title: 'Monochrome Elegance 2026',
      description: 'Bộ ảnh trắng đen tối giản mang phong cách Studio Vogue.',
      category: 'EDITORIAL',
      status: 'DRAFT',
      featured: true,
    });

    expect(newCol.id).toBeDefined();
    expect(newCol.title).toBe('Monochrome Elegance 2026');
    expect(newCol.status).toBe('DRAFT');

    // Verify collection is in getAllCollections
    const allCols = await getAllCollections('ALL');
    expect(allCols.some(c => c.id === newCol.id)).toBe(true);

    // Update collection
    const updated = await updateCollection(newCol.id, {
      title: 'Monochrome Elegance Haute',
      status: 'PUBLISHED',
    });
    expect(updated.title).toBe('Monochrome Elegance Haute');
    expect(updated.status).toBe('PUBLISHED');

    // Delete collection
    await deleteCollection(newCol.id);
    const afterDelete = await getAllCollections('ALL');
    expect(afterDelete.some(c => c.id === newCol.id)).toBe(false);
  });
});
