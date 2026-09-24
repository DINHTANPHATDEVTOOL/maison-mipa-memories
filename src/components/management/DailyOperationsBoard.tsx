import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import type { Booking, DailyOperationsBoardData } from '../../types';
import { getDailyOperationsBoardData } from '../../services/studioOperationsService';

interface DailyOperationsBoardProps {
  onOpenBookingDetails?: (bookingId: string) => void;
  onNavigateToStaff?: () => void;
  onNavigateToResources?: () => void;
}

export const DailyOperationsBoard: React.FC<DailyOperationsBoardProps> = ({
  onOpenBookingDetails,
  onNavigateToStaff,
  onNavigateToResources,
}) => {
  const [boardData, setBoardData] = useState<DailyOperationsBoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ISSUES' | 'SHOOTING' | 'POST_PROD'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDailyOperationsBoardData();
      setBoardData(data);
    } catch (err) {
      console.error('Failed to load daily operations board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#604634' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>ĐANG TẢI DỮ LIỆU VẬN HÀNH HÔM NAY...</p>
      </div>
    );
  }

  const { todayShoots, upcomingCheckIns: _upcomingCheckIns, crewIssues, postProductionDue } = boardData || {
    todayShoots: [],
    upcomingCheckIns: [],
    crewIssues: [],
    resourceIssues: [],
    postProductionDue: [],
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: '#2C2420' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(96, 70, 52, 0.15)',
        paddingBottom: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            <Sparkles size={14} color="#C6A45F" /> Trung Tâm Điều Phối Studio
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', margin: '0.3rem 0 0', fontWeight: 700, color: '#2C2420' }}>
            Hôm Nay — Bảng Vận Hành Trực Tiếp
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Giám sát thời gian thực: Điểm danh, Ca chụp đang diễn ra, Thiếu nhân sự & Hậu kỳ đến hạn.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            backgroundColor: '#FFFDF6',
            border: '1px solid #D1C7BD',
            color: '#604634',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          backgroundColor: '#FFFDF6',
          border: '1px solid #E5DFD7',
          borderRadius: '12px',
          padding: '1.1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Ca chụp hôm nay</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2420', marginTop: '0.3rem' }}>{todayShoots.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <CheckCircle2 size={13} /> Sẵn sàng phục vụ
          </div>
        </div>

        <div style={{
          backgroundColor: crewIssues.length > 0 ? '#FEF2F2' : '#FFFDF6',
          border: crewIssues.length > 0 ? '1px solid #FCA5A5' : '1px solid #E5DFD7',
          borderRadius: '12px',
          padding: '1.1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: '0.8rem', color: crewIssues.length > 0 ? '#DC2626' : '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Cần bố trí Crew</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: crewIssues.length > 0 ? '#B91C1C' : '#2C2420', marginTop: '0.3rem' }}>
            {crewIssues.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: crewIssues.length > 0 ? '#DC2626' : '#666', marginTop: '0.2rem' }}>
            {crewIssues.length > 0 ? '⚠ Thiếu thợ chụp hoặc makeup' : 'Đã phân công đầy đủ'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFDF6',
          border: '1px solid #E5DFD7',
          borderRadius: '12px',
          padding: '1.1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Đang thực hiện (Shooting)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#C6A45F', marginTop: '0.3rem' }}>
            {todayShoots.filter(s => s.bookingStatus === 'SHOOTING').length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>Đang ghi hình tại studio</div>
        </div>

        <div style={{
          backgroundColor: '#FFFDF6',
          border: '1px solid #E5DFD7',
          borderRadius: '12px',
          padding: '1.1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Hậu kỳ đến hạn</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2420', marginTop: '0.3rem' }}>
            {postProductionDue.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>Cần bàn giao file ảnh</div>
        </div>
      </div>

      {/* Main Grid: Left Column (Shoots & Check-in), Right Column (Crew Issues & Post-prod) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Today's Schedule & Check-ins */}
        <div style={{
          backgroundColor: '#FFFDF6',
          borderRadius: '14px',
          border: '1px solid #E5DFD7',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#C6A45F" /> Tiến Độ Chụp Hôm Nay
            </h2>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#F3EFEA', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
              {todayShoots.length} ca
            </span>
          </div>

          {todayShoots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#999', fontSize: '0.9rem' }}>
              Hôm nay không có ca chụp nào được lên lịch.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {todayShoots.map(booking => {
                const isShooting = booking.bookingStatus === 'SHOOTING';
                const isCheckedIn = booking.bookingStatus === 'CHECKED_IN';
                return (
                  <div
                    key={booking.id}
                    style={{
                      border: isShooting ? '1.5px solid #C6A45F' : '1px solid #EDE8E2',
                      borderRadius: '10px',
                      padding: '1rem',
                      backgroundColor: isShooting ? '#FCFAF5' : '#FFFDF6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2420' }}>
                          {booking.bookingCode}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '8px',
                          backgroundColor: isShooting ? '#FEF3C7' : isCheckedIn ? '#DCFCE7' : '#F3EFEA',
                          color: isShooting ? '#B45309' : isCheckedIn ? '#15803D' : '#604634',
                        }}>
                          {booking.bookingStatus}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#555' }}>
                        <strong>{booking.customerName}</strong> • {booking.serviceName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>
                        ⏰ {booking.startTime} – {booking.endTime} • Phòng: {booking.studioName}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {onOpenBookingDetails && (
                        <button
                          onClick={() => onOpenBookingDetails(booking.id)}
                          style={{
                            padding: '0.45rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid #D1C7BD',
                            backgroundColor: '#FFFDF6',
                            color: '#604634',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Eye size={13} /> Xem
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Crew Missing Alerts & Post-Production Due */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Crew Alerts Box */}
          <div style={{
            backgroundColor: '#FFFDF6',
            borderRadius: '14px',
            border: crewIssues.length > 0 ? '1.5px solid #FCA5A5' : '1px solid #E5DFD7',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: crewIssues.length > 0 ? '#B91C1C' : '#2C2420' }}>
                <AlertTriangle size={18} color={crewIssues.length > 0 ? '#DC2626' : '#16A34A'} />
                Cảnh Báo Thiếu Nhân Sự ({crewIssues.length})
              </h2>
              {onNavigateToStaff && (
                <button
                  onClick={onNavigateToStaff}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#8C6E53',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  Điều phối <ArrowRight size={13} />
                </button>
              )}
            </div>

            {crewIssues.length === 0 ? (
              <div style={{ color: '#16A34A', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.8rem', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
                <CheckCircle2 size={16} /> Toàn bộ ca chụp hôm nay đã được phân công đầy đủ nhân sự.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {crewIssues.map(issue => (
                  <div
                    key={issue.bookingId}
                    style={{
                      border: '1px solid #FECACA',
                      backgroundColor: '#FEF2F2',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#991B1B' }}>
                        {issue.bookingCode} — {issue.customerName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#B91C1C', marginTop: '0.2rem' }}>
                        Khung giờ: {issue.startTime} • Thiếu: <strong>{issue.missingRoles.join(', ')}</strong>
                      </div>
                    </div>
                    {onNavigateToStaff && (
                      <button
                        onClick={onNavigateToStaff}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#DC2626',
                          color: '#FFF',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Gán ngay
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Production Due Section */}
          <div style={{
            backgroundColor: '#FFFDF6',
            borderRadius: '14px',
            border: '1px solid #E5DFD7',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', margin: '0 0 1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={18} color="#C6A45F" /> Hậu Kỳ & Trả File Hôm Nay ({postProductionDue.length})
            </h2>

            {postProductionDue.length === 0 ? (
              <div style={{ color: '#888', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                Không có hợp đồng nào đến hạn trả file hôm nay.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {postProductionDue.map(item => (
                  <div
                    key={item.bookingId}
                    style={{
                      border: '1px solid #EDE8E2',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: item.isOverdue ? '#FEF2F2' : '#FFFDF6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2C2420' }}>
                        {item.bookingCode} — {item.customerName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#777', marginTop: '0.2rem' }}>
                        Editor: {item.editorName} • Hạn: {item.dueAt?.slice(0, 10)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      backgroundColor: item.isOverdue ? '#FCA5A5' : '#E0E7FF',
                      color: item.isOverdue ? '#7F1D1D' : '#3730A3',
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
