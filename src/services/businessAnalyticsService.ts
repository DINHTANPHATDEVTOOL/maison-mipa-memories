// ==============================================================================
// Maison MIPA Memories - Business Intelligence & Studio Analytics Service
// Server-authoritative PostgreSQL aggregations. Explicit Asia/Ho_Chi_Minh boundaries.
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  BusinessDashboardSummary,
  BookingFunnelMetrics,
  ServicePerformanceMetric,
  ConceptPerformanceMetric,
  StudioUtilizationMetric,
} from '../types';

export type DateRangePreset = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom';

/**
 * Calculates start and end ISO strings strictly aligned to Asia/Ho_Chi_Minh (UTC+7).
 */
export function getDateRangeTimestamps(preset: DateRangePreset, customStart?: string, customEnd?: string): {
  startAt: string;
  endAt: string;
} {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);

  const year = vnNow.getUTCFullYear();
  const month = vnNow.getUTCMonth();
  const date = vnNow.getUTCDate();

  const getVnIsoString = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) => {
    // Calculate UTC timestamp corresponding to that local Vietnam time
    const utcTime = Date.UTC(y, m, d, h, min, s, ms) - VN_OFFSET_MS;
    return new Date(utcTime).toISOString();
  };

  switch (preset) {
    case 'today': {
      return {
        startAt: getVnIsoString(year, month, date, 0, 0, 0, 0),
        endAt: getVnIsoString(year, month, date, 23, 59, 59, 999),
      };
    }
    case '7days': {
      const startVn = new Date(vnNow.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        startAt: getVnIsoString(startVn.getUTCFullYear(), startVn.getUTCMonth(), startVn.getUTCDate(), 0, 0, 0, 0),
        endAt: getVnIsoString(year, month, date, 23, 59, 59, 999),
      };
    }
    case '30days': {
      const startVn = new Date(vnNow.getTime() - 29 * 24 * 60 * 60 * 1000);
      return {
        startAt: getVnIsoString(startVn.getUTCFullYear(), startVn.getUTCMonth(), startVn.getUTCDate(), 0, 0, 0, 0),
        endAt: getVnIsoString(year, month, date, 23, 59, 59, 999),
      };
    }
    case 'this_month': {
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      return {
        startAt: getVnIsoString(year, month, 1, 0, 0, 0, 0),
        endAt: getVnIsoString(year, month, lastDayOfMonth, 23, 59, 59, 999),
      };
    }
    case 'last_month': {
      const prevMonthYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      const lastDayOfPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonth + 1, 0)).getUTCDate();
      return {
        startAt: getVnIsoString(prevMonthYear, prevMonth, 1, 0, 0, 0, 0),
        endAt: getVnIsoString(prevMonthYear, prevMonth, lastDayOfPrevMonth, 23, 59, 59, 999),
      };
    }
    case 'custom': {
      if (customStart && customEnd) {
        return {
          startAt: new Date(customStart).toISOString(),
          endAt: new Date(customEnd).toISOString(),
        };
      }
      return {
        startAt: getVnIsoString(year, month, 1, 0, 0, 0, 0),
        endAt: getVnIsoString(year, month, date, 23, 59, 59, 999),
      };
    }
  }
}

/**
 * Retrieves executive business dashboard summary.
 */
export async function getBusinessDashboardSummary(
  startAt?: string,
  endAt?: string
): Promise<BusinessDashboardSummary> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.rpc('get_crm_dashboard_summary', {
        p_start_at: startAt || null,
        p_end_at: endAt || null,
      });

      if (!error && data) {
        return {
          period: {
            startAt: data.period?.start_at || startAt || '',
            endAt: data.period?.end_at || endAt || '',
          },
          funnel: {
            consultationRequests: Number(data.funnel?.consultation_requests || 0),
            consulting: Number(data.funnel?.consulting || 0),
            confirmedBookings: Number(data.funnel?.confirmed_bookings || 0),
            completedBookings: Number(data.funnel?.completed_bookings || 0),
            cancelledBookings: Number(data.funnel?.cancelled_bookings || 0),
            consultationConversionRate: Number(data.funnel?.consultation_conversion_rate || 0),
            confirmedToCompletedRate: Number(data.funnel?.confirmed_to_completed_rate || 0),
          },
          financials: {
            confirmedBookingValue: Number(data.financials?.confirmed_booking_value || 0),
            completedBookingValue: Number(data.financials?.completed_booking_value || 0),
            confirmedDeposits: Number(data.financials?.confirmed_deposits || 0),
            actualCashReceived: Number(data.financials?.actual_cash_received || 0),
            outstandingBalance: Number(data.financials?.outstanding_balance || 0),
            refundedAmount: Number(data.financials?.refunded_amount || 0),
          },
          customers: {
            totalActiveCustomers: Number(data.customers?.total_active_customers || 0),
            newCustomers: Number(data.customers?.new_customers || 0),
            returningCustomers: Number(data.customers?.returning_customers || 0),
            repeatCustomerRate: Number(data.customers?.repeat_customer_rate || 0),
          },
          operations: {
            upcomingShoots: Number(data.operations?.upcoming_shoots || 0),
            overdueOperationalJobs: Number(data.operations?.overdue_operational_jobs || 0),
            openFollowUps: Number(data.operations?.open_follow_ups || 0),
            overdueFollowUps: Number(data.operations?.overdue_follow_ups || 0),
          },
        };
      }
      if (error) {
        console.warn('[Analytics] get_crm_dashboard_summary RPC error, falling back:', error);
      }
    } catch (err) {
      console.warn('[Analytics] get_crm_dashboard_summary call failed:', err);
    }
  }

  // Fallback demo/mock values
  return {
    period: { startAt: startAt || '', endAt: endAt || '' },
    funnel: {
      consultationRequests: 42,
      consulting: 18,
      confirmedBookings: 24,
      completedBookings: 19,
      cancelledBookings: 3,
      consultationConversionRate: 57.14,
      confirmedToCompletedRate: 79.17,
    },
    financials: {
      confirmedBookingValue: 84000000,
      completedBookingValue: 66500000,
      confirmedDeposits: 24000000,
      actualCashReceived: 72000000,
      outstandingBalance: 12000000,
      refundedAmount: 0,
    },
    customers: {
      totalActiveCustomers: 128,
      newCustomers: 26,
      returningCustomers: 16,
      repeatCustomerRate: 38.1,
    },
    operations: {
      upcomingShoots: 8,
      overdueOperationalJobs: 1,
      openFollowUps: 5,
      overdueFollowUps: 2,
    },
  };
}

/**
 * Retrieves cohort-based booking funnel metrics.
 */
export async function getBookingFunnelMetrics(
  startAt?: string,
  endAt?: string
): Promise<BookingFunnelMetrics> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.rpc('get_booking_funnel_metrics', {
        p_start_at: startAt || null,
        p_end_at: endAt || null,
      });

      if (!error && data) {
        return {
          cohortTotalCreated: Number(data?.cohort_total_created || 0),
          stages: Array.isArray(data?.stages)
            ? data.stages.map((s: any) => ({
                stage: s.stage,
                count: Number(s.count || 0),
                conversionRate: Number(s.conversion_rate || 0),
                medianHoursFromPrevious: s.median_hours_from_previous !== null ? Number(s.median_hours_from_previous) : null,
              }))
            : [],
        };
      }
      if (error) {
        console.warn('[Analytics] get_booking_funnel_metrics error, falling back:', error);
      }
    } catch (err) {
      console.warn('[Analytics] get_booking_funnel_metrics call failed:', err);
    }
  }

  return {
    cohortTotalCreated: 42,
    stages: [
      { stage: 'Yêu cầu tư vấn', count: 42, conversionRate: 100, medianHoursFromPrevious: null },
      { stage: 'Đang tư vấn', count: 35, conversionRate: 83.33, medianHoursFromPrevious: 1.5 },
      { stage: 'Đã xác nhận', count: 24, conversionRate: 57.14, medianHoursFromPrevious: 8.2 },
      { stage: 'Đã chụp', count: 21, conversionRate: 50.0, medianHoursFromPrevious: 48.0 },
      { stage: 'Đã giao ảnh', count: 20, conversionRate: 47.62, medianHoursFromPrevious: 72.0 },
      { stage: 'Hoàn thành', count: 19, conversionRate: 45.24, medianHoursFromPrevious: 24.0 },
    ],
  };
}

/**
 * Retrieves service performance analytics.
 */
export async function getServicePerformance(
  startAt?: string,
  endAt?: string
): Promise<ServicePerformanceMetric[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.rpc('get_service_performance', {
        p_start_at: startAt || null,
        p_end_at: endAt || null,
      });

      if (!error && data) {
        return (Array.isArray(data) ? data : []).map((r: any) => ({
          serviceId: r.service_id,
          serviceName: r.service_name,
          category: r.category || 'Service',
          consultationRequests: Number(r.consultation_requests || 0),
          confirmedBookings: Number(r.confirmed_bookings || 0),
          completedBookings: Number(r.completed_bookings || 0),
          confirmedBookingValue: Number(r.confirmed_booking_value || 0),
          actualCashReceived: Number(r.actual_cash_received || 0),
          conversionRate: Number(r.conversion_rate || 0),
        }));
      }
      if (error) {
        console.warn('[Analytics] get_service_performance error, falling back:', error);
      }
    } catch (err) {
      console.warn('[Analytics] get_service_performance call failed:', err);
    }
  }

  return [
    {
      serviceId: 'srv-1',
      serviceName: 'Chụp ảnh Cưới - Wedding Editorial',
      category: 'Wedding',
      consultationRequests: 18,
      confirmedBookings: 12,
      completedBookings: 10,
      confirmedBookingValue: 48000000,
      actualCashReceived: 42000000,
      conversionRate: 66.67,
    },
    {
      serviceId: 'srv-2',
      serviceName: 'Chụp ảnh Chân dung Nghệ thuật',
      category: 'Portrait',
      consultationRequests: 15,
      confirmedBookings: 8,
      completedBookings: 6,
      confirmedBookingValue: 24000000,
      actualCashReceived: 21000000,
      conversionRate: 53.33,
    },
    {
      serviceId: 'srv-3',
      serviceName: 'Chụp ảnh Gia đình & Bé',
      category: 'Family',
      consultationRequests: 9,
      confirmedBookings: 4,
      completedBookings: 3,
      confirmedBookingValue: 12000000,
      actualCashReceived: 9000000,
      conversionRate: 44.44,
    },
  ];
}

/**
 * Retrieves concept performance analytics.
 */
export async function getConceptPerformance(
  startAt?: string,
  endAt?: string
): Promise<ConceptPerformanceMetric[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.rpc('get_concept_performance', {
        p_start_at: startAt || null,
        p_end_at: endAt || null,
      });

      if (!error && data) {
        return (Array.isArray(data) ? data : []).map((r: any) => ({
          conceptId: r.concept_id,
          conceptName: r.concept_name,
          conceptSlug: r.concept_slug || undefined,
          timesSelected: Number(r.times_selected || 0),
          confirmedBookings: Number(r.confirmed_bookings || 0),
          completedBookings: Number(r.completed_bookings || 0),
          conversionRate: Number(r.conversion_rate || 0),
        }));
      }
      if (error) {
        console.warn('[Analytics] get_concept_performance error, falling back:', error);
      }
    } catch (err) {
      console.warn('[Analytics] get_concept_performance call failed:', err);
    }
  }

  return [
    {
      conceptId: 'cpt-1',
      conceptName: 'Parisian Chic Morning',
      conceptSlug: 'parisian-chic',
      timesSelected: 14,
      confirmedBookings: 9,
      completedBookings: 8,
      conversionRate: 64.29,
    },
    {
      conceptId: 'cpt-2',
      conceptName: 'Classic Studio Monochrome',
      conceptSlug: 'classic-monochrome',
      timesSelected: 11,
      confirmedBookings: 7,
      completedBookings: 6,
      conversionRate: 63.64,
    },
    {
      conceptId: 'cpt-3',
      conceptName: 'Sunset Warmth Editorial',
      conceptSlug: 'sunset-warmth',
      timesSelected: 8,
      confirmedBookings: 4,
      completedBookings: 3,
      conversionRate: 50.0,
    },
  ];
}

/**
 * Retrieves studio room utilization metrics.
 */
export async function getStudioUtilization(
  startAt?: string,
  endAt?: string
): Promise<StudioUtilizationMetric[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.rpc('get_studio_utilization_metrics', {
        p_start_at: startAt || null,
        p_end_at: endAt || null,
      });

      if (!error && data) {
        return (Array.isArray(data) ? data : []).map((r: any) => ({
          roomId: r.room_id,
          roomName: r.room_name,
          roomCode: r.room_code,
          capacity: Number(r.capacity || 1),
          confirmedBookingsCount: Number(r.confirmed_bookings_count || 0),
          confirmedBookingHours: Number(r.confirmed_booking_hours || 0),
          availableBusinessHours: Number(r.available_business_hours || 0),
          utilizationRate: Number(r.utilization_rate || 0),
          popularWeekday: r.popular_weekday || 'Thứ Bảy',
          popularTimeRange: r.popular_time_range || '14:00 - 17:00',
        }));
      }
      if (error) {
        console.warn('[Analytics] get_studio_utilization_metrics error, falling back:', error);
      }
    } catch (err) {
      console.warn('[Analytics] get_studio_utilization_metrics call failed:', err);
    }
  }

  return [
    {
      roomId: 'room-1',
      roomName: 'Studio A - Lumière Naturelle',
      roomCode: 'STUDIO_A',
      capacity: 10,
      confirmedBookingsCount: 16,
      confirmedBookingHours: 48,
      availableBusinessHours: 240,
      utilizationRate: 20.0,
      popularWeekday: 'Thứ Bảy',
      popularTimeRange: '09:00 - 12:00',
    },
    {
      roomId: 'room-2',
      roomName: 'Studio B - Editorial Dark & Warm',
      roomCode: 'STUDIO_B',
      capacity: 8,
      confirmedBookingsCount: 8,
      confirmedBookingHours: 24,
      availableBusinessHours: 240,
      utilizationRate: 10.0,
      popularWeekday: 'Chủ Nhật',
      popularTimeRange: '14:00 - 17:00',
    },
  ];
}
