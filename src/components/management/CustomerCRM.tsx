import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { getCrmCustomers, getCrmTags } from '../../services/crmService';
import { Customer360Drawer } from './Customer360Drawer';
import { generateCsv, downloadCsv } from '../../utils/csvExport';
import type { CrmCustomerListItem, CrmTag, CrmLifecycleStage, Booking } from '../../types';

interface CustomerCRMProps {
  bookings?: Booking[];
}

export const CustomerCRM: React.FC<CustomerCRMProps> = () => {
  const [customers, setCustomers] = useState<CrmCustomerListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const [search, setSearch] = useState<string>('');
  const [lifecycle, setLifecycle] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [repeatOnly, setRepeatOnly] = useState<boolean>(false);
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  const [availableTags, setAvailableTags] = useState<CrmTag[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [crmResult, tags] = await Promise.all([
        getCrmCustomers({
          search,
          lifecycle,
          tag: selectedTag,
          repeatOnly,
          overdueOnly,
          page,
          pageSize,
        }),
        getCrmTags(),
      ]);

      setCustomers(crmResult.customers);
      setTotalCount(crmResult.totalCount);
      setAvailableTags(tags);
    } catch (err: any) {
      console.error('[CRM] Load customers failed:', err);
      setError(err.message || 'Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [search, lifecycle, selectedTag, repeatOnly, overdueOnly, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    if (customers.length === 0) return;

    const columns = [
      { header: 'Mã Khách Hàng', accessor: (r: CrmCustomerListItem) => r.id },
      { header: 'Họ Tên', accessor: (r: CrmCustomerListItem) => r.fullName },
      { header: 'Số Điện Thoại', accessor: (r: CrmCustomerListItem) => r.phone },
      { header: 'Email', accessor: (r: CrmCustomerListItem) => r.email },
      { header: 'Vòng Đời CRM', accessor: (r: CrmCustomerListItem) => r.lifecycleStage },
      { header: 'Thẻ Gắn', accessor: (r: CrmCustomerListItem) => r.tags.map(t => t.name).join('; ') },
      { header: 'Tổng Booking', accessor: (r: CrmCustomerListItem) => r.totalBookings },
      { header: 'Booking Xác Nhận', accessor: (r: CrmCustomerListItem) => r.confirmedBookings },
      { header: 'Giá Trị Hợp Đồng (VNĐ)', accessor: (r: CrmCustomerListItem) => r.confirmedBookingValue },
      { header: 'Thực Thu (VNĐ)', accessor: (r: CrmCustomerListItem) => r.actualCashReceived },
      { header: 'Còn Phải Thu (VNĐ)', accessor: (r: CrmCustomerListItem) => r.outstandingBalance },
      { header: 'Lần Đặt Gần Nhất', accessor: (r: CrmCustomerListItem) => r.lastBookingAt || '' },
      { header: 'Lần Đặt Tới', accessor: (r: CrmCustomerListItem) => r.nextBookingAt || '' },
      { header: 'Nhiệm Vụ Quá Hạn', accessor: (r: CrmCustomerListItem) => r.overdueTasksCount },
    ];

    const csvContent = generateCsv(customers, columns);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`Maison_MIPA_CRM_Customers_${dateStr}.csv`, csvContent);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA CLIENT RELATIONSHIP MANAGEMENT
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0 0 0', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
            Khách Hàng & Customer 360
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCsv}
            disabled={customers.length === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FFFDF6',
              border: '1px solid #C6A45F',
              borderRadius: '12px',
              color: '#604634',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: customers.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: customers.length === 0 ? 0.6 : 1,
            }}
          >
            <Download size={15} /> Xuất CSV
          </button>
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
            aria-label="Tải lại dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '1.2rem',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        boxShadow: '0 2px 8px rgba(96, 70, 52, 0.04)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="mipa-input"
              style={{ paddingLeft: '36px', height: '40px', width: '100%' }}
            />
          </div>

          {/* Lifecycle filter */}
          <div>
            <select
              value={lifecycle}
              onChange={(e) => {
                setLifecycle(e.target.value);
                setPage(1);
              }}
              className="mipa-input"
              style={{ height: '40px', width: '100%' }}
            >
              <option value="">Tất cả vòng đời</option>
              <option value="NEW">Mới (NEW)</option>
              <option value="CONSULTATION">Đang tư vấn (CONSULTATION)</option>
              <option value="QUALIFIED">Tiềm năng (QUALIFIED)</option>
              <option value="BOOKED">Đã đặt cọc (BOOKED)</option>
              <option value="ACTIVE">Đang chụp/hậu kỳ (ACTIVE)</option>
              <option value="DELIVERED">Đã bàn giao (DELIVERED)</option>
              <option value="RETURNING">Khách quay lại (RETURNING)</option>
              <option value="INACTIVE">Không hoạt động (INACTIVE)</option>
            </select>
          </div>

          {/* Tag filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              className="mipa-input"
              style={{ height: '40px', width: '100%' }}
            >
              <option value="">Tất cả thẻ tags</option>
              {availableTags.map(t => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Checkbox Chips */}
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#604634', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={repeatOnly}
                onChange={(e) => {
                  setRepeatOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Khách quay lại ({'>'}1 booking)
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#DC2626', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Có việc quá hạn
            </label>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '1.2rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '12px', color: '#991B1B', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> Không thể tải dữ liệu CRM
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem' }}>{error}</p>
        </div>
      )}

      {/* Main Table / Directory */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            Đang truy xuất dữ liệu CRM...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            <Users size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#604634' }}>Không tìm thấy khách hàng nào</div>
            <p style={{ fontSize: '0.85rem', color: '#6E5F55', margin: '0.3rem 0 0 0' }}>
              Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F3EB', color: '#604634', borderBottom: '1px solid #EFE6C9', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.9rem 1.2rem' }}>Khách Hàng</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Vòng Đời / Thẻ</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Bookings</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Hợp Đồng</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Thực Thu</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Còn Thu</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Lịch Hẹn & Follow-up</th>
                  <th style={{ padding: '0.9rem 1.2rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={{
                      borderBottom: '1px solid #F3EDE2',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFDF6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.92rem' }}>
                        {c.fullName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                        {c.phone || 'Chưa có SĐT'} • {c.email}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#EFE6C9',
                          color: '#604634',
                        }}>
                          {c.lifecycleStage}
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {c.tags.map((t) => (
                            <span
                              key={t.id}
                              style={{
                                fontSize: '0.7rem',
                                color: t.color,
                                backgroundColor: `${t.color}15`,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#604634' }}>
                        {c.confirmedBookings}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6E5F55' }}>
                        /{c.totalBookings}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'right', fontWeight: 600, color: '#604634' }}>
                      {c.confirmedBookingValue.toLocaleString('vi-VN')}đ
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                      {c.actualCashReceived.toLocaleString('vi-VN')}đ
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700,
                        color: c.outstandingBalance > 0 ? '#B45309' : '#10B981',
                      }}>
                        {c.outstandingBalance.toLocaleString('vi-VN')}đ
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      {c.nextBookingAt ? (
                        <div style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 600 }}>
                          📅 Lịch chụp: {new Date(c.nextBookingAt).toLocaleDateString('vi-VN')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Không có lịch sắp tới</div>
                      )}
                      {c.overdueTasksCount > 0 ? (
                        <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700, marginTop: '0.2rem' }}>
                          ⚠️ {c.overdueTasksCount} việc quá hạn
                        </div>
                      ) : c.todayTasksCount > 0 ? (
                        <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600, marginTop: '0.2rem' }}>
                          🔔 {c.todayTasksCount} việc cần làm hôm nay
                        </div>
                      ) : null}
                    </td>

                    <td style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId(c.id);
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          backgroundColor: '#8C6E53',
                          color: '#FFFDF6',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Chi Tiết 360°
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{
          padding: '0.8rem 1.2rem',
          borderTop: '1px solid #EFE6C9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F7F3EB',
          fontSize: '0.85rem',
          color: '#604634',
        }}>
          <div>
            Hiển thị <strong>{customers.length}</strong> / <strong>{totalCount}</strong> khách hàng (Trang {page}/{totalPages})
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '0.35rem 0.65rem',
                border: '1px solid #C6A45F',
                backgroundColor: page === 1 ? '#EFE6C9' : '#FFFFFF',
                borderRadius: '8px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
              }}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '0.35rem 0.65rem',
                border: '1px solid #C6A45F',
                backgroundColor: page >= totalPages ? '#EFE6C9' : '#FFFFFF',
                borderRadius: '8px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Customer 360 Drawer */}
      {selectedCustomerId && (
        <Customer360Drawer
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onCustomerUpdated={loadData}
        />
      )}
    </div>
  );
};
