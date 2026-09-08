import React, { useState } from 'react';
import type { Booking, BookingStatus } from '../../types';
import { getNextActionForBooking } from '../../utils/bookingStateMachine';
import { Camera, Clock, UserCheck, Play, CheckCircle, Upload, AlertCircle, FileText, Lock, ArrowRight, CheckSquare } from 'lucide-react';

interface StaffPortalProps {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ bookings, onUpdateStatus }) => {
  const [driveUrlInput, setDriveUrlInput] = useState<{ [bookingId: string]: string }>({});

  const handleDriveUrlChange = (id: string, url: string) => {
    setDriveUrlInput({ ...driveUrlInput, [id]: url });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      
      {/* Staff Header */}
      <div className="mipa-card-gold" style={{ padding: '1.8rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80"
            alt="Photographer Hoàng Minh"
            style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C6A45F' }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              STAFF PORTAL • WORKSPACE DÀNH RIÊNG CHO KÍP CHỤP
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: 0 }}>Hoàng Minh (Lead Photographer)</h2>
            <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginTop: '0.2rem' }}>
              Ca làm việc hôm nay: <strong>09:00 - 18:00</strong> • Studio: <strong>Maison Room 01 & Outdoor Garden</strong>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 700 }}>TASKS CỦA TÔI</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#604634' }}>
            {bookings.length} Buổi chụp
          </div>
        </div>
      </div>

      {/* Security & Data Scope Notice */}
      <div style={{
        padding: '0.85rem 1.2rem',
        backgroundColor: '#EFF6FF',
        border: '1px solid #93C5FD',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.82rem',
        color: '#1E40AF',
      }}>
        <Lock size={18} />
        <span>
          <strong>ABAC Access Scope:</strong> Bạn đang làm việc trực tiếp trên <strong>Single Source of Truth</strong>. Bạn chỉ thấy thông tin kỹ thuật, concept & nút hành động <strong>"Next Action"</strong> liên quan trực tiếp ca chụp của mình.
        </span>
      </div>

      <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '1rem' }}>MY WORK — DANH SÁCH CA CHỤP & TASK HẬU KỲ HÔM NAY</h3>

      {/* Staff Session Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {bookings.map((booking) => {
          const nextAction = getNextActionForBooking(booking, 'STAFF');

          return (
            <div key={booking.id} className="mipa-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', backgroundColor: '#EFE6C9', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                      {booking.bookingCode}
                    </span>
                    <span className={`badge-status badge-${booking.bookingStatus.toLowerCase()}`}>
                      ● {booking.bookingStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.3rem', color: '#604634', marginTop: '0.4rem', marginBottom: '0.2rem' }}>
                    {booking.serviceName} — {booking.packageName}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                    Khách hàng: <strong>{booking.customerName}</strong> ({booking.customerPhone}) • Dịp chụp: <strong>{booking.occasion || 'Kỷ niệm'}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#8C6E53', fontSize: '1.1rem' }}>
                    ⏰ {booking.startTime} - {booking.endTime}
                  </div>
                  <div style={{ color: '#604634', fontWeight: 600 }}>
                    📍 {booking.studioName}
                  </div>
                </div>
              </div>

              {/* Special Instructions & Addons */}
              <div style={{ padding: '0.8rem 1rem', backgroundColor: '#FFFDF6', borderRadius: '10px', border: '1px solid var(--mipa-beige)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div>💬 <strong>Yêu cầu Concept / Ghi chú từ khách:</strong> {booking.customerNote || 'Chỉnh sáng tự nhiên & rèm lụa.'}</div>
                <div style={{ marginTop: '0.3rem', color: '#8C6E53' }}>
                  ✨ <strong>Dịch vụ kèm theo:</strong> {booking.addons.length > 0 ? booking.addons.map((a) => a.name).join(', ') : 'Gói gốc'}
                </div>
              </div>

              {/* Workflow Next Action Control */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #EFE6C9', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#6E5F55' }}>
                  Trạng thái quy trình: <strong>{booking.bookingStatus}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {nextAction ? (
                    <button
                      onClick={() => onUpdateStatus(booking.id, nextAction.targetStatus)}
                      className={nextAction.buttonClass}
                      style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
                    >
                      {nextAction.label}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckSquare size={16} /> Ca chụp đã hoàn tất đúng tiến độ!
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
