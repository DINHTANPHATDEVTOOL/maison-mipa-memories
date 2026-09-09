// ==============================================================================
// Maison MIPA Memories - Makeup & Styling Portal ("Lịch / Makeup Tasks")
// Dedicated workspace for Makeup Artists & Stylists.
// Authority: Assigned tasks only. Manages task workflow (TODO -> IN_PROGRESS -> DONE).
// ==============================================================================
import React, { useState, useEffect } from 'react';
import type { Booking, User } from '../../types';
import { Sparkles, CheckCircle2, Clock, Check, Calendar, AlertCircle } from 'lucide-react';
import { getStaffTasks, updateStaffTask } from '../../services/bookingService';

interface MakeupPortalProps {
  currentUser: User | null;
  bookings: Booking[];
}

export const MakeupPortal: React.FC<MakeupPortalProps> = ({
  currentUser,
  bookings,
}) => {
  // Assigned sessions for makeup
  const assignedShoots = bookings.filter(b => {
    if (!currentUser) return false;
    return b.assignments.some(
      a => (a.employeeId === currentUser.id || a.employeeName.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase())) &&
           (a.assignmentRole === 'MAKEUP' || a.assignmentRole === 'MANAGER' || a.assignmentRole === 'ADMIN')
    );
  });

  const [tasks, setTasks] = useState<{ [bookingId: string]: 'TODO' | 'IN_PROGRESS' | 'DONE' }>({});

  const handleToggleTask = (bookingId: string) => {
    setTasks(prev => {
      const current = prev[bookingId] || 'TODO';
      let next: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'IN_PROGRESS';
      if (current === 'IN_PROGRESS') next = 'DONE';
      else if (current === 'DONE') next = 'TODO';
      return { ...prev, [bookingId]: next };
    });
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div className="mipa-card-gold" style={{ padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
            MAKEUP & STYLING • CHUYÊN VIÊN TRANG ĐIỂM
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: '0.2rem 0' }}>
            {currentUser?.fullName || 'Chuyên Viên Trang Điểm'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Nhiệm vụ: Make-up, làm tóc và chuẩn bị trang phục theo concept cho khách hàng.
          </div>
        </div>

        <div style={{ textAlign: 'right', padding: '0.6rem 1.4rem', backgroundColor: '#FFFDF6', borderRadius: '12px', border: '1px solid #EFE6C9' }}>
          <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>CA MAKEUP ĐƯỢC GÁN</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#604634' }}>
            {assignedShoots.length} ca
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {assignedShoots.length === 0 ? (
          <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', color: '#8C6E53' }}>
            <Sparkles size={38} color="#C6A45F" style={{ margin: '0 auto 0.8rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hiện bạn chưa có ca makeup nào được phân công.</div>
            <div style={{ fontSize: '0.85rem', color: '#6E5F55', marginTop: '0.3rem' }}>
              Quản lý studio sẽ gán ca makeup tương ứng với gói chụp có dịch vụ makeup.
            </div>
          </div>
        ) : (
          assignedShoots.map((b) => {
            const taskStatus = tasks[b.id] || 'TODO';

            return (
              <div key={b.id} className="mipa-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#604634', backgroundColor: '#EFE6C9', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                        {b.startTime} - {b.endTime}
                      </span>
                      <span style={{ fontWeight: 700, color: '#8C6E53' }}>{b.bookingCode}</span>
                    </div>
                    <h4 style={{ fontSize: '1.3rem', color: '#604634', margin: '0.2rem 0' }}>
                      Khách hàng: {b.customerName}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                      Gói: <strong>{b.packageName}</strong> • Studio: <strong>{b.studioName}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8C6E53', fontWeight: 600 }}>Ngày thực hiện:</div>
                    <div style={{ fontWeight: 700, color: '#604634' }}>{b.bookingDate}</div>
                  </div>
                </div>

                {/* Makeup Style Notes */}
                <div style={{ padding: '0.8rem 1rem', backgroundColor: '#FFFDF6', borderRadius: '10px', border: '1px solid var(--mipa-beige)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>💄 <strong>Yêu cầu Make-up / Tone da:</strong> {b.customerNote || 'Tone trong trẻo Hàn Quốc, tóc uốn lơi tự nhiên.'}</div>
                </div>

                {/* Makeup Task Workflow Control */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #EFE6C9', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                    Trạng thái Makeup Task:
                    <span style={{
                      fontWeight: 700,
                      marginLeft: '0.4rem',
                      color: taskStatus === 'DONE' ? '#16A34A' : taskStatus === 'IN_PROGRESS' ? '#D97706' : '#6E5F55',
                    }}>
                      {taskStatus === 'DONE' ? '✓ ĐÃ HOÀN TẤT' : taskStatus === 'IN_PROGRESS' ? '● ĐANG TRANG ĐIỂM' : '○ CHỜ BẮT ĐẦU'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleTask(b.id)}
                    className={taskStatus === 'DONE' ? 'btn-mipa-secondary' : 'btn-mipa-gold'}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}
                  >
                    {taskStatus === 'TODO' && '▶ Bắt Đầu Makeup'}
                    {taskStatus === 'IN_PROGRESS' && '✓ Hoàn Tất Makeup'}
                    {taskStatus === 'DONE' && '↩ Đặt Lại'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
