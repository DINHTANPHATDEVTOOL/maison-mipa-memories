// ==============================================================================
// Maison MIPA Memories - Staff Scheduling & Workforce Management Service
// Authoritative Staff Availability, Skills, Working Hours, Leave & Assignment Engine
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import { normalizeError } from '../utils/AppError';
import type {
  StaffSkill,
  StaffWorkingHours,
  StaffLeaveRequest,
  StaffShift,
  StaffRole,
  Employee,
  BookingAssignment,
} from '../types';
import { INITIAL_EMPLOYEES } from '../mockData';

// Initial default skills for studio staff
const DEFAULT_SKILLS: StaffSkill[] = [
  { id: 'skill-1', code: 'PORTRAIT', name: 'Chân dung nghệ thuật', category: 'PHOTOGRAPHY', active: true },
  { id: 'skill-2', code: 'COUPLE', name: 'Concept Cặp đôi / Pre-wedding', category: 'PHOTOGRAPHY', active: true },
  { id: 'skill-3', code: 'WEDDING', name: 'Đám cưới / Tiệc cưới', category: 'PHOTOGRAPHY', active: true },
  { id: 'skill-4', code: 'FAMILY', name: 'Gia đình & Em bé', category: 'PHOTOGRAPHY', active: true },
  { id: 'skill-5', code: 'STUDIO_LIGHTING', name: 'Setup Ánh sáng Studio chuẩn', category: 'LIGHTING', active: true },
  { id: 'skill-6', code: 'MAKEUP_BRIDAL', name: 'Trang điểm Cô dâu Haute', category: 'MAKEUP', active: true },
  { id: 'skill-7', code: 'MAKEUP_EDITORIAL', name: 'Makeup Editorial / Thời trang', category: 'MAKEUP', active: true },
  { id: 'skill-8', code: 'RETOUCH_HIGH_END', name: 'Chấm sửa da High-end Fashion', category: 'POST_PRODUCTION', active: true },
  { id: 'skill-9', code: 'COLOR_GRADING', name: 'Cân chỉnh màu Cine tone Pháp', category: 'POST_PRODUCTION', active: true },
];

// In-memory state for demo/local test runs
let inMemoryLeaveRequests: StaffLeaveRequest[] = [
  {
    id: 'leave-001',
    employeeId: 'emp_hung',
    employeeName: 'Trần Hùng',
    leaveType: 'ANNUAL',
    startAt: '2026-09-22T08:00:00+07:00',
    endAt: '2026-09-23T18:00:00+07:00',
    reason: 'Nghỉ phép thường niên cá nhân',
    status: 'APPROVED',
    managerNote: 'Đã duyệt, không trùng ca chụp',
    approvedBy: 'mgr-01',
    approvedAt: '2026-09-15T10:00:00+07:00',
    createdAt: '2026-09-14T09:00:00+07:00',
  },
  {
    id: 'leave-002',
    employeeId: 'emp_huong',
    employeeName: 'Phạm Thanh Hương',
    leaveType: 'PERSONAL',
    startAt: '2026-09-25T13:00:00+07:00',
    endAt: '2026-09-25T17:00:00+07:00',
    reason: 'Việc gia đình buổi chiều',
    status: 'REQUESTED',
    createdAt: '2026-09-16T14:30:00+07:00',
  },
];

let _inMemoryShifts: StaffShift[] = [];

/**
 * Fetch all available staff skills
 */
export async function getStaffSkills(): Promise<StaffSkill[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('staff_skills')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });

    if (error) {
      throw normalizeError(error, 'getStaffSkills');
    }
    return (data || []).map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      description: s.description,
      active: s.active,
      createdAt: s.created_at,
    }));
  }
  return DEFAULT_SKILLS;
}

/**
 * Fetch weekly working hours for an employee
 */
export async function getStaffWorkingHours(employeeId: string): Promise<StaffWorkingHours[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('staff_working_hours')
      .select('*')
      .eq('employee_id', employeeId)
      .order('day_of_week', { ascending: true });

    if (error) {
      throw normalizeError(error, 'getStaffWorkingHours');
    }

    return (data || []).map(w => ({
      id: w.id,
      employeeId: w.employee_id,
      dayOfWeek: w.day_of_week,
      startTime: w.start_time,
      endTime: w.end_time,
      isDayOff: w.is_day_off,
      timezone: w.timezone,
    }));
  }

  // Fallback: standard 09:00 - 18:00, day off on Monday (ISO DOW: 1 = Monday, ..., 7 = Sunday)
  return Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1; // 1 = Monday ... 7 = Sunday
    return {
      id: `hours-${employeeId}-${dow}`,
      employeeId,
      dayOfWeek: dow,
      startTime: '09:00',
      endTime: '18:00',
      isDayOff: dow === 1, // Monday off by default for studio
      timezone: 'Asia/Ho_Chi_Minh',
    };
  });
}

/**
 * Fetch all leave requests (for managers) or for a specific employee
 */
export async function getStaffLeaveRequests(employeeId?: string): Promise<StaffLeaveRequest[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let query = supabase
      .from('staff_leave_requests')
      .select(`
        *,
        profiles:employee_id (id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) {
      throw normalizeError(error, 'getStaffLeaveRequests');
    }

    return (data || []).map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: (r as any)?.profiles?.full_name || (r as any)?.employees?.name || 'Nhân viên MIPA',
      leaveType: r.leave_type as any,
      startAt: r.start_at,
      endAt: r.end_at,
      reason: r.reason,
      status: r.status as any,
      managerNote: r.manager_note,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      createdAt: r.created_at,
    }));
  }

  if (employeeId) {
    return inMemoryLeaveRequests.filter(l => l.employeeId === employeeId);
  }
  return [...inMemoryLeaveRequests];
}

/**
 * Submit a new leave request (Staff self-service)
 */
export async function requestStaffLeave(params: {
  employeeId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
  startAt: string;
  endAt: string;
  reason: string;
}): Promise<StaffLeaveRequest> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('staff_leave_requests')
      .insert({
        employee_id: params.employeeId,
        leave_type: params.leaveType,
        start_at: params.startAt,
        end_at: params.endAt,
        reason: params.reason,
        status: 'REQUESTED',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      employeeId: data.employee_id,
      leaveType: data.leave_type as any,
      startAt: data.start_at,
      endAt: data.end_at,
      reason: data.reason,
      status: data.status as any,
      managerNote: data.manager_note,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdAt: data.created_at,
    };
  }

  const emp = INITIAL_EMPLOYEES.find(e => e.id === params.employeeId);
  const newLeave: StaffLeaveRequest = {
    id: `leave-${Date.now()}`,
    employeeId: params.employeeId,
    employeeName: emp?.name || 'Nhân viên',
    leaveType: params.leaveType,
    startAt: params.startAt,
    endAt: params.endAt,
    reason: params.reason,
    status: 'REQUESTED',
    createdAt: new Date().toISOString(),
  };
  inMemoryLeaveRequests.unshift(newLeave);
  return newLeave;
}

/**
 * Approve staff leave (Manager/Admin only, validates no active booking conflicts)
 */
export async function approveStaffLeave(
  leaveId: string,
  managerNote?: string
): Promise<{ success: boolean; message?: string }> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('approve_staff_leave', {
      p_leave_id: leaveId,
      p_manager_note: managerNote || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const res = data as any;
    if (res && res.success === false) {
      throw new Error(res.error || 'Không thể duyệt nghỉ phép do trùng lịch chụp.');
    }

    return { success: true };
  }

  // In-memory logic
  const leave = inMemoryLeaveRequests.find(l => l.id === leaveId);
  if (!leave) throw new Error('Yêu cầu nghỉ phép không tồn tại.');

  leave.status = 'APPROVED';
  leave.managerNote = managerNote || null;
  leave.approvedAt = new Date().toISOString();
  return { success: true };
}

/**
 * Reject staff leave (Manager/Admin only)
 */
export async function rejectStaffLeave(
  leaveId: string,
  managerNote?: string
): Promise<{ success: boolean }> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('reject_staff_leave', {
      p_leave_id: leaveId,
      p_manager_note: managerNote || null,
    });

    if (error) throw new Error(error.message);
    const res = data as any;
    if (res && res.success === false) {
      throw new Error(res.error || 'Thao tác từ chối thất bại.');
    }
    return { success: true };
  }

  const leave = inMemoryLeaveRequests.find(l => l.id === leaveId);
  if (leave) {
    leave.status = 'REJECTED';
    leave.managerNote = managerNote || null;
  }
  return { success: true };
}

/**
 * Assign staff to a booking via authoritative RPC v2 with advisory lock and conflict engine
 */
export async function assignBookingStaffV2(params: {
  bookingId: string;
  employeeId: string;
  assignmentRole: string;
  notes?: string;
}): Promise<BookingAssignment> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('assign_booking_staff_v2', {
      p_booking_id: params.bookingId,
      p_employee_id: params.employeeId,
      p_assignment_role: params.assignmentRole,
      p_notes: params.notes || null,
    });

    if (error) {
      throw normalizeError(error, 'assignBookingStaffV2');
    }

    const res = data as any;
    if (res && res.success === false) {
      throw normalizeError(new Error(res.error || 'Phân công nhân viên thất bại do trùng lịch hoặc nhân viên không khả dụng.'), 'assignBookingStaffV2');
    }

    // Fetch the inserted assignment details
    const assignment = res.assignment || res;
    return {
      id: assignment.id,
      bookingId: assignment.booking_id,
      employeeId: assignment.employee_id,
      employeeName: assignment.employee_name || 'Chuyên viên MIPA',
      assignmentRole: (assignment.assignment_role || params.assignmentRole) as StaffRole,
      startTime: assignment.start_at,
      endTime: assignment.end_at,
    };
  }

  // In-memory fallback
  const emp = INITIAL_EMPLOYEES.find(e => e.id === params.employeeId);
  return {
    id: `assign-${Date.now()}`,
    bookingId: params.bookingId,
    employeeId: params.employeeId,
    employeeName: emp?.name || 'Chuyên viên MIPA',
    assignmentRole: params.assignmentRole as StaffRole,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  };
}

/**
 * Get staff suggestions for a booking based on role, availability, and skills
 */
export async function getSuggestedStaffForBooking(params: {
  bookingId: string;
  role: StaffRole;
  startAt: string;
  endAt: string;
}): Promise<{
  employee: Employee;
  isAvailable: boolean;
  unavailabilityReason?: string;
  matchingSkills: string[];
}[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_available_staff_for_booking', {
      p_booking_id: params.bookingId,
      p_assignment_role: params.role,
    });

    if (error) {
      throw normalizeError(error, 'getSuggestedStaffForBooking');
    }

    const staffList = (data as any[]) || [];
    return staffList.map(s => ({
      employee: {
        id: s.employee_id,
        name: s.full_name || s.employee_name || 'Chuyên viên MIPA',
        phone: s.phone || '',
        email: s.email || '',
        role: (s.staff_role || s.role || params.role) as StaffRole,
        avatar: s.avatar || '',
        rating: s.rating ?? 5.0,
        totalSessions: s.total_sessions ?? 0,
        status: (s.status === 'ACTIVE' ? 'ACTIVE' : s.status === 'ON_LEAVE' ? 'ON_LEAVE' : 'OFF'),
        skills: s.matching_skills || s.skills || [],
        shiftSchedule: s.shift_schedule || {},
      },
      isAvailable: Boolean(s.is_available),
      unavailabilityReason: s.unavailability_reason || undefined,
      matchingSkills: s.matching_skills || s.skills || [],
    }));
  }

  // In-memory demo/test fallback only
  const allEmployees = INITIAL_EMPLOYEES.filter(
    e => e.role === params.role || (params.role === 'PHOTOGRAPHER' && e.role === 'PHOTOGRAPHER')
  );

  return allEmployees.map(emp => {
    // Check leave
    const hasLeave = inMemoryLeaveRequests.some(
      l =>
        l.employeeId === emp.id &&
        l.status === 'APPROVED' &&
        l.startAt < params.endAt &&
        l.endAt > params.startAt
    );

    return {
      employee: emp,
      isAvailable: !hasLeave && emp.status === 'ACTIVE',
      unavailabilityReason: hasLeave ? 'Đã có lịch nghỉ phép được duyệt' : undefined,
      matchingSkills: emp.skills || [],
    };
  });
}

// ==============================================================================
// Staff Shift Registration & Smart Booking Assignment System
// ==============================================================================

export type ShiftType = 'MORNING' | 'AFTERNOON';

export interface ShiftInfo {
  type: ShiftType;
  name: string;
  timeRange: string;
  startHour: string;
  endHour: string;
}

export const SHIFT_CONFIGS: Record<ShiftType, ShiftInfo> = {
  MORNING: {
    type: 'MORNING',
    name: 'Ca Sáng',
    timeRange: '08:00 - 13:00',
    startHour: '08:00',
    endHour: '13:00',
  },
  AFTERNOON: {
    type: 'AFTERNOON',
    name: 'Ca Chiều',
    timeRange: '13:00 - 19:00',
    startHour: '13:00',
    endHour: '19:00',
  },
};

export interface StaffShiftRegistrationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: StaffRole;
  shiftDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export interface StaffEmailNotification {
  id: string;
  toEmail: string;
  employeeName: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  shootDate: string;
  shootTime: string;
  shiftName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'SENT';
}

// LocalStorage key for temporary drafts only (never authoritative schedule in production)
const LOCAL_STORAGE_SHIFTS_DRAFT_KEY = 'mipa_draft_registered_shifts';

// In-memory fallback stores
let inMemoryRegisteredShifts: StaffShiftRegistrationRecord[] = [];
let inMemoryEmailNotifications: StaffEmailNotification[] = [];

/**
 * Reads registered shifts from localStorage draft (if in demo mode) or memory.
 */
export function getStoredRegisteredShifts(): StaffShiftRegistrationRecord[] {
  if (isDemoModeEnabled() && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SHIFTS_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryRegisteredShifts = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StaffScheduling] Error reading shifts from localStorage draft:', e);
    }
  }
  return inMemoryRegisteredShifts;
}

/**
 * Persists registered shifts to memory and localStorage draft (in demo mode only).
 */
export function persistStoredRegisteredShifts(shifts: StaffShiftRegistrationRecord[]) {
  inMemoryRegisteredShifts = shifts;
  if (isDemoModeEnabled() && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_SHIFTS_DRAFT_KEY, JSON.stringify(shifts));
      window.dispatchEvent(new CustomEvent('mipa_shifts_updated', { detail: { count: shifts.length } }));
    } catch (e) {
      console.warn('[StaffScheduling] Error saving draft shifts to localStorage:', e);
    }
  }
}

// Initialize default shifts for demo and development ONLY
function initializeDefaultShifts() {
  if (!isDemoModeEnabled()) {
    // Production mode must NEVER auto-generate fake shifts!
    return;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SHIFTS_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryRegisteredShifts = parsed;
          return;
        }
      }
    } catch {
      // proceed to generate defaults
    }
  }

  if (inMemoryRegisteredShifts.length > 0) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  for (let d = -3; d <= 21; d++) {
    const targetDate = new Date(year, month, today.getDate() + d);
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...

    // Hoàng Minh (Photographer): Mon, Wed, Fri, Sat
    if ([1, 3, 5, 6].includes(dayOfWeek)) {
      inMemoryRegisteredShifts.push({
        id: `shift-minh-${dateStr}-M`,
        employeeId: 'emp_minh',
        employeeName: 'Hoàng Minh',
        role: 'PHOTOGRAPHER',
        shiftDate: dateStr,
        shiftType: 'MORNING',
        startAt: `${dateStr}T08:00:00+07:00`,
        endAt: `${dateStr}T13:00:00+07:00`,
        createdAt: new Date().toISOString(),
      });
      if (dayOfWeek === 6 || dayOfWeek === 1) {
        inMemoryRegisteredShifts.push({
          id: `shift-minh-${dateStr}-A`,
          employeeId: 'emp_minh',
          employeeName: 'Hoàng Minh',
          role: 'PHOTOGRAPHER',
          shiftDate: dateStr,
          shiftType: 'AFTERNOON',
          startAt: `${dateStr}T13:00:00+07:00`,
          endAt: `${dateStr}T19:00:00+07:00`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Trần Hùng (Photographer): Tue, Thu, Sat, Sun
    if ([2, 4, 6, 0].includes(dayOfWeek)) {
      inMemoryRegisteredShifts.push({
        id: `shift-hung-${dateStr}-A`,
        employeeId: 'emp_hung',
        employeeName: 'Trần Hùng',
        role: 'PHOTOGRAPHER',
        shiftDate: dateStr,
        shiftType: 'AFTERNOON',
        startAt: `${dateStr}T13:00:00+07:00`,
        endAt: `${dateStr}T19:00:00+07:00`,
        createdAt: new Date().toISOString(),
      });
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        inMemoryRegisteredShifts.push({
          id: `shift-hung-${dateStr}-M`,
          employeeId: 'emp_hung',
          employeeName: 'Trần Hùng',
          role: 'PHOTOGRAPHER',
          shiftDate: dateStr,
          shiftType: 'MORNING',
          startAt: `${dateStr}T08:00:00+07:00`,
          endAt: `${dateStr}T13:00:00+07:00`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Phạm Thanh Hương (Makeup): Mon, Tue, Thu, Fri, Sat
    if ([1, 2, 4, 5, 6].includes(dayOfWeek)) {
      inMemoryRegisteredShifts.push({
        id: `shift-huong-${dateStr}-M`,
        employeeId: 'emp_huong',
        employeeName: 'Phạm Thanh Hương',
        role: 'MAKEUP',
        shiftDate: dateStr,
        shiftType: 'MORNING',
        startAt: `${dateStr}T08:00:00+07:00`,
        endAt: `${dateStr}T13:00:00+07:00`,
        createdAt: new Date().toISOString(),
      });
      inMemoryRegisteredShifts.push({
        id: `shift-huong-${dateStr}-A`,
        employeeId: 'emp_huong',
        employeeName: 'Phạm Thanh Hương',
        role: 'MAKEUP',
        shiftDate: dateStr,
        shiftType: 'AFTERNOON',
        startAt: `${dateStr}T13:00:00+07:00`,
        endAt: `${dateStr}T19:00:00+07:00`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (typeof window !== 'undefined' && window.localStorage && inMemoryRegisteredShifts.length > 0 && isDemoModeEnabled()) {
    try {
      localStorage.setItem(LOCAL_STORAGE_SHIFTS_DRAFT_KEY, JSON.stringify(inMemoryRegisteredShifts));
    } catch {
      // ignore
    }
  }
}

// In demo mode only, populate initial demo shifts
if (isDemoModeEnabled()) {
  initializeDefaultShifts();
}

/**
 * Determines whether a given time falls into MORNING or AFTERNOON shift
 * Centralized Asia/Ho_Chi_Minh timezone-independent calculation
 */
import { determineShiftFromTime } from '../utils/businessTime';
export { determineShiftFromTime };

/**
 * Fetch registered shifts, optionally filtered by employeeId and/or date range
 * In production Supabase mode: Database is authoritative and fails closed.
 */
export async function getStaffRegisteredShifts(params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<StaffShiftRegistrationRecord[]> {
  if (isDemoModeEnabled()) {
    initializeDefaultShifts();
  }

  // 1. Authoritative production mode
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let query = supabase.from('staff_shifts').select('id, employee_id, shift_date, shift_type, start_at, end_at, created_at');
    if (params?.employeeId) {
      query = query.eq('employee_id', params.employeeId);
    }
    if (params?.startDate) {
      query = query.gte('shift_date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('shift_date', params.endDate);
    }
    const { data, error } = await query;
    if (error) {
      throw normalizeError(error, 'getStaffRegisteredShifts');
    }
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: 'Nhân sự MIPA',
      role: 'PHOTOGRAPHER' as StaffRole,
      shiftDate: row.shift_date,
      shiftType: row.shift_type as ShiftType,
      startAt: row.start_at,
      endAt: row.end_at,
      createdAt: row.created_at,
    }));
  }

  // 2. Demo / test mode fallback
  let result = [...getStoredRegisteredShifts()];
  if (params?.employeeId) {
    result = result.filter(s => s.employeeId === params.employeeId);
  }
  if (params?.startDate) {
    result = result.filter(s => s.shiftDate >= params.startDate!);
  }
  if (params?.endDate) {
    result = result.filter(s => s.shiftDate <= params.endDate!);
  }
  return result;
}

/**
 * Register or unregister shifts for a staff member (supports week & month updates)
 * In production mode: mutates DB first and fails closed without updating local state on error.
 */
export async function registerStaffShifts(
  employeeId: string,
  shiftsToUpdate: { date: string; shiftType: ShiftType; selected: boolean }[],
  staffMetadata?: { employeeName?: string; role?: StaffRole }
): Promise<StaffShiftRegistrationRecord[]> {
  // 1. Authoritative production mode: Fail-closed DB mutation
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    for (const item of shiftsToUpdate) {
      const config = SHIFT_CONFIGS[item.shiftType];
      if (item.selected) {
        const { error } = await supabase.from('staff_shifts').upsert({
          employee_id: employeeId,
          shift_date: item.date,
          shift_type: item.shiftType,
          start_at: `${item.date}T${config.startHour}:00+07:00`,
          end_at: `${item.date}T${config.endHour}:00+07:00`,
        }, { onConflict: 'employee_id,shift_date,shift_type' });
        if (error) {
          throw normalizeError(error, 'registerStaffShifts');
        }
      } else {
        const { error } = await supabase
          .from('staff_shifts')
          .delete()
          .match({ employee_id: employeeId, shift_date: item.date, shift_type: item.shiftType });
        if (error) {
          throw normalizeError(error, 'registerStaffShifts');
        }
      }
    }

    const { data, error } = await supabase.from('staff_shifts').select('*').eq('employee_id', employeeId);
    if (error) {
      throw normalizeError(error, 'registerStaffShifts');
    }
    const updated = (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: staffMetadata?.employeeName || 'Nhân sự MIPA',
      role: staffMetadata?.role || 'PHOTOGRAPHER',
      shiftDate: row.shift_date,
      shiftType: row.shift_type as ShiftType,
      startAt: row.start_at,
      endAt: row.end_at,
      createdAt: row.created_at,
    }));
    persistStoredRegisteredShifts(updated);
    return updated;
  }

  // 2. Demo / test mode fallback
  if (isDemoModeEnabled()) {
    initializeDefaultShifts();
  }
  const currentShifts = [...getStoredRegisteredShifts()];

  const emp = INITIAL_EMPLOYEES.find(e => e.id === employeeId);
  const employeeName = staffMetadata?.employeeName || emp?.name || 'Nhân sự MIPA';
  const role = staffMetadata?.role || emp?.role || 'PHOTOGRAPHER';

  for (const item of shiftsToUpdate) {
    const existingIndex = currentShifts.findIndex(
      s => s.employeeId === employeeId && s.shiftDate === item.date && s.shiftType === item.shiftType
    );

    if (item.selected) {
      const config = SHIFT_CONFIGS[item.shiftType];
      const record: StaffShiftRegistrationRecord = {
        id: `shift-${employeeId}-${item.date}-${item.shiftType[0]}`,
        employeeId,
        employeeName,
        role,
        shiftDate: item.date,
        shiftType: item.shiftType,
        startAt: `${item.date}T${config.startHour}:00+07:00`,
        endAt: `${item.date}T${config.endHour}:00+07:00`,
        createdAt: new Date().toISOString(),
      };
      if (existingIndex === -1) {
        currentShifts.push(record);
      } else {
        currentShifts[existingIndex] = record;
      }
    } else {
      if (existingIndex !== -1) {
        currentShifts.splice(existingIndex, 1);
      }
    }
  }

  persistStoredRegisteredShifts(currentShifts);
  return currentShifts.filter(s => s.employeeId === employeeId);
}

/**
 * Returns available staff for a specific date and time slot,
 * highlighting staff who have registered for that shift.
 * In production Supabase mode: queries actual employees and staff_shifts.
 */
export async function getAvailableStaffForSlot(params: {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or ISO
  role?: StaffRole;
}): Promise<{
  employee: Employee;
  shiftType: ShiftType;
  isRegisteredForShift: boolean;
  registeredTimeRange?: string;
}[]> {
  const shiftType = determineShiftFromTime(params.time);
  const targetDate = params.date.split('T')[0];

  // 1. Authoritative production mode
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let empQuery = supabase.from('employees').select('*').eq('active', true);
    if (params.role) {
      empQuery = empQuery.eq('staff_role', params.role);
    }
    const { data: empData, error: empErr } = await empQuery;
    if (empErr) {
      throw normalizeError(empErr, 'getAvailableStaffForSlot');
    }
    const employeesList: Employee[] = (empData || []).map((row: any) => ({
      id: row.id,
      name: row.name || 'Nhân sự MIPA',
      email: row.email || '',
      phone: row.phone || '',
      role: (row.staff_role || 'PHOTOGRAPHER') as StaffRole,
      avatar: row.avatar || '',
      skills: Array.isArray(row.skills) ? row.skills : [],
      rating: 5.0,
      totalSessions: 0,
      status: 'ACTIVE' as const,
      shiftSchedule: {},
    }));

    // Query real shifts from DB for this date
    const { data: shiftData, error: shiftErr } = await supabase
      .from('staff_shifts')
      .select('employee_id, shift_type')
      .eq('shift_date', targetDate);

    if (shiftErr) {
      throw normalizeError(shiftErr, 'getAvailableStaffForSlot');
    }

    const registeredEmpIds = new Set(
      (shiftData || [])
        .filter((s: any) => s.shift_type === shiftType)
        .map((s: any) => s.employee_id)
    );

    return employeesList.map(emp => {
      const registered = registeredEmpIds.has(emp.id);
      return {
        employee: emp,
        shiftType,
        isRegisteredForShift: registered,
        registeredTimeRange: registered ? SHIFT_CONFIGS[shiftType].timeRange : undefined,
      };
    });
  }

  // 2. Demo / test mode fallback
  if (isDemoModeEnabled()) {
    initializeDefaultShifts();
  }
  const registeredShifts = getStoredRegisteredShifts();

  // Combine INITIAL_EMPLOYEES with any dynamically registered employees
  const dynamicEmployees: Employee[] = [...INITIAL_EMPLOYEES];
  registeredShifts.forEach(s => {
    if (!dynamicEmployees.some(e => e.id === s.employeeId)) {
      dynamicEmployees.push({
        id: s.employeeId,
        name: s.employeeName,
        email: `${s.employeeId}@maisonmipa.vn`,
        phone: '',
        role: s.role,
        avatar: '/hero.png',
        skills: [],
        rating: 5.0,
        totalSessions: 0,
        status: 'ACTIVE',
        shiftSchedule: {},
      });
    }
  });

  const candidateEmployees = params.role
    ? dynamicEmployees.filter(e => e.role === params.role)
    : dynamicEmployees;

  return candidateEmployees.map(emp => {
    const registered = registeredShifts.some(
      s => s.employeeId === emp.id && s.shiftDate === targetDate && s.shiftType === shiftType
    );

    return {
      employee: emp,
      shiftType,
      isRegisteredForShift: registered,
      registeredTimeRange: registered ? SHIFT_CONFIGS[shiftType].timeRange : undefined,
    };
  });
}

/**
 * Assigns staff to a booking and triggers shoot notification email to the staff member
 */
export async function assignStaffAndSendEmailNotification(params: {
  bookingId: string;
  employeeId: string;
  role: StaffRole;
  bookingDetails: {
    bookingCode: string;
    customerName: string;
    customerPhone?: string;
    shootDate: string;
    shootTime: string;
    packageName?: string;
    serviceName?: string;
    studioName?: string;
    notes?: string;
  };
  staffDetails?: {
    name?: string;
    email?: string;
  };
}): Promise<{
  assignment: BookingAssignment;
  emailNotification: StaffEmailNotification;
}> {
  const registeredShifts = getStoredRegisteredShifts();
  const shiftRecord = registeredShifts.find(s => s.employeeId === params.employeeId);
  const emp = INITIAL_EMPLOYEES.find(e => e.id === params.employeeId);

  const staffName = params.staffDetails?.name || emp?.name || shiftRecord?.employeeName || 'Nhân sự MIPA';
  const staffEmail = params.staffDetails?.email || emp?.email || `${params.employeeId}@maisonmipa.vn`;
  const shiftType = determineShiftFromTime(params.bookingDetails.shootTime);
  const shiftName = SHIFT_CONFIGS[shiftType].name;

  const assignment: BookingAssignment = {
    id: `assign-${Date.now()}`,
    bookingId: params.bookingId,
    employeeId: params.employeeId,
    employeeName: staffName,
    assignmentRole: params.role,
    startTime: `${params.bookingDetails.shootDate}T${params.bookingDetails.shootTime}:00+07:00`,
    endTime: `${params.bookingDetails.shootDate}T19:00:00+07:00`,
  };

  const emailNotification: StaffEmailNotification = {
    id: `email-${Date.now()}`,
    toEmail: staffEmail,
    employeeName: staffName,
    bookingId: params.bookingId,
    bookingCode: params.bookingDetails.bookingCode,
    customerName: params.bookingDetails.customerName,
    shootDate: params.bookingDetails.shootDate,
    shootTime: params.bookingDetails.shootTime,
    shiftName: `${shiftName} (${SHIFT_CONFIGS[shiftType].timeRange})`,
    subject: `[Maison MIPA] Thông Báo Buổi Chụp Mới: Đơn #${params.bookingDetails.bookingCode} - ${params.bookingDetails.shootDate}`,
    body: `Chào ${staffName},\n\nBạn vừa được Quản lý phân công phụ trách buổi chụp tại Maison MIPA Memories:\n\n- Khách hàng: ${params.bookingDetails.customerName} (${params.bookingDetails.customerPhone || 'N/A'})\n- Gói chụp: ${params.bookingDetails.packageName || params.bookingDetails.serviceName || 'Gói Chụp Nghệ Thuật'}\n- Thời gian: Ngày ${params.bookingDetails.shootDate} vào lúc ${params.bookingDetails.shootTime}\n- Ca làm việc: ${shiftName} (${SHIFT_CONFIGS[shiftType].timeRange})\n- Địa điểm: ${params.bookingDetails.studioName || 'Phòng Studio Maison MIPA'}\n\nLịch chụp đã được tự động cập nhật vào trang cá nhân "Ca Chụp Của Tôi" của bạn. Vui lòng có mặt trước 15 phút để chuẩn bị thiết bị.\n\nTrân trọng,\nBan Quản Lý Vận Hành Maison MIPA`,
    sentAt: new Date().toISOString(),
    status: 'SENT',
  };

  inMemoryEmailNotifications.unshift(emailNotification);
  console.info(`[STAFF EMAIL SENT] -> To: ${staffEmail} | Subject: ${emailNotification.subject}`);

  return {
    assignment,
    emailNotification,
  };
}

/**
 * Get all sent email notifications to staff members
 */
export function getStaffEmailNotifications(employeeId?: string): StaffEmailNotification[] {
  if (employeeId) {
    const emp = INITIAL_EMPLOYEES.find(e => e.id === employeeId);
    const targetEmail = emp?.email || `${employeeId}@maisonmipa.vn`;
    return inMemoryEmailNotifications.filter(e => e.toEmail === targetEmail || (emp && e.toEmail === emp.email));
  }
  return [...inMemoryEmailNotifications];
}

export interface StaffAssignmentNotificationResult {
  assignment: BookingAssignment;
  notificationStatus: 'QUEUED' | 'SENT' | 'SKIPPED_MISSING_EMAIL' | 'FAILED';
  notificationMessage: string;
}

/**
 * Unified authoritative staff assignment + email dispatch flow.
 * 1. Executes authoritative assign_booking_staff_v2 RPC
 * 2. On assignment success, creates durable notification_outbox event (STAFF_BOOKING_ASSIGNED)
 * 3. Distinguishes assignment success from email dispatch status without false delivery claims
 */
export async function assignBookingStaffAndNotify(params: {
  bookingId: string;
  employeeId: string;
  role: StaffRole;
  bookingDetails: {
    bookingCode: string;
    customerName: string;
    customerPhone?: string;
    shootDate: string;
    shootTime: string;
    packageName?: string;
    serviceName?: string;
    studioName?: string;
    notes?: string;
  };
  staffDetails?: {
    name?: string;
    email?: string;
  };
}): Promise<StaffAssignmentNotificationResult> {
  // 1. Authoritative mutation
  const assignment = await assignBookingStaffV2({
    bookingId: params.bookingId,
    employeeId: params.employeeId,
    assignmentRole: params.role,
    notes: params.bookingDetails.notes,
  });

  const staffName = params.staffDetails?.name || assignment.employeeName || 'Nhân sự MIPA';
  const targetEmail = params.staffDetails?.email?.trim();

  // 2. Missing email validation (No fake staff@maisonmipa.vn fallback)
  if (!targetEmail || targetEmail === 'staff@maisonmipa.vn' || targetEmail.includes('placeholder')) {
    return {
      assignment,
      notificationStatus: 'SKIPPED_MISSING_EMAIL',
      notificationMessage: `Đã phân công ${staffName}. Nhân sự chưa có email hợp lệ để gửi thông báo.`,
    };
  }

  // 3. Durable notification_outbox event in production mode
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const idempotencyKey = `staff-assignment:${params.bookingId}:${params.employeeId}:${params.role}`;
    try {
      const { error: outboxErr } = await supabase.from('notification_outbox').upsert({
        event_type: 'STAFF_BOOKING_ASSIGNED',
        recipient_user_id: params.employeeId,
        recipient_email: targetEmail,
        entity_type: 'booking_assignments',
        entity_id: assignment.id,
        template_key: 'STAFF_BOOKING_ASSIGNED',
        payload: {
          booking_id: params.bookingId,
          booking_code: params.bookingDetails.bookingCode,
          customer_name: params.bookingDetails.customerName,
          customer_phone: params.bookingDetails.customerPhone || null,
          shoot_date: params.bookingDetails.shootDate,
          shoot_time: params.bookingDetails.shootTime,
          package_name: params.bookingDetails.packageName || params.bookingDetails.serviceName || 'Gói Chụp Nghệ Thuật',
          studio_name: params.bookingDetails.studioName || 'Studio Maison MIPA',
          employee_name: staffName,
          role: params.role,
        },
        status: 'PENDING',
        idempotency_key: idempotencyKey,
      }, { onConflict: 'idempotency_key' });

      if (outboxErr) {
        console.warn('[StaffScheduling] Failed to insert notification_outbox:', outboxErr);
        return {
          assignment,
          notificationStatus: 'FAILED',
          notificationMessage: `Đã phân công ${staffName}. Email thông báo tạm thời gặp lỗi khi đưa vào hàng đợi.`,
        };
      }

      return {
        assignment,
        notificationStatus: 'QUEUED',
        notificationMessage: `Đã phân công ${staffName}. Email thông báo đang được gửi.`,
      };
    } catch (err) {
      console.warn('[StaffScheduling] Exception writing notification_outbox:', err);
      return {
        assignment,
        notificationStatus: 'FAILED',
        notificationMessage: `Đã phân công ${staffName}. Lỗi hệ thống gửi thông báo.`,
      };
    }
  }

  // 4. Demo / test mode fallback
  const demoResult = await assignStaffAndSendEmailNotification(params);
  return {
    assignment: demoResult.assignment,
    notificationStatus: 'SENT',
    notificationMessage: `Đã phân công ${staffName}. Email thông báo đã gửi.`,
  };
}
