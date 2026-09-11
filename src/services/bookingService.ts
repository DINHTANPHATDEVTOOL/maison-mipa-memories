// ==============================================================================
// Maison MIPA Memories - Booking Service & Persistence Layer (Fail-Closed)
// Handles authoritative booking creation, anti-double-booking protection,
// status state machine transitions, staff assignments, and customer acknowledgements.
// ==============================================================================
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  Booking,
  BookingStatus,
  BookingAssignment,
  Addon,
} from '../types';
import { INITIAL_BOOKINGS, INITIAL_PACKAGES, INITIAL_SERVICES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS, INITIAL_EMPLOYEES } from '../mockData';
import { DEMO_CONCEPTS } from './portfolioService';
import { calculatePricing } from './pricingService';
import { isIntervalOverlapping, timeToMinutes, minutesToTime } from './availabilityService';

export class BookingConflictError extends Error {
  constructor(message: string = 'Phòng studio đã có lịch đặt trong khoảng thời gian này. Vui lòng chọn khung giờ khác.') {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingValidationError';
  }
}

export interface CreateBookingRequest {
  serviceId: string;
  packageId: string;
  studioId: string;
  date: string; // 'YYYY-MM-DD'
  timeSlot: string; // 'HH:mm'
  addonIds?: string[];
  voucherCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  occasion?: string;
  customerNote?: string;
  conceptId?: string;
  conceptIds?: string[];
}

// In-memory store for explicit demo mode and offline unit tests
let inMemoryBookings: Booking[] = [...INITIAL_BOOKINGS];

export function resetInMemoryBookings(initial: Booking[] = INITIAL_BOOKINGS): void {
  inMemoryBookings = [...initial];
}

export function getBookingsInMemory(): Booking[] {
  return inMemoryBookings;
}

export const getBookingsStore = getBookingsInMemory;
export const getInMemoryBookings = getBookingsInMemory;

export function updateBookingInMemory(bookingId: string, updates: Partial<Booking>): Booking | null {
  const index = inMemoryBookings.findIndex(b => b.id === bookingId || b.bookingCode === bookingId);
  if (index === -1) return null;
  inMemoryBookings[index] = {
    ...inMemoryBookings[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return inMemoryBookings[index];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_TO_UUID_MAP: Record<string, string> = {
  // Services
  'srv_couple': 'c0000000-0000-0000-0000-000000000001',
  'couple': 'c0000000-0000-0000-0000-000000000001',
  'srv_wedding': 'c0000000-0000-0000-0000-000000000002',
  'wedding': 'c0000000-0000-0000-0000-000000000002',
  'srv_family': 'c0000000-0000-0000-0000-000000000003',
  'family': 'c0000000-0000-0000-0000-000000000003',
  'srv_baby': 'c0000000-0000-0000-0000-000000000004',
  'baby': 'c0000000-0000-0000-0000-000000000004',
  'srv_portrait': 'c0000000-0000-0000-0000-000000000005',
  'portrait': 'c0000000-0000-0000-0000-000000000005',
  'srv_birthday': 'c0000000-0000-0000-0000-000000000006',
  'birthday': 'c0000000-0000-0000-0000-000000000006',

  // Packages
  'pkg_basic': 'd0000000-0000-0000-0000-000000000001',
  'basic': 'd0000000-0000-0000-0000-000000000001',
  'pkg_signature': 'd0000000-0000-0000-0000-000000000002',
  'signature': 'd0000000-0000-0000-0000-000000000002',
  'pkg_premium': 'd0000000-0000-0000-0000-000000000003',
  'premium': 'd0000000-0000-0000-0000-000000000003',

  // Studio Rooms
  'std_room_1': 'f0000000-0000-0000-0000-000000000001',
  'std_cozy': 'f0000000-0000-0000-0000-000000000001',
  'room_01': 'f0000000-0000-0000-0000-000000000001',
  'ROOM_01': 'f0000000-0000-0000-0000-000000000001',
  'std_room_2': 'f0000000-0000-0000-0000-000000000002',
  'std_vintage': 'f0000000-0000-0000-0000-000000000002',
  'room_02': 'f0000000-0000-0000-0000-000000000002',
  'ROOM_02': 'f0000000-0000-0000-0000-000000000002',
  'std_garden': 'f0000000-0000-0000-0000-000000000003',
  'std_nature': 'f0000000-0000-0000-0000-000000000003',
  'garden': 'f0000000-0000-0000-0000-000000000003',
  'GARDEN': 'f0000000-0000-0000-0000-000000000003',

  // Addons
  'add_makeup': 'e0000000-0000-0000-0000-000000000001',
  'makeup': 'e0000000-0000-0000-0000-000000000001',
  'add_hair': 'e0000000-0000-0000-0000-000000000002',
  'hair': 'e0000000-0000-0000-0000-000000000002',
  'add_concept': 'e0000000-0000-0000-0000-000000000003',
  'concept': 'e0000000-0000-0000-0000-000000000003',
  'add_time': 'e0000000-0000-0000-0000-000000000004',
  'time': 'e0000000-0000-0000-0000-000000000004',
  'add_album': 'e0000000-0000-0000-0000-000000000005',
  'album': 'e0000000-0000-0000-0000-000000000005',
  'add_express': 'e0000000-0000-0000-0000-000000000006',
  'express': 'e0000000-0000-0000-0000-000000000006',
};

export async function resolveEntityUuid(
  idOrSlug: string,
  table: 'services' | 'packages' | 'studio_rooms' | 'addons',
  serviceId?: string
): Promise<string> {
  if (!idOrSlug) return idOrSlug;
  if (UUID_REGEX.test(idOrSlug)) return idOrSlug;

  try {
    if (isSupabaseConfigured()) {
      let query = supabase.from(table).select('id');
      if (table === 'studio_rooms') {
        query = query.or(`slug.eq.${idOrSlug},code.eq.${idOrSlug}`);
      } else {
        query = query.eq('slug', idOrSlug);
        if (table === 'packages' && serviceId && UUID_REGEX.test(serviceId)) {
          query = (query as any).eq('service_id', serviceId);
        }
      }
      const { data } = await query.limit(1).maybeSingle();

      if (data?.id && UUID_REGEX.test(data.id)) {
        return data.id;
      }
    }
  } catch {
    // fallback
  }

  // Fallback to INITIAL_PACKAGES for service-specific packages in demo or offline mode
  if (table === 'packages' && serviceId) {
    const pkg = INITIAL_PACKAGES.find(
      p => p.serviceId === serviceId && (p.id === idOrSlug || p.name.toLowerCase().includes(idOrSlug.toLowerCase()))
    );
    if (pkg) return pkg.id;
  }

  if (SLUG_TO_UUID_MAP[idOrSlug]) return SLUG_TO_UUID_MAP[idOrSlug];

  return idOrSlug;
}

/**
 * Creates a new booking with database-level anti-double-booking protection
 * and authoritative server-side price calculation.
 */
export async function createBooking(request: CreateBookingRequest): Promise<Booking> {
  // Input Validation
  if (!request.serviceId || !request.packageId || !request.studioId) {
    throw new BookingValidationError('Vui lòng chọn đầy đủ Dịch vụ, Gói chụp và Phòng Studio.');
  }
  if (!request.date || !request.timeSlot) {
    throw new BookingValidationError('Vui lòng chọn ngày và khung giờ chụp ảnh.');
  }

  const conceptIds = request.conceptIds || (request.conceptId ? [request.conceptId] : []);

  // If Supabase is configured, execute the Postgres stored procedure (create_booking RPC)
  if (isSupabaseConfigured()) {
    const startIso = `${request.date}T${request.timeSlot}:00+07:00`;

    const serviceId = await resolveEntityUuid(request.serviceId, 'services');
    const packageId = await resolveEntityUuid(request.packageId, 'packages', serviceId);
    const studioId = await resolveEntityUuid(request.studioId, 'studio_rooms');
    const addonIds = await Promise.all(
      (request.addonIds || []).map(id => resolveEntityUuid(id, 'addons'))
    );
    const validConceptIds = conceptIds.filter(id => UUID_REGEX.test(id));

    const { data, error } = await supabase.rpc('create_booking', {
      p_service_id: serviceId,
      p_package_id: packageId,
      p_studio_room_id: studioId,
      p_start_at: startIso,
      p_addon_ids: addonIds.filter(id => UUID_REGEX.test(id)),
      p_voucher_code: request.voucherCode || null,
      p_customer_name: request.customerName || null,
      p_customer_phone: request.customerPhone || null,
      p_customer_email: request.customerEmail || null,
      p_occasion: request.occasion || null,
      p_customer_note: request.customerNote || null,
      p_concept_ids: validConceptIds,
    });

    if (error) {
      if (error.code === '23P01' || error.message?.includes('already booked') || error.message?.includes('conflict')) {
        throw new BookingConflictError(error.message || 'Phòng studio đã có lịch đặt trong khoảng thời gian này.');
      }
      throw new Error(`Lỗi tạo đơn đặt lịch: ${error.message}`);
    }

    if (!data) {
      throw new Error('Hệ thống không phản hồi dữ liệu đơn đặt lịch.');
    }

    const newBooking = mapDatabaseRecordToDomain(data as any);
    return newBooking;
  }

  // In demo or test mode
  if (isDemoModeEnabled()) {
    return createBookingInMemory(request);
  }

  throw new Error('Hệ thống cơ sở dữ liệu chưa được kích hoạt.');
}

/**
 * In-Memory Booking Engine for offline tests
 */
export function createBookingInMemory(request: CreateBookingRequest): Booking {
  if (!request.serviceId || !request.packageId || !request.studioId) {
    throw new BookingValidationError('Vui lòng chọn đầy đủ Dịch vụ, Gói chụp và Phòng Studio.');
  }
  if (!request.date || !request.timeSlot) {
    throw new BookingValidationError('Vui lòng chọn ngày và khung giờ chụp ảnh.');
  }

  const service = INITIAL_SERVICES.find(s => s.id === request.serviceId) || INITIAL_SERVICES[0];
  const pkg = INITIAL_PACKAGES.find(p => p.id === request.packageId) || INITIAL_PACKAGES[0];
  const studio = INITIAL_STUDIO_ROOMS.find(st => st.id === request.studioId) || INITIAL_STUDIO_ROOMS[0];

  const conceptIds = request.conceptIds || (request.conceptId ? [request.conceptId] : []);
  if (conceptIds.length > (pkg.conceptsCount || 1)) {
    throw new BookingValidationError(
      `Gói ${pkg.name} chỉ cho phép tối đa ${pkg.conceptsCount || 1} concept (bạn đã chọn ${conceptIds.length}).`
    );
  }

  for (const cId of conceptIds) {
    const concept = DEMO_CONCEPTS.find(c => c.id === cId || c.slug === cId);
    if (!concept) {
      throw new BookingValidationError(`Concept "${cId}" không tồn tại trên hệ thống.`);
    }
    if (!concept.active) {
      throw new BookingValidationError(`Concept "${concept.name}" hiện đang tạm ngưng hoạt động.`);
    }
    if (!concept.bookable) {
      throw new BookingValidationError(`Concept "${concept.name}" chưa mở nhận đặt lịch.`);
    }
  }

  const primaryConcept = conceptIds.length > 0 ? DEMO_CONCEPTS.find(c => c.id === conceptIds[0] || c.slug === conceptIds[0]) : undefined;

  const selectedAddons: Addon[] = (request.addonIds || [])
    .map(id => INITIAL_ADDONS.find(a => a.id === id))
    .filter((a): a is Addon => Boolean(a));

  const totalDuration = pkg.durationMinutes + selectedAddons.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);

  const startMinutes = timeToMinutes(request.timeSlot);
  const endMinutes = startMinutes + totalDuration;
  const endTimeStr = minutesToTime(endMinutes);

  // Anti-double-booking interval check
  const conflicting = inMemoryBookings.find(b => {
    if (b.bookingDate !== request.date) return false;
    if (b.studioId !== studio.id) return false;
    if (b.bookingStatus === 'CANCELLED') return false;

    const existingStart = timeToMinutes(b.startTime);
    const existingEnd = timeToMinutes(b.endTime);

    return isIntervalOverlapping(startMinutes, endMinutes, existingStart, existingEnd);
  });

  if (conflicting) {
    throw new BookingConflictError(
      `Phòng ${studio.name} đã có lịch đặt từ ${conflicting.startTime} đến ${conflicting.endTime}. Vui lòng chọn khung giờ khác.`
    );
  }

  const promo = request.voucherCode ? {
    discountPercent: request.voucherCode.toUpperCase() === 'MIPA20' ? 20 : request.voucherCode.toUpperCase() === 'SUMMERMEMORY' ? 10 : 0,
    minOrder: 500000,
    isActive: true,
  } : null;

  const pricing = calculatePricing({
    packageItem: pkg,
    addons: selectedAddons,
    promotion: promo,
  });

  const dateCompact = request.date.replace(/-/g, '').slice(2);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `MIPA-${dateCompact}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `bk_${Date.now()}_${randomSuffix}`,
    bookingCode,
    customerId: 'cust_current',
    customerName: request.customerName || 'Khách Hàng MIPA',
    customerPhone: request.customerPhone || '0908 123 456',
    customerEmail: request.customerEmail || 'khachhang@maisonmipa.vn',
    serviceId: service.id,
    serviceName: service.name,
    packageId: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.price,
    bookingDate: request.date,
    startTime: request.timeSlot,
    endTime: endTimeStr,
    studioId: studio.id,
    studioName: studio.name,
    addons: selectedAddons,
    conceptId: primaryConcept?.id || conceptIds[0] || undefined,
    conceptIds,
    conceptName: primaryConcept?.name,
    subtotal: pricing.subtotal,
    discount: pricing.discountTotal,
    depositAmount: pricing.depositAmount,
    totalAmount: pricing.totalAmount,
    paymentStatus: 'UNPAID',
    bookingStatus: 'PENDING_PAYMENT',
    customerNote: request.customerNote,
    occasion: request.occasion,
    assignments: [],
    startAt: `${request.date}T${request.timeSlot}:00Z`,
    endAt: `${request.date}T${endTimeStr}:00Z`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryBookings = [newBooking, ...inMemoryBookings];
  return newBooking;
}

/**
 * Fetch bookings with strict fail-closed policy.
 */
export async function getBookings(customerId?: string): Promise<Booking[]> {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('bookings')
      .select('*, booking_assignments(*)');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load bookings from database:', error.message);
      throw new Error(`Không thể tải dữ liệu đơn đặt lịch: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapDatabaseRecordToDomain);
  }

  // Demo mode
  if (isDemoModeEnabled()) {
    if (customerId) {
      return inMemoryBookings.filter(b => b.customerId === customerId);
    }
    return [...inMemoryBookings];
  }

  return [];
}

export const getCustomerBookings = getBookings;

/**
 * Subscribes to real-time updates for bookings in PostgreSQL Supabase.
 * Triggers callback immediately when bookings change, with a background heartbeat fallback.
 */
export function subscribeBookings(
  onChange: (bookings: Booking[]) => void,
  customerId?: string
): () => void {
  let isSubscribed = true;

  const reload = async () => {
    try {
      const bks = await getBookings(customerId);
      if (isSubscribed) {
        onChange(bks);
      }
    } catch (e) {
      console.warn('Realtime booking refresh warning:', e);
    }
  };

  if (isSupabaseConfigured()) {
    const channelName = `realtime-bookings-${customerId || 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          if (isSubscribed) reload();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_assignments',
        },
        () => {
          if (isSubscribed) reload();
        }
      )
      .subscribe();

    // 8-second safety heartbeat
    const intervalId = setInterval(() => {
      if (isSubscribed) reload();
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }

  return () => {
    isSubscribed = false;
  };
}

/**
 * Updates booking status with authoritative backend state machine.
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  staffNote?: string
): Promise<Booking> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_new_status: newStatus,
      p_staff_note: staffNote || null,
    });

    if (error) {
      throw new Error(error.message || `Không thể chuyển trạng thái sang ${newStatus}`);
    }

    if (!data) {
      throw new Error('Dữ liệu trạng thái không hợp lệ.');
    }

    return mapDatabaseRecordToDomain(data as any);
  }

  // In-Memory state transitions for tests
  const existing = inMemoryBookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
  if (!existing) {
    throw new Error('Booking not found in memory store.');
  }

  if (existing.bookingStatus === 'COMPLETED' && ['DRAFT', 'PENDING_PAYMENT'].includes(newStatus)) {
    throw new Error(`Illegal state transition from COMPLETED to ${newStatus}`);
  }

  const updated: Booking = {
    ...existing,
    bookingStatus: newStatus,
    staffNote: staffNote ? `${existing.staffNote || ''}\n${staffNote}`.trim() : existing.staffNote,
    updatedAt: new Date().toISOString(),
  };

  inMemoryBookings = inMemoryBookings.map(b => (b.id === existing.id ? updated : b));
  return updated;
}

/**
 * Customer Acknowledgements
 */
export async function acknowledgeCustomerSchedule(bookingId: string): Promise<Booking> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('acknowledge_customer_schedule', {
      p_booking_id: bookingId,
    });
    if (error) throw new Error(error.message);
    return mapDatabaseRecordToDomain(data as any);
  }

  const updated = updateBookingInMemory(bookingId, {
    customerScheduleConfirmedAt: new Date().toISOString(),
  });
  if (!updated) throw new Error('Booking not found');
  return updated;
}

export async function acknowledgeCustomerShoot(bookingId: string): Promise<Booking> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('acknowledge_customer_shoot', {
      p_booking_id: bookingId,
    });
    if (error) throw new Error(error.message);
    return mapDatabaseRecordToDomain(data as any);
  }

  const updated = updateBookingInMemory(bookingId, {
    customerShootAckAt: new Date().toISOString(),
  });
  if (!updated) throw new Error('Booking not found');
  return updated;
}

export async function requestBookingReschedule(
  bookingId: string,
  newDate: string,
  newSlot: string,
  reason?: string
): Promise<Booking> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('request_booking_reschedule', {
      p_booking_id: bookingId,
      p_new_date: newDate,
      p_new_slot: newSlot,
      p_reason: reason || null,
    });
    if (error) throw new Error(error.message);
    return mapDatabaseRecordToDomain(data as any);
  }

  const updated = updateBookingInMemory(bookingId, {
    rescheduleRequestedAt: new Date().toISOString(),
    rescheduleRequestedDate: newDate,
    rescheduleRequestedSlot: newSlot,
    rescheduleRequestedReason: reason,
  });
  if (!updated) throw new Error('Booking not found');
  return updated;
}

export async function requestBookingCancel(bookingId: string, reason?: string): Promise<Booking> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('request_booking_cancel', {
      p_booking_id: bookingId,
      p_reason: reason || undefined,
    });
    if (error) throw new Error(error.message);
    return mapDatabaseRecordToDomain(data as any);
  }

  const updated = updateBookingInMemory(bookingId, {
    cancelRequestedAt: new Date().toISOString(),
    cancelRequestedReason: reason,
  });
  if (!updated) throw new Error('Booking not found');
  return updated;
}

/**
 * Staff Tasks (Makeup, Styling)
 */
export async function getStaffTasks(employeeId?: string): Promise<any[]> {
  if (isSupabaseConfigured()) {
    let query = supabase.from('staff_tasks').select('*, bookings(booking_code, start_at, customer_name)');
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
  return [];
}

export async function updateStaffTask(taskId: string, newStatus: string, notes?: string): Promise<any> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('update_staff_task_status', {
      p_task_id: taskId,
      p_new_status: newStatus,
      p_notes: notes || null,
    });
    if (error) throw new Error(error.message);
    return data;
  }
  return { id: taskId, status: newStatus, notes };
}

/**
 * Assign staff to a booking
 */
export async function assignBookingStaff(
  bookingId: string,
  employeeId: string,
  assignmentRole: string = 'PHOTOGRAPHER'
): Promise<BookingAssignment> {
  if (isSupabaseConfigured()) {
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('start_at, end_at')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) throw new Error('Booking not found');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, staff_role')
      .eq('id', employeeId)
      .maybeSingle();

    let empName: string = profile?.full_name || '';
    if (!empName) {
      const { data: emp } = await supabase
        .from('employees')
        .select('name')
        .eq('id', employeeId)
        .maybeSingle();
      empName = (emp?.name as string) || 'Chuyên Viên MIPA';
    }

    const role = (assignmentRole || profile?.staff_role || 'PHOTOGRAPHER') as any;

    // Delete existing assignment for this booking and role to cleanly replace staff
    await supabase
      .from('booking_assignments')
      .delete()
      .eq('booking_id', bookingId)
      .eq('assignment_role', role);

    const { data, error } = await supabase
      .from('booking_assignments')
      .insert({
        booking_id: bookingId,
        employee_id: employeeId,
        assignment_role: role,
        start_at: booking.start_at,
        end_at: booking.end_at,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      bookingId: data.booking_id,
      employeeId: data.employee_id,
      employeeName: empName,
      assignmentRole: data.assignment_role,
      startTime: data.start_at,
      endTime: data.end_at,
    };
  }

  // In-memory fallback
  const booking = inMemoryBookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
  const employee = INITIAL_EMPLOYEES.find(e => e.id === employeeId);
  const asg: BookingAssignment = {
    id: `asg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bookingId,
    employeeId,
    employeeName: employee ? employee.name : 'Chuyên Viên Phân Công',
    assignmentRole: assignmentRole as any,
    startTime: booking ? booking.startTime : '09:00',
    endTime: booking ? booking.endTime : '11:00',
  };

  if (booking) {
    if (!booking.assignments) booking.assignments = [];
    const existingIndex = booking.assignments.findIndex(a => a.assignmentRole === assignmentRole);
    if (existingIndex >= 0) {
      booking.assignments[existingIndex] = asg;
    } else {
      booking.assignments.push(asg);
    }
  }

  return asg;
}

/**
 * Map database record to frontend domain model
 */
export function mapDatabaseRecordToDomain(record: any): Booking {
  const startAt = record.start_at || record.startAt || '';
  const endAt = record.end_at || record.endAt || '';

  let bookingDate = record.bookingDate || '';
  let startTime = record.startTime || '';
  let endTime = record.endTime || '';

  if (startAt) {
    const d = new Date(startAt);
    if (!isNaN(d.getTime())) {
      bookingDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

      startTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    } else {
      bookingDate = startAt.split('T')[0] || '';
      startTime = startAt.substring(11, 16) || '';
    }
  }

  if (endAt) {
    const d = new Date(endAt);
    if (!isNaN(d.getTime())) {
      endTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    } else {
      endTime = endAt.substring(11, 16) || '';
    }
  }

  const assignments: BookingAssignment[] = Array.isArray(record.booking_assignments)
    ? record.booking_assignments.map((a: any) => ({
        id: a.id,
        bookingId: a.booking_id,
        employeeId: a.employee_id,
        employeeName: a.employee_name || 'Chuyên Viên MIPA',
        assignmentRole: a.assignment_role,
        startTime: a.start_at,
        endTime: a.end_at,
      }))
    : record.assignments || [];

  return {
    id: record.id,
    bookingCode: record.booking_code || record.bookingCode,
    customerId: record.customer_id || record.customerId,
    customerName: record.customer_name || record.customerName || 'Khách Hàng MIPA',
    customerPhone: record.customer_phone || record.customerPhone || '',
    customerEmail: record.customer_email || record.customerEmail || '',
    serviceId: record.service_id || record.serviceId,
    serviceName: record.service_name || record.serviceName || 'Dịch Vụ MIPA',
    packageId: record.package_id || record.packageId,
    packageName: record.package_name || record.packageName || 'Gói Chụp MIPA',
    packagePrice: Number(record.package_price || record.packagePrice || record.subtotal || 0),
    bookingDate,
    startTime,
    endTime,
    studioId: record.studio_room_id || record.studioId || '',
    studioName: record.studio_name || record.studioName || 'Phòng Studio MIPA',
    addons: record.addons || [],
    conceptId: record.concept_id || record.conceptId,
    conceptIds: record.concept_ids || (record.concept_id ? [record.concept_id] : []),
    conceptName: record.concept_name || record.conceptName,
    subtotal: Number(record.subtotal || 0),
    discount: Number(record.discount_total || record.discount || 0),
    depositAmount: Number(record.deposit_amount || record.depositAmount || 0),
    totalAmount: Number(record.total_amount || record.totalAmount || 0),
    paymentStatus: record.payment_status || record.paymentStatus || 'UNPAID',
    bookingStatus: record.booking_status || record.bookingStatus || 'PENDING_PAYMENT',
    customerNote: record.customer_note || record.customerNote,
    staffNote: record.staff_note || record.staffNote,
    occasion: record.occasion,
    assignments,
    startAt,
    endAt,
    customerScheduleConfirmedAt: record.customer_schedule_confirmed_at,
    customerShootAckAt: record.customer_shoot_ack_at,
    rescheduleRequestedAt: record.reschedule_requested_at,
    rescheduleRequestedDate: record.reschedule_requested_date,
    rescheduleRequestedSlot: record.reschedule_requested_slot,
    rescheduleRequestedReason: record.reschedule_requested_reason,
    cancelRequestedAt: record.cancel_requested_at,
    cancelRequestedReason: record.cancel_requested_reason,
    driveFolderUrl: record.drive_folder_url,
    driveReadyForCustomer: record.drive_ready_for_customer,
    createdAt: record.created_at || record.createdAt || new Date().toISOString(),
    updatedAt: record.updated_at || record.updatedAt || new Date().toISOString(),
  };
}
