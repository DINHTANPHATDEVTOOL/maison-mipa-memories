// ==============================================================================
// Maison MIPA Memories - Receptionist Portal (Lịch hôm nay)
// Dedicated workspace for Front Desk / Tiếp Tân.
// Authority: CHECK-IN only. Minimal operational PII.
// ==============================================================================
import React, { useState } from 'react';
import type { Booking, BookingStatus } from '../../types';
import { UserCheck, Clock, Phone, MapPin, CheckCircle } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/AsyncStates';
import { checkInBooking } from '../../services/photoWorkflowService';

interface ReceptionistPortalProps {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const ReceptionistPortal: React.FC<ReceptionistPortalProps> = ({
  bookings,
  onUpdateStatus,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const todaysBookings = bookings.filter(b =>
    b.bookingDate === today || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN'
  );

  const handleCheckIn = async (b: Booking) => {
    try {
      setLoadingId(b.id);
      setErrorMsg('');
      await checkInBooking(b.id);
      onUpdateStatus(b.id, 'CHECKED_IN', 'Khách đã có mặt tại sảnh tiếp tân');
      setSuccessMsg(`✓ ${b.customerName} đã check-in thành công.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể check-in khách hàng.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--mipa-surface)',
          border: '1px solid var(--mipa-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--mipa-gold)', fontWeight: 700 }}>
            RECEPTION DESK · LỄ TÂN STUDIO
          </div>
          <h2 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.5rem', color: 'var(--mipa-text)', margin: '0.2rem 0 0', fontWeight: 600 }}>
            Lịch Đón Khách Hôm Nay ({todaysBookings.length} ca)
          </h2>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.84rem', color: 'var(--mipa-text-muted)', marginTop: '0.2rem' }}>
            Nhiệm vụ: Xác nhận khách đến studio & bàn giao cho kíp chụp.
          </div>
        </div>

        <div
          style={{
            padding: '0.65rem 1.2rem',
            background: 'var(--mipa-surface-soft)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--mipa-border)',
            textAlign: 'right',
          }}
        >
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', color: 'var(--mipa-text-muted)', fontWeight: 700 }}>CHỜ CHECK-IN</div>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--mipa-warning)' }}>
            {todaysBookings.filter(b => b.bookingStatus === 'CONFIRMED').length}
          </div>
        </div>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div style={{ background: 'var(--mipa-success-soft)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-success)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: 'var(--mipa-danger-soft)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-danger)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Bookings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {todaysBookings.length === 0 ? (
          <EmptyState
            icon={<Clock size={22} />}
            title="Hôm nay chưa có lịch hẹn"
            message="Chưa có ca chụp nào cần tiếp đón hôm nay."
            height={240}
          />
        ) : (
          todaysBookings.map((b) => {
            const canCheckIn = b.bookingStatus === 'CONFIRMED';
            const isAlreadyIn = b.bookingStatus === 'CHECKED_IN' || b.bookingStatus === 'SHOOTING';

            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--mipa-surface)',
                  border: `1px solid ${canCheckIn ? 'rgba(245, 158, 11, 0.4)' : isAlreadyIn ? 'rgba(16, 185, 129, 0.4)' : 'var(--mipa-border)'}`,
                  borderLeft: `4px solid ${canCheckIn ? 'var(--mipa-warning)' : isAlreadyIn ? 'var(--mipa-success)' : 'var(--mipa-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--mipa-gold)', background: 'rgba(198, 164, 95, 0.12)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)' }}>
                      {b.startTime} — {b.endTime}
                    </span>
                    <span style={{ fontFamily: 'var(--mipa-font-body)', fontWeight: 700, color: 'var(--mipa-text-soft)', fontSize: '0.85rem' }}>{b.bookingCode}</span>
                    <StatusBadge status={b.bookingStatus} size="sm" pulseDot={canCheckIn} />
                  </div>

                  <div style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--mipa-text)' }}>
                    {b.customerName}
                  </div>
                  <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-text-muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} /> {b.customerPhone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {b.studioName}</span>
                    <span>Gói: <strong>{b.packageName}</strong></span>
                  </div>
                </div>

                <div>
                  {canCheckIn ? (
                    <Button
                      variant="gold"
                      size="md"
                      icon={<UserCheck size={16} />}
                      loading={loadingId === b.id}
                      onClick={() => handleCheckIn(b)}
                    >
                      Xác nhận check-in
                    </Button>
                  ) : isAlreadyIn ? (
                    <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.85rem', color: 'var(--mipa-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={15} /> Đã vào phòng chụp
                    </span>
                  ) : (
                    <StatusBadge status={b.bookingStatus} size="sm" />
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
