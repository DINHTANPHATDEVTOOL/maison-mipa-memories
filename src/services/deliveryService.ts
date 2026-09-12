// ==============================================================================
// Maison MIPA Memories - Google Drive Delivery Service Layer (Production Fail-Closed)
// Coordinates client-side interaction with Supabase Database and Edge Functions.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BookingDelivery, DeliveryStatus } from '../types';

// In-memory store for deterministic unit tests and offline demo mode
let inMemoryDeliveries: Map<string, BookingDelivery> = new Map();

export const resetInMemoryDeliveries = () => {
  inMemoryDeliveries.clear();
};

export const setInMemoryDelivery = (bookingId: string, delivery: BookingDelivery) => {
  inMemoryDeliveries.set(bookingId, delivery);
};

export const getInMemoryDelivery = (bookingId: string): BookingDelivery | null => {
  return inMemoryDeliveries.get(bookingId) || null;
};

/**
 * Maps raw database row or Edge Function payload to camelCase domain model.
 */
export function mapDatabaseDeliveryToDomain(raw: any): BookingDelivery {
  return {
    id: raw.id,
    bookingId: raw.booking_id || raw.bookingId,
    provider: raw.provider || 'GOOGLE_DRIVE',
    driveFolderId: raw.drive_folder_id || raw.driveFolderId || undefined,
    driveFolderUrl: raw.drive_folder_url || raw.driveFolderUrl || undefined,
    status: (raw.status as DeliveryStatus) || 'NOT_CREATED',
    customerPermissionId: raw.customer_permission_id || raw.customerPermissionId || undefined,
    shareEmail: raw.share_email || raw.shareEmail || undefined,
    createdBy: raw.created_by || raw.createdBy || undefined,
    readyBy: raw.ready_by || raw.readyBy || undefined,
    revokedBy: raw.revoked_by || raw.revokedBy || undefined,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
    readyAt: raw.ready_at || raw.readyAt || undefined,
    revokedAt: raw.revoked_at || raw.revokedAt || undefined,
    lastReconciledAt: raw.last_reconciled_at || raw.lastReconciledAt || undefined,
    lastError: raw.last_error || raw.lastError || undefined,
  };
}

/**
 * Retrieves delivery record for a booking with RLS / Secure RPC enforcement.
 */
export async function getBookingDelivery(bookingId: string): Promise<BookingDelivery | null> {
  if (isSupabaseConfigured()) {
    // Strictly route through role-safe secure RPC reader (Blocker 9: No raw select fallback)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_booking_delivery_secure', {
      p_booking_id: bookingId,
    });

    if (rpcErr || !rpcData) {
      return null;
    }

    return mapDatabaseDeliveryToDomain(rpcData);
  }

  // In-Memory Test Store
  const mem = inMemoryDeliveries.get(bookingId);
  return mem ? { ...mem } : null;
}

/**
 * Triggered on SHOOT_COMPLETED. Idempotently creates or reconciles Google Drive folder.
 */
export async function createDriveFolder(bookingId: string): Promise<BookingDelivery> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'CREATE_FOLDER', booking_id: bookingId },
    });

    if (error) {
      throw new Error(error.message || 'Không thể tạo thư mục Google Drive.');
    }

    if (!data?.success || !data?.delivery) {
      throw new Error(data?.error || 'Tạo thư mục Google Drive thất bại.');
    }

    return mapDatabaseDeliveryToDomain(data.delivery);
  }

  // In-Memory Test Store (Idempotent: 1 folder created even if called repeatedly)
  const existing = inMemoryDeliveries.get(bookingId);
  if (existing && existing.driveFolderId && ['READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER'].includes(existing.status)) {
    return { ...existing };
  }

  const folderId = `mock_folder_${bookingId.substring(0, 8)}`;
  const newDelivery: BookingDelivery = {
    id: `del_${Date.now()}`,
    bookingId,
    provider: 'GOOGLE_DRIVE',
    driveFolderId: folderId,
    driveFolderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    status: 'READY_FOR_UPLOAD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryDeliveries.set(bookingId, newDelivery);
  return newDelivery;
}

/**
 * Manager/Admin delivers photos to customer.
 * Server verifies customer email and grants Google Drive reader access.
 */
export async function deliverToCustomer(bookingId: string): Promise<BookingDelivery> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'MARK_READY', booking_id: bookingId },
    });

    if (error) {
      throw new Error(error.message || 'Không thể cấp quyền xem ảnh cho khách.');
    }

    if (!data?.success || !data?.delivery) {
      throw new Error(data?.error || 'Giao ảnh cho khách thất bại.');
    }

    return mapDatabaseDeliveryToDomain(data.delivery);
  }

  // In-Memory Test Store
  const existing = inMemoryDeliveries.get(bookingId);
  if (!existing || !existing.driveFolderId) {
    throw new Error('Thư mục Drive chưa được khởi tạo.');
  }

  const updated: BookingDelivery = {
    ...existing,
    status: 'READY_FOR_CUSTOMER',
    customerPermissionId: `perm_${Date.now()}`,
    shareEmail: existing.shareEmail || 'customer@example.com',
    readyAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryDeliveries.set(bookingId, updated);
  return updated;
}

/**
 * Manager/Admin revokes customer Drive reader access.
 */
export async function revokeCustomerAccess(bookingId: string): Promise<BookingDelivery> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'REVOKE', booking_id: bookingId },
    });

    if (error) {
      throw new Error(error.message || 'Không thể thu hồi quyền xem ảnh.');
    }

    if (!data?.success || !data?.delivery) {
      throw new Error(data?.error || 'Thu hồi quyền xem ảnh thất bại.');
    }

    return mapDatabaseDeliveryToDomain(data.delivery);
  }

  // In-Memory Test Store
  const existing = inMemoryDeliveries.get(bookingId);
  if (!existing) {
    throw new Error('Không tìm thấy thông tin delivery.');
  }

  const updated: BookingDelivery = {
    ...existing,
    status: 'REVOKED',
    customerPermissionId: undefined,
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryDeliveries.set(bookingId, updated);
  return updated;
}

/**
 * Reconciles Google Drive state with database.
 */
export async function reconcileDriveDelivery(bookingId: string): Promise<BookingDelivery> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.functions.invoke('drive-delivery', {
      body: { action: 'RECONCILE', booking_id: bookingId },
    });

    if (error) {
      throw new Error(error.message || 'Không thể đồng bộ trạng thái Drive.');
    }

    if (!data?.success || !data?.delivery) {
      throw new Error(data?.error || 'Đồng bộ trạng thái Drive thất bại.');
    }

    return mapDatabaseDeliveryToDomain(data.delivery);
  }

  const existing = inMemoryDeliveries.get(bookingId);
  if (!existing) {
    throw new Error('Không tìm thấy thông tin delivery.');
  }

  const updated: BookingDelivery = {
    ...existing,
    lastReconciledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryDeliveries.set(bookingId, updated);
  return updated;
}
