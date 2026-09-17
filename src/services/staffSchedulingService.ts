// ==============================================================================
// Maison MIPA Memories - Staff Scheduling & Workforce Management Service
// Authoritative Staff Availability, Skills, Working Hours, Leave & Assignment Engine
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
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
      console.warn('[StaffScheduling] Failed to fetch skills, using fallback:', error.message);
      return DEFAULT_SKILLS;
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
      console.warn('[StaffScheduling] Failed to fetch working hours:', error.message);
      return [];
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

  // Fallback: standard 09:00 - 18:00, day off on Monday
  return Array.from({ length: 7 }, (_, i) => ({
    id: `hours-${employeeId}-${i}`,
    employeeId,
    dayOfWeek: i,
    startTime: '09:00',
    endTime: '18:00',
    isDayOff: i === 1, // Monday off by default for studio
    timezone: 'Asia/Ho_Chi_Minh',
  }));
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
        employees:employee_id (name)
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[StaffScheduling] Failed to fetch leave requests:', error.message);
      return inMemoryLeaveRequests;
    }

    return (data || []).map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: (r.employees as any)?.name || 'Nhân viên MIPA',
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
      throw new Error(error.message);
    }

    const res = data as any;
    if (res && res.success === false) {
      throw new Error(res.error || 'Phân công nhân viên thất bại do trùng lịch hoặc nhân viên không khả dụng.');
    }

    // Fetch the inserted assignment details
    const assignment = res.assignment;
    return {
      id: assignment.id,
      bookingId: assignment.booking_id,
      employeeId: assignment.employee_id,
      employeeName: assignment.employee_name || 'Chuyên viên MIPA',
      assignmentRole: assignment.assignment_role as StaffRole,
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
  // Query all active employees of matching role
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
