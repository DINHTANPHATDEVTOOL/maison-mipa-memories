import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type { NotificationItem } from '../types';
import { getBookings, getBookingsInMemory } from './bookingService';

// ==============================================================================
// Persistent Read & Dismiss Tracking (LocalStorage isolated by userId)
// Ensures notifications marked as read NEVER reappear as unread on browser reload
// ==============================================================================

export function getReadNotificationIds(userId: string = 'global'): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`mipa_read_notifs_${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markNotificationAsRead(id: string, userId: string = 'global'): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getReadNotificationIds(userId);
    set.add(id);
    localStorage.setItem(`mipa_read_notifs_${userId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Error saving read notification:', err);
  }
}

export function markAllNotificationsAsRead(ids: string[], userId: string = 'global'): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getReadNotificationIds(userId);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(`mipa_read_notifs_${userId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Error saving all read notifications:', err);
  }
}

export function getDismissedNotificationIds(userId: string = 'global'): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`mipa_dismissed_notifs_${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function dismissNotification(id: string, userId: string = 'global'): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDismissedNotificationIds(userId);
    set.add(id);
    localStorage.setItem(`mipa_dismissed_notifs_${userId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Error saving dismissed notification:', err);
  }
}

export function clearAllNotifications(ids: string[], userId: string = 'global'): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDismissedNotificationIds(userId);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(`mipa_dismissed_notifs_${userId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Error clearing notifications:', err);
  }
}

/**
 * Authoritative notification loader:
 * Aggregates real bookings & Supabase notification_outbox records,
 * cross-referenced against persistent read and dismissed sets.
 */
export async function getUserNotifications(
  userId?: string,
  userRole?: string
): Promise<NotificationItem[]> {
  const currentUserId = userId || 'global';
  const readIds = getReadNotificationIds(currentUserId);
  const dismissedIds = getDismissedNotificationIds(currentUserId);

  const notificationList: NotificationItem[] = [];

  // 1. Fetch real notifications from Supabase notification_outbox if configured
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (userId && userRole === 'CUSTOMER') {
        query = query.eq('recipient_user_id', userId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        data.forEach((item: any) => {
          notificationList.push({
            id: item.id,
            title: item.event_type.replace(/_/g, ' '),
            message: item.payload?.message || `Thông báo cho mã đơn ${item.payload?.booking_code || item.entity_id}`,
            timestamp: item.created_at,
            read: readIds.has(item.id) || item.status === 'SENT',
            type: item.entity_type.toLowerCase() as any,
          });
        });
      }
    } catch (err) {
      console.warn('Error fetching notification_outbox:', err);
    }
  }

  // 2. Derive real notifications from active bookings
  try {
    let bookings = [];
    try {
      bookings = await getBookings(userRole === 'CUSTOMER' && userId ? userId : undefined);
    } catch {
      bookings = getBookingsInMemory();
    }

    if (!bookings || bookings.length === 0) {
      bookings = getBookingsInMemory();
    }

    const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER' || !userRole;
    const isStaff = userRole === 'STAFF';

    const recentBookings = bookings.slice(0, 10);

    recentBookings.forEach((b: any) => {
      const bDate = b.bookingDate || b.date || '';
      const bTime = b.startTime || b.timeSlot || '';
      const bStatus = b.bookingStatus || b.status || '';

      // (a) Booking creation event
      const createdId = `notif_created_${b.id}`;
      if (isAdminOrManager) {
        notificationList.push({
          id: createdId,
          title: `Đơn đặt lịch mới #${b.bookingCode}`,
          message: `Khách hàng ${b.customerName || 'Khách'} đã đặt lịch ngày ${bDate} lúc ${bTime}.`,
          timestamp: b.createdAt || bDate,
          read: readIds.has(createdId),
          type: 'booking',
        });
      } else if (!isStaff && (b.customerId === userId || !b.customerId)) {
        notificationList.push({
          id: createdId,
          title: `Đặt lịch thành công #${b.bookingCode}`,
          message: `Lịch chụp của quý khách vào ngày ${bDate} lúc ${bTime} đã được tiếp nhận.`,
          timestamp: b.createdAt || bDate,
          read: readIds.has(createdId),
          type: 'booking',
        });
      }

      // (b) Deposit confirmation event
      if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'].includes(bStatus)) {
        const depositId = `notif_deposit_${b.id}`;
        notificationList.push({
          id: depositId,
          title: `Xác nhận đặt cọc #${b.bookingCode}`,
          message: `Đã xác nhận đặt cọc thành công cho đơn #${b.bookingCode}. Maison MIPA đã sẵn sàng đón tiếp.`,
          timestamp: b.updatedAt || bDate,
          read: readIds.has(depositId),
          type: 'payment',
        });
      }

      // (c) Photos delivered event
      if (['COMPLETED', 'DELIVERED'].includes(bStatus)) {
        const deliveredId = `notif_delivery_${b.id}`;
        notificationList.push({
          id: deliveredId,
          title: `Bộ ảnh đã sẵn sàng #${b.bookingCode}`,
          message: `Bộ ảnh kỷ niệm của đơn #${b.bookingCode} đã hoàn tất và sẵn sàng trong thư viện.`,
          timestamp: b.updatedAt || bDate,
          read: readIds.has(deliveredId),
          type: 'album',
        });
      }

      // (d) Staff assignment event
      if (isStaff && b.assignments?.some((a: any) => a.employeeId === userId)) {
        const assignId = `notif_staff_assign_${b.id}`;
        notificationList.push({
          id: assignId,
          title: `Phân công chụp ảnh #${b.bookingCode}`,
          message: `Bạn được phân công phụ trách buổi chụp ngày ${bDate} lúc ${bTime}.`,
          timestamp: b.updatedAt || bDate,
          read: readIds.has(assignId),
          type: 'booking',
        });
      }
    });
  } catch (err) {
    console.warn('Error deriving booking notifications:', err);
  }

  // 3. Deduplicate by ID
  const uniqueMap = new Map<string, NotificationItem>();
  notificationList.forEach((n) => {
    if (!uniqueMap.has(n.id)) {
      uniqueMap.set(n.id, n);
    }
  });

  // 4. Filter out dismissed notifications, sort descending
  const finalNotifications = Array.from(uniqueMap.values())
    .filter((n) => !dismissedIds.has(n.id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return finalNotifications;
}

/**
 * Triggers asynchronous server-side dispatch of booking confirmation email
 * through the Supabase Edge Function `send-email`.
 */
export async function dispatchBookingEmail(bookingId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !bookingId) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { bookingId },
    });

    if (error) {
      console.warn('send-email Edge Function response warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (err: any) {
    console.warn('Failed to invoke send-email Edge Function:', err?.message);
    return { success: false, error: err?.message };
  }
}

