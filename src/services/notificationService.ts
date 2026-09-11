// ==============================================================================
// Maison MIPA Memories - Authoritative Notification Service
// Interacts with PostgreSQL notification_outbox table.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { NotificationItem } from '../types';

export async function getUserNotifications(userId?: string): Promise<NotificationItem[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (userId) {
        query = query.eq('recipient_user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error.message);
        return [];
      }

      if (data) {
        return data.map((item: any) => ({
          id: item.id,
          title: item.event_type.replace(/_/g, ' '),
          message: item.payload?.message || `Thông báo cho mã đơn ${item.payload?.booking_code || item.entity_id}`,
          timestamp: item.created_at,
          read: item.status === 'SENT',
          type: item.entity_type.toLowerCase() as any,
        }));
      }

      return [];
    } catch (err) {
      console.error('Unexpected error fetching notifications:', err);
      return [];
    }
  }

  return [];
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

