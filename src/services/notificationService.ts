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
          const bCode = item.payload?.bookingCode || item.payload?.booking_code;
          const bId = item.entity_id || item.payload?.bookingId || item.payload?.booking_id;
          const codeSuffix = bCode ? ` #${bCode}` : '';

          let formattedTitle = item.event_type.replace(/_/g, ' ');
          if (item.event_type === 'BOOKING_CANCEL_REQUESTED') formattedTitle = `🚨 Khách yêu cầu hủy đơn${codeSuffix}`;
          else if (item.event_type === 'BOOKING_CANCELLED') formattedTitle = `✓ Đã duyệt hủy đơn${codeSuffix}`;
          else if (item.event_type === 'BOOKING_CONSULTATION_REQUESTED' || item.event_type === 'BOOKING_CREATED') formattedTitle = `🔔 Đơn đặt lịch mới${codeSuffix}`;
          else if (item.event_type === 'BOOKING_CONFIRMED' || item.event_type === 'DEPOSIT_CONFIRMED') formattedTitle = `💵 Xác nhận đặt cọc${codeSuffix}`;
          else if (item.event_type === 'ALBUM_READY') formattedTitle = `📸 Bộ ảnh đã hoàn tất${codeSuffix}`;
          else if (item.event_type === 'BOOKING_RESCHEDULED') formattedTitle = `🗓️ Khách xin đổi lịch${codeSuffix}`;

          const directLink = (userRole === 'ADMIN' || userRole === 'MANAGER')
            ? `/management?tab=dashboard&bookingCode=${bCode || ''}&bookingId=${bId || ''}`
            : (bCode ? `/account?tab=bookings&bookingCode=${bCode}` : `/account`);

          notificationList.push({
            id: item.id,
            title: formattedTitle,
            message: item.payload?.message || item.payload?.cancelReason || `Thông báo cho mã đơn ${bCode || item.entity_id}`,
            timestamp: item.created_at,
            read: readIds.has(item.id) || item.status === 'SENT',
            type: item.entity_type.toLowerCase() as any,
            link: directLink,
            bookingCode: bCode,
            bookingId: bId,
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

    const recentBookings = bookings.slice(0, 15);

    recentBookings.forEach((b: any) => {
      const bDate = b.bookingDate || b.date || '';
      const bTime = b.startTime || b.timeSlot || '';
      const bStatus = b.bookingStatus || b.status || '';
      const mgmtLink = `/management?tab=dashboard&bookingCode=${b.bookingCode}&bookingId=${b.id}`;
      const customerLink = b.bookingCode ? `/account?tab=bookings&bookingCode=${b.bookingCode}` : `/account`;

      // (a) Customer Cancel Request event
      if (b.cancelRequestedAt && bStatus !== 'CANCELLED') {
        const cancelReqId = `notif_cancel_req_${b.id}_${b.cancelRequestedAt}`;
        if (isAdminOrManager) {
          notificationList.push({
            id: cancelReqId,
            title: `🚨 Khách yêu cầu hủy đơn #${b.bookingCode}`,
            message: `Khách ${b.customerName || 'Khách'} (${b.customerPhone || ''}) gửi yêu cầu hủy: "${b.cancelRequestedReason || 'Khách không cung cấp lý do'}". Bấm để xử lý.`,
            timestamp: b.cancelRequestedAt,
            read: readIds.has(cancelReqId),
            type: 'booking',
            link: mgmtLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        } else if (!isStaff && (b.customerId === userId || !b.customerId)) {
          notificationList.push({
            id: cancelReqId,
            title: `Đang chờ xem xét hủy đơn #${b.bookingCode}`,
            message: `Yêu cầu hủy lịch hẹn ngày ${bDate} của quý khách đang được quản lý xem xét.`,
            timestamp: b.cancelRequestedAt,
            read: readIds.has(cancelReqId),
            type: 'booking',
            link: customerLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        }
      }

      // (b) Cancelled Booking event
      if (bStatus === 'CANCELLED') {
        const cancelledId = `notif_cancelled_${b.id}`;
        if (isAdminOrManager) {
          notificationList.push({
            id: cancelledId,
            title: `Đã hủy đơn #${b.bookingCode}`,
            message: `Đơn của khách ${b.customerName || 'Khách'} đã hủy thành công, phòng ${b.studioName || 'Studio'} đã giải phóng slot.`,
            timestamp: b.updatedAt || bDate,
            read: readIds.has(cancelledId),
            type: 'booking',
            link: mgmtLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        } else if (!isStaff && (b.customerId === userId || !b.customerId)) {
          notificationList.push({
            id: cancelledId,
            title: `✓ Đơn #${b.bookingCode} đã được duyệt hủy`,
            message: `Maison MIPA đã hoàn tất thủ tục hủy đơn lịch chụp ngày ${bDate}. Quý khách có thể đặt lịch mới bất cứ lúc nào.`,
            timestamp: b.updatedAt || bDate,
            read: readIds.has(cancelledId),
            type: 'booking',
            link: customerLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        }
      }

      // (c) Customer Reschedule Request event
      if (b.rescheduleRequestedAt) {
        const reschedId = `notif_resched_${b.id}_${b.rescheduleRequestedAt}`;
        if (isAdminOrManager) {
          notificationList.push({
            id: reschedId,
            title: `🗓️ Khách yêu cầu đổi lịch #${b.bookingCode}`,
            message: `Khách ${b.customerName || 'Khách'} muốn dời lịch sang ngày ${b.rescheduleRequestedDate} (${b.rescheduleRequestedSlot}). Bấm để kiểm tra.`,
            timestamp: b.rescheduleRequestedAt,
            read: readIds.has(reschedId),
            type: 'booking',
            link: mgmtLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        }
      }

      // (d) Booking creation event
      if (bStatus !== 'CANCELLED') {
        const createdId = `notif_created_${b.id}`;
        if (isAdminOrManager) {
          notificationList.push({
            id: createdId,
            title: `🔔 Đơn đặt lịch mới #${b.bookingCode}`,
            message: `Khách hàng ${b.customerName || 'Khách'} (${b.customerPhone || ''}) đã đặt lịch ngày ${bDate} lúc ${bTime}. Bấm để xem chi tiết.`,
            timestamp: b.createdAt || bDate,
            read: readIds.has(createdId),
            type: 'booking',
            link: mgmtLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        } else if (!isStaff && (b.customerId === userId || !b.customerId)) {
          notificationList.push({
            id: createdId,
            title: `Đặt lịch thành công #${b.bookingCode}`,
            message: `Lịch chụp của quý khách vào ngày ${bDate} lúc ${bTime} đã được tiếp nhận. Maison MIPA sẽ liên hệ tư vấn.`,
            timestamp: b.createdAt || bDate,
            read: readIds.has(createdId),
            type: 'booking',
            link: customerLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        }
      }

      // (e) Deposit confirmation event
      if (['CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(bStatus) || b.depositConfirmedAt) {
        const depositId = `notif_deposit_${b.id}`;
        if (isAdminOrManager) {
          notificationList.push({
            id: depositId,
            title: `💵 Đã nhận cọc #${b.bookingCode}`,
            message: `Đã xác nhận cọc ${(b.depositAmount || 0).toLocaleString('vi-VN')} đ cho đơn #${b.bookingCode} (${b.customerName || 'Khách'}).`,
            timestamp: b.depositConfirmedAt || b.updatedAt || bDate,
            read: readIds.has(depositId),
            type: 'payment',
            link: mgmtLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        } else if (!isStaff && (b.customerId === userId || !b.customerId)) {
          notificationList.push({
            id: depositId,
            title: `💵 Xác nhận đặt cọc thành công #${b.bookingCode}`,
            message: `Maison MIPA đã nhận cọc ${(b.depositAmount || 0).toLocaleString('vi-VN')} đ cho đơn #${b.bookingCode}. Hẹn gặp bạn ngày ${bDate}!`,
            timestamp: b.depositConfirmedAt || b.updatedAt || bDate,
            read: readIds.has(depositId),
            type: 'payment',
            link: customerLink,
            bookingCode: b.bookingCode,
            bookingId: b.id,
          });
        }
      }

      // (f) Photos delivered event
      if (['COMPLETED', 'DELIVERED'].includes(bStatus) || Boolean(b.driveReadyForCustomer)) {
        const deliveredId = `notif_delivery_${b.id}`;
        notificationList.push({
          id: deliveredId,
          title: `📸 Bộ ảnh đã sẵn sàng #${b.bookingCode}`,
          message: `Bộ ảnh kỷ niệm của đơn #${b.bookingCode} đã hoàn tất và sẵn sàng để tải về.`,
          timestamp: b.updatedAt || bDate,
          read: readIds.has(deliveredId),
          type: 'album',
          link: !isAdminOrManager ? customerLink : mgmtLink,
          bookingCode: b.bookingCode,
          bookingId: b.id,
        });
      }

      // (g) Staff assignment event
      if (isStaff && b.assignments?.some((a: any) => a.employeeId === userId)) {
        const assignId = `notif_staff_assign_${b.id}`;
        notificationList.push({
          id: assignId,
          title: `Phân công chụp ảnh #${b.bookingCode}`,
          message: `Bạn được phân công phụ trách buổi chụp ngày ${bDate} lúc ${bTime}.`,
          timestamp: b.updatedAt || bDate,
          read: readIds.has(assignId),
          type: 'booking',
          link: `/staff`,
          bookingCode: b.bookingCode,
          bookingId: b.id,
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
 * Triggers asynchronous server-side dispatch of booking emails (confirmation, cancellation, reschedule)
 * through the Supabase Edge Function `send-email`.
 */
export async function dispatchBookingEmail(
  bookingId: string,
  options?: {
    action?: 'CANCEL' | 'RESCHEDULE' | 'CANCEL_REQUEST' | 'CREATED' | string;
    reason?: string;
    newDate?: string;
    newSlot?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !bookingId) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { bookingId, ...(options || {}) },
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

