// ==============================================================================
// Maison MIPA Memories - Photo Workflow Service
// Authoritative operations for: Check-in -> Shoot -> Proofs -> Selection ->
// Post-production -> Review & Revisions -> Secure Delivery -> Completion
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type { Booking, BookingProofImage, BookingPhotoSelection } from '../types';
import {
  mapDatabaseRecordToDomain,
  getBookingsInMemory,
  updateBookingInMemory,
} from './bookingService';
import { INITIAL_PACKAGES } from '../mockData';

// In-memory proof storage for offline tests
let inMemoryProofImages: BookingProofImage[] = [];
let inMemoryPhotoSelections: BookingPhotoSelection[] = [];

export function resetInMemoryProofs(proofs: BookingProofImage[] = [], selections: BookingPhotoSelection[] = []): void {
  inMemoryProofImages = [...proofs];
  inMemoryPhotoSelections = [...selections];
}

export function getInMemoryProofs(): BookingProofImage[] {
  return inMemoryProofImages;
}

export function getInMemorySelections(bookingId?: string): BookingPhotoSelection[] {
  if (bookingId) {
    return inMemoryPhotoSelections.filter((s) => s.bookingId === bookingId);
  }
  return inMemoryPhotoSelections;
}

/**
 * 1. Check-in booking (CONFIRMED -> CHECKED_IN)
 */
export async function checkInBooking(bookingId: string, staffNoteOrActorId?: string, callerRole?: string): Promise<Booking> {
  const role = callerRole || (staffNoteOrActorId === 'CUSTOMER' ? 'CUSTOMER' : undefined);
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền thực hiện check-in.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('check_in_booking', {
      p_booking_id: bookingId,
      p_staff_note: staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : null,
    });
    if (error) throw new Error(error.message || 'Không thể check-in khách hàng.');
    if (!data) throw new Error('Dữ liệu phản hồi check-in không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');
  if (existing.bookingStatus !== 'CONFIRMED') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể check-in khi ở trạng thái "CONFIRMED".`);
  }

  const staffNote = staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : undefined;
  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'CHECKED_IN',
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
  });
  return updated!;
}

/**
 * 2. Start shoot (CHECKED_IN -> SHOOTING)
 */
export async function startBookingShoot(bookingId: string, staffNoteOrActorId?: string, callerRole?: string): Promise<Booking> {
  const role = callerRole || (staffNoteOrActorId === 'CUSTOMER' ? 'CUSTOMER' : undefined);
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền bắt đầu buổi chụp.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('start_booking_shoot', {
      p_booking_id: bookingId,
      p_staff_note: staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : null,
    });
    if (error) throw new Error(error.message || 'Không thể bắt đầu buổi chụp.');
    if (!data) throw new Error('Dữ liệu phản hồi bắt đầu chụp không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');
  if (existing.bookingStatus !== 'CHECKED_IN') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể bắt đầu chụp khi ở trạng thái "CHECKED_IN".`);
  }

  const staffNote = staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : undefined;
  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'SHOOTING',
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
  });
  return updated!;
}

/**
 * 3. Complete shoot (SHOOTING -> SHOOT_COMPLETED)
 */
export async function completeBookingShoot(bookingId: string, staffNoteOrActorId?: string, callerRole?: string): Promise<Booking> {
  const role = callerRole || (staffNoteOrActorId === 'CUSTOMER' ? 'CUSTOMER' : undefined);
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền hoàn tất buổi chụp.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('complete_booking_shoot', {
      p_booking_id: bookingId,
      p_staff_note: staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : null,
    });
    if (error) throw new Error(error.message || 'Không thể hoàn tất buổi chụp.');
    if (!data) throw new Error('Dữ liệu phản hồi hoàn tất chụp không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');
  if (existing.bookingStatus !== 'SHOOTING') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể hoàn tất chụp khi ở trạng thái "SHOOTING".`);
  }

  const staffNote = staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : undefined;
  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'SHOOT_COMPLETED',
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
  });
  return updated!;
}

/**
 * 4. Sync proof images from Google Drive folder 02_PROOFS (Phase 7)
 */
export async function syncBookingProofs(
  bookingId: string,
  actorIdOrMockFiles?: string | Array<{ id: string; name: string; mimeType?: string; size?: number }>,
  maybeMockFiles?: Array<{ id: string; name: string; mimeType?: string; size?: number }>
): Promise<{ success: boolean; proofFileCount: number; syncedCount: number; bookingStatus: string }> {
  const customFiles = Array.isArray(actorIdOrMockFiles) ? actorIdOrMockFiles : maybeMockFiles;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'SYNC_PROOFS', booking_id: bookingId },
    });
    if (error) throw new Error(error.message || 'Lỗi đồng bộ ảnh proof từ Google Drive.');
    return {
      success: true,
      proofFileCount: data?.proof_file_count || 0,
      syncedCount: data?.proof_file_count || 0,
      bookingStatus: 'AWAITING_SELECTION',
    };
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (customFiles && customFiles.length > 0) {
    // Filter RAW formats
    const rawExtensions = ['.cr2', '.arw', '.nef', '.dng', '.raw', '.raf'];
    const safeFiles = customFiles.filter(f => {
      const lowerName = f.name.toLowerCase();
      const isRaw = rawExtensions.some(ext => lowerName.endsWith(ext)) || (f.mimeType && f.mimeType.includes('raw'));
      return !isRaw;
    });

    // Deduplicate by drive file id
    const seenIds = new Set<string>();
    const deduplicatedFiles = safeFiles.filter(f => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });

    // Idempotent upsert
    for (const [idx, f] of deduplicatedFiles.entries()) {
      const existingProof = inMemoryProofImages.find(p => p.bookingId === existing.id && p.driveFileId === f.id);
      if (!existingProof) {
        inMemoryProofImages.push({
          id: `proof_${existing.id}_${f.id}`,
          bookingId: existing.id,
          driveFileId: f.id,
          fileName: f.name,
          mimeType: f.mimeType || 'image/jpeg',
          sortOrder: idx + 1,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const currentBookingProofs = inMemoryProofImages.filter(p => p.bookingId === existing.id && p.active);
    const count = currentBookingProofs.length;

    updateBookingInMemory(existing.id, {
      proofFileCount: count,
      bookingStatus: existing.bookingStatus === 'SHOOT_COMPLETED' ? 'AWAITING_SELECTION' : existing.bookingStatus,
    });

    return {
      success: true,
      proofFileCount: count,
      syncedCount: count,
      bookingStatus: 'AWAITING_SELECTION',
    };
  }

  // Idempotent default test sync: generate mock proofs if none exist
  const existingProofs = inMemoryProofImages.filter((p) => p.bookingId === existing.id);
  let count = existingProofs.length;
  if (count === 0) {
    const newProofs: BookingProofImage[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => ({
      id: `proof_${existing.id}_${i}`,
      bookingId: existing.id,
      driveFileId: `drive_file_${existing.id}_${i}`,
      fileName: `MIPA_PROOF_${String(i).padStart(4, '0')}.jpg`,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1280,
      sortOrder: i,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    inMemoryProofImages.push(...newProofs);
    count = newProofs.length;
  }

  updateBookingInMemory(existing.id, {
    proofFileCount: count,
    bookingStatus: existing.bookingStatus === 'SHOOT_COMPLETED' ? 'AWAITING_SELECTION' : existing.bookingStatus,
  });

  return {
    success: true,
    proofFileCount: count,
    syncedCount: count,
    bookingStatus: 'AWAITING_SELECTION',
  };
}

/**
 * 5. Sync final deliverables from Google Drive folder 03_FINAL (Phase 12)
 */
export async function syncFinalAssets(bookingId: string): Promise<{ success: boolean; finalFileCount: number }> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'SYNC_FINAL', booking_id: bookingId },
    });
    if (error) throw new Error(error.message || 'Lỗi đồng bộ ảnh final từ Google Drive.');
    return {
      success: true,
      finalFileCount: data?.final_file_count || 0,
    };
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  // Default to 10 final files in demo mode if not previously set
  const count = existing.finalFileCount && existing.finalFileCount > 0 ? existing.finalFileCount : 10;
  updateBookingInMemory(existing.id, { finalFileCount: count });

  return {
    success: true,
    finalFileCount: count,
  };
}

/**
 * 6. Get proof images and current selections for a booking
 */
export async function getBookingProofs(
  bookingId: string
): Promise<{ proofs: BookingProofImage[]; selections: BookingPhotoSelection[]; selectionLimit: number }> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const [proofsRes, selRes, bRes] = await Promise.all([
      supabase
        .from('booking_proof_images')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('booking_photo_selections')
        .select('*')
        .eq('booking_id', bookingId),
      supabase
        .from('bookings')
        .select('package_id, selection_limit, packages(photos_count)')
        .eq('id', bookingId)
        .single(),
    ]);

    if (proofsRes.error) throw new Error(proofsRes.error.message);
    if (selRes.error) throw new Error(selRes.error.message);

    const bookingData = bRes.data;
    const selectionLimit =
      bookingData?.selection_limit ||
      (bookingData?.packages as any)?.photos_count ||
      10;

    const proofs: BookingProofImage[] = (proofsRes.data || []).map((p: any) => ({
      id: p.id,
      bookingId: p.booking_id,
      driveFileId: p.drive_file_id,
      fileName: p.file_name,
      mimeType: p.mime_type,
      width: p.width,
      height: p.height,
      sortOrder: p.sort_order,
      active: p.active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const selections: BookingPhotoSelection[] = (selRes.data || []).map((s: any) => ({
      id: s.id,
      bookingId: s.booking_id,
      proofImageId: s.proof_image_id,
      selectedBy: s.selected_by,
      selectedAt: s.selected_at,
      createdAt: s.created_at,
    }));

    return { proofs, selections, selectionLimit };
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  const pkg = INITIAL_PACKAGES.find((p) => p.id === existing?.packageId);
  const limit = existing?.selectionLimit || pkg?.editedPhotosCount || 10;

  const proofs = inMemoryProofImages.filter((p) => (existing ? p.bookingId === existing.id : true) && p.active);
  const selections = inMemoryPhotoSelections.filter((s) => (existing ? s.bookingId === existing.id : true));

  return {
    proofs,
    selections,
    selectionLimit: limit,
  };
}

/**
 * 7. Submit photo selections by customer (AWAITING_SELECTION -> EDITING)
 * Strictly enforced limit on backend / RPC.
 */
/**
 * 7. Submit photo selections by customer (AWAITING_SELECTION -> EDITING)
 * Strictly enforced limit on backend / RPC.
 */
export async function submitPhotoSelection(
  bookingIdOrPayload: string | { bookingId: string; customerId?: string; selectedProofIds: string[] },
  selectedProofIdsArg?: string[]
): Promise<Booking> {
  const bookingId = typeof bookingIdOrPayload === 'string' ? bookingIdOrPayload : bookingIdOrPayload.bookingId;
  const selectedProofIds = Array.isArray(selectedProofIdsArg) ? selectedProofIdsArg : (typeof bookingIdOrPayload === 'object' ? bookingIdOrPayload.selectedProofIds : []);
  const customerId = typeof bookingIdOrPayload === 'object' ? bookingIdOrPayload.customerId : undefined;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('submit_photo_selection', {
      p_booking_id: bookingId,
      p_selected_proof_ids: selectedProofIds,
    });
    if (error) throw new Error(error.message || 'Không thể xác nhận danh sách ảnh chọn.');
    if (!data) throw new Error('Dữ liệu phản hồi xác nhận ảnh không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  // Idempotency check: if already EDITING with the same selection count, return existing
  if (existing.bookingStatus === 'EDITING' && existing.selectionSubmittedAt) {
    return existing;
  }

  if (existing.bookingStatus !== 'AWAITING_SELECTION') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể chọn ảnh khi ở trạng thái "AWAITING_SELECTION".`);
  }

  const pkg = INITIAL_PACKAGES.find((p) => p.id === existing.packageId);
  const limit = existing.selectionLimit || pkg?.editedPhotosCount || 10;

  // Enforce duplicate check first
  const uniqueIds = Array.from(new Set(selectedProofIds));
  if (uniqueIds.length !== selectedProofIds.length) {
    throw new Error('Duplicate: Danh sách ảnh chọn chứa ảnh trùng lặp.');
  }

  // Enforce selection limit server-side
  if (selectedProofIds.length > limit) {
    throw new Error(`Selection count exceeds limit: Số lượng ảnh chọn (${selectedProofIds.length}) vượt quá giới hạn cho phép (${limit} ảnh).`);
  }

  if (selectedProofIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 ảnh trước khi xác nhận.');
  }

  for (const pid of selectedProofIds) {
    const proof = inMemoryProofImages.find((p) => p.id === pid && p.bookingId === existing.id && p.active);
    if (!proof) {
      throw new Error(`Proof images do not belong to booking: Ảnh proof ${pid} không hợp lệ hoặc không thuộc đơn đặt lịch này.`);
    }
  }

  // Idempotently store selections
  inMemoryPhotoSelections = inMemoryPhotoSelections.filter((s) => s.bookingId !== existing.id);
  const nowIso = new Date().toISOString();
  const actorCustId = customerId || existing.customerId;
  for (const pid of selectedProofIds) {
    inMemoryPhotoSelections.push({
      id: `sel_${existing.id}_${pid}`,
      bookingId: existing.id,
      proofImageId: pid,
      selectedBy: actorCustId,
      selectedAt: nowIso,
      createdAt: nowIso,
    });
  }

  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'EDITING',
    selectionSubmittedAt: nowIso,
    selectionSubmittedBy: actorCustId,
  });

  return updated!;
}

/**
 * 8. Reopen photo selection by Manager/Admin (EDITING -> AWAITING_SELECTION)
 */
export async function reopenPhotoSelection(
  bookingId: string,
  reasonOrActorId: string,
  callerRoleOrReason?: string,
  maybeReason?: string
): Promise<Booking> {
  const role = callerRoleOrReason === 'CUSTOMER' ? 'CUSTOMER' : undefined;
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền mở lại khâu chọn ảnh.');
  }

  const reason = maybeReason || (callerRoleOrReason && callerRoleOrReason !== 'CUSTOMER' && callerRoleOrReason !== 'MANAGER' && callerRoleOrReason !== 'ADMIN' ? callerRoleOrReason : reasonOrActorId);

  if (!reason || !reason.trim()) {
    throw new Error('Mở lại khâu chọn ảnh phải có lý do chi tiết.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('reopen_photo_selection', {
      p_booking_id: bookingId,
      p_reason: reason,
    });
    if (error) throw new Error(error.message || 'Không thể mở lại khâu chọn ảnh.');
    if (!data) throw new Error('Dữ liệu phản hồi mở lại chọn ảnh không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (existing.bookingStatus !== 'EDITING') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể mở lại khi ở trạng thái "EDITING".`);
  }

  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'AWAITING_SELECTION',
    staffNote: `${existing.staffNote || ''}\n[Mở lại chọn ảnh]: ${reason}`.trim(),
  });

  return updated!;
}

/**
 * 9. Complete editing by Editor/Manager (EDITING -> READY_FOR_REVIEW)
 * Fails closed if 0 final assets exist.
 */
export async function completeBookingEditing(
  bookingId: string,
  staffNoteOrActorId?: string,
  callerRole?: string
): Promise<Booking> {
  const role = callerRole || (staffNoteOrActorId === 'CUSTOMER' ? 'CUSTOMER' : undefined);
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền hoàn tất hậu kỳ.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('complete_booking_editing', {
      p_booking_id: bookingId,
      p_staff_note: staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') && !staffNoteOrActorId.startsWith('emp_') ? staffNoteOrActorId : null,
    });
    if (error) throw new Error(error.message || 'Không thể hoàn tất hậu kỳ.');
    if (!data) throw new Error('Dữ liệu phản hồi hoàn tất hậu kỳ không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (existing.bookingStatus !== 'EDITING') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể hoàn tất hậu kỳ khi ở trạng thái "EDITING".`);
  }

  // Fails closed if zero final deliverables
  if (!existing.finalFileCount || existing.finalFileCount <= 0) {
    throw new Error('Không thể hoàn tất hậu kỳ khi chưa có ảnh final trong thư mục 03_FINAL.');
  }

  const staffNote = staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') && !staffNoteOrActorId.startsWith('emp_') ? staffNoteOrActorId : undefined;
  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'READY_FOR_REVIEW',
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
  });

  return updated!;
}

/**
 * 10. Request revisions by Manager/Admin (READY_FOR_REVIEW -> EDITING)
 * Requires revision note and logs audit entry.
 */
export async function requestBookingRevision(
  bookingId: string,
  actorIdOrNotes: string,
  maybeNotes?: string
): Promise<Booking> {
  const revisionNotes = maybeNotes !== undefined ? maybeNotes : actorIdOrNotes;
  if (!revisionNotes || !revisionNotes.trim()) {
    throw new Error('Ghi chú yêu cầu chỉnh sửa là bắt buộc.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('request_booking_revision', {
      p_booking_id: bookingId,
      p_revision_notes: revisionNotes,
    });
    if (error) throw new Error(error.message || 'Không thể yêu cầu chỉnh sửa bộ ảnh.');
    if (!data) throw new Error('Dữ liệu phản hồi yêu cầu chỉnh sửa không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (existing.bookingStatus !== 'READY_FOR_REVIEW') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể yêu cầu chỉnh sửa khi ở trạng thái "READY_FOR_REVIEW".`);
  }

  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'EDITING',
    revisionNotes,
    staffNote: `${existing.staffNote || ''}\n[Yêu cầu chỉnh sửa]: ${revisionNotes}`.trim(),
  });

  return updated!;
}

/**
 * 11. Manager/Admin approves and delivers finals to customer (READY_FOR_REVIEW -> DELIVERED)
 * Grants reader access strictly to 03_FINAL. Fails closed if zero final assets.
 */
export async function approveAndDeliverFinals(bookingId: string, _actorId?: string): Promise<Booking> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'MARK_READY', booking_id: bookingId },
    });
    if (error) throw new Error(error.message || 'Lỗi cấp quyền Google Drive cho khách hàng.');
    if (!data?.success) throw new Error(data?.error || 'Không thể giao ảnh cho khách hàng.');

    // Fetch refreshed booking
    const { data: bData, error: bErr } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (bErr || !bData) throw new Error('Không thể tải lại thông tin đơn đặt lịch.');
    return mapDatabaseRecordToDomain(bData);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  // Idempotency: if already DELIVERED, return current booking
  if (existing.bookingStatus === 'DELIVERED') {
    return existing;
  }

  if (existing.bookingStatus !== 'READY_FOR_REVIEW') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể giao ảnh khi ở trạng thái "READY_FOR_REVIEW".`);
  }

  if (!existing.finalFileCount || existing.finalFileCount <= 0) {
    throw new Error('Chưa có ảnh final trong thư mục 03_FINAL. Vui lòng tải ảnh hoàn thiện trước khi duyệt và giao.');
  }

  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'DELIVERED',
    finalFolderUrl: existing.finalFolderUrl || `https://drive.google.com/drive/folders/final_${existing.id}`,
  });

  return updated!;
}

/**
 * 12. Complete booking (DELIVERED -> COMPLETED)
 */
export async function completeBooking(
  bookingId: string,
  staffNoteOrActorId?: string,
  callerRole?: string
): Promise<Booking> {
  const role = callerRole || (staffNoteOrActorId === 'CUSTOMER' ? 'CUSTOMER' : undefined);
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền hoàn tất đơn hàng.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('complete_booking', {
      p_booking_id: bookingId,
      p_staff_note: staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : null,
    });
    if (error) throw new Error(error.message || 'Không thể hoàn tất đơn đặt lịch.');
    if (!data) throw new Error('Dữ liệu phản hồi hoàn tất không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (existing.bookingStatus !== 'DELIVERED') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể hoàn tất khi ở trạng thái "DELIVERED".`);
  }

  const staffNote = staffNoteOrActorId && !staffNoteOrActorId.startsWith('user_') ? staffNoteOrActorId : undefined;
  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'COMPLETED',
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
  });

  return updated!;
}

/**
 * 13. Manager bypasses photo selection (SHOOT_COMPLETED -> EDITING)
 * "Không cần khách chọn ảnh"
 */
export async function bypassCustomerSelection(
  bookingId: string,
  reasonOrActorId: string,
  callerRoleOrReason?: string,
  maybeReason?: string
): Promise<Booking> {
  const role = callerRoleOrReason === 'CUSTOMER' ? 'CUSTOMER' : undefined;
  if (role === 'CUSTOMER') {
    throw new Error('Unauthorized: Khách hàng không có quyền bỏ qua chọn ảnh.');
  }

  const reason = maybeReason || (callerRoleOrReason && callerRoleOrReason !== 'CUSTOMER' && callerRoleOrReason !== 'MANAGER' && callerRoleOrReason !== 'ADMIN' ? callerRoleOrReason : reasonOrActorId);

  if (!reason || !reason.trim()) {
    throw new Error('Bỏ qua khâu chọn ảnh phải có lý do xác thực.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'EDITING',
      p_staff_note: `[Không cần khách chọn ảnh]: ${reason}`,
    });
    if (error) throw new Error(error.message || 'Không thể bỏ qua chọn ảnh.');
    if (!data) throw new Error('Dữ liệu phản hồi không hợp lệ.');
    return mapDatabaseRecordToDomain(data);
  }

  const existing = getBookingsInMemory().find((b) => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) throw new Error('Booking not found in memory store.');

  if (existing.bookingStatus !== 'SHOOT_COMPLETED' && existing.bookingStatus !== 'AWAITING_SELECTION') {
    throw new Error(`Đơn đặt lịch đang ở trạng thái "${existing.bookingStatus}". Chỉ có thể bỏ qua chọn ảnh khi ở trạng thái "SHOOT_COMPLETED" hoặc "AWAITING_SELECTION".`);
  }

  const updated = updateBookingInMemory(existing.id, {
    bookingStatus: 'EDITING',
    staffNote: `${existing.staffNote || ''}\n[Không cần khách chọn ảnh]: ${reason}`.trim(),
  });

  return updated!;
}

// Aliases for workflow compatibility
export {
  syncBookingProofs as syncProofImages,
  syncFinalAssets as syncFinalImages,
  approveAndDeliverFinals as approveAndDeliverBooking,
  completeBooking as completeBookingOrder,
  bypassCustomerSelection as bypassPhotoSelection,
  getBookingProofs as getBookingProofImages,
  getInMemorySelections as getBookingPhotoSelections,
};
