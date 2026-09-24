import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  getBusinessDashboardSummary,
  getBookingFunnelMetrics,
  getServicePerformance,
  getConceptPerformance,
  getStudioUtilization,
  getDateRangeTimestamps,
  type DateRangePreset,
} from '../../services/businessAnalyticsService';
import type {
  BusinessDashboardSummary,
  BookingFunnelMetrics,
  ServicePerformanceMetric,
  ConceptPerformanceMetric,
  StudioUtilizationMetric,
} from '../../types';

export const BusinessIntelligenceDashboard: React.FC = () => {
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [customStart, _setCustomStart] = useState<string>('');
  const [customEnd, _setCustomEnd] = useState<string>('');

  const [summary, setSummary] = useState<BusinessDashboardSummary | null>(null);
  const [funnel, setFunnel] = useState<BookingFunnelMetrics | null>(null);
  const [services, setServices] = useState<ServicePerformanceMetric[]>([]);
  const [concepts, setConcepts] = useState<ConceptPerformanceMetric[]>([]);
  const [studios, setStudios] = useState<StudioUtilizationMetric[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { startAt, endAt } = getDateRangeTimestamps(preset, customStart, customEnd);
      const [sum, fnl, srv, cpt, std] = await Promise.all([
        getBusinessDashboardSummary(startAt, endAt),
        getBookingFunnelMetrics(startAt, endAt),
        getServicePerformance(startAt, endAt),
        getConceptPerformance(startAt, endAt),
        getStudioUtilization(startAt, endAt),
      ]);

      setSummary(sum);
      setFunnel(fnl);
      setServices(srv);
      setConcepts(cpt);
      setStudios(std);
    } catch (err: any) {
      console.error('[BI] Load error:', err);
      setError(err.message || 'Không thể tải dữ liệu phân tích kinh doanh.');
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA BUSINESS INTELLIGENCE & STUDIO KPI
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0 0 0', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
            Báo Cáo Hoạt Động & Phân Tích Kinh Doanh
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Timezone Indicator */}
          <div style={{ fontSize: '0.78rem', color: '#8C6E53', backgroundColor: '#F7F3EB', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid #EFE6C9', fontWeight: 600 }}>
            🌐 Giờ Việt Nam (Asia/Ho_Chi_Minh)
          </div>

          <button
            onClick={loadData}
            style={{
              padding: '0.5rem',
              backgroundColor: '#F7F3EB',
              border: '1px solid #EFE6C9',
              borderRadius: '12px',
              color: '#604634',
              cursor: 'pointer',
            }}
            aria-label="Tải lại phân tích"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Filter */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '1rem 1.2rem',
        borderRadius: '16px',
        border: '1px solid #EFE6C9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={15} /> Kỳ báo cáo:
          </span>
          {[
            { key: 'today', label: 'Hôm Nay' },
            { key: '7days', label: '7 Ngày Qua' },
            { key: '30days', label: '30 Ngày Qua' },
            { key: 'this_month', label: 'Tháng Này' },
            { key: 'last_month', label: 'Tháng Trước' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setPreset(item.key as DateRangePreset)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: preset === item.key ? '1px solid #8C6E53' : '1px solid #EFE6C9',
                backgroundColor: preset === item.key ? '#604634' : '#FFFDF6',
                color: preset === item.key ? '#FFFDF6' : '#604634',
                fontWeight: preset === item.key ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ padding: '1.2rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '12px', color: '#991B1B', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> Không thể kết xuất số liệu BI
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem' }}>{error}</p>
        </div>
      )}

      {/* Main KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Confirmed Booking Value */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Giá Trị Booking Đã Chốt</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#604634', marginTop: '0.3rem' }}>
              {summary.financials.confirmedBookingValue.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
              {summary.funnel.confirmedBookings} booking xác nhận
            </div>
          </div>

          {/* Actual Cash Received */}
          <div style={{ backgroundColor: '#ECFDF5', padding: '1.2rem', borderRadius: '16px', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: '0.78rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600 }}>Thực Thu Thực Tế (Net Cash)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#065F46', marginTop: '0.3rem' }}>
              {summary.financials.actualCashReceived.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.2rem' }}>
              Cọc: {summary.financials.confirmedDeposits.toLocaleString('vi-VN')}đ
            </div>
          </div>

          {/* Outstanding Balance */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#B45309', textTransform: 'uppercase', fontWeight: 600 }}>Còn Phải Thu</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#92400E', marginTop: '0.3rem' }}>
              {summary.financials.outstandingBalance.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
              {summary.financials.outstandingBalance > 0 ? 'Cần thu trước bàn giao' : 'Đã thu trọn'}
            </div>
          </div>

          {/* Funnel Conversion Rate */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Tỷ Lệ Chốt Tư Vấn</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#604634', marginTop: '0.3rem' }}>
              {summary.funnel.consultationConversionRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
              {summary.funnel.confirmedBookings}/{summary.funnel.consultationRequests} yêu cầu chốt lịch
            </div>
          </div>

          {/* Customer Retention */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Khách Quay Lại (Retention)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563EB', marginTop: '0.3rem' }}>
              {summary.customers.repeatCustomerRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
              {summary.customers.returningCustomers} khách quay lại / {summary.customers.totalActiveCustomers}
            </div>
          </div>
        </div>
      )}

      {/* Funnel Cohort Analytics Section */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} color="#8C6E53" /> Phễu Chuyển Đổi (Cohort Funnel Analytics)
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.2rem' }}>
              Theo dõi lộ trình chuyển đổi từ yêu cầu tư vấn ban đầu đến hoàn thành bàn giao ảnh
            </div>
          </div>
          {funnel && (
            <div style={{ fontSize: '0.85rem', color: '#604634', fontWeight: 600 }}>
              Tổng Cohort Tạo Trong Kỳ: <strong>{funnel.cohortTotalCreated}</strong>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>Đang kết xuất phễu...</div>
        ) : funnel && funnel.stages.length > 0 ? (
          <div>
            {/* Visual Funnel Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {funnel.stages.map((stage, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '160px', fontSize: '0.85rem', fontWeight: 600, color: '#604634' }}>
                    {stage.stage}
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#F3EDE2', height: '28px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    <div
                      style={{
                        width: `${Math.max(4, Math.min(100, stage.conversionRate))}%`,
                        height: '100%',
                        backgroundColor: idx === 0 ? '#8C6E53' : idx === 2 ? '#047857' : '#604634',
                        borderRadius: '8px',
                        transition: 'width 0.4s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '0.6rem',
                        color: '#FFFDF6',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      {stage.count} ({stage.conversionRate}%)
                    </div>
                  </div>
                  <div style={{ width: '130px', fontSize: '0.75rem', color: '#6E5F55', textAlign: 'right' }}>
                    {stage.medianHoursFromPrevious !== null ? `~${stage.medianHoursFromPrevious}h từ bước trước` : 'Khởi điểm'}
                  </div>
                </div>
              ))}
            </div>

            {/* Funnel Notes */}
            <div style={{ marginTop: '1.2rem', padding: '0.8rem', backgroundColor: '#F7F3EB', borderRadius: '10px', fontSize: '0.78rem', color: '#8C6E53' }}>
              💡 <strong>Lưu ý về số liệu Funnel</strong>: Mẫu số tính toán dựa trên các booking được tạo trong kỳ đã chọn (Cohort Logic). Tỷ lệ chuyển đổi thể hiện bước tiến thực tế của cohort đó qua các mốc thời gian.
            </div>
          </div>
        ) : null}
      </div>

      {/* Two Column Grid: Services & Concepts Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Service Performance Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #EFE6C9',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.15rem', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={17} color="#8C6E53" /> Hiệu Suất Theo Gói Dịch Vụ
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F3EB', color: '#604634', borderBottom: '1px solid #EFE6C9', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.7rem 0.8rem', textAlign: 'left' }}>Dịch Vụ</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'center' }}>Tư Vấn</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'center' }}>Chốt</th>
                  <th style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>Giá Trị Hợp Đồng</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'right' }}>Chuyển Đổi</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.serviceId} style={{ borderBottom: '1px solid #F3EDE2' }}>
                    <td style={{ padding: '0.8rem 0.8rem', fontWeight: 600, color: '#604634' }}>
                      {s.serviceName}
                    </td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>{s.consultationRequests}</td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#047857' }}>{s.confirmedBookings}</td>
                    <td style={{ padding: '0.8rem 0.8rem', textAlign: 'right', fontWeight: 600 }}>
                      {s.confirmedBookingValue.toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#8C6E53' }}>
                      {s.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Concept Performance Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #EFE6C9',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.15rem', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={17} color="#C6A45F" /> Concept Được Chọn Nhiều Nhất
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F3EB', color: '#604634', borderBottom: '1px solid #EFE6C9', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.7rem 0.8rem', textAlign: 'left' }}>Concept</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'center' }}>Lựa Chọn</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'center' }}>Đã Chụp</th>
                  <th style={{ padding: '0.7rem 0.6rem', textAlign: 'right' }}>Tỷ Lệ Chốt</th>
                </tr>
              </thead>
              <tbody>
                {concepts.map((c) => (
                  <tr key={c.conceptId} style={{ borderBottom: '1px solid #F3EDE2' }}>
                    <td style={{ padding: '0.8rem 0.8rem', fontWeight: 600, color: '#604634' }}>
                      {c.conceptName}
                    </td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>{c.timesSelected}</td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#047857' }}>{c.confirmedBookings}</td>
                    <td style={{ padding: '0.8rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#8C6E53' }}>
                      {c.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Studio Room Utilization & Calendar Heatmap */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={18} color="#8C6E53" /> Hiệu Suất & Công Suất Phòng Studio (Room Utilization)
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.2rem' }}>
              Dựa trên giờ chụp thực tế từ các booking đã chốt cọc (8h-18h hàng ngày)
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          {studios.map((std) => (
            <div
              key={std.roomId}
              style={{
                backgroundColor: '#F7F3EB',
                padding: '1.2rem',
                borderRadius: '14px',
                border: '1px solid #EFE6C9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#604634', fontSize: '0.95rem' }}>
                  {std.roomName}
                </span>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#EFE6C9',
                  color: '#604634',
                }}>
                  {std.roomCode}
                </span>
              </div>

              <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8C6E53' }}>Tỷ lệ lấp đầy phòng:</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857' }}>
                    {std.utilizationRate}%
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#6E5F55' }}>
                  <div>{std.confirmedBookingHours}h đã book</div>
                  <div>/{std.availableBusinessHours}h mở cửa</div>
                </div>
              </div>

              <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid #E5DFD3', fontSize: '0.78rem', color: '#604634' }}>
                <div>🗓️ Thứ đông nhất: <strong>{std.popularWeekday || 'Cuối tuần'}</strong></div>
                <div>⏰ Giờ cao điểm: <strong>{std.popularTimeRange || '14:00 - 17:00'}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
