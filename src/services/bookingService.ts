// ==============================================================================
// Maison MIPA Memories - Booking Service & Persistence Layer
// Handles authoritative booking creation, anti-double-booking protection,
// status state machine transitions, and staff assignments.
// ==============================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Booking,
  BookingStatus,
  BookingAssignment,
  StaffRole,
  Addon,
} from '../types';
import { INITIAL_BOOKINGS, INITIAL_PACKAGES, INITIAL_SERVICES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS, INITIAL_EMPLOYEES } from '../mockData';
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
}

// In-memory persistent store for offline mode, unit tests & dev without live Supabase
let inMemoryBookings: Booking[] = [...INITIAL_BOOKINGS];

export function resetInMemoryBookings(initial: Booking[] = INITIAL_BOOKINGS): void {
  inMemoryBookings = [...initial];
}

export function getInMemoryBookings(): Booking[] {
  return inMemoryBookings;
}

export const getBookingsInMemory = getInMemoryBookings;

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

  // If live Supabase is configured, execute the Postgres stored procedure (create_booking RPC)
  if (isSupabaseConfigured()) {
    try {
      const startIso = `${request.date}T${request.timeSlot}:00+07:00`;

      const { data, error } = await supabase.rpc('create_booking', {
        p_service_id: request.serviceId,
        p_package_id: request.packageId,
        p_studio_room_id: request.studioId,
        p_start_at: startIso,
        p_addon_ids: request.addonIds || [],
        p_voucher_code: request.voucherCode || null,
        p_customer_name: request.customerName || null,
        p_customer_phone: request.customerPhone || null,
        p_customer_email: request.customerEmail || null,
        p_occasion: request.occasion || null,
        p_customer_note: request.customerNote || null,
      });

      if (error) {
        // Check for exclusion constraint violation (code 23P01) or conflict message
        if (error.code === '23P01' || error.message.includes('already booked') || error.message.includes('conflict')) {
          throw new BookingConflictError(error.message || 'Phòng studio đã có lịch đặt trong khoảng thời gian này.');
        }
        throw new Error(error.message);
      }

      const result = data as any;
      const newBooking = mapDatabaseRecordToDomain(result);
      inMemoryBookings = [newBooking, ...inMemoryBookings];
      return newBooking;
    } catch (err: any) {
      if (err instanceof BookingConflictError || err.name === 'BookingConflictError') {
        throw err;
      }
      // If network fails, fall back to offline simulation
      if (!err.message?.includes('already booked') && !err.message?.includes('conflict')) {
        console.warn('Supabase create_booking fallback to offline engine:', err.message);
      } else {
        throw err;
      }
    }
  }

  return createBookingInMemory(request);
}

/**
 * Offline / In-Memory Authoritative Engine:
 * Enforces the EXACT SAME exclusion constraint and pricing rules as the PostgreSQL schema.
 */
export function createBookingInMemory(request: CreateBookingRequest): Booking {
  // Input Validation
  if (!request.serviceId || !request.packageId || !request.studioId) {
    throw new BookingValidationError('Vui lòng chọn đầy đủ Dịch vụ, Gói chụp và Phòng Studio.');
  }
  if (!request.date || !request.timeSlot) {
    throw new BookingValidationError('Vui lòng chọn ngày và khung giờ chụp ảnh.');
  }

  const service = INITIAL_SERVICES.find(s => s.id === request.serviceId) || INITIAL_SERVICES[0];
  const pkg = INITIAL_PACKAGES.find(p => p.id === request.packageId) || INITIAL_PACKAGES[0];
  const studio = INITIAL_STUDIO_ROOMS.find(st => st.id === request.studioId) || INITIAL_STUDIO_ROOMS[0];

  const selectedAddons: Addon[] = (request.addonIds || [])
    .map(id => INITIAL_ADDONS.find(a => a.id === id))
    .filter((a): a is Addon => Boolean(a));

  // Authoritative Pricing calculation (client cannot dictate totalAmount)
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

  // Calculate start and end minutes
  const startMinutes = timeToMinutes(request.timeSlot);
  const endMinutes = startMinutes + pricing.totalDurationMinutes;
  const endTimeStr = minutesToTime(endMinutes);

  // Anti-Double-Booking Check (Exclusion Constraint Simulation)
  // Non-cancelled bookings on the same studio and date must NOT overlap
  const conflictingBooking = inMemoryBookings.find(b => {
    const isSameStudio = b.studioId === request.studioId;
    const isSameDate = b.bookingDate === request.date;
    const isNotCancelled = b.bookingStatus !== 'CANCELLED';

    if (!isSameStudio || !isSameDate || !isNotCancelled) {
      return false;
    }

    const existingStart = timeToMinutes(b.startTime);
    const existingEnd = timeToMinutes(b.endTime);

    // Half-open interval overlap check [start, end)
    return isIntervalOverlapping(startMinutes, endMinutes, existingStart, existingEnd);
  });

  if (conflictingBooking) {
    throw new BookingConflictError(
      `Phòng studio ${studio.name} đã có lịch đặt trùng (${conflictingBooking.startTime} - ${conflictingBooking.endTime}). Vui lòng chọn khung giờ khác.`
    );
  }

  // Generate Collision-Resistant Unique Booking Code: MIPA-YYMMDD-XXXX
  const dateCompact = request.date.replace(/-/g, '').slice(2);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
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
    subtotal: pricing.subtotal,
    discount: pricing.discountTotal,
    depositAmount: pricing.depositAmount,
    totalAmount: pricing.totalAmount,
    paymentStatus: 'UNPAID', // Initial status is UNPAID (Payment gateway is in Issue #3)
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
 * Fetch all bookings (or filtered for a customer).
 */
export async function getBookings(customerId?: string): Promise<Booking[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapDatabaseRecordToDomain);
      }
    } catch {
      // Fallback
    }
  }

  if (customerId) {
    return inMemoryBookings.filter(b => b.customerId === customerId);
  }
  return [...inMemoryBookings];
}

/**
 * Updates booking status with state machine validation and persistence.
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  staffNote?: string
): Promise<Booking> {
  // State machine validations
  const existing = inMemoryBookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
  if (existing) {
    if (existing.bookingStatus === 'COMPLETED' && ['DRAFT', 'PENDING_PAYMENT'].includes(newStatus)) {
      throw new Error(`Illegal state transition from COMPLETED to ${newStatus}`);
    }
    if (existing.bookingStatus === 'CANCELLED' && newStatus !== 'CANCELLED') {
      throw new Error('Cannot update a cancelled booking.');
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_staff_note: staffNote || null,
      });

      if (!error && data) {
        const updated = mapDatabaseRecordToDomain(data as any);
        inMemoryBookings = inMemoryBookings.map(b => (b.id === bookingId ? updated : b));
        return updated;
      }
    } catch {
      // Fallback to in-memory mutation
    }
  }

  // Offline / In-memory mutation
  let updatedBooking: Booking | null = null;
  inMemoryBookings = inMemoryBookings.map(b => {
    if (b.id === bookingId || b.bookingCode === bookingId) {
      const newStaffNote = staffNote
        ? `${b.staffNote || ''} [${new Date().toLocaleTimeString('vi-VN')}]: ${staffNote}`
        : b.staffNote;

      updatedBooking = {
        ...b,
        bookingStatus: newStatus,
        staffNote: newStaffNote,
        updatedAt: new Date().toISOString(),
      };
      return updatedBooking;
    }
    return b;
  });

  if (!updatedBooking) {
    throw new Error('Booking not found.');
  }

  return updatedBooking;
}

/**
 * Assigns an employee to a booking with role validation and audit.
 */
export async function assignBookingStaff(
  bookingId: string,
  employeeId: string,
  assignmentRole?: StaffRole
): Promise<BookingAssignment> {
  const employee = INITIAL_EMPLOYEES.find(e => e.id === employeeId);
  const role = assignmentRole || employee?.role || 'PHOTOGRAPHER';

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('assign_booking_staff', {
        p_booking_id: bookingId,
        p_employee_id: employeeId,
        p_assignment_role: role,
      });

      if (!error && data) {
        const res = data as any;
        return {
          id: res.id,
          bookingId: res.booking_id,
          employeeId: res.employee_id,
          employeeName: employee?.name || 'Nhân viên MIPA',
          assignmentRole: role as StaffRole,
          startTime: res.start_at || '09:00',
          endTime: res.end_at || '11:00',
        };
      }
    } catch {
      // Fallback
    }
  }

  // Offline / in-memory mutation
  const targetBooking = inMemoryBookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
  if (!targetBooking) {
    throw new Error('Booking not found');
  }

  const newAssignment: BookingAssignment = {
    id: `asg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bookingId: targetBooking.id,
    employeeId,
    employeeName: employee?.name || 'Nhân viên MIPA',
    assignmentRole: role as StaffRole,
    startTime: targetBooking.startTime,
    endTime: targetBooking.endTime,
  };

  inMemoryBookings = inMemoryBookings.map(b => {
    if (b.id === targetBooking.id) {
      return {
        ...b,
        assignments: [
          ...b.assignments.filter(a => a.assignmentRole !== role),
          newAssignment,
        ],
        updatedAt: new Date().toISOString(),
      };
    }
    return b;
  });

  return newAssignment;
}

/**
 * Mapper from Supabase database row to frontend Booking domain model
 */
function mapDatabaseRecordToDomain(row: any): Booking {
  const startD = row.start_at ? new Date(row.start_at) : null;
  const endD = row.end_at ? new Date(row.end_at) : null;

  const bookingDate = startD ? startD.toISOString().slice(0, 10) : '2026-09-08';
  const startTime = startD ? `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}` : '09:00';
  const endTime = endD ? `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}` : '11:00';

  const service = INITIAL_SERVICES.find(s => s.id === row.service_id) || INITIAL_SERVICES[0];
  const pkg = INITIAL_PACKAGES.find(p => p.id === row.package_id) || INITIAL_PACKAGES[0];
  const studio = INITIAL_STUDIO_ROOMS.find(st => st.id === row.studio_room_id) || INITIAL_STUDIO_ROOMS[0];

  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerId: row.customer_id,
    customerName: row.customer_name || 'Khách Hàng',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    serviceId: row.service_id,
    serviceName: service.name,
    packageId: row.package_id,
    packageName: pkg.name,
    packagePrice: Number(row.subtotal || pkg.price),
    bookingDate,
    startTime,
    endTime,
    studioId: row.studio_room_id,
    studioName: studio.name,
    addons: [],
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount_total || 0),
    depositAmount: Number(row.deposit_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paymentStatus: (row.payment_status || 'UNPAID') as any,
    bookingStatus: (row.booking_status || 'PENDING_PAYMENT') as any,
    customerNote: row.customer_note || undefined,
    occasion: row.occasion || undefined,
    assignments: [],
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}
