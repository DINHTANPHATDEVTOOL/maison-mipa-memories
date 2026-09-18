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

// In-memory persistent stores
let inMemoryRegisteredShifts: StaffShiftRegistrationRecord[] = [];
let inMemoryEmailNotifications: StaffEmailNotification[] = [];

// Initialize default shifts for demo and development
function initializeDefaultShifts() {
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
}

initializeDefaultShifts();

/**
 * Determines whether a given time falls into MORNING or AFTERNOON shift
 */
export function determineShiftFromTime(timeString: string): ShiftType {
  let hour = 9;
  if (timeString.includes('T')) {
    hour = new Date(timeString).getHours();
  } else if (timeString.includes(':')) {
    hour = parseInt(timeString.split(':')[0], 10);
  }
  return hour < 13 ? 'MORNING' : 'AFTERNOON';
}

/**
 * Fetch registered shifts, optionally filtered by employeeId and/or date range
 */
export async function getStaffRegisteredShifts(params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<StaffShiftRegistrationRecord[]> {
  initializeDefaultShifts();

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      let query = supabase.from('staff_shifts').select('*');
      if (params?.employeeId) query = query.eq('employee_id', params.employeeId);
      if (params?.startDate) query = query.gte('shift_date', params.startDate);
      if (params?.endDate) query = query.lte('shift_date', params.endDate);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((s: any) => {
          const emp = INITIAL_EMPLOYEES.find(e => e.id === s.employee_id);
          return {
            id: s.id,
            employeeId: s.employee_id,
            employeeName: emp?.name || 'Nhân viên',
            role: emp?.role || 'PHOTOGRAPHER',
            shiftDate: s.shift_date,
            shiftType: (s.shift_type || 'MORNING') as ShiftType,
            startAt: s.start_at,
            endAt: s.end_at,
            createdAt: s.created_at || new Date().toISOString(),
          };
        });
      }
    } catch (e) {
      console.warn('[StaffScheduling] getStaffRegisteredShifts DB fallback to memory:', e);
    }
  }

  let result = [...inMemoryRegisteredShifts];
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
 */
export async function registerStaffShifts(
  employeeId: string,
  shiftsToUpdate: { date: string; shiftType: ShiftType; selected: boolean }[]
): Promise<StaffShiftRegistrationRecord[]> {
  initializeDefaultShifts();

  const emp = INITIAL_EMPLOYEES.find(e => e.id === employeeId);
  const employeeName = emp?.name || 'Nhân sự MIPA';
  const role = emp?.role || 'PHOTOGRAPHER';

  for (const item of shiftsToUpdate) {
    const existingIndex = inMemoryRegisteredShifts.findIndex(
      s => s.employeeId === employeeId && s.shiftDate === item.date && s.shiftType === item.shiftType
    );

    if (item.selected) {
      if (existingIndex === -1) {
        const config = SHIFT_CONFIGS[item.shiftType];
        inMemoryRegisteredShifts.push({
          id: `shift-${employeeId}-${item.date}-${item.shiftType[0]}`,
          employeeId,
          employeeName,
          role,
          shiftDate: item.date,
          shiftType: item.shiftType,
          startAt: `${item.date}T${config.startHour}:00+07:00`,
          endAt: `${item.date}T${config.endHour}:00+07:00`,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      if (existingIndex !== -1) {
        inMemoryRegisteredShifts.splice(existingIndex, 1);
      }
    }
  }

  // Attempt Supabase sync if connected
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      for (const item of shiftsToUpdate) {
        if (item.selected) {
          const config = SHIFT_CONFIGS[item.shiftType];
          await supabase.from('staff_shifts').upsert({
            employee_id: employeeId,
            shift_date: item.date,
            shift_type: item.shiftType,
            start_at: `${item.date}T${config.startHour}:00+07:00`,
            end_at: `${item.date}T${config.endHour}:00+07:00`,
          });
        } else {
          await supabase
            .from('staff_shifts')
            .delete()
            .match({ employee_id: employeeId, shift_date: item.date, shift_type: item.shiftType });
        }
      }
    } catch (e) {
      console.warn('[StaffScheduling] registerStaffShifts DB sync fallback:', e);
    }
  }

  return inMemoryRegisteredShifts.filter(s => s.employeeId === employeeId);
}

/**
 * Returns available staff for a specific date and time slot,
 * highlighting staff who have registered for that shift.
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
  initializeDefaultShifts();
  const shiftType = determineShiftFromTime(params.time);
  const targetDate = params.date.split('T')[0];

  const candidateEmployees = params.role
    ? INITIAL_EMPLOYEES.filter(e => e.role === params.role)
    : INITIAL_EMPLOYEES;

  return candidateEmployees.map(emp => {
    const registered = inMemoryRegisteredShifts.some(
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
}): Promise<{
  assignment: BookingAssignment;
  emailNotification: StaffEmailNotification;
}> {
  const emp = INITIAL_EMPLOYEES.find(e => e.id === params.employeeId);
  const staffName = emp?.name || 'Nhân sự MIPA';
  const staffEmail = emp?.email || 'staff@maisonmipa.vn';
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
    if (emp) {
      return inMemoryEmailNotifications.filter(e => e.toEmail === emp.email);
    }
  }
  return [...inMemoryEmailNotifications];
}
