// ==============================================================================
// Maison MIPA Memories - Photographer Portal ("Ca chụp của tôi")
// Dedicated workspace for Lead Photographers.
// Authority: Assigned bookings only. CHECKED_IN -> SHOOTING -> SHOOT_COMPLETED.
// ==============================================================================
import React from 'react';
import type { Booking, BookingStatus, User } from '../../types';
import { Camera, Clock, CheckSquare, Upload, FolderUp, MapPin, Sparkles } from 'lucide-react';

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
  // ABAC: Photographer sees ONLY assigned bookings
  const assignedShoots = bookings.filter(b => {
    if (!currentUser) return false;
    return b.assignments.some(
      a => (a.employeeId === currentUser.id || a.employeeName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase())) &&
           (a.assignmentRole === 'PHOTOGRAPHER' || a.assignmentRole === 'MANAGER' || a.assignmentRole === 'ADMIN')
    );
  });

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div className="mipa-card-gold" style={{ padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
            PHOTOGRAPHER WORKSPACE • CA CHỤP CỦA TÔI
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: '0.2rem 0' }}>
            {currentUser?.fullName || 'Nhiếp Ảnh Gia'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Nhiệm vụ: Chụp ảnh theo concept, bắt góc khoảnh khắc & tải file gốc lên Drive.
          </div>
        </div>

        <div style={{ textAlign: 'right', padding: '0.6rem 1.4rem', backgroundColor: '#FFFDF6', borderRadius: '12px', border: '1px solid #EFE6C9' }}>
          <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>CA ĐƯỢC PHÂN CÔNG</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#604634' }}>
            {assignedShoots.length} ca
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {assignedShoots.length === 0 ? (
          <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', color: '#8C6E53' }}>
            <Camera size={38} color="#C6A45F" style={{ margin: '0 auto 0.8rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hiện bạn chưa có ca chụp nào được phân công.</div>
            <div style={{ fontSize: '0.85rem', color: '#6E5F55', marginTop: '0.3rem' }}>
              Quản lý studio sẽ gán ca chụp dựa trên lịch đăng ký làm việc của bạn.
            </div>
          </div>
        ) : (
          assignedShoots.map((b) => {
            const canStartShoot = b.bookingStatus === 'CHECKED_IN';
            const canCompleteShoot = b.bookingStatus === 'SHOOTING';
            const isCompleted = ['SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus);

            return (
              <div key={b.id} className="mipa-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#604634', backgroundColor: '#EFE6C9', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                        {b.startTime} - {b.endTime}
                      </span>
                      <span style={{ fontWeight: 700, color: '#8C6E53' }}>{b.bookingCode}</span>
                      <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                        ● {b.bookingStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.3rem', color: '#604634', margin: '0.2rem 0' }}>
                      {b.serviceName} — {b.packageName}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                      Khách hàng: <strong>{b.customerName}</strong> • Phòng: <strong>{b.studioName}</strong> • Dịp: <strong>{b.occasion || 'Kỷ niệm'}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8C6E53', fontWeight: 600 }}>Ngày chụp:</div>
                    <div style={{ fontWeight: 700, color: '#604634' }}>{b.bookingDate}</div>
                  </div>
                </div>

                {/* Concept / Customer Notes */}
                <div style={{ padding: '0.8rem 1rem', backgroundColor: '#FFFDF6', borderRadius: '10px', border: '1px solid var(--mipa-beige)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>💬 <strong>Yêu cầu Concept / Phong cách:</strong> {b.customerNote || 'Tone màu tự nhiên, phong cách thanh lịch Pháp.'}</div>
                </div>

                {/* Workflow Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #EFE6C9', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    {/* Google Drive Upload Integration Button */}
                    <a
                      href={b.driveFolderUrl || 'https://drive.google.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-mipa-secondary"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                    >
                      <FolderUp size={15} /> Mở Thư Mục Upload Ảnh
                    </a>
                  </div>

                  <div>
                    {canStartShoot && (
                      <button
                        onClick={() => onUpdateStatus(b.id, 'SHOOTING', 'Bắt đầu chụp tại studio')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.9rem', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Camera size={16} /> BẮT ĐẦU BUỔI CHỤP
                      </button>
                    )}

                    {canCompleteShoot && (
                      <button
                        onClick={() => onUpdateStatus(b.id, 'SHOOT_COMPLETED', 'Đã chụp xong, chuyển giao hậu kỳ')}
                        className="btn-mipa-primary"
                        style={{ fontSize: '0.9rem', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckSquare size={16} /> HOÀN TẤT BUỔI CHỤP
                      </button>
                    )}

                    {isCompleted && (
                      <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        ✓ Buổi chụp đã hoàn tất
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
