import React, { useState } from 'react';
import type { Booking, StudioRoom } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, RefreshCw, X, User, Phone, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

interface StudioCalendarProps {
  bookings: Booking[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
}

export const StudioCalendar: React.FC<StudioCalendarProps> = ({ bookings, studios, onOpenBooking }) => {
  const [viewMode, setViewMode] = useState<'ROOM' | 'DAY' | 'WEEK' | 'MONTH'>('ROOM');

  // Initial date: today in Vietnam time (Asia/Ho_Chi_Minh)
  const getTodayVietnamIso = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  const [currentDate, setCurrentDate] = useState<string>(getTodayVietnamIso);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const handlePrevDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    const nextStr = [
      dateObj.getFullYear(),
      String(dateObj.getMonth() + 1).padStart(2, '0'),
      String(dateObj.getDate()).padStart(2, '0'),
    ].join('-');
    setCurrentDate(nextStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    const nextStr = [
      dateObj.getFullYear(),
      String(dateObj.getMonth() + 1).padStart(2, '0'),
      String(dateObj.getDate()).padStart(2, '0'),
    ].join('-');
    setCurrentDate(nextStr);
  };

  const handleToday = () => {
    setCurrentDate(getTodayVietnamIso());
  };

  const formattedDateLabel = (() => {
    try {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][dateObj.getDay()];
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${dayOfWeek}, ${day}/${month}/${year}`;
    } catch {
      return currentDate;
    }
  })();

  // Filter bookings for the selected date (excluding cancelled)
  const dayBookings = bookings.filter((b) => {
    const matchesDate = b.bookingDate === currentDate || (b.startAt && b.startAt.startsWith(currentDate));
    const notCancelled = b.bookingStatus !== 'CANCELLED';
    return matchesDate && notCancelled;
  });

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      
      {/* Calendar Header Bar */}
      <div className="mipa-card" style={{ padding: '1.2rem 1.8rem', borderRadius: '20px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
                MAISON MIPA RESOURCE SCHEDULER
              </span>
              {/* Realtime Pulsing Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#065F46',
                padding: '0.2rem 0.55rem',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                }} />
                Dữ liệu Realtime
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.2rem' }}>
              <h2 style={{ fontSize: '1.6rem', color: '#604634', margin: 0 }}>Lịch Trình Studio & Phân Khu Chụp</h2>
              <span style={{ fontSize: '0.85rem', color: '#8C6E53', fontWeight: 500 }}>
                ({dayBookings.length} ca chụp trong ngày)
              </span>
            </div>
          </div>

          {/* Interactive Date Navigation Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFDF6', padding: '0.3rem 0.6rem', borderRadius: '20px', border: '1px solid var(--mipa-beige)' }}>
            <button
              onClick={handlePrevDay}
              title="Ngày trước"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <ChevronLeft size={18} color="#604634" />
            </button>
            <span style={{ fontWeight: 700, color: '#604634', fontSize: '0.9rem', minWidth: '155px', textAlign: 'center' }}>
              {formattedDateLabel}
            </span>
            <button
              onClick={handleNextDay}
              title="Ngày tiếp theo"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <ChevronRight size={18} color="#604634" />
            </button>
            <button
              onClick={handleToday}
              style={{
                border: '1px solid rgba(198, 164, 95, 0.4)',
                background: '#FAF6EE',
                color: '#604634',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '10px',
                cursor: 'pointer',
                marginLeft: '0.3rem',
              }}
            >
              Hôm nay
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#8C6E53',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginLeft: '0.2rem',
              }}
            />
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
                transition: 'all 0.2s ease',
              }}
            >
              {mode.label}
            </button>
          ))}
          <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Đặt Lịch Mới
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
                  <div style={{ fontSize: '0.75rem', color: '#6E5F55', fontWeight: 400 }}>Sức chứa: {std.capacity} người</div>
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
                  // Find booking match for this studio, date, and hour
                  const matchingBooking = dayBookings.find((b) => {
                    if (b.studioId !== std.id) return false;
                    if (b.startTime && b.endTime) {
                      return b.startTime <= time && time < b.endTime;
                    }
                    if (b.startAt && b.endAt) {
                      const startD = new Date(b.startAt);
                      const endD = new Date(b.endAt);
                      const slotStartD = new Date(`${currentDate}T${time}:00+07:00`);
                      const slotEndD = new Date(slotStartD.getTime() + 60 * 60 * 1000);
                      return slotStartD.getTime() < endD.getTime() && slotEndD.getTime() > startD.getTime();
                    }
                    return false;
                  });

                  return (
                    <td key={std.id} style={{ padding: '0.5rem', verticalAlign: 'top', height: '80px' }}>
                      {matchingBooking ? (
                        <div
                          onClick={() => setSelectedBooking(matchingBooking)}
                          title="Nhấp để xem chi tiết đơn đặt lịch"
                          style={{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '12px',
                            backgroundColor: matchingBooking.bookingStatus === 'SHOOTING'
                              ? '#FCE7F3'
                              : matchingBooking.paymentStatus === 'DEPOSIT_PAID' || matchingBooking.paymentStatus === 'FULLY_PAID'
                              ? '#F0FDF4'
                              : '#FFFDF6',
                            border: matchingBooking.bookingStatus === 'SHOOTING'
                              ? '1.5px solid #F472B6'
                              : matchingBooking.paymentStatus === 'DEPOSIT_PAID'
                              ? '1.5px solid #86EFAC'
                              : '1.5px solid #C6A45F',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C6E53', fontFamily: 'monospace' }}>
                              #{matchingBooking.bookingCode}
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '8px',
                                backgroundColor: matchingBooking.paymentStatus === 'DEPOSIT_PAID' ? '#DCFCE7' : '#FEF3C7',
                                color: matchingBooking.paymentStatus === 'DEPOSIT_PAID' ? '#166534' : '#92400E',
                              }}
                            >
                              {matchingBooking.paymentStatus === 'DEPOSIT_PAID' ? '✓ Đã cọc' : 'Chờ cọc'}
                            </span>
                          </div>

                          <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                            {matchingBooking.packageName}
                          </div>
                          
                          <div style={{ fontSize: '0.72rem', color: '#6E5F55' }}>
                            👤 {matchingBooking.customerName} • 💰 {matchingBooking.totalAmount ? matchingBooking.totalAmount.toLocaleString('vi-VN') + 'đ' : ''}
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
                            backgroundColor: 'rgba(255, 253, 246, 0.4)',
                          }}
                          onClick={onOpenBooking}
                        >
                          + Còn Trống
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

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(44, 34, 30, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="mipa-card" style={{
            maxWidth: '540px',
            width: '100%',
            padding: '1.8rem',
            borderRadius: '20px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <button
              onClick={() => setSelectedBooking(null)}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#8C6E53',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                CHI TIẾT LỊCH HẸN
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '8px',
                backgroundColor: selectedBooking.paymentStatus === 'DEPOSIT_PAID' ? '#DCFCE7' : '#FEF3C7',
                color: selectedBooking.paymentStatus === 'DEPOSIT_PAID' ? '#166534' : '#92400E',
              }}>
                {selectedBooking.paymentStatus === 'DEPOSIT_PAID' ? '✓ Đã cọc' : 'Chờ cọc'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.45rem', color: '#604634', margin: '0 0 1rem 0', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
              {selectedBooking.packageName} ({selectedBooking.serviceName})
            </h3>

            {/* Photoshoot Spec Card */}
            <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #E6D7B9', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#8C6E53' }}>Mã đơn: </span>
                  <strong style={{ fontFamily: 'monospace', color: '#604634' }}>#{selectedBooking.bookingCode}</strong>
                </div>
                <div>
                  <span style={{ color: '#8C6E53' }}>Phòng studio: </span>
                  <strong>{selectedBooking.studioName}</strong>
                </div>
                <div>
                  <span style={{ color: '#8C6E53' }}>Ngày chụp: </span>
                  <strong>{selectedBooking.bookingDate}</strong>
                </div>
                <div>
                  <span style={{ color: '#8C6E53' }}>Khung giờ: </span>
                  <strong>{selectedBooking.startTime} - {selectedBooking.endTime}</strong>
                </div>
                {selectedBooking.conceptName && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#8C6E53' }}>Concept: </span>
                    <strong>{selectedBooking.conceptName}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Card */}
            <div style={{ backgroundColor: '#FFFDF6', border: '1.5px solid #C6A45F', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                <span style={{ color: '#8C6E53' }}>Tổng chi phí buổi chụp:</span>
                <strong style={{ fontSize: '1rem', color: '#2C221E' }}>
                  {selectedBooking.totalAmount ? selectedBooking.totalAmount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#B45309' }}>
                <strong>Tiền cọc giữ lịch:</strong>
                <strong style={{ fontSize: '1.1rem' }}>
                  {selectedBooking.depositAmount ? selectedBooking.depositAmount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.82rem', color: '#8C6E53', borderTop: '1px dashed #E6D7B9', paddingTop: '0.4rem' }}>
                <span>Còn lại thanh toán tại studio:</span>
                <span>{Math.max(0, (selectedBooking.totalAmount || 0) - (selectedBooking.depositAmount || 0)).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ fontSize: '0.85rem', color: '#604634', marginBottom: '1.2rem', lineHeight: '1.6' }}>
              <div>👤 <strong>Khách hàng:</strong> {selectedBooking.customerName}</div>
              {selectedBooking.customerPhone && <div>📞 <strong>Điện thoại:</strong> {selectedBooking.customerPhone}</div>}
              {selectedBooking.customerEmail && <div>✉️ <strong>Email:</strong> {selectedBooking.customerEmail}</div>}
              {selectedBooking.occasion && <div>🎉 <strong>Dịp chụp:</strong> {selectedBooking.occasion}</div>}
              {selectedBooking.customerNote && <div>📝 <strong>Ghi chú:</strong> <em>"{selectedBooking.customerNote}"</em></div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn-mipa-secondary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
