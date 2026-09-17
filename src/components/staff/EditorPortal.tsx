// ==============================================================================
// Maison MIPA Memories - Editor Portal (Hậu kỳ của tôi)
// Dedicated workspace for Photo Retouchers & Post-Production Editors.
// Authority: Assigned bookings only. EDITING → READY_FOR_REVIEW.
// ==============================================================================
import React, { useState } from 'react';
import type { Booking, BookingStatus, User } from '../../types';
import { Palette, CheckSquare, FolderUp, CheckCircle, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/AsyncStates';
import { completeBookingEditing } from '../../services/photoWorkflowService';

interface EditorPortalProps {
  currentUser: User | null;
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const EditorPortal: React.FC<EditorPortalProps> = ({
  currentUser,
  bookings,
  onUpdateStatus,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  const assignedEdits = bookings.filter(b => {
    if (!currentUser) return false;
    return b.assignments.some(
      a => (a.employeeId === currentUser.id || a.employeeName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase())) &&
           (a.assignmentRole === 'EDITOR' || a.assignmentRole === 'MANAGER' || a.assignmentRole === 'ADMIN')
    );
  });

  const handleCompleteEditing = async (b: Booking) => {
    try {
      setLoadingId(b.id);
      setError('');
      await completeBookingEditing(b.id);
      onUpdateStatus(b.id, 'READY_FOR_REVIEW', 'Đã tải ảnh hoàn thiện lên Drive, sẵn sàng duyệt');
      setNotice(`✓ Bộ ảnh ${b.bookingCode} đã hoàn tất hậu kỳ, chờ quản lý duyệt.`);
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Không thể hoàn tất hậu kỳ. Vui lòng đảm bảo đã tải ảnh final lên Drive 03_FINAL.');
      setTimeout(() => setError(''), 7000);
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
            POST-PRODUCTION WORKSPACE · HẬU KỲ CỦA TÔI
          </div>
          <h2 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.5rem', color: 'var(--mipa-text)', margin: '0.2rem 0 0', fontWeight: 600 }}>
            {currentUser?.fullName || 'Chuyên Viên Hậu Kỳ'}
          </h2>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.84rem', color: 'var(--mipa-text-muted)', marginTop: '0.2rem' }}>
            Nhiệm vụ: Chỉnh màu tone film MIPA, retouch & upload ảnh chất lượng cao lên Drive 03_FINAL.
          </div>
        </div>
        <div style={{ padding: '0.65rem 1.2rem', background: 'var(--mipa-surface-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--mipa-border)', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', color: 'var(--mipa-text-muted)', fontWeight: 700 }}>DỰ ÁN HẬU KỲ</div>
          <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--mipa-text)' }}>{assignedEdits.length} bộ</div>
        </div>
      </div>

      {/* Feedback */}
      {notice && <div style={{ background: 'var(--mipa-success-soft)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-success)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={15} /> {notice}</div>}
      {error && <div style={{ background: 'var(--mipa-danger-soft)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: 'var(--mipa-danger)', fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={15} /> {error}</div>}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {assignedEdits.length === 0 ? (
          <EmptyState
            icon={<Palette size={22} />}
            title="Chưa có đơn hậu kỳ nào được phân công"
            message="Khi buổi chụp hoàn tất, quản lý studio sẽ chỉ định chuyên viên hậu kỳ cho từng bộ ảnh."
            height={260}
          />
        ) : (
          assignedEdits.map((b) => {
            const canFinishEdit = b.bookingStatus === 'EDITING';
            const isReadyOrDone = ['READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus);
            const hasRevision = !!b.revisionNotes;

            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--mipa-surface)',
                  border: `1px solid ${hasRevision ? 'rgba(239, 68, 68, 0.4)' : canFinishEdit ? 'rgba(168, 85, 247, 0.35)' : 'var(--mipa-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontWeight: 700, color: 'var(--mipa-gold)', background: 'rgba(198, 164, 95, 0.12)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>{b.bookingCode}</span>
                      <StatusBadge status={b.bookingStatus} size="sm" pulseDot={canFinishEdit} />
                      {hasRevision && <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', background: 'var(--mipa-danger-soft)', color: 'var(--mipa-danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>⚠ Cần chỉnh sửa lại</span>}
                    </div>
                    <h4 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.15rem', color: 'var(--mipa-text)', margin: '0 0 0.25rem' }}>
                      {b.serviceName} — {b.packageName}
                    </h4>
                    <div style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Khách: <strong style={{ color: 'var(--mipa-text-soft)' }}>{b.customerName}</strong></span>
                      <span>Ngày chụp: <strong style={{ color: 'var(--mipa-text-soft)' }}>{b.bookingDate}</strong></span>
                      {b.selectionSubmittedAt && (
                        <span>Đã chọn: <strong style={{ color: 'var(--mipa-gold)' }}>{b.selectedPhotoCount || b.selectionLimit || '?'} ảnh</strong></span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={b.bookingStatus} size="sm" />
                </div>

                {/* Revision note alert */}
                {hasRevision && (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--mipa-danger-soft)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem', fontFamily: 'var(--mipa-font-body)', fontSize: '0.83rem', color: 'var(--mipa-danger)' }}>
                    <strong>Yêu cầu chỉnh sửa từ Quản lý:</strong> {b.revisionNotes}
                  </div>
                )}

                {/* Tone note */}
                {b.customerNote && (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--mipa-surface-soft)', border: '1px solid var(--mipa-border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem', fontFamily: 'var(--mipa-font-body)', fontSize: '0.82rem', color: 'var(--mipa-text-muted)' }}>
                    <strong style={{ color: 'var(--mipa-text-soft)' }}>Tone màu & yêu cầu khách:</strong> {b.customerNote}
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
                    <FolderUp size={14} /> Mở Drive 03_FINAL
                  </a>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {canFinishEdit && (
                      <Button
                        variant="outline"
                        size="md"
                        icon={<CheckSquare size={16} />}
                        loading={loadingId === b.id}
                        onClick={() => handleCompleteEditing(b)}
                      >
                        Hoàn tất & sẵn sàng duyệt
                      </Button>
                    )}
                    {isReadyOrDone && (
                      <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.85rem', color: 'var(--mipa-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle size={15} /> Bộ ảnh đã sẵn sàng / đã giao
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
