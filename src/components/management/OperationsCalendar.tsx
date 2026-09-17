import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { OperationsCalendarEvent } from '../../types';
import { getOperationsCalendarEvents } from '../../services/studioOperationsService';

interface OperationsCalendarProps {
  onOpenBooking?: (bookingId: string) => void;
}

export const OperationsCalendar: React.FC<OperationsCalendarProps> = ({ onOpenBooking }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  const [events, setEvents] = useState<OperationsCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Layer toggles
  const [showBookings, setShowBookings] = useState<boolean>(true);
  const [showLeaves, setShowLeaves] = useState<boolean>(true);
  const [showMaintenance, setShowMaintenance] = useState<boolean>(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Calculate start and end date for range
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 15);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 15);

      const data = await getOperationsCalendarEvents(start.toISOString(), end.toISOString());
      setEvents(data);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'DAY') next.setDate(next.getDate() - 1);
    else if (viewMode === 'WEEK') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'DAY') next.setDate(next.getDate() + 1);
    else if (viewMode === 'WEEK') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const filteredEvents = events.filter(e => {
    if (e.type === 'BOOKING' && !showBookings) return false;
    if (e.type === 'STAFF_LEAVE' && !showLeaves) return false;
    if (e.type === 'MAINTENANCE' && !showMaintenance) return false;
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: '#2C2420' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid rgba(96, 70, 52, 0.15)',
        paddingBottom: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            <Sparkles size={14} color="#C6A45F" /> Tổng Thể Lịch Studio
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', margin: '0.3rem 0 0', fontWeight: 700, color: '#2C2420' }}>
            Operations Calendar — Lịch Vận Hành Studio
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Tích hợp nhiều lớp thông tin: Lịch chụp, Nhân sự được phân công, Lịch nghỉ phép & Lịch bảo trì máy.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleToday}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #D1C7BD',
              backgroundColor: '#FFFDF6',
              color: '#604634',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Hôm nay
          </button>
          <div style={{ display: 'flex', border: '1px solid #D1C7BD', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={handlePrev}
              style={{ padding: '0.45rem 0.6rem', border: 'none', backgroundColor: '#FFFDF6', cursor: 'pointer', color: '#604634' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              style={{ padding: '0.45rem 0.6rem', border: 'none', backgroundColor: '#FFFDF6', borderLeft: '1px solid #D1C7BD', cursor: 'pointer', color: '#604634' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', border: '1px solid #D1C7BD', borderRadius: '6px', overflow: 'hidden' }}>
            {(['DAY', 'WEEK', 'MONTH'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '0.45rem 0.8rem',
                  border: 'none',
                  backgroundColor: viewMode === m ? '#604634' : '#FFFDF6',
                  color: viewMode === m ? '#FFFDF6' : '#604634',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {m === 'DAY' ? 'Ngày' : m === 'WEEK' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Toggles */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        marginBottom: '1.25rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#FFFDF6',
        borderRadius: '8px',
        border: '1px solid #E5DFD7',
        fontSize: '0.85rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#8C6E53' }}>
          <Layers size={15} /> Lớp hiển thị:
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showBookings}
            onChange={e => setShowBookings(e.target.checked)}
          />
          <span>Lịch Chụp Studio (Bookings)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLeaves}
            onChange={e => setShowLeaves(e.target.checked)}
          />
          <span>Nhân sự Nghỉ Phép (Leaves)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMaintenance}
            onChange={e => setShowMaintenance(e.target.checked)}
          />
          <span>Bảo trì thiết bị (Maintenance)</span>
        </label>
      </div>

      {/* Events Board */}
      <div style={{
        backgroundColor: '#FFFDF6',
        borderRadius: '12px',
        border: '1px solid #E5DFD7',
        padding: '1.5rem',
        minHeight: '450px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'Cinzel, serif', margin: 0, fontSize: '1.2rem', color: '#2C2420' }}>
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric', day: 'numeric' })}
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#888' }}>
            Hiển thị {filteredEvents.length} sự kiện
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Đang tải dữ liệu lịch...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            Không có sự kiện hoặc lịch chụp nào trong khoảng thời gian này.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredEvents.map(evt => {
              const isBooking = evt.type === 'BOOKING';
              const isLeave = evt.type === 'STAFF_LEAVE';
              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (isBooking && evt.metadata?.booking_id && onOpenBooking) {
                      onOpenBooking(evt.metadata.booking_id);
                    }
                  }}
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '8px',
                    border: isBooking ? '1px solid #C6A45F' : isLeave ? '1px solid #FCA5A5' : '1px solid #D1C7BD',
                    backgroundColor: isBooking ? '#FCFAF5' : isLeave ? '#FEF2F2' : '#F3EFEA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: isBooking && onOpenBooking ? 'pointer' : 'default',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: isBooking ? '#C6A45F' : isLeave ? '#DC2626' : '#604634',
                        color: '#FFF',
                      }}>
                        {evt.type}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#2C2420' }}>{evt.title}</strong>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#666' }}>
                      ⏰ {evt.startAt.slice(11, 16)} → {evt.endAt.slice(11, 16)} (Ngày {evt.startAt.slice(0, 10)})
                      {evt.studioRoomName && ` • Phòng: ${evt.studioRoomName}`}
                      {evt.staffName && ` • Nhân sự: ${evt.staffName}`}
                    </div>
                  </div>

                  {isBooking && evt.crewStatus && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: evt.crewStatus === 'CREW_READY' ? '#DCFCE7' : '#FEF3C7',
                      color: evt.crewStatus === 'CREW_READY' ? '#15803D' : '#B45309',
                    }}>
                      {evt.crewStatus}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
