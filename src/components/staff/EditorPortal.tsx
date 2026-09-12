// ==============================================================================
// Maison MIPA Memories - Editor Portal ("Hậu kỳ của tôi")
// Dedicated workspace for Photo Retouchers & Post-Production Editors.
// Authority: Assigned bookings only. SHOOT_COMPLETED -> EDITING -> READY_FOR_REVIEW.
// Prepares integration for Google Drive customer delivery #8.
// ==============================================================================
import React from 'react';
import type { Booking, BookingStatus, User } from '../../types';
import { Palette, CheckCircle, Clock, FolderUp, CheckSquare, Sparkles } from 'lucide-react';

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
  // ABAC: Editor sees ONLY assigned editing bookings
  const assignedEdits = bookings.filter(b => {
    if (!currentUser) return false;
    return b.assignments.some(
      a => (a.employeeId === currentUser.id || a.employeeName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase())) &&
           (a.assignmentRole === 'EDITOR' || a.assignmentRole === 'MANAGER' || a.assignmentRole === 'ADMIN')
    );
  });

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div className="mipa-card-gold" style={{ padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
            POST-PRODUCTION WORKSPACE • HẬU KỲ CỦA TÔI
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: '0.2rem 0' }}>
            {currentUser?.fullName || 'Chuyên Viên Hậu Kỳ'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Nhiệm vụ: Chỉnh màu tone film Maison MIPA, retouch da & upload ảnh chất lượng cao lên Drive.
          </div>
        </div>

        <div style={{ textAlign: 'right', padding: '0.6rem 1.4rem', backgroundColor: '#FFFDF6', borderRadius: '12px', border: '1px solid #EFE6C9' }}>
          <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>DỰ ÁN HẬU KỲ</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#604634' }}>
            {assignedEdits.length} bộ
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {assignedEdits.length === 0 ? (
          <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', color: '#8C6E53' }}>
            <Palette size={38} color="#C6A45F" style={{ margin: '0 auto 0.8rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hiện bạn chưa có đơn hậu kỳ nào được phân công.</div>
            <div style={{ fontSize: '0.85rem', color: '#6E5F55', marginTop: '0.3rem' }}>
              Khi buổi chụp hoàn tất, quản lý studio sẽ chỉ định chuyên viên hậu kỳ cho từng bộ ảnh.
            </div>
          </div>
        ) : (
          assignedEdits.map((b) => {
            const canStartEdit = b.bookingStatus === 'SHOOT_COMPLETED';
            const canFinishEdit = b.bookingStatus === 'EDITING';
            const isReadyOrDelivered = ['READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus);

            return (
              <div key={b.id} className="mipa-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, color: '#8C6E53', backgroundColor: '#EFE6C9', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {b.bookingCode}
                      </span>
                      <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                        ● {b.bookingStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.3rem', color: '#604634', margin: '0.2rem 0' }}>
                      {b.serviceName} — {b.packageName}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                      Khách hàng: <strong>{b.customerName}</strong> • Ngày chụp: <strong>{b.bookingDate}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8C6E53', fontWeight: 600 }}>Trạng thái:</div>
                    <div style={{ fontWeight: 700, color: '#604634' }}>{b.bookingStatus}</div>
                  </div>
                </div>

                {/* Edit Tone Instructions */}
                <div style={{ padding: '0.8rem 1rem', backgroundColor: '#FFFDF6', borderRadius: '10px', border: '1px solid var(--mipa-beige)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>🎨 <strong>Tone màu & Yêu cầu chỉnh sửa:</strong> {b.customerNote || 'Tone màu cổ điển Pháp, giữ khối da tự nhiên.'}</div>
                </div>

                {/* Workflow Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #EFE6C9', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {/* Google Drive Upload Integration - Authoritative without arbitrary fallback */}
                    {b.delivery?.driveFolderUrl && ['READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'REVOKED'].includes(b.delivery?.status) ? (
                      <a
                        href={b.delivery.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-mipa-secondary"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                      >
                        <FolderUp size={15} /> Mở Thư Mục Google Drive Upload Ảnh
                      </a>
                    ) : ['SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW'].includes(b.bookingStatus) ? (
                      <span style={{ fontSize: '0.82rem', color: '#8C6E53', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        ⏳ Đang chuẩn bị thư mục Drive...
                      </span>
                    ) : null}
                  </div>

                  <div>
                    {canStartEdit && (
                      <button
                        onClick={() => onUpdateStatus(b.id, 'EDITING', 'Bắt đầu quy trình chỉnh màu & retouch')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.9rem', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Palette size={16} /> BẮT ĐẦU HẬU KỲ
                      </button>
                    )}

                    {canFinishEdit && (
                      <button
                        onClick={() => onUpdateStatus(b.id, 'READY_FOR_REVIEW', 'Đã tải ảnh hoàn thiện lên Drive, sẵn sàng duyệt')}
                        className="btn-mipa-primary"
                        style={{ fontSize: '0.9rem', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckSquare size={16} /> HOÀN TẤT & SẴN SÀNG DUYỆT
                      </button>
                    )}

                    {isReadyOrDelivered && (
                      <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        ✓ Bộ ảnh đã sẵn sàng hoặc đã giao cho khách
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
