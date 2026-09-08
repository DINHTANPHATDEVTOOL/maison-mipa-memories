import React, { useState } from 'react';
import type { Booking, BookingStatus, Employee, StudioRoom } from '../../types';
import { getOperationsInboxStats, getNextActionForBooking } from '../../utils/bookingStateMachine';
import { Calendar, DollarSign, Users, Clock, Filter, Plus, UserPlus, CheckCircle, Search, Edit3, ArrowRight, AlertTriangle, CheckSquare, Layers, ShieldCheck, Activity } from 'lucide-react';

interface ManagerDashboardProps {
  bookings: Booking[];
  employees: Employee[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus) => void;
  onAssignStaff: (bookingId: string, employeeId: string, role: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  bookings,
  employees,
  studios,
  onOpenBooking,
  onUpdateStatus,
  onAssignStaff,
  onNavigateTab,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [activeBookingTimeline, setActiveBookingTimeline] = useState<Booking | null>(bookings[0] || null);

  // Computed Operations Inbox stats
  const inboxStats = getOperationsInboxStats(bookings);

  // KPI calculations
  const totalBookingsCount = bookings.length;
  const totalRevenue = bookings.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalDeposit = bookings.reduce((acc, b) => acc + b.depositAmount, 0);
  const activeStaffCount = employees.filter((e) => e.status === 'ACTIVE').length;

  const filteredBookings = selectedStatusFilter === 'ALL'
    ? bookings
    : bookings.filter((b) => b.bookingStatus === selectedStatusFilter);

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      
      {/* Top Banner & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA STUDIO MANAGEMENT SYSTEM
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>
            Tổng Quan Vận Hành Studio (Management OS)
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Single Source of Truth • Realtime WebSocket Connected • RBAC & ABAC Engine Active
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => onNavigateTab('studio_calendar')} className="btn-mipa-secondary" style={{ fontSize: '0.85rem' }}>
            <Calendar size={15} /> Xem Lịch Studio (Calendar)
          </button>
          <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Tạo Booking Trực Tiếp
          </button>
        </div>
      </div>

      {/* OPERATIONS INBOX BANNER - Actionable Workstation */}
      <div style={{
        backgroundColor: '#FFFBEB',
        border: '1.5px solid #F59E0B',
        borderRadius: '20px',
        padding: '1.2rem 1.6rem',
        marginBottom: '1.8rem',
        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400E', fontWeight: 700, fontSize: '1.05rem' }}>
            <AlertTriangle size={20} color="#D97706" />
            <span>OPERATIONS INBOX — {inboxStats.totalActionRequired} VIỆC CẦN XỦ LÝ NGAY:</span>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 700 }}>
            ⚡ Tự động phân luồng theo Booking State Machine
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <button
            onClick={() => setSelectedStatusFilter('DEPOSIT_PAID')}
            style={{
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CHỜ XÁC NHẬN CỌC</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.pendingConfirmationCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('CONFIRMED')}
            style={{
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CHƯA GÁN KÍP CHỤP</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.unassignedStaffCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('SHOOTING')}
            style={{
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>ĐANG CHỤP TẠI STUDIO</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.shootingNowCount} phòng</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('READY_FOR_REVIEW')}
            style={{
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CẦN GỬI ALBUM CHO KHÁCH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.readyToDeliverCount} bộ ảnh</div>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="mipa-kpi-grid" style={{ display: 'grid', gap: '1.2rem', marginBottom: '2rem' }}>
        <div className="mipa-card-gold" style={{ padding: '1.4rem', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 700 }}>
            TỔNG BOOKING HÔM NAY
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#604634', margin: '0.2rem 0' }}>
            {totalBookingsCount} <span style={{ fontSize: '0.9rem', color: '#8C6E53', fontWeight: 400 }}>đơn</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#047857' }}>
            ✓ Single Source of Truth Table
          </div>
        </div>

        <div className="mipa-card" style={{ padding: '1.4rem', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 700 }}>
            DOANH THU DỰ KIẾN
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8C6E53', margin: '0.2rem 0' }}>
            {totalRevenue.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6E5F55' }}>
            Đã thu cọc: <strong>{totalDeposit.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>

        <div className="mipa-card" style={{ padding: '1.4rem', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 700 }}>
            TIỀN CỌC ĐÃ XÁC NHẬN
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#047857', margin: '0.2rem 0' }}>
            {totalDeposit.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '0.78rem', color: '#047857' }}>
            ✓ 100% Qua VietQR / Chuyển khoản
          </div>
        </div>

        <div className="mipa-card" style={{ padding: '1.4rem', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 700 }}>
            NHÂN VIÊN CA HÔM NAY
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#604634', margin: '0.2rem 0' }}>
            {activeStaffCount} <span style={{ fontSize: '0.9rem', color: '#8C6E53', fontWeight: 400 }}>nhân sự</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6E5F55' }}>
            2 Photographers • 1 Makeup • 1 Editor
          </div>
        </div>
      </div>

      {/* Main Section: Schedule & Booking Control Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Bookings Table / List */}
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: 0 }}>
              Danh Sách Đơn Đặt Lịch (Single Source of Truth)
            </h3>

            {/* Status Filter Pill */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['ALL', 'DEPOSIT_PAID', 'CONFIRMED', 'SHOOTING', 'READY_FOR_REVIEW', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  style={{
                    border: 'none',
                    background: selectedStatusFilter === st ? '#8C6E53' : '#FFFDF6',
                    color: selectedStatusFilter === st ? '#FFFDF6' : '#604634',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {st === 'ALL' ? 'Tất cả' : st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredBookings.map((b) => {
              const nextAction = getNextActionForBooking(b, 'MANAGER');
              const isSelectedForTimeline = activeBookingTimeline?.id === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => setActiveBookingTimeline(b)}
                  style={{
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: isSelectedForTimeline ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                    backgroundColor: isSelectedForTimeline ? '#FFFDF6' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ color: '#8C6E53', fontSize: '0.9rem' }}>{b.bookingCode}</strong>
                      <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                        ● {b.bookingStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                      🗓️ <strong>{b.bookingDate}</strong> lúc <strong>{b.startTime}</strong> ({b.studioName})
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', color: '#604634', margin: 0 }}>{b.packageName} ({b.serviceName})</h4>
                      <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                        Khách: <strong>{b.customerName}</strong> • SĐT: <strong>{b.customerPhone}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8C6E53' }}>
                        {b.totalAmount.toLocaleString('vi-VN')}đ
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                        Cọc: {b.depositAmount.toLocaleString('vi-VN')}đ (Đã nhận)
                      </div>
                    </div>
                  </div>

                  {/* Assigned Staff Pills & Next Action button */}
                  <div style={{ padding: '0.66rem 0.8rem', backgroundColor: '#FFFDF6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', border: '1px solid var(--mipa-beige)' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <span>📷 Photog: <strong>{b.assignments.find((a) => a.assignmentRole === 'PHOTOGRAPHER')?.employeeName || 'Chưa gán'}</strong></span>
                      <span>💄 Makeup: <strong>{b.assignments.find((a) => a.assignmentRole === 'MAKEUP')?.employeeName || 'Chưa gán'}</strong></span>
                    </div>

                    {nextAction && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(b.id, nextAction.targetStatus);
                        }}
                        className={nextAction.buttonClass}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      >
                        {nextAction.label}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Activity Timeline for Selected Booking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {activeBookingTimeline && (
            <div className="mipa-card-gold" style={{ padding: '1.4rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#604634', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} color="#8C6E53" /> Activity Timeline
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53' }}>{activeBookingTimeline.bookingCode}</span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginBottom: '1rem', borderBottom: '1px dashed #C6A45F', paddingBottom: '0.6rem' }}>
                Khách: <strong>{activeBookingTimeline.customerName}</strong> ({activeBookingTimeline.customerPhone})
              </div>

              {/* Activity Events Track */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#047857', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#047857' }}>BOOKING_CONFIRMED</div>
                    <div style={{ color: '#6E5F55' }}>Manager Phát đã xác nhận cọc 30% ({activeBookingTimeline.depositAmount.toLocaleString('vi-VN')}đ)</div>
                    <div style={{ fontSize: '0.68rem', color: '#A39385' }}>11 Aug 13:00</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C6A45F', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#604634' }}>STAFF_ASSIGNED</div>
                    <div style={{ color: '#6E5F55' }}>Gán Photographer Hoàng Minh & Makeup Lan</div>
                    <div style={{ fontSize: '0.68rem', color: '#A39385' }}>11 Aug 13:10</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8C6E53', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#604634' }}>REALTIME_WEBSOCKET_PUSHED</div>
                    <div style={{ color: '#6E5F55' }}>Tự động gửi thông báo lịch chụp cho Photographer Hoàng Minh</div>
                    <div style={{ fontSize: '0.68rem', color: '#A39385' }}>11 Aug 13:10</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Quick Staff Shift Availability */}
          <div className="mipa-card" style={{ padding: '1.4rem', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#604634', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#8C6E53" /> Nhân Sự Đang Trong Ca
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
              {employees.map((emp) => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <img src={emp.avatar} alt={emp.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#2C221E' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6E5F55' }}>{emp.role}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>● Đang làm việc</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
