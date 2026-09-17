import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  CreditCard,
  Download,
  Filter,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from 'lucide-react';
import { FocusTrap } from '../ui/FocusTrap';
import {
  getFinancialTransactions,
  getFinancialLedgerSummary,
  recordPaymentReceipt,
  type FinancialSummary,
} from '../../services/financialLedgerService';
import { generateCsv, downloadCsv } from '../../utils/csvExport';
import type {
  FinancialTransaction,
  FinancialTransactionType,
  FinancialPaymentMethod,
  Booking,
} from '../../types';

interface FinancialLedgerDashboardProps {
  bookings?: Booking[];
}

export const FinancialLedgerDashboard: React.FC<FinancialLedgerDashboardProps> = ({
  bookings = [],
}) => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');

  // Modal "Xác nhận đã thu phần còn lại"
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<FinancialPaymentMethod>('BANK_TRANSFER');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, txs] = await Promise.all([
        getFinancialLedgerSummary(),
        getFinancialTransactions({
          transactionType: (typeFilter as FinancialTransactionType) || undefined,
          method: (methodFilter as FinancialPaymentMethod) || undefined,
          limit: 100,
        }),
      ]);
      setSummary(sum);
      setTransactions(txs);
    } catch (err: any) {
      console.error('[Finance] Load error:', err);
      setError(err.message || 'Không thể tải dữ liệu sổ quỹ.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, methodFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    if (transactions.length === 0) return;

    const columns = [
      { header: 'Mã Giao Dịch', accessor: (t: FinancialTransaction) => t.id },
      { header: 'Mã Booking', accessor: (t: FinancialTransaction) => t.bookingCode || t.bookingId },
      { header: 'Khách Hàng', accessor: (t: FinancialTransaction) => t.customerName || '' },
      { header: 'Loại Giao Dịch', accessor: (t: FinancialTransaction) => t.transactionType },
      { header: 'Chiều Tiền', accessor: (t: FinancialTransaction) => t.direction },
      { header: 'Số Tiền (VNĐ)', accessor: (t: FinancialTransaction) => t.amount },
      { header: 'Hình Thức', accessor: (t: FinancialTransaction) => t.method },
      { header: 'Thời Điểm Thu', accessor: (t: FinancialTransaction) => t.receivedAt },
      { header: 'Ghi Chú', accessor: (t: FinancialTransaction) => t.referenceNote || '' },
      { header: 'Người Ghi Nhận', accessor: (t: FinancialTransaction) => t.recordedByName || '' },
    ];

    const csv = generateCsv(transactions, columns);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`Maison_MIPA_Financial_Ledger_${dateStr}.csv`, csv);
  };

  // Selected booking details for modal
  const activeBooking = bookings.find(b => b.id === selectedBookingId);
  const bookingTotal = activeBooking?.totalAmount || 0;
  const depositPaid = activeBooking?.depositAmount || 0;
  const previousCollected = transactions
    .filter(t => t.bookingId === selectedBookingId)
    .reduce((sum, t) => sum + (t.direction === 'IN' ? t.amount : -t.amount), 0);
  const remainingExpected = Math.max(0, bookingTotal - previousCollected);

  const handleOpenReceiptModal = (bId?: string) => {
    const targetId = bId || (bookings.length > 0 ? bookings[0].id : '');
    setSelectedBookingId(targetId);
    const b = bookings.find(item => item.id === targetId);
    const total = b?.totalAmount || 0;
    const pastCollected = transactions
      .filter(t => t.bookingId === targetId)
      .reduce((sum, t) => sum + (t.direction === 'IN' ? t.amount : -t.amount), 0);
    const diff = Math.max(0, total - pastCollected);
    setAmount(diff > 0 ? diff : 0);
    setMethod('BANK_TRANSFER');
    setReferenceNote(`Thu nốt số dư ${b?.bookingCode || ''}`);
    setSubmitError(null);
    setShowReceiptModal(true);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || amount <= 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await recordPaymentReceipt({
        bookingId: selectedBookingId,
        transactionType: 'BALANCE',
        amount,
        method,
        referenceNote: referenceNote.trim() || 'Xác nhận thu phần còn lại',
      });
      setShowReceiptModal(false);
      await loadData();
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi khi ghi nhận phiếu thu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={15} color="#047857" /> SỔ QUỸ & TÀI CHÍNH NỘI BỘ (STAFF ONLY)
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0 0 0', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
            Quản Lý Thu Tiền & Sổ Quỹ Studio
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => handleOpenReceiptModal()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#047857',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFDF6',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Plus size={15} /> Xác Nhận Đã Thu Tiền
          </button>
          <button
            onClick={handleExportCsv}
            disabled={transactions.length === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FFFDF6',
              border: '1px solid #C6A45F',
              borderRadius: '12px',
              color: '#604634',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: transactions.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Download size={15} /> Xuất Báo Cáo Sổ Quỹ
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
            aria-label="Tải lại sổ quỹ"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Giá Trị Booking Đã Chốt</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#604634', marginTop: '0.3rem' }}>
              {summary.confirmedBookingValue.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>Tổng giá trị hợp đồng</div>
          </div>

          <div style={{ backgroundColor: '#ECFDF5', padding: '1.2rem', borderRadius: '16px', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: '0.78rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600 }}>Thực Thu Thực Tế (Net Cash)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065F46', marginTop: '0.3rem' }}>
              {summary.actualCashReceived.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.2rem' }}>Tiền thực tế đã vào quỹ</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Tiền Cọc Đã Xác Nhận</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#604634', marginTop: '0.3rem' }}>
              {summary.confirmedDeposits.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>Cọc giữ lịch studio</div>
          </div>

          <div style={{ backgroundColor: summary.outstandingBalance > 0 ? '#FFFBEB' : '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: `1px solid ${summary.outstandingBalance > 0 ? '#FDE68A' : '#EFE6C9'}` }}>
            <div style={{ fontSize: '0.78rem', color: summary.outstandingBalance > 0 ? '#B45309' : '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Còn Phải Thu</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.outstandingBalance > 0 ? '#92400E' : '#10B981', marginTop: '0.3rem' }}>
              {summary.outstandingBalance.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>Số dư còn nợ</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
            <div style={{ fontSize: '0.78rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Hoàn Tiền (Refunds)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#DC2626', marginTop: '0.3rem' }}>
              {summary.totalRefunded.toLocaleString('vi-VN')}đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>Đã hoàn cho khách hủy</div>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '1rem 1.2rem',
        borderRadius: '16px',
        border: '1px solid #EFE6C9',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#604634', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={15} /> Lọc giao dịch:
        </span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="mipa-input"
          style={{ height: '36px', minWidth: '160px' }}
        >
          <option value="">Tất cả loại giao dịch</option>
          <option value="DEPOSIT">Đặt cọc (DEPOSIT)</option>
          <option value="BALANCE">Thanh toán nốt (BALANCE)</option>
          <option value="ADDITIONAL_CHARGE">Phụ phí (ADDITIONAL_CHARGE)</option>
          <option value="REFUND">Hoàn tiền (REFUND)</option>
          <option value="ADJUSTMENT">Điều chỉnh (ADJUSTMENT)</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="mipa-input"
          style={{ height: '36px', minWidth: '160px' }}
        >
          <option value="">Tất cả hình thức</option>
          <option value="BANK_TRANSFER">Chuyển khoản</option>
          <option value="CASH">Tiền mặt</option>
          <option value="OTHER">Khác</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '1.2rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '12px', color: '#991B1B', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> Lỗi nạp sổ quỹ
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem' }}>{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            Đang tải dữ liệu giao dịch...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            <CreditCard size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#604634' }}>Chưa có giao dịch sổ quỹ nào</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F3EB', color: '#604634', borderBottom: '1px solid #EFE6C9', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.9rem 1.2rem' }}>Thời Gian</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Mã Booking / Khách</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Loại Giao Dịch</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Hình Thức</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Số Tiền</th>
                  <th style={{ padding: '0.9rem 1.2rem' }}>Ghi Chú & Người Ghi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: '1px solid #F3EDE2' }}
                  >
                    <td style={{ padding: '0.9rem 1.2rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#604634' }}>
                        {new Date(tx.receivedAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8C6E53' }}>
                        {new Date(tx.receivedAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#604634' }}>
                        #{tx.bookingCode || tx.bookingId.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6E5F55' }}>
                        {tx.customerName || 'Khách hàng'}
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: tx.direction === 'IN' ? '#DCFCE7' : '#FEE2E2',
                        color: tx.direction === 'IN' ? '#166534' : '#991B1B',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}>
                        {tx.direction === 'IN' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        {tx.transactionType}
                      </span>
                    </td>

                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#604634' }}>
                      {tx.method === 'BANK_TRANSFER' ? 'Chuyển khoản' : tx.method === 'CASH' ? 'Tiền mặt' : 'Khác'}
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: tx.direction === 'IN' ? '#047857' : '#DC2626',
                      }}>
                        {tx.direction === 'IN' ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')}đ
                      </span>
                    </td>

                    <td style={{ padding: '0.9rem 1.2rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                        {tx.referenceNote || '—'}
                      </div>
                      {tx.recordedByName && (
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                          Ghi bởi: {tx.recordedByName}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Xác nhận đã thu phần còn lại */}
      {showReceiptModal && (
        <FocusTrap onEscape={() => setShowReceiptModal(false)}>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowReceiptModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '2rem',
                width: '100%',
                maxWidth: '540px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#047857', fontWeight: 700 }}>
                PHIẾU THU NỘI BỘ STUDIO
              </div>
              <h3 style={{ margin: '0.2rem 0 1.2rem 0', color: '#604634', fontSize: '1.3rem', fontFamily: 'Cinzel, serif' }}>
                Xác Nhận Đã Thu Phần Còn Lại
              </h3>

              {submitError && (
                <div style={{ padding: '0.8rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '8px', color: '#991B1B', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                    Chọn Booking cần thu tiền *
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => handleOpenReceiptModal(e.target.value)}
                    className="mipa-input"
                    style={{ width: '100%', height: '40px' }}
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.bookingCode} ({b.customerName || 'Khách'}) — Hợp đồng: {Number(b.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calculation breakdown summary */}
                <div style={{ backgroundColor: '#F7F3EB', padding: '1rem', borderRadius: '12px', border: '1px solid #EFE6C9', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#6E5F55' }}>Tổng hợp đồng:</span>
                    <strong style={{ color: '#604634' }}>{bookingTotal.toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#6E5F55' }}>Cọc đã xác nhận:</span>
                    <span style={{ color: '#047857', fontWeight: 600 }}>{depositPaid.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#6E5F55' }}>Tổng tiền đã thu:</span>
                    <span style={{ color: '#047857', fontWeight: 600 }}>{previousCollected.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5DFD3', paddingTop: '0.4rem' }}>
                    <span style={{ color: '#8C6E53', fontWeight: 700 }}>Còn lại dự kiến:</span>
                    <strong style={{ color: '#B45309', fontSize: '1rem' }}>{remainingExpected.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Số tiền thực thu lần này (VNĐ) *
                    </label>
                    <input
                      required
                      type="number"
                      min="1000"
                      step="1000"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="mipa-input"
                      style={{ width: '100%', height: '40px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Phương thức thu
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="mipa-input"
                      style={{ width: '100%', height: '40px' }}
                    >
                      <option value="BANK_TRANSFER">Chuyển khoản</option>
                      <option value="CASH">Tiền mặt</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                    Ghi chú đối soát nội bộ
                  </label>
                  <input
                    type="text"
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    placeholder="VD: Thu tại quầy lễ tân sau khi bàn giao..."
                    className="mipa-input"
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#F3F4F6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#4B5563',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '0.5rem 1.4rem',
                      backgroundColor: '#047857',
                      color: '#FFFDF6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {submitting ? 'Đang ghi nhận...' : 'Xác Nhận Thu Tiền'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
};
