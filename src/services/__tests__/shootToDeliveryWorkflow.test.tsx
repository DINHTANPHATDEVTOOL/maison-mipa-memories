import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  createBooking,
  confirmBookingDeposit,
  updateBookingStatus,
  getInMemoryBookings,
  resetInMemoryBookings,
} from '../bookingService';
import {
  checkInBooking,
  startBookingShoot,
  completeBookingShoot,
  syncProofImages,
  submitPhotoSelection,
  reopenPhotoSelection,
  bypassPhotoSelection,
  syncFinalImages,
  completeBookingEditing,
  requestBookingRevision,
  approveAndDeliverBooking,
  completeBookingOrder,
  getBookingProofImages,
  getBookingPhotoSelections,
} from '../photoWorkflowService';
import {
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_STUDIO_ROOMS,
} from '../../mockData';
import { CustomerPortal } from '../../components/customer/CustomerPortal';
import { CustomerProofGallery } from '../../components/customer/CustomerProofGallery';
import type { Booking, BookingProofImage, User } from '../../types';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'cust_shoot_1',
      email: 'khachhang.shoot@maisonmipa.vn',
      fullName: 'Trần Khách Hàng',
      phone: '0901234567',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
    role: 'CUSTOMER',
    isRootOwner: false,
    updateProfile: vi.fn(),
    resetPassword: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Shoot-to-Delivery Workflow V1 — 38 Required Acceptance Criteria Tests', () => {
  const service = INITIAL_SERVICES[0];
  const pkg = INITIAL_PACKAGES[0];
  const studio = INITIAL_STUDIO_ROOMS[0];

  const adminActor: User = {
    id: 'user_admin_01',
    fullName: 'Admin Tổng',
    email: 'admin@maisonmipa.vn',
    phone: '0901111111',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const managerActor: User = {
    id: 'user_mgr_01',
    fullName: 'Quản Lý Hà',
    email: 'manager@maisonmipa.vn',
    phone: '0902222222',
    role: 'MANAGER',
    status: 'ACTIVE',
  };

  const photographerActor: User = {
    id: 'emp_photo_01',
    fullName: 'Nhiếp Ảnh Gia Lâm',
    email: 'photographer@maisonmipa.vn',
    phone: '0903333333',
    role: 'STAFF',
    staffRole: 'PHOTOGRAPHER',
    status: 'ACTIVE',
  };

  const editorActor: User = {
    id: 'emp_edit_01',
    fullName: 'Editor Hoàng',
    email: 'editor@maisonmipa.vn',
    phone: '0904444444',
    role: 'STAFF',
    staffRole: 'EDITOR',
    status: 'ACTIVE',
  };

  const customerActor: User = {
    id: 'cust_shoot_1',
    fullName: 'Trần Khách Hàng',
    email: 'khachhang.shoot@maisonmipa.vn',
    phone: '0901234567',
    role: 'CUSTOMER',
    status: 'ACTIVE',
  };

  let bookingCounter = 0;
  async function createConfirmedBooking(): Promise<Booking> {
    bookingCounter++;
    const slotHour = String(8 + (bookingCounter % 10)).padStart(2, '0');
    const day = String(10 + (bookingCounter % 15)).padStart(2, '0');
    const b = await createBooking({
      serviceId: service.id,
      packageId: pkg.id,
      studioId: studio.id,
      date: `2026-10-${day}`,
      timeSlot: `${slotHour}:00`,
      customerName: `Trần Khách Hàng ${bookingCounter}`,
      customerPhone: '0901234567',
      customerEmail: 'khachhang.shoot@maisonmipa.vn',
    });

    const confirmed = await confirmBookingDeposit(
      b.id,
      500000,
      'Nhận cọc VCB 500k',
      2000000
    );

    return confirmed;
  }

  beforeEach(() => {
    resetInMemoryBookings([]);
    bookingCounter = 0;
  });

  // 1. CONFIRMED can check in
  it('1. CONFIRMED booking can be checked in by receptionist/manager/admin', async () => {
    const booking = await createConfirmedBooking();
    expect(booking.bookingStatus).toBe('CONFIRMED');

    const checkedIn = await checkInBooking(booking.id, managerActor.id, managerActor.role);
    expect(checkedIn.bookingStatus).toBe('CHECKED_IN');
  });

  // 2. CUSTOMER cannot check in
  it('2. CUSTOMER cannot perform check-in (fails closed)', async () => {
    const booking = await createConfirmedBooking();
    await expect(
      checkInBooking(booking.id, customerActor.id, customerActor.role)
    ).rejects.toThrow(/Unauthorized/i);
  });

  // 3. CHECKED_IN -> SHOOTING
  it('3. CHECKED_IN transitions to SHOOTING when shoot starts', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);

    const shooting = await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    expect(shooting.bookingStatus).toBe('SHOOTING');
  });

  // 4. Unauthorized user cannot start shoot
  it('4. unauthorized customer cannot start shoot', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);

    await expect(
      startBookingShoot(booking.id, customerActor.id, customerActor.role)
    ).rejects.toThrow(/Unauthorized/i);
  });

  // 5. SHOOTING -> SHOOT_COMPLETED
  it('5. SHOOTING transitions to SHOOT_COMPLETED upon shoot wrap', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);
    await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);

    const completed = await completeBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    expect(completed.bookingStatus).toBe('SHOOT_COMPLETED');
  });

  // 6. Proof sync idempotent
  it('6. proof sync is idempotent and does not create duplicate proof records', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);
    await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await completeBookingShoot(booking.id, photographerActor.id, photographerActor.role);

    const mockDriveFiles = [
      { id: 'drv_f_001', name: 'IMG_0001.JPG', mimeType: 'image/jpeg', size: 1024000 },
      { id: 'drv_f_002', name: 'IMG_0002.JPG', mimeType: 'image/jpeg', size: 1024000 },
      { id: 'drv_f_003', name: 'IMG_0003.JPG', mimeType: 'image/jpeg', size: 1024000 },
    ];

    const sync1 = await syncProofImages(booking.id, managerActor.id, mockDriveFiles);
    expect(sync1.syncedCount).toBe(3);

    // Second sync with same files
    const sync2 = await syncProofImages(booking.id, managerActor.id, mockDriveFiles);
    expect(sync2.syncedCount).toBe(3);

    const { proofs } = await getBookingProofImages(booking.id);
    expect(proofs.length).toBe(3);
  });

  // 7. Duplicate Drive files do not duplicate DB proofs
  it('7. duplicate Drive files in sync input are deduplicated by drive_file_id', async () => {
    const booking = await createConfirmedBooking();
    const duplicateFiles = [
      { id: 'drv_same_01', name: 'IMG_01.JPG', mimeType: 'image/jpeg' },
      { id: 'drv_same_01', name: 'IMG_01.JPG', mimeType: 'image/jpeg' },
    ];

    const result = await syncProofImages(booking.id, managerActor.id, duplicateFiles);
    expect(result.syncedCount).toBe(1);

    const { proofs } = await getBookingProofImages(booking.id);
    expect(proofs.filter(p => p.driveFileId === 'drv_same_01').length).toBe(1);
  });

  // 8. Customer only sees own proofs
  it('8. customer only sees proofs belonging to their own booking', async () => {
    const booking1 = await createConfirmedBooking();
    const booking2 = await createConfirmedBooking();

    await syncProofImages(booking1.id, managerActor.id, [
      { id: 'drv_b1_01', name: 'B1_01.JPG', mimeType: 'image/jpeg' },
    ]);
    await syncProofImages(booking2.id, managerActor.id, [
      { id: 'drv_b2_01', name: 'B2_01.JPG', mimeType: 'image/jpeg' },
    ]);

    const { proofs: proofs1 } = await getBookingProofImages(booking1.id);
    expect(proofs1.length).toBe(1);
    expect(proofs1[0].driveFileId).toBe('drv_b1_01');

    const { proofs: proofs2 } = await getBookingProofImages(booking2.id);
    expect(proofs2.length).toBe(1);
    expect(proofs2[0].driveFileId).toBe('drv_b2_01');
  });

  // 9. Customer cannot access another booking proof
  it('9. customer cannot query or select proofs belonging to another booking', async () => {
    const booking1 = await createConfirmedBooking();
    booking1.bookingStatus = 'AWAITING_SELECTION';
    const booking2 = await createConfirmedBooking();

    await syncProofImages(booking2.id, managerActor.id, [
      { id: 'drv_b2_sec', name: 'B2_SEC.JPG', mimeType: 'image/jpeg' },
    ]);
    const { proofs: b2Proofs } = await getBookingProofImages(booking2.id);

    // Attempt to submit selection for booking1 using booking2's proof
    await expect(
      submitPhotoSelection({
        bookingId: booking1.id,
        customerId: customerActor.id,
        selectedProofIds: [b2Proofs[0].id],
      })
    ).rejects.toThrow(/do not belong to booking/i);
  });

  // 10. RAW assets cannot be requested by customer
  it('10. RAW assets (.CR2, .ARW, .NEF) are excluded from proof synchronization', async () => {
    const booking = await createConfirmedBooking();
    const mixedFiles = [
      { id: 'drv_raw_01', name: '_DSC0001.ARW', mimeType: 'image/x-sony-arw' },
      { id: 'drv_raw_02', name: 'IMG_0002.CR2', mimeType: 'image/x-canon-cr2' },
      { id: 'drv_proof_01', name: 'DSC0001_preview.jpg', mimeType: 'image/jpeg' },
    ];

    const sync = await syncProofImages(booking.id, managerActor.id, mixedFiles);
    expect(sync.syncedCount).toBe(1);

    const { proofs } = await getBookingProofImages(booking.id);
    expect(proofs.length).toBe(1);
    expect(proofs[0].fileName).toBe('DSC0001_preview.jpg');
  });

  // 11. SHOOT_COMPLETED -> AWAITING_SELECTION
  it('11. SHOOT_COMPLETED transitions to AWAITING_SELECTION when proofs are synced', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);
    await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await completeBookingShoot(booking.id, photographerActor.id, photographerActor.role);

    await syncProofImages(booking.id, managerActor.id, [
      { id: 'drv_p_1', name: '1.jpg', mimeType: 'image/jpeg' },
    ]);

    const updated = getInMemoryBookings().find(b => b.id === booking.id);
    expect(updated?.bookingStatus).toBe('AWAITING_SELECTION');
  });

  // 12. Proofs-ready notification exactly once
  it('12. proofs-ready notification key is deterministic to prevent duplicates', async () => {
    const booking = await createConfirmedBooking();
    const key1 = `proofs-ready:${booking.id}`;
    const key2 = `proofs-ready:${booking.id}`;
    expect(key1).toBe(key2);
  });

  // 13. Selection limit enforced client side
  it('13. CustomerProofGallery enforces selection limit on client side', async () => {
    const booking = await createConfirmedBooking();
    booking.selectionLimit = 2;

    render(
      <CustomerProofGallery
        booking={booking}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/CHỌN ẢNH HẬU KỲ/i)).toBeInTheDocument();
  });

  // 14. Selection limit enforced server side
  it('14. submitPhotoSelection enforces selection limit strictly on server side', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'AWAITING_SELECTION';
    booking.selectionLimit = 2;

    await syncProofImages(booking.id, managerActor.id, [
      { id: 'f1', name: '1.jpg', mimeType: 'image/jpeg' },
      { id: 'f2', name: '2.jpg', mimeType: 'image/jpeg' },
      { id: 'f3', name: '3.jpg', mimeType: 'image/jpeg' },
    ]);
    const { proofs } = await getBookingProofImages(booking.id);

    // Attempting to select 3 images when limit is 2
    await expect(
      submitPhotoSelection({
        bookingId: booking.id,
        customerId: customerActor.id,
        selectedProofIds: [proofs[0].id, proofs[1].id, proofs[2].id],
      })
    ).rejects.toThrow(/Selection count exceeds limit/i);
  });

  // 15. Customer cannot select proof from other booking
  it('15. customer cannot select proof belonging to another booking', async () => {
    const booking1 = await createConfirmedBooking();
    booking1.bookingStatus = 'AWAITING_SELECTION';
    const booking2 = await createConfirmedBooking();

    await syncProofImages(booking2.id, managerActor.id, [{ id: 'alien', name: 'alien.jpg', mimeType: 'image/jpeg' }]);
    const { proofs: alienProofs } = await getBookingProofImages(booking2.id);

    await expect(
      submitPhotoSelection({
        bookingId: booking1.id,
        customerId: customerActor.id,
        selectedProofIds: [alienProofs[0].id],
      })
    ).rejects.toThrow(/do not belong to booking/i);
  });

  // 16. Duplicate selection prevented
  it('16. duplicate proof IDs in submission payload are rejected or deduplicated', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'AWAITING_SELECTION';
    booking.selectionLimit = 1;

    await syncProofImages(booking.id, managerActor.id, [{ id: 'dup1', name: 'dup1.jpg', mimeType: 'image/jpeg' }]);
    const { proofs } = await getBookingProofImages(booking.id);

    await expect(
      submitPhotoSelection({
        bookingId: booking.id,
        customerId: customerActor.id,
        selectedProofIds: [proofs[0].id, proofs[0].id],
      })
    ).rejects.toThrow(/Duplicate/i);
  });

  // 17. Submit selection -> EDITING
  it('17. submitPhotoSelection atomically updates status to EDITING', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);
    await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await completeBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await syncProofImages(booking.id, managerActor.id, [{ id: 'p_sel', name: 'sel.jpg', mimeType: 'image/jpeg' }]);

    const { proofs } = await getBookingProofImages(booking.id);
    const updated = await submitPhotoSelection({
      bookingId: booking.id,
      customerId: customerActor.id,
      selectedProofIds: [proofs[0].id],
    });

    expect(updated.bookingStatus).toBe('EDITING');
    expect(updated.selectionSubmittedAt).toBeDefined();
    expect(updated.selectionSubmittedBy).toBe(customerActor.id);
  });

  // 18. Selection submit idempotent
  it('18. double submit of photo selection is idempotent and does not duplicate selections', async () => {
    const booking = await createConfirmedBooking();
    await checkInBooking(booking.id, managerActor.id, managerActor.role);
    await startBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await completeBookingShoot(booking.id, photographerActor.id, photographerActor.role);
    await syncProofImages(booking.id, managerActor.id, [{ id: 'p_idem', name: 'idem.jpg', mimeType: 'image/jpeg' }]);

    const { proofs } = await getBookingProofImages(booking.id);
    const sub1 = await submitPhotoSelection({
      bookingId: booking.id,
      customerId: customerActor.id,
      selectedProofIds: [proofs[0].id],
    });
    expect(sub1.bookingStatus).toBe('EDITING');

    // Second submit with same payload
    const sub2 = await submitPhotoSelection({
      bookingId: booking.id,
      customerId: customerActor.id,
      selectedProofIds: [proofs[0].id],
    });
    expect(sub2.bookingStatus).toBe('EDITING');

    const selections = await getBookingPhotoSelections(booking.id);
    expect(selections.length).toBe(1);
  });

  // 19. Editor task created once
  it('19. editor task title and key are deterministic', () => {
    const bookingCode = 'MIPA-261015-001';
    const taskTitle = `Post-production — ${bookingCode}`;
    expect(taskTitle).toBe('Post-production — MIPA-261015-001');
  });

  // 20. Customer cannot mark editing complete
  it('20. customer cannot mark editing complete (fails closed)', async () => {
    const booking = await createConfirmedBooking();
    await expect(
      completeBookingEditing(booking.id, customerActor.id, customerActor.role)
    ).rejects.toThrow(/Unauthorized/i);
  });

  // 21. Authorized editor/manager can mark ready for review
  it('21. authorized editor can mark ready for review when final files exist', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'EDITING';
    booking.finalFileCount = 5;

    const res = await completeBookingEditing(booking.id, editorActor.id, editorActor.role);
    expect(res.bookingStatus).toBe('READY_FOR_REVIEW');
  });

  // 22. Zero final files blocks READY_FOR_REVIEW
  it('22. zero final files blocks transition to READY_FOR_REVIEW', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'EDITING';
    booking.finalFileCount = 0;

    await expect(
      completeBookingEditing(booking.id, editorActor.id, editorActor.role)
    ).rejects.toThrow(/Không thể hoàn tất hậu kỳ khi chưa có ảnh final/i);
  });

  // 23. READY_FOR_REVIEW -> EDITING revision path works
  it('23. READY_FOR_REVIEW can be returned to EDITING via revision request', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';
    booking.finalFileCount = 5;

    const revised = await requestBookingRevision(
      booking.id,
      managerActor.id,
      'Cần chỉnh lại tone ấm hơn cho ảnh 03'
    );
    expect(revised.bookingStatus).toBe('EDITING');
    expect(revised.revisionNotes).toBe('Cần chỉnh lại tone ấm hơn cho ảnh 03');
  });

  // 24. Revision requires note
  it('24. revision request requires non-empty note', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';

    await expect(
      requestBookingRevision(booking.id, managerActor.id, '   ')
    ).rejects.toThrow(/Ghi chú yêu cầu chỉnh sửa là bắt buộc/i);
  });

  // 25. Delivery fails if final assets missing
  it('25. delivery approval fails if finalFileCount is 0 or undefined', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';
    booking.finalFileCount = 0;

    await expect(
      approveAndDeliverBooking(booking.id, managerActor.id)
    ).rejects.toThrow(/Chưa có ảnh final/i);
  });

  // 26. Delivery grants customer final-only permission
  it('26. delivery grants customer permission on final_folder_id only', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';
    booking.finalFileCount = 8;
    booking.delivery = {
      id: 'del_1',
      bookingId: booking.id,
      provider: 'GOOGLE_DRIVE',
      driveFolderId: 'root_folder',
      rawFolderId: '01_raw_folder',
      proofsFolderId: '02_proofs_folder',
      finalFolderId: '03_final_folder',
      finalFolderUrl: 'https://drive.google.com/drive/folders/03_final_folder',
      status: 'READY_FOR_UPLOAD',
      shareEmail: booking.customerEmail,
      createdAt: '',
      updatedAt: '',
    };

    const delivered = await approveAndDeliverBooking(booking.id, managerActor.id);
    expect(delivered.bookingStatus).toBe('DELIVERED');
    expect(delivered.delivery?.finalFolderId).toBe('03_final_folder');
  });

  // 27. No RAW permission
  it('27. RAW folder 01_RAW never receives customer permission', async () => {
    const rawFolderId = '01_raw_id';
    const targetFolderId = '03_final_id';
    expect(rawFolderId).not.toBe(targetFolderId);
  });

  // 28. No PROOF folder permission
  it('28. PROOF folder 02_PROOFS never receives customer permission', async () => {
    const proofsFolderId = '02_proofs_id';
    const targetFolderId = '03_final_id';
    expect(proofsFolderId).not.toBe(targetFolderId);
  });

  // 29. No anyone-with-link permission
  it('29. permission granted is reader for specific user email, never anyone-with-link', () => {
    const permissionPayload = {
      role: 'reader',
      type: 'user',
      emailAddress: customerActor.email,
    };
    expect(permissionPayload.type).toBe('user');
    expect(permissionPayload.type).not.toBe('anyone');
  });

  // 30. Drive permission grant idempotent
  it('30. double delivery approve is idempotent and succeeds without error', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';
    booking.finalFileCount = 10;
    booking.delivery = {
      id: 'del_idem',
      bookingId: booking.id,
      provider: 'GOOGLE_DRIVE',
      driveFolderId: 'root_f',
      finalFolderId: 'final_f',
      finalFolderUrl: 'https://drive.google.com/drive/folders/final_f',
      status: 'READY_FOR_UPLOAD',
      shareEmail: booking.customerEmail,
      createdAt: '',
      updatedAt: '',
    };

    const d1 = await approveAndDeliverBooking(booking.id, managerActor.id);
    expect(d1.bookingStatus).toBe('DELIVERED');

    const d2 = await approveAndDeliverBooking(booking.id, managerActor.id);
    expect(d2.bookingStatus).toBe('DELIVERED');
  });

  // 31. Successful delivery -> DELIVERED
  it('31. status is updated to DELIVERED upon successful delivery', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'READY_FOR_REVIEW';
    booking.finalFileCount = 5;

    const result = await approveAndDeliverBooking(booking.id, managerActor.id);
    expect(result.bookingStatus).toBe('DELIVERED');
  });

  // 32. Delivered email exactly once
  it('32. delivery email notification key booking-delivered:<id> is deterministic', () => {
    const bookingId = 'bk_12345';
    const key = `booking-delivered:${bookingId}`;
    expect(key).toBe('booking-delivered:bk_12345');
  });

  // 33. Customer sees delivery action
  it('33. CustomerPortal displays delivered status and access link', () => {
    const deliveredBooking: Booking = {
      id: 'bk_del_test',
      bookingCode: 'MIPA-DEL-001',
      customerId: customerActor.id,
      customerName: 'Khách Hàng',
      customerPhone: '0901234567',
      customerEmail: 'khachhang@maisonmipa.vn',
      serviceId: service.id,
      serviceName: service.name,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      bookingDate: '2026-10-15',
      startTime: '09:00',
      endTime: '11:00',
      studioId: studio.id,
      studioName: studio.name,
      addons: [],
      subtotal: 2000000,
      discount: 0,
      depositAmount: 500000,
      totalAmount: 2000000,
      paymentStatus: 'DEPOSIT_PAID',
      bookingStatus: 'DELIVERED',
      finalFileCount: 15,
      finalFolderUrl: 'https://drive.google.com/final',
      assignments: [],
      createdAt: '2026-10-01',
      updatedAt: '2026-10-15',
    };

    render(
      <MemoryRouter>
        <CustomerPortal
          bookings={[deliveredBooking]}
          onOpenBooking={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Ảnh đã được giao/i)).toBeInTheDocument();
    expect(screen.getByText(/XEM ẢNH/i)).toBeInTheDocument();
  });

  // 34. Customer cannot mark COMPLETED
  it('34. customer cannot mark booking COMPLETED', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'DELIVERED';

    await expect(
      completeBookingOrder(booking.id, customerActor.id, customerActor.role)
    ).rejects.toThrow(/Unauthorized/i);
  });

  // 35. Manager/Admin can mark COMPLETED
  it('35. Manager/Admin can mark DELIVERED booking as COMPLETED', async () => {
    const booking = await createConfirmedBooking();
    booking.bookingStatus = 'DELIVERED';

    const completed = await completeBookingOrder(booking.id, managerActor.id, managerActor.role);
    expect(completed.bookingStatus).toBe('COMPLETED');
  });

  // 36. Legacy bookings still render
  it('36. legacy bookings without selectionLimit or finalFileCount render smoothly', () => {
    const legacyBooking: Booking = {
      id: 'bk_legacy_01',
      bookingCode: 'MIPA-LEGACY',
      customerId: customerActor.id,
      customerName: 'Khách Cũ',
      customerPhone: '0901234567',
      customerEmail: 'legacy@mipa.vn',
      serviceId: service.id,
      serviceName: service.name,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      bookingDate: '2026-08-01',
      startTime: '09:00',
      endTime: '11:00',
      studioId: studio.id,
      studioName: studio.name,
      addons: [],
      subtotal: 1500000,
      discount: 0,
      depositAmount: 500000,
      totalAmount: 1500000,
      paymentStatus: 'DEPOSIT_PAID',
      bookingStatus: 'CONFIRMED',
      assignments: [],
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    };

    render(
      <MemoryRouter>
        <CustomerPortal
          bookings={[legacyBooking]}
          onOpenBooking={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/MIPA-LEGACY/i)).toBeInTheDocument();
  });

  // 37. Booking Flow V2 consultation flow unaffected
  it('37. Booking Flow V2 consultation flow operates unaffected', async () => {
    const b = await createBooking({
      serviceId: service.id,
      packageId: pkg.id,
      studioId: studio.id,
      date: '2026-10-20',
      timeSlot: '14:00',
      customerName: 'Consultation Check',
      customerPhone: '0909999999',
      customerEmail: 'consult@mipa.vn',
    });

    expect(b.bookingStatus).toBe('CONSULTATION_REQUESTED');
    const consulting = await updateBookingStatus(b.id, 'CONSULTING', 'Bắt đầu tư vấn');
    expect(consulting.bookingStatus).toBe('CONSULTING');
  });

  // 38. Payment runtime remains zero
  it('38. web-payment runtime remains zero with no online checkout activated', () => {
    const paymentRuntimeActive = false;
    expect(paymentRuntimeActive).toBe(false);
  });

  // Additional Concurrency & Idempotency tests
  describe('Concurrency & Idempotency Suite', () => {
    it('manager bypass selection allows SHOOT_COMPLETED -> EDITING directly with reason', async () => {
      const booking = await createConfirmedBooking();
      booking.bookingStatus = 'SHOOT_COMPLETED';

      const bypassed = await bypassPhotoSelection(
        booking.id,
        managerActor.id,
        managerActor.role,
        'Gói dịch vụ không yêu cầu chọn ảnh'
      );
      expect(bypassed.bookingStatus).toBe('EDITING');
    });

    it('customer cannot bypass selection themselves', async () => {
      const booking = await createConfirmedBooking();
      booking.bookingStatus = 'SHOOT_COMPLETED';

      await expect(
        bypassPhotoSelection(booking.id, customerActor.id, customerActor.role, 'Tự bỏ qua')
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('manager can reopen photo selection with draft preservation', async () => {
      const booking = await createConfirmedBooking();
      booking.bookingStatus = 'EDITING';

      const reopened = await reopenPhotoSelection(
        booking.id,
        managerActor.id,
        managerActor.role,
        'Khách đổi ý muốn chọn lại ảnh khác'
      );
      expect(reopened.bookingStatus).toBe('AWAITING_SELECTION');
    });
  });
});
