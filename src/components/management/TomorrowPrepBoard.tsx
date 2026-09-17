import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { TomorrowPrepItem } from '../../services/studioOperationsService';
import { getTomorrowPrepBoardData } from '../../services/studioOperationsService';

interface TomorrowPrepBoardProps {
  onOpenBookingDetails?: (bookingId: string) => void;
  onOpenPlanner?: (bookingId: string) => void;
}

export const TomorrowPrepBoard: React.FC<TomorrowPrepBoardProps> = ({
  onOpenBookingDetails,
  onOpenPlanner,
}) => {
  const [items, setItems] = useState<TomorrowPrepItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTomorrowPrepBoardData();
      setItems(data);
    } catch (err) {
      console.error('Failed to load tomorrow prep data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBookings = items.length;
  const readyBookings = items.filter(i => i.isAllGreen).length;

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
            <Sparkles size={14} color="#C6A45F" /> Kiểm Tra Trước Ca Chụp
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', margin: '0.3rem 0 0', fontWeight: 700, color: '#2C2420' }}>
            Chuẩn Bị Ngày Mai — Checklist Sẵn Sàng Vận Hành
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Rà soát 7 tiêu chí bắt buộc: Phòng studio, Nhiếp ảnh gia, Makeup, Thiết bị, Đạo cụ, Khách xác nhận & Drive workspace.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: readyBookings === totalBookings && totalBookings > 0 ? '#DCFCE7' : '#FEF3C7',
            color: readyBookings === totalBookings && totalBookings > 0 ? '#15803D' : '#B45309',
            padding: '0.45rem 0.9rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}>
            {readyBookings}/{totalBookings} Hợp đồng sẵn sàng 100%
          </div>

          <button
            onClick={loadData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#FFFDF6',
              border: '1px solid #D1C7BD',
              color: '#604634',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Kiểm tra lại
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#604634' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontFamily: 'Cinzel, serif' }}>ĐANG KIỂM TRA TÀI NGUYÊN VẬN HÀNH NGÀY MAI...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFDF6',
          borderRadius: '12px',
          border: '1px solid #E5DFD7',
          padding: '3rem',
          textAlign: 'center',
          color: '#888',
        }}>
          <CalendarCheck size={42} color="#8C6E53" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ margin: 0, color: '#2C2420' }}>Không có lịch chụp nào vào ngày mai</h3>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>Đội ngũ có thể chuẩn bị thiết bị bảo trì hoặc đào tạo nội bộ.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {items.map(item => (
            <div
              key={item.bookingId}
              style={{
                backgroundColor: '#FFFDF6',
                borderRadius: '14px',
                border: item.isAllGreen ? '1.5px solid #BBF7D0' : '1.5px solid #FDE68A',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #F0EAE1', paddingBottom: '0.8rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2420' }}>
                      {item.bookingCode}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                      • {item.customerName}
                    </span>
                    <span style={{ fontSize: '0.82rem', backgroundColor: '#F3EFEA', padding: '0.15rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                      {item.serviceName}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.2rem' }}>
                    ⏰ Khung giờ: {item.startTime} – {item.endTime} (Ngày {item.shootDate})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {onOpenPlanner && (
                    <button
                      onClick={() => onOpenPlanner(item.bookingId)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #C6A45F',
                        backgroundColor: '#FCFAF5',
                        color: '#8C6E53',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Điều phối tài nguyên
                    </button>
                  )}
                  {onOpenBookingDetails && (
                    <button
                      onClick={() => onOpenBookingDetails(item.bookingId)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        backgroundColor: '#FFFDF6',
                        color: '#604634',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Chi tiết
                    </button>
                  )}
                </div>
              </div>

              {/* 7-Criteria Checklist Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem',
              }}>
                {/* 1. Studio Room */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.studioReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.studioReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.studioReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Phòng Studio</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.studioReady ? '#15803D' : '#B91C1C' }}>
                      {item.studioReady ? item.studioName : 'Chưa chọn phòng'}
                    </div>
                  </div>
                </div>

                {/* 2. Photographer */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.photographerReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.photographerReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.photographerReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Nhiếp ảnh gia</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.photographerReady ? '#15803D' : '#B91C1C' }}>
                      {item.photographerReady ? item.photographerName : '⚠ Chưa phân công'}
                    </div>
                  </div>
                </div>

                {/* 3. Makeup */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.makeupReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.makeupReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.makeupReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Chuyên viên Makeup</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.makeupReady ? '#15803D' : '#B91C1C' }}>
                      {item.makeupReady ? item.makeupName || 'Đã chuẩn bị' : '⚠ Chưa phân công'}
                    </div>
                  </div>
                </div>

                {/* 4. Equipment */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.equipmentReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.equipmentReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.equipmentReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Máy & Ống kính</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.equipmentReady ? '#15803D' : '#B91C1C' }}>
                      {item.equipmentReady ? `${item.reservedEquipmentCount} món đã giữ` : '⚠ Chưa giữ máy'}
                    </div>
                  </div>
                </div>

                {/* 5. Props & Wardrobe */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.propsReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.propsReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.propsReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Đạo cụ & Trang phục</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803D' }}>
                      Sẵn sàng tại kho
                    </div>
                  </div>
                </div>

                {/* 6. Customer Confirmed */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.customerAckReady ? '#F0FDF4' : '#FFFBEB',
                  border: item.customerAckReady ? '1px solid #DCFCE7' : '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.customerAckReady ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertTriangle size={16} color="#D97706" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Khách xác nhận</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.customerAckReady ? '#15803D' : '#B45309' }}>
                      {item.customerAckReady ? 'Đã xác nhận' : 'Cần gọi nhắc'}
                    </div>
                  </div>
                </div>

                {/* 7. Drive Folder */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.driveReady ? '#F0FDF4' : '#FEF2F2',
                  border: item.driveReady ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {item.driveReady ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Thư mục Drive</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.driveReady ? '#15803D' : '#B91C1C' }}>
                      {item.driveReady ? (
                        <a
                          href={item.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#15803D', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          Đã tạo <ExternalLink size={11} />
                        </a>
                      ) : (
                        'Chưa khởi tạo'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
