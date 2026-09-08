import React, { useState } from 'react';
import type { Booking, StudioRoom } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Filter, Plus, Check } from 'lucide-react';

interface StudioCalendarProps {
  bookings: Booking[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
}

export const StudioCalendar: React.FC<StudioCalendarProps> = ({ bookings, studios, onOpenBooking }) => {
  const [viewMode, setViewMode] = useState<'ROOM' | 'DAY' | 'WEEK' | 'MONTH'>('ROOM');
  const [currentDate, setCurrentDate] = useState<string>('2026-08-11');

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      
      {/* Calendar Header Bar */}
      <div className="mipa-card" style={{ padding: '1.2rem 1.8rem', borderRadius: '20px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              MAISON MIPA RESOURCE SCHEDULER
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: 0 }}>Lịch Trình Studio & Phân Khu Chụp</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FFFDF6', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--mipa-beige)' }}>
            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><ChevronLeft size={18} color="#604634" /></button>
            <span style={{ fontWeight: 700, color: '#604634', fontSize: '0.9rem' }}>Thứ Ba, 11/08/2026</span>
            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><ChevronRight size={18} color="#604634" /></button>
          </div>
        </div>

        {/* View Switchers */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[
            { id: 'ROOM', label: 'Theo Phòng Studio' },
            { id: 'DAY', label: 'Theo Ngày' },
            { id: 'WEEK', label: 'Theo Tuần' },
            { id: 'MONTH', label: 'Theo Tháng' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              style={{
                border: '1px solid var(--mipa-beige)',
                background: viewMode === mode.id ? '#8C6E53' : '#FFFDF6',
                color: viewMode === mode.id ? '#FFFDF6' : '#604634',
                padding: '0.5rem 1rem',
                borderRadius: '16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {mode.label}
            </button>
          ))}
          <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Đặt Lịch
          </button>
        </div>
      </div>

      {/* Interactive Room Grid Schedule Matrix */}
      <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px', overflowX: 'auto' }}>
        
        {/* Table Header: Rooms */}
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--mipa-beige)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', width: '100px', color: '#8C6E53', fontSize: '0.85rem' }}>THỜI GIAN</th>
              {studios.map((std) => (
                <th key={std.id} style={{ padding: '1rem', textAlign: 'center', color: '#604634', fontSize: '1rem' }}>
                  <div style={{ fontWeight: 700 }}>{std.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6E5F55', fontWeight: 400 }}>Sức chứa max: {std.capacity} người</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} style={{ borderBottom: '1px solid #EFE6C9' }}>
                {/* Time Slot Label */}
                <td style={{ padding: '1rem', fontWeight: 700, color: '#8C6E53', fontSize: '0.85rem', backgroundColor: '#FFFDF6' }}>
                  ⏰ {time}
                </td>

                {/* Studio Columns */}
                {studios.map((std) => {
                  // Find booking match
                  const matchingBooking = bookings.find(
                    (b) => b.studioId === std.id && b.startTime <= time && time < b.endTime
                  );

                  return (
                    <td key={std.id} style={{ padding: '0.5rem', verticalAlign: 'top', height: '80px' }}>
                      {matchingBooking ? (
                        <div
                          style={{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '12px',
                            backgroundColor: matchingBooking.bookingStatus === 'SHOOTING' ? '#FCE7F3' : '#F8F3E6',
                            border: matchingBooking.bookingStatus === 'SHOOTING' ? '1px solid #F472B6' : '1px solid #C6A45F',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C6E53' }}>{matchingBooking.bookingCode}</span>
                            <span className={`badge-status badge-${matchingBooking.bookingStatus.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                              ● {matchingBooking.bookingStatus}
                            </span>
                          </div>

                          <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                            {matchingBooking.packageName} ({matchingBooking.serviceName})
                          </div>
                          
                          <div style={{ fontSize: '0.72rem', color: '#6E5F55' }}>
                            👤 {matchingBooking.customerName} • 📷 {matchingBooking.assignments.find(a => a.assignmentRole === 'PHOTOGRAPHER')?.employeeName || 'Chưa gán'}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '100%',
                            border: '1px dashed #EFE6C9',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#A39385',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={onOpenBooking}
                        >
                          + Phòng Trống (Book ngay)
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
};
