// ==============================================================================
// Maison MIPA Memories - Studio Operations Service
// Daily Operations Board ("Hôm nay"), Tomorrow Prep Checklist, Operations Calendar & Overdue Detection
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import { normalizeError } from '../utils/AppError';
import type {
  Booking,
  DailyOperationsBoardData,
  OperationsCalendarEvent,
} from '../types';
import { INITIAL_BOOKINGS } from '../mockData';
import { getBookings } from './bookingService';

export function getTomorrowVn(): string {
  const d = new Date();
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = vnFormatter.format(d).split('-');
  const tomorrow = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export interface TomorrowPrepItem {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  shootDate: string;
  startTime: string;
  endTime: string;
  studioReady: boolean;
  studioName: string;
  photographerReady: boolean;
  photographerName?: string;
  makeupReady: boolean;
  makeupName?: string;
  equipmentReady: boolean;
  reservedEquipmentCount: number;
  propsReady: boolean;
  customerAckReady: boolean;
  driveReady: boolean;
  driveFolderUrl?: string;
  isAllGreen: boolean;
}

/**
 * Fetch authoritative Daily Operations Board data ("Hôm nay")
 */
export async function getDailyOperationsBoardData(targetDate?: string): Promise<DailyOperationsBoardData> {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_daily_operations_board', {
      p_target_date: dateStr,
    });

    if (error) {
      throw normalizeError(error, 'getDailyOperationsBoardData');
    }

    if (data) {
      const res = data as any;
      return {
        todayShoots: (res.todayShoots || []) as Booking[],
        upcomingCheckIns: (res.upcomingCheckIns || []) as Booking[],
        crewIssues: res.crewIssues || [],
        resourceIssues: res.resourceIssues || [],
        postProductionDue: res.postProductionDue || [],
      };
    }
  }

  // In-memory fallback
  const todayShoots = INITIAL_BOOKINGS.filter(b => b.bookingDate === dateStr || b.bookingStatus === 'SHOOTING');
  const upcomingCheckIns = INITIAL_BOOKINGS.filter(b => b.bookingDate === dateStr && (b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN'));

  // Detect crew completeness
  const crewIssues = todayShoots
    .filter(b => !b.assignments || b.assignments.length === 0 || b.crewStatus === 'CREW_INCOMPLETE' || b.crewStatus === 'CREW_CONFLICT')
    .map(b => ({
      bookingId: b.id,
      bookingCode: b.bookingCode,
      customerName: b.customerName,
      serviceName: b.serviceName,
      startTime: b.startTime,
      missingRoles: b.assignments?.some(a => a.assignmentRole === 'PHOTOGRAPHER') ? ['MAKEUP'] : ['PHOTOGRAPHER'],
      conflictRoles: [],
    }));

  const postProductionDue = INITIAL_BOOKINGS
    .filter(b => b.bookingStatus === 'EDITING' || b.bookingStatus === 'AWAITING_SELECTION' || b.bookingStatus === 'READY_FOR_REVIEW')
    .map(b => {
      const editor = b.assignments?.find(a => a.assignmentRole === 'EDITOR')?.employeeName || 'Chưa phân công Editor';
      return {
        bookingId: b.id,
        bookingCode: b.bookingCode,
        customerName: b.customerName,
        editorName: editor,
        status: b.bookingStatus,
        dueAt: b.editingDueAt || '2026-09-22',
        isOverdue: false,
      };
    });

  return {
    todayShoots,
    upcomingCheckIns,
    crewIssues,
    resourceIssues: [],
    postProductionDue,
  };
}

/**
 * Fetch Tomorrow Prep Checklist items ("Chuẩn bị ngày mai")
 */
export async function getTomorrowPrepBoardData(): Promise<TomorrowPrepItem[]> {
  const tomorrowDateStr = getTomorrowVn();

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const allBookings = await getBookings();
      const tomorrowBookings = allBookings.filter(
        b => b.bookingDate === tomorrowDateStr && ['CONFIRMED', 'CHECKED_IN', 'SHOOTING'].includes(b.bookingStatus)
      );

      return tomorrowBookings.map((b) => {
        const photo = b.assignments?.find(a => a.assignmentRole === 'PHOTOGRAPHER');
        const makeup = b.assignments?.find(a => a.assignmentRole === 'MAKEUP');

        const studioReady = Boolean(b.studioId && b.studioId.trim() !== '');
        const photographerReady = Boolean(photo);
        const makeupReady = Boolean(makeup) || Boolean(b.serviceId?.includes('single')) || false;
        const equipmentReady = true;
        const propsReady = true;
        const customerAckReady = Boolean((b as any).customerScheduleConfirmedAt || (b as any).customer_schedule_confirmed_at);
        const driveReady = Boolean(b.driveFolderUrl && b.driveFolderUrl !== 'https://drive.google.com');

        const isAllGreen =
          studioReady &&
          photographerReady &&
          makeupReady &&
          equipmentReady &&
          customerAckReady &&
          driveReady;

        return {
          bookingId: b.id,
          bookingCode: b.bookingCode,
          customerName: b.customerName,
          serviceName: b.serviceName || 'Dịch Vụ MIPA',
          shootDate: tomorrowDateStr,
          startTime: b.startTime,
          endTime: b.endTime,
          studioReady,
          studioName: b.studioName || 'Phòng Studio MIPA',
          photographerReady,
          photographerName: photo?.employeeName,
          makeupReady,
          makeupName: makeup?.employeeName,
          equipmentReady,
          reservedEquipmentCount: 2,
          propsReady,
          customerAckReady,
          driveReady,
          driveFolderUrl: b.driveFolderUrl && b.driveFolderUrl !== 'https://drive.google.com'
            ? b.driveFolderUrl
            : `https://drive.google.com/drive/folders/mipa_${(b.bookingCode || b.id).toLowerCase()}`,
          isAllGreen,
        };
      });
    } catch (err) {
      console.warn('Fallback in getTomorrowPrepBoardData:', err);
    }
  }

  // In-memory fallback
  const matched = INITIAL_BOOKINGS.filter(
    b => b.bookingDate === tomorrowDateStr && ['CONFIRMED', 'CHECKED_IN', 'SHOOTING'].includes(b.bookingStatus)
  );
  const tomorrowBookings = matched.length > 0 ? matched : INITIAL_BOOKINGS.slice(0, 3);
  return tomorrowBookings.map((b, idx) => {
    const photo = b.assignments?.find(a => a.assignmentRole === 'PHOTOGRAPHER');
    const makeup = b.assignments?.find(a => a.assignmentRole === 'MAKEUP');

    const photographerReady = idx !== 1; // Simulated missing photographer on booking #2
    const equipmentReady = idx !== 2; // Simulated missing equipment on booking #3

    const isAllGreen = photographerReady && equipmentReady;

    return {
      bookingId: b.id,
      bookingCode: b.bookingCode,
      customerName: b.customerName,
      serviceName: b.serviceName,
      shootDate: tomorrowDateStr,
      startTime: b.startTime,
      endTime: b.endTime,
      studioReady: true,
      studioName: b.studioName,
      photographerReady,
      photographerName: photo?.employeeName,
      makeupReady: Boolean(makeup),
      makeupName: makeup?.employeeName,
      equipmentReady,
      reservedEquipmentCount: 2,
      propsReady: true,
      customerAckReady: true,
      driveReady: true,
      driveFolderUrl: b.driveFolderUrl,
      isAllGreen,
    };
  });
}

/**
 * Fetch unified Operations Calendar events (Bookings, Staff shifts, Leaves, Maintenance)
 */
export async function getOperationsCalendarEvents(
  startAt: string,
  endAt: string
): Promise<OperationsCalendarEvent[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_operations_calendar_events', {
      p_start_at: startAt,
      p_end_at: endAt,
    });

    if (error) {
      throw normalizeError(error, 'getOperationsCalendarEvents');
    }

    if (data) {
      return (data as any[]).map(e => ({
        id: e.id,
        title: e.title,
        type: e.type,
        startAt: e.start_at,
        endAt: e.end_at,
        studioRoomId: e.studio_room_id,
        studioRoomName: e.studio_room_name,
        bookingCode: e.booking_code,
        serviceName: e.service_name,
        customerName: e.customer_name,
        bookingStatus: e.booking_status,
        crewStatus: e.crew_status,
        resourceStatus: e.resource_status,
        staffName: e.staff_name,
        staffRole: e.staff_role,
        leaveType: e.leave_type,
        metadata: e.metadata,
      }));
    }
  }

  // In-memory fallback
  const events: OperationsCalendarEvent[] = INITIAL_BOOKINGS.map(b => ({
    id: `event-book-${b.id}`,
    title: `[${b.bookingCode}] ${b.customerName} - ${b.serviceName}`,
    type: 'BOOKING',
    startAt: `${b.bookingDate}T${b.startTime}:00+07:00`,
    endAt: `${b.bookingDate}T${b.endTime}:00+07:00`,
    studioRoomId: b.studioId,
    studioRoomName: b.studioName,
    bookingCode: b.bookingCode,
    serviceName: b.serviceName,
    customerName: b.customerName,
    bookingStatus: b.bookingStatus,
    crewStatus: b.crewStatus || 'CREW_READY',
    resourceStatus: b.resourceStatus || 'RESOURCE_READY',
    staffName: b.assignments?.[0]?.employeeName,
  }));

  // Add leave events
  events.push({
    id: 'event-leave-001',
    title: 'Lê Hoàng Long - Nghỉ phép thường niên',
    type: 'STAFF_LEAVE',
    startAt: '2026-09-22T08:00:00+07:00',
    endAt: '2026-09-23T18:00:00+07:00',
    staffName: 'Lê Hoàng Long',
    staffRole: 'PHOTOGRAPHER',
    leaveType: 'ANNUAL',
  });

  return events;
}

/**
 * Calculate dynamic production due date based on package standard SLA
 */
export function calculateProductionDueDates(
  serviceId: string,
  shootCompletedAt: Date = new Date()
): { editingDueAt: string; deliveryDueAt: string } {
  // Editorial Wedding / Pre-wedding: 7 calendar days editing, 14 days delivery
  // Portrait Standard: 3 calendar days editing, 5 days delivery
  const isWedding = serviceId.includes('wedding') || serviceId.includes('couple');
  const editingDays = isWedding ? 7 : 3;
  const deliveryDays = isWedding ? 14 : 5;

  const editingDate = new Date(shootCompletedAt.getTime() + editingDays * 24 * 60 * 60 * 1000);
  const deliveryDate = new Date(shootCompletedAt.getTime() + deliveryDays * 24 * 60 * 60 * 1000);

  return {
    editingDueAt: editingDate.toISOString(),
    deliveryDueAt: deliveryDate.toISOString(),
  };
}
