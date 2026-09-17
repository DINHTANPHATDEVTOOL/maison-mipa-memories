// ==============================================================================
// Maison MIPA Memories - Photographer Portal (Ca chụp của tôi)
// Dedicated workspace for Lead Photographers.
// Authority: Assigned bookings only. CHECKED_IN → SHOOTING → SHOOT_COMPLETED.
// ==============================================================================
import React, { useState } from 'react';
import type { Booking, BookingStatus, User } from '../../types';
import { Camera, CheckSquare, FolderUp, CheckCircle, MapPin } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/AsyncStates';
import { startBookingShoot, completeBookingShoot } from '../../services/photoWorkflowService';

interface PhotographerPortalProps {
  currentUser: User | null;
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const PhotographerPortal: React.FC<PhotographerPortalProps> = ({
  currentUser,
  bookings,
  onUpdateStatus,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  const assignedShoots = bookings.filter(b => {
    if (!currentUser) return false;
    return b.assignments.some(
      a => (a.employeeId === currentUser.id || a.employeeName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase())) &&
           (a.assignmentRole === 'PHOTOGRAPHER' || a.assignmentRole === 'MANAGER' || a.assignmentRole === 'ADMIN')
    );
  });

  const handleAction = async (b: Booking, action: 'start' | 'complete') => {
    try {
      setLoadingId(`${b.id}-${action}`);
      setError('');
      if (action === 'start') {
        await startBookingShoot(b.id);
        onUpdateStatus(b.id, 'SHOOTING', 'Bắt đầu chụp tại studio');
        setNotice(`✓ Đã bắt đầu ca chụp ${b.bookingCode}.`);
      } else {
        await completeBookingShoot(b.id);
        onUpdateStatus(b.id, 'SHOOT_COMPLETED', 'Đã chụp xong, chuyển giao hậu kỳ');
        setNotice(`✓ Hoàn tất ca chụp ${b.bookingCode}. Vui lòng tải ảnh lên Drive 01_RAW.`);
      }
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Thao tác thất bại.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
            PHOTOGRAPHER WORKSPACE · CA CHỤP CỦA TÔI
          </div>
          <h2 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.5rem', color: 'var(--mipa-text)', margin: '0.2rem 0 0', fontWeight: 600 }}>
            {currentUser?.fullName || 'Nhiếp Ảnh Gia'}
          </h2>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.84rem', color: 'var(--mipa-text-muted)', marginTop: '0.2rem' }}>
            Nhiệm vụ: Chụp ảnh theo concept & tải file gốc lên Drive 01_RAW.
          </div>
        </div>
        <div style={{ padding: '0.65rem 1.2rem', background: 'var(--mipa-surface-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--mipa-border)', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', color: 'var(--mipa-text-muted)', fontWeight: 700 }}>CA PHÂN CÔNG</div>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--mipa-text)' }}>{assignedShoots.length} ca</div>
        </div>
      </div>

      {/* Feedback */}
      {notice && <div style={{ background: 'var(--mipa-success-soft)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-success)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={15} /> {notice}</div>}
      {error && <div style={{ background: 'var(--mipa-danger-soft)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-danger)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>{error}</div>}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {assignedShoots.length === 0 ? (
          <EmptyState
            icon={<Camera size={22} />}
            title="Chưa có ca chụp nào được phân công"
            message="Quản lý studio sẽ gán ca chụp dựa trên lịch đăng ký làm việc của bạn."
            height={260}
          />
        ) : (
          assignedShoots.map((b) => {
            const canStart = b.bookingStatus === 'CHECKED_IN';
            const canComplete = b.bookingStatus === 'SHOOTING';
            const isDone = ['SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus);

            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--mipa-surface)',
                  border: `1px solid ${canStart ? 'rgba(245, 158, 11, 0.4)' : canComplete ? 'rgba(239, 68, 68, 0.35)' : 'var(--mipa-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--mipa-gold)', background: 'rgba(198, 164, 95, 0.12)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)' }}>
                        {b.startTime} — {b.endTime}
                      </span>
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontWeight: 700, color: 'var(--mipa-text-soft)', fontSize: '0.85rem' }}>{b.bookingCode}</span>
                      <StatusBadge status={b.bookingStatus} size="sm" pulseDot={canComplete} />
                    </div>
                    <h4 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.15rem', color: 'var(--mipa-text)', margin: '0 0 0.25rem' }}>
                      {b.serviceName} — {b.packageName}
                    </h4>
                    <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Khách: <strong style={{ color: 'var(--mipa-text-soft)' }}>{b.customerName}</strong></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {b.studioName}</span>
                      {b.occasion && <span>Dịp: <strong style={{ color: 'var(--mipa-text-soft)' }}>{b.occasion}</strong></span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.75rem', color: 'var(--mipa-text-muted)' }}>Ngày chụp</div>
                    <div style={{ fontFamily: 'var(--mipa-font-body)', fontWeight: 700, color: 'var(--mipa-text-soft)', fontSize: '0.9rem' }}>{b.bookingDate}</div>
                  </div>
                </div>

                {/* Concept note */}
                {b.customerNote && (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--mipa-surface-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--mipa-border-subtle)', marginBottom: '0.85rem', fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-text-muted)' }}>
                    <strong style={{ color: 'var(--mipa-text-soft)' }}>Yêu cầu concept:</strong> {b.customerNote}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--mipa-border-subtle)', paddingTop: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <a
                    href={b.driveFolderUrl || 'https://drive.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', border: '1px solid var(--mipa-border)', borderRadius: 'var(--radius-full)', padding: '0.4rem 0.85rem', transition: 'all var(--transition-fast)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--mipa-gold-glow)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <FolderUp size={14} /> Mở thư mục Drive
                  </a>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {canStart && (
                      <Button
                        variant="gold"
                        size="md"
                        icon={<Camera size={16} />}
                        loading={loadingId === `${b.id}-start`}
                        onClick={() => handleAction(b, 'start')}
                      >
                        Bắt đầu buổi chụp
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        variant="outline"
                        size="md"
                        icon={<CheckSquare size={16} />}
                        loading={loadingId === `${b.id}-complete`}
                        onClick={() => handleAction(b, 'complete')}
                      >
                        Hoàn tất buổi chụp
                      </Button>
                    )}
                    {isDone && (
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.85rem', color: 'var(--mipa-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle size={15} /> Buổi chụp đã hoàn tất
                      </span>
                    )}
                    {b.bookingStatus === 'SHOOT_COMPLETED' && !isDone && (
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-gold)', fontWeight: 600 }}>
                        ✓ Chờ upload & đồng bộ proofs
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
