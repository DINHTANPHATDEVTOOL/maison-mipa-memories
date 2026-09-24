// ==============================================================================
// Maison MIPA Memories - Staff Shift Registration Component
// Enables Photographers, Makeup artists, and staff to register shifts by Week & Month.
// Supports 2 daily shifts:
// - Ca Sáng: 08:00 - 13:00
// - Ca Chiều: 13:00 - 19:00
// Data is authoritative and visible to Admin / Managers for smart booking assignment.
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import type { User, StaffRole } from '../../types';
import {
  type ShiftType,
  type StaffShiftRegistrationRecord,
  getStaffRegisteredShifts,
  registerStaffShifts,
  getStaffEmailNotifications,
  type StaffEmailNotification,
} from '../../services/staffSchedulingService';
import {
  Calendar,
  Sun,
  Sunset,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Save,
  Mail,
  Check,
  RotateCcw,
} from 'lucide-react';

interface StaffShiftRegistrationProps {
  currentUser: User | null;
  targetRole?: StaffRole;
}

export const StaffShiftRegistration: React.FC<StaffShiftRegistrationProps> = ({
  currentUser,
  targetRole = 'PHOTOGRAPHER',
}) => {
  const staffId = currentUser?.id || 'emp_minh';
  const staffName = currentUser?.fullName || 'Chuyên Viên';

  // View Mode: 'WEEK' | 'MONTH'
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');

  // Base date for navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [_registeredShifts, setRegisteredShifts] = useState<StaffShiftRegistrationRecord[]>([]);
  const [emailAlerts, setEmailAlerts] = useState<StaffEmailNotification[]>([]);
  const [localSelections, setLocalSelections] = useState<Record<string, { MORNING: boolean; AFTERNOON: boolean }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing shifts for this staff
  const loadShifts = useCallback(async () => {
    try {
      const shifts = await getStaffRegisteredShifts({ employeeId: staffId });
      setRegisteredShifts(shifts);

      // Map to localSelections
      const mapping: Record<string, { MORNING: boolean; AFTERNOON: boolean }> = {};
      shifts.forEach((s) => {
        if (!mapping[s.shiftDate]) {
          mapping[s.shiftDate] = { MORNING: false, AFTERNOON: false };
        }
        if (s.shiftType === 'MORNING') mapping[s.shiftDate].MORNING = true;
        if (s.shiftType === 'AFTERNOON') mapping[s.shiftDate].AFTERNOON = true;
      });
      setLocalSelections(mapping);

      // Load email alerts
      const emails = getStaffEmailNotifications(staffId);
      setEmailAlerts(emails);
    } catch (err) {
      console.error('Failed to load registered shifts:', err);
    }
  }, [staffId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Helper to get days of the current week (Mon -> Sun)
  const getDaysOfWeek = (baseDate: Date) => {
    const curr = new Date(baseDate);
    const day = curr.getDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(curr.setDate(curr.getDate() + diffToMonday));

    const weekDays: { dateStr: string; dateObj: Date; dayName: string }[] = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      weekDays.push({
        dateStr,
        dateObj: d,
        dayName: dayNames[i],
      });
    }
    return weekDays;
  };

  // Helper to get all days of current month
  const getDaysOfMonth = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthDays: { dateStr: string; dateObj: Date; dayNumber: number; dayOfWeek: number }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      monthDays.push({
        dateStr,
        dateObj: d,
        dayNumber: i,
        dayOfWeek: d.getDay(),
      });
    }
    return monthDays;
  };

  const weekDays = getDaysOfWeek(currentDate);
  const monthDays = getDaysOfMonth(currentDate);

  // Toggle shift selection
  const toggleShift = (dateStr: string, shiftType: ShiftType) => {
    setLocalSelections((prev) => {
      const dayState = prev[dateStr] || { MORNING: false, AFTERNOON: false };
      return {
        ...prev,
        [dateStr]: {
          ...dayState,
          [shiftType]: !dayState[shiftType],
        },
      };
    });
  };

  // Bulk select for the week
  const selectAllShiftForWeek = (shiftType: ShiftType, value: boolean) => {
    setLocalSelections((prev) => {
      const updated = { ...prev };
      weekDays.forEach((w) => {
        const currentDay = updated[w.dateStr] || { MORNING: false, AFTERNOON: false };
        updated[w.dateStr] = {
          ...currentDay,
          [shiftType]: value,
        };
      });
      return updated;
    });
  };

  // Save changes
  const handleSaveShifts = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const shiftsToUpdate: { date: string; shiftType: ShiftType; selected: boolean }[] = [];

      Object.entries(localSelections).forEach(([dateStr, shifts]) => {
        shiftsToUpdate.push({ date: dateStr, shiftType: 'MORNING', selected: shifts.MORNING });
        shiftsToUpdate.push({ date: dateStr, shiftType: 'AFTERNOON', selected: shifts.AFTERNOON });
      });

      const updated = await registerStaffShifts(staffId, shiftsToUpdate, {
        employeeName: staffName,
        role: currentUser?.staffRole || targetRole,
      });
      setRegisteredShifts(updated);
      setSuccessMessage('✓ Đã lưu lịch làm việc thành công! Quản lý studio đã có thể điều phối lịch chụp cho bạn.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Không thể lưu lịch làm việc: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation handlers
  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === 'WEEK') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === 'WEEK') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  // Total registered count in current active view
  const activeDays = viewMode === 'WEEK' ? weekDays.map((w) => w.dateStr) : monthDays.map((m) => m.dateStr);
  let totalSelectedShifts = 0;
  activeDays.forEach((dateStr) => {
    if (localSelections[dateStr]?.MORNING) totalSelectedShifts++;
    if (localSelections[dateStr]?.AFTERNOON) totalSelectedShifts++;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        className="mipa-card-gold"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: '18px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.2rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
            {targetRole === 'PHOTOGRAPHER' ? 'NHIẾP ẢNH GIA' : targetRole === 'MAKEUP' ? 'CHUYÊN VIÊN TRANG ĐIỂM' : 'NHÂN SỰ STUDIO'} • ĐĂNG KÝ CA LÀM VIỆC
          </div>
          <h2 style={{ fontSize: '1.7rem', color: '#604634', margin: '0.2rem 0' }}>
            Đăng Ký Lịch Làm Việc ({staffName})
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Hệ thống 2 ca chuẩn studio: <strong>Ca Sáng (08:00 - 13:00)</strong> &amp; <strong>Ca Chiều (13:00 - 19:00)</strong>. Quản lý sẽ ưu tiên chọn bạn khi có lịch đặt vào ca đã đăng ký.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Total Shifts Badge */}
          <div style={{ textAlign: 'center', padding: '0.6rem 1.2rem', backgroundColor: '#FFFDF6', borderRadius: '12px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>TỔNG CA ĐÃ CHỌN</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#604634' }}>
              {totalSelectedShifts} ca
            </div>
          </div>

          <button
            onClick={handleSaveShifts}
            disabled={isSaving}
            className="btn-mipa-gold"
            style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu Lịch Đăng Ký'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          style={{
            padding: '0.9rem 1.2rem',
            backgroundColor: '#DCFCE7',
            border: '1px solid #22C55E',
            borderRadius: '12px',
            color: '#15803D',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* View Switcher & Navigation Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFDF6',
          border: '1px solid var(--mipa-beige)',
          borderRadius: '14px',
          padding: '0.8rem 1.2rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={prevPeriod}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid var(--mipa-beige)',
              backgroundColor: '#FAF8F5',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#604634',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#604634', minWidth: '180px', textAlign: 'center' }}>
            {viewMode === 'WEEK' ? (
              <>Tuần {weekDays[0].dateStr.split('-')[2]}/{weekDays[0].dateStr.split('-')[1]} — {weekDays[6].dateStr.split('-')[2]}/{weekDays[6].dateStr.split('-')[1]}/{weekDays[6].dateStr.split('-')[0]}</>
            ) : (
              <>Tháng {currentDate.getMonth() + 1} Năm {currentDate.getFullYear()}</>
            )}
          </span>

          <button
            onClick={nextPeriod}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid var(--mipa-beige)',
              backgroundColor: '#FAF8F5',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#604634',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={resetToToday}
            style={{
              padding: '0.35rem 0.7rem',
              border: '1px solid var(--mipa-beige)',
              backgroundColor: '#FFFDF6',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#8C6E53',
            }}
          >
            Hôm nay
          </button>
        </div>

        {/* View Mode Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setViewMode('WEEK')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: viewMode === 'WEEK' ? '#604634' : 'transparent',
              color: viewMode === 'WEEK' ? '#FFFDF6' : '#604634',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Clock size={14} /> Theo Tuần
          </button>
          <button
            onClick={() => setViewMode('MONTH')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: viewMode === 'MONTH' ? '#604634' : 'transparent',
              color: viewMode === 'MONTH' ? '#FFFDF6' : '#604634',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Calendar size={14} /> Theo Tháng
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'WEEK' && (
        <div>
          {/* Quick Select Tool */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600 }}>Thao tác nhanh tuần này:</span>
            <button
              onClick={() => selectAllShiftForWeek('MORNING', true)}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #FEF08A', backgroundColor: '#FEFCE8', color: '#854D0E', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              + Chọn tất cả Ca Sáng
            </button>
            <button
              onClick={() => selectAllShiftForWeek('AFTERNOON', true)}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #FED7AA', backgroundColor: '#FFF7ED', color: '#9A3412', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              + Chọn tất cả Ca Chiều
            </button>
            <button
              onClick={() => {
                selectAllShiftForWeek('MORNING', false);
                selectAllShiftForWeek('AFTERNOON', false);
              }}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#4B5563', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <RotateCcw size={12} /> Bỏ chọn tuần này
            </button>
          </div>

          {/* 7 Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {weekDays.map((day) => {
              const isToday = new Date().toISOString().split('T')[0] === day.dateStr;
              const hasMorning = !!localSelections[day.dateStr]?.MORNING;
              const hasAfternoon = !!localSelections[day.dateStr]?.AFTERNOON;

              return (
                <div
                  key={day.dateStr}
                  className="mipa-card"
                  style={{
                    borderRadius: '16px',
                    padding: '1rem',
                    backgroundColor: isToday ? '#FFFDF2' : '#FFFDF6',
                    border: isToday ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                  }}
                >
                  {/* Day Header */}
                  <div style={{ borderBottom: '1px solid rgba(140, 110, 83, 0.15)', paddingBottom: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isToday ? '#C6A45F' : '#8C6E53', textTransform: 'uppercase' }}>
                      {day.dayName} {isToday && '(HÔM NAY)'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#604634' }}>
                      {day.dateStr.split('-')[2]}/{day.dateStr.split('-')[1]}
                    </div>
                  </div>

                  {/* Ca Sáng Toggle */}
                  <div
                    onClick={() => toggleShift(day.dateStr, 'MORNING')}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: hasMorning ? '1.5px solid #EAB308' : '1px dashed #D1D5DB',
                      backgroundColor: hasMorning ? '#FEFCE8' : '#FAF8F5',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: hasMorning ? 'none' : '1.5px solid #9CA3AF',
                        backgroundColor: hasMorning ? '#EAB308' : '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                      }}
                    >
                      {hasMorning && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasMorning ? '#854D0E' : '#4B5563', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Sun size={13} color="#EAB308" /> Ca Sáng
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>08:00 - 13:00</div>
                    </div>
                  </div>

                  {/* Ca Chiều Toggle */}
                  <div
                    onClick={() => toggleShift(day.dateStr, 'AFTERNOON')}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: hasAfternoon ? '1.5px solid #F97316' : '1px dashed #D1D5DB',
                      backgroundColor: hasAfternoon ? '#FFF7ED' : '#FAF8F5',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: hasAfternoon ? 'none' : '1.5px solid #9CA3AF',
                        backgroundColor: hasAfternoon ? '#F97316' : '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                      }}
                    >
                      {hasAfternoon && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasAfternoon ? '#9A3412' : '#4B5563', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Sunset size={13} color="#F97316" /> Ca Chiều
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>13:00 - 19:00</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'MONTH' && (
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px', backgroundColor: '#FFFDF6', border: '1px solid var(--mipa-beige)', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 700, color: '#8C6E53', fontSize: '0.82rem' }}>
            <div>CN</div>
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {/* Empty slots for start of month */}
            {Array.from({ length: monthDays[0].dayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ minHeight: '80px', backgroundColor: 'transparent' }} />
            ))}

            {monthDays.map((m) => {
              const isToday = new Date().toISOString().split('T')[0] === m.dateStr;
              const hasM = !!localSelections[m.dateStr]?.MORNING;
              const hasA = !!localSelections[m.dateStr]?.AFTERNOON;

              return (
                <div
                  key={m.dateStr}
                  style={{
                    minHeight: '85px',
                    borderRadius: '10px',
                    border: isToday ? '2px solid #C6A45F' : '1px solid #EFE6C9',
                    backgroundColor: isToday ? '#FFFDF0' : '#FAF8F5',
                    padding: '0.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#604634' }}>{m.dayNumber}</span>
                    {isToday && <span style={{ fontSize: '0.62rem', color: '#C6A45F', fontWeight: 700 }}>Nay</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.3rem' }}>
                    <button
                      onClick={() => toggleShift(m.dateStr, 'MORNING')}
                      style={{
                        padding: '0.2rem 0.3rem',
                        borderRadius: '4px',
                        border: hasM ? '1px solid #EAB308' : '1px solid #E5E7EB',
                        backgroundColor: hasM ? '#FEFCE8' : '#FFF',
                        color: hasM ? '#854D0E' : '#9CA3AF',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {hasM ? '✓ Sáng (08h)' : '+ Sáng'}
                    </button>

                    <button
                      onClick={() => toggleShift(m.dateStr, 'AFTERNOON')}
                      style={{
                        padding: '0.2rem 0.3rem',
                        borderRadius: '4px',
                        border: hasA ? '1px solid #F97316' : '1px solid #E5E7EB',
                        backgroundColor: hasA ? '#FFF7ED' : '#FFF',
                        color: hasA ? '#9A3412' : '#9CA3AF',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {hasA ? '✓ Chiều (13h)' : '+ Chiều'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Email Notifications Received by Staff (Audit & Feed) */}
      <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '18px', backgroundColor: '#FFFDF6', border: '1px solid var(--mipa-beige)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', color: '#604634', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={16} color="#C6A45F" /> Thông Báo Email Phân Công Buổi Chụp ({emailAlerts.length})
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
              Khi quản lý studio chọn bạn cho lịch chụp, hệ thống sẽ tự động gửi email thông báo và cập nhật ca chụp.
            </span>
          </div>
        </div>

        {emailAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8C6E53', fontSize: '0.85rem' }}>
            Chưa có thông báo phân công ca chụp nào trong hộp thư.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {emailAlerts.map((em) => (
              <div
                key={em.id}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #EFE6C9',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.9rem' }}>
                    {em.subject}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#8C6E53', backgroundColor: '#FFF', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #E5DFD7' }}>
                    {new Date(em.sentAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6E5F55', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                  {em.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffShiftRegistration;
