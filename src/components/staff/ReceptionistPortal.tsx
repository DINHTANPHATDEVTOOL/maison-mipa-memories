// ==============================================================================
// Maison MIPA Memories - Receptionist Portal ("Lịch hôm nay")
// Dedicated workspace for Front Desk / Tiếp Tân.
// Authority: CHECK-IN only. Minimal operational PII.
// ==============================================================================
import React from 'react';
import type { Booking, BookingStatus } from '../../types';
import { UserCheck, Clock, Phone, MapPin, CheckCircle, Search } from 'lucide-react';

interface ReceptionistPortalProps {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const ReceptionistPortal: React.FC<ReceptionistPortalProps> = ({
  bookings,
  onUpdateStatus,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Receptionist focuses on today's scheduled arrivals and active sessions
  const todaysBookings = bookings.filter(b => b.bookingDate === today || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN');

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div className="mipa-card-gold" style={{ padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
            RECEPTION DESK • LỄ TÂN STUDIO
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: '0.2rem 0' }}>
            Lịch Đón Khách Hôm Nay ({todaysBookings.length} ca)
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Nhiệm vụ: Xác nhận khách đến studio & bàn giao cho kíp chụp.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'right', padding: '0.6rem 1.2rem', backgroundColor: '#FFFDF6', borderRadius: '12px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>CHỜ CHECK-IN</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>
              {todaysBookings.filter(b => b.bookingStatus === 'CONFIRMED').length}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {todaysBookings.length === 0 ? (
          <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', color: '#8C6E53' }}>
            Hôm nay chưa có lịch hẹn nào cần tiếp đón.
          </div>
        ) : (
          todaysBookings.map((b) => {
            const canCheckIn = b.bookingStatus === 'CONFIRMED';
            const isAlreadyCheckedIn = b.bookingStatus === 'CHECKED_IN' || b.bookingStatus === 'SHOOTING';

            return (
              <div
                key={b.id}
                className="mipa-card"
                style={{
                  padding: '1.2rem 1.6rem',
                  borderRadius: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderLeft: canCheckIn ? '5px solid #D97706' : isAlreadyCheckedIn ? '5px solid #16A34A' : '1px solid var(--mipa-beige)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#604634', backgroundColor: '#EFE6C9', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      {b.startTime} - {b.endTime}
                    </span>
                    <span style={{ fontWeight: 700, color: '#8C6E53' }}>{b.bookingCode}</span>
                    <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                      ● {b.bookingStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#604634' }}>
                    Khách: {b.customerName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6E5F55', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={13} /> {b.customerPhone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {b.studioName}</span>
                    <span>Gói: <strong>{b.packageName}</strong></span>
                  </div>
                </div>

                <div>
                  {canCheckIn ? (
                    <button
                      onClick={() => onUpdateStatus(b.id, 'CHECKED_IN', 'Khách đã có mặt tại sảnh tiếp tân')}
                      className="btn-mipa-gold"
                      style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <UserCheck size={16} /> XÁC NHẬN CHECK-IN
                    </button>
                  ) : isAlreadyCheckedIn ? (
                    <span style={{ fontSize: '0.85rem', color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={16} /> Đã vào phòng chụp
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#8C6E53' }}>
                      Trạng thái: {b.bookingStatus}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
