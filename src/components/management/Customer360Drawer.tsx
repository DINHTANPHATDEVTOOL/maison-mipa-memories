import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronRight,
  CreditCard,
  History,
} from 'lucide-react';
import { FocusTrap } from '../ui/FocusTrap';
import {
  getCustomer360,
  recordCrmInteraction,
  createFollowUpTask,
  updateFollowUpTaskStatus,
  assignCustomerTag,
  removeCustomerTag,
  getCrmTags,
} from '../../services/crmService';
import { recordPaymentReceipt } from '../../services/financialLedgerService';
import type {
  Customer360,
  CrmTag,
  CrmInteractionType,
  CrmChannel,
  CrmTaskPriority,
  FinancialPaymentMethod,
} from '../../types';

interface Customer360DrawerProps {
  customerId: string | null;
  onClose: () => void;
  onCustomerUpdated?: () => void;
}

export const Customer360Drawer: React.FC<Customer360DrawerProps> = ({
  customerId,
  onClose,
  onCustomerUpdated,
}) => {
  const [data, setData] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'interactions' | 'finance' | 'tasks'>('overview');
  
  // Available tags for adding
  const [availableTags, setAvailableTags] = useState<CrmTag[]>([]);
  const [showAddTagModal, setShowAddTagModal] = useState<boolean>(false);

  // Modals
  const [showInteractionModal, setShowInteractionModal] = useState<boolean>(false);
  const [interactionForm, setInteractionForm] = useState<{
    type: CrmInteractionType;
    channel: CrmChannel;
    summary: string;
    outcome: string;
    nextFollowUpDate: string;
    bookingId?: string;
  }>({
    type: 'CONSULTATION_CALL',
    channel: 'PHONE',
    summary: '',
    outcome: '',
    nextFollowUpDate: '',
  });

  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    dueAt: string;
    priority: CrmTaskPriority;
    bookingId?: string;
  }>({
    title: '',
    description: '',
    dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    priority: 'NORMAL',
  });

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentForm, setPaymentForm] = useState<{
    bookingId: string;
    amount: number;
    method: FinancialPaymentMethod;
    referenceNote: string;
  }>({
    bookingId: '',
    amount: 0,
    method: 'BANK_TRANSFER',
    referenceNote: '',
  });

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCustomerData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [c360, tags] = await Promise.all([
        getCustomer360(customerId),
        getCrmTags(),
      ]);
      setData(c360);
      setAvailableTags(tags);
    } catch (err: any) {
      console.error('[Customer360] Load error:', err);
      setError(err.message || 'Không thể tải thông tin khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId, loadCustomerData]);

  if (!customerId) return null;

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionForm.summary.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await recordCrmInteraction({
        customerId,
        bookingId: interactionForm.bookingId || undefined,
        interactionType: interactionForm.type,
        channel: interactionForm.channel,
        summary: interactionForm.summary.trim(),
        outcome: interactionForm.outcome.trim() || undefined,
        nextFollowUpAt: interactionForm.nextFollowUpDate ? new Date(interactionForm.nextFollowUpDate).toISOString() : undefined,
      });
      setShowInteractionModal(false);
      setInteractionForm({
        type: 'CONSULTATION_CALL',
        channel: 'PHONE',
        summary: '',
        outcome: '',
        nextFollowUpDate: '',
      });
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi lưu tương tác');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.dueAt) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await createFollowUpTask({
        customerId,
        bookingId: taskForm.bookingId || undefined,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        dueAt: new Date(taskForm.dueAt).toISOString(),
        priority: taskForm.priority,
      });
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        priority: 'NORMAL',
      });
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi tạo nhiệm vụ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.bookingId || paymentForm.amount <= 0) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await recordPaymentReceipt({
        bookingId: paymentForm.bookingId,
        transactionType: 'BALANCE',
        amount: paymentForm.amount,
        method: paymentForm.method,
        referenceNote: paymentForm.referenceNote.trim() || 'Thu phần còn lại',
      });
      setShowPaymentModal(false);
      setPaymentForm({
        bookingId: '',
        amount: 0,
        method: 'BANK_TRANSFER',
        referenceNote: '',
      });
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi ghi nhận thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      await updateFollowUpTaskStatus(taskId, nextStatus as any);
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      await assignCustomerTag(customerId, tagId);
      setShowAddTagModal(false);
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err) {
      console.error('Failed to assign tag:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeCustomerTag(customerId, tagId);
      await loadCustomerData();
      onCustomerUpdated?.();
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          height: '100%',
          backgroundColor: '#FFFDF6',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#604634',
            color: '#FFFDF6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(239, 230, 201, 0.2)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#EFE6C9' }}>
              CUSTOMER 360 PROFILE
            </div>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.35rem', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
              {data ? data.identity.fullName : 'Đang tải thông tin...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng chi tiết khách hàng"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFDF6',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#8C6E53' }}>
              Đang tải dữ liệu Customer 360...
            </div>
          )}

          {error && (
            <div style={{ padding: '1.2rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '12px', color: '#991B1B' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> Không thể tải dữ liệu CRM
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem' }}>{error}</p>
              <button
                onClick={loadCustomerData}
                style={{
                  marginTop: '0.8rem',
                  padding: '0.4rem 0.8rem',
                  backgroundColor: '#991B1B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {data && !loading && (
            <div>
              {/* Top Highlights Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#F7F3EB', padding: '1rem', borderRadius: '14px', border: '1px solid #EFE6C9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Giá Trị Booking</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#604634', marginTop: '0.2rem' }}>
                    {data.financialSummary.confirmedBookingValue.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                    {data.bookingsSummary.confirmedBookings} booking đã xác nhận
                  </div>
                </div>

                <div style={{ backgroundColor: '#ECFDF5', padding: '1rem', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600 }}>Thực Thu (Cash In)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#065F46', marginTop: '0.2rem' }}>
                    {data.financialSummary.actualCashReceived.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.2rem' }}>
                    Cọc: {data.financialSummary.confirmedDeposits.toLocaleString('vi-VN')}đ
                  </div>
                </div>

                <div style={{ backgroundColor: data.financialSummary.outstandingBalance > 0 ? '#FFFBEB' : '#F7F3EB', padding: '1rem', borderRadius: '14px', border: `1px solid ${data.financialSummary.outstandingBalance > 0 ? '#FDE68A' : '#EFE6C9'}` }}>
                  <div style={{ fontSize: '0.75rem', color: data.financialSummary.outstandingBalance > 0 ? '#B45309' : '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Còn Phải Thu</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: data.financialSummary.outstandingBalance > 0 ? '#92400E' : '#604634', marginTop: '0.2rem' }}>
                    {data.financialSummary.outstandingBalance.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                    {data.financialSummary.outstandingBalance > 0 ? 'Chưa thu đủ' : 'Đã thu trọn vẹn'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F7F3EB', padding: '1rem', borderRadius: '14px', border: '1px solid #EFE6C9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8C6E53', textTransform: 'uppercase', fontWeight: 600 }}>Vòng Đời & Tần Suất</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{
                      backgroundColor: '#604634',
                      color: '#FFFDF6',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      {data.crm.lifecycleStage}
                    </span>
                    {data.bookingsSummary.isRepeatCustomer && (
                      <span style={{
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}>
                        Khách Quay Lại
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.3rem' }}>
                    Tổng {data.bookingsSummary.totalBookings} lần liên hệ
                  </div>
                </div>
              </div>

              {/* Contact & Tags Row */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#604634', fontSize: '0.88rem' }}>
                        <Phone size={15} color="#8C6E53" /> {data.identity.phone || 'Chưa cập nhật SĐT'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#604634', fontSize: '0.88rem' }}>
                        <Mail size={15} color="#8C6E53" /> {data.identity.email}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6E5F55', fontSize: '0.8rem' }}>
                        <Clock size={14} /> Liên hệ gần nhất: {data.crm.lastContactAt ? new Date(data.crm.lastContactAt).toLocaleDateString('vi-VN') : 'Mới'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setShowInteractionModal(true)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        backgroundColor: '#604634',
                        color: '#FFFDF6',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <MessageSquare size={14} /> Ghi nhận tương tác
                    </button>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        backgroundColor: '#8C6E53',
                        color: '#FFFDF6',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Plus size={14} /> Giao follow-up
                    </button>
                    {data.financialSummary.outstandingBalance > 0 && data.bookings.length > 0 && (
                      <button
                        onClick={() => {
                          const targetBooking = data.bookings.find(b => b.status === 'CONFIRMED' || b.status === 'DELIVERED') || data.bookings[0];
                          setPaymentForm({
                            bookingId: targetBooking.id,
                            amount: data.financialSummary.outstandingBalance,
                            method: 'BANK_TRANSFER',
                            referenceNote: `Thu nốt số dư ${targetBooking.code}`,
                          });
                          setShowPaymentModal(true);
                        }}
                        style={{
                          padding: '0.45rem 0.85rem',
                          backgroundColor: '#047857',
                          color: '#FFFDF6',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <CreditCard size={14} /> Thu tiền
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags row */}
                <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid #F3EDE2', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: '#8C6E53', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Tag size={13} /> Thẻ:
                  </span>
                  {data.crm.tags.map((t) => (
                    <span
                      key={t.id}
                      style={{
                        backgroundColor: `${t.color}1A`,
                        color: t.color,
                        border: `1px solid ${t.color}4D`,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {t.name}
                      <button
                        onClick={() => handleRemoveTag(t.id)}
                        aria-label={`Gỡ thẻ ${t.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.color,
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.8rem',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setShowAddTagModal(true)}
                    style={{
                      background: 'none',
                      border: '1px dashed #8C6E53',
                      color: '#8C6E53',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Gắn thẻ
                  </button>
                </div>
              </div>

              {/* Navigation Tabs inside Customer 360 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #EFE6C9', marginBottom: '1.2rem', gap: '0.5rem' }}>
                {[
                  { key: 'overview', label: 'Tổng Quan' },
                  { key: 'bookings', label: `Bookings (${data.bookings.length})` },
                  { key: 'interactions', label: `Tương Tác (${data.interactions.length})` },
                  { key: 'finance', label: `Sổ Quỹ (${data.financialTransactions.length})` },
                  { key: 'tasks', label: `Follow-up (${data.followUpTasks.length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === t.key ? '2px solid #604634' : '2px solid transparent',
                      color: activeTab === t.key ? '#604634' : '#8C6E53',
                      fontWeight: activeTab === t.key ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW & PREFERENCES */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {/* Preferences block */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EFE6C9' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', color: '#604634', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} color="#C6A45F" /> Sở Thích & Phong Cách Đã Đặt
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#8C6E53', fontWeight: 600, marginBottom: '0.4rem' }}>Dịch Vụ Ưa Chuộng:</div>
                        {data.preferences.topServices.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Chưa có dữ liệu dịch vụ</div>
                        ) : (
                          data.preferences.topServices.map((s, idx) => (
                            <div key={idx} style={{ fontSize: '0.82rem', color: '#604634', marginBottom: '0.2rem' }}>
                              • {s.name} ({s.count} lần)
                            </div>
                          ))
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#8C6E53', fontWeight: 600, marginBottom: '0.4rem' }}>Concept Đã Chọn:</div>
                        {data.preferences.topConcepts.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Chưa có dữ liệu concept</div>
                        ) : (
                          data.preferences.topConcepts.map((c, idx) => (
                            <div key={idx} style={{ fontSize: '0.82rem', color: '#604634', marginBottom: '0.2rem' }}>
                              • {c.name} ({c.count} lần)
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upcoming & Recent Booking preview */}
                  {data.bookingsSummary.upcomingBooking && (
                    <div style={{ backgroundColor: '#F0FDF4', padding: '1.2rem', borderRadius: '16px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>
                        Booking Sắp Tới: {data.bookingsSummary.upcomingBooking.code}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#166534', marginTop: '0.3rem' }}>
                        {data.bookingsSummary.upcomingBooking.serviceName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#15803D', marginTop: '0.2rem' }}>
                        📅 Ngày: {data.bookingsSummary.upcomingBooking.bookingDate} lúc {data.bookingsSummary.upcomingBooking.startTime}
                      </div>
                    </div>
                  )}

                  {/* Internal Summary Note */}
                  {data.crm.internalSummary && (
                    <div style={{ backgroundColor: '#FFFBEB', padding: '1.2rem', borderRadius: '16px', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 700, textTransform: 'uppercase' }}>
                        Ghi Chú Vận Hành Nội Bộ
                      </div>
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#78350F', lineHeight: 1.5 }}>
                        {data.crm.internalSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BOOKINGS */}
              {activeTab === 'bookings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {data.bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>Chưa có lịch đặt chụp nào.</div>
                  ) : (
                    data.bookings.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1.1rem',
                          borderRadius: '14px',
                          border: '1px solid #EFE6C9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.8rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 700, color: '#604634', fontSize: '0.95rem' }}>#{b.code}</span>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#EFE6C9',
                              color: '#604634',
                            }}>
                              {b.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6E5F55', marginTop: '0.3rem' }}>
                            {b.serviceName || 'Dịch vụ'} • {b.packageName || 'Gói'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.2rem' }}>
                            📅 {b.bookingDate} ({b.startTime})
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#604634' }}>
                            {Number(b.totalAmount || 0).toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                            Đã cọc: {Number(b.depositAmount || 0).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: INTERACTIONS TIMELINE */}
              {activeTab === 'interactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {data.interactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>Chưa có tương tác nào được ghi nhận.</div>
                  ) : (
                    data.interactions.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1rem',
                          borderRadius: '14px',
                          border: '1px solid #EFE6C9',
                          borderLeft: '4px solid #8C6E53',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#604634', fontSize: '0.85rem' }}>
                            [{it.interactionType}] qua {it.channel}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#8C6E53' }}>
                            {new Date(it.occurredAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p style={{ margin: '0.4rem 0', fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                          {it.summary}
                        </p>
                        {it.outcome && (
                          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 500 }}>
                            Kết quả: {it.outcome}
                          </div>
                        )}
                        {it.actorName && (
                          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.3rem' }}>
                            Nhân viên: {it.actorName}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: FINANCIAL TRANSACTIONS */}
              {activeTab === 'finance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {data.financialTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>Chưa có giao dịch nội bộ nào.</div>
                  ) : (
                    data.financialTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1rem',
                          borderRadius: '14px',
                          border: '1px solid #EFE6C9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: tx.direction === 'IN' ? '#DCFCE7' : '#FEE2E2',
                              color: tx.direction === 'IN' ? '#166534' : '#991B1B',
                            }}>
                              {tx.transactionType} ({tx.direction})
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#604634' }}>
                              {tx.method}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6E5F55', marginTop: '0.3rem' }}>
                            {tx.referenceNote || 'Không có ghi chú'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#8C6E53', marginTop: '0.2rem' }}>
                            🕒 {new Date(tx.receivedAt).toLocaleString('vi-VN')} {tx.recordedByName ? `(bởi ${tx.recordedByName})` : ''}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: tx.direction === 'IN' ? '#047857' : '#DC2626',
                          }}>
                            {tx.direction === 'IN' ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: FOLLOW-UP TASKS */}
              {activeTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {data.followUpTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>Chưa có nhiệm vụ follow-up nào.</div>
                  ) : (
                    data.followUpTasks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1rem',
                          borderRadius: '14px',
                          border: '1px solid #EFE6C9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <button
                            onClick={() => handleToggleTaskStatus(t.id, t.status)}
                            aria-label={t.status === 'DONE' ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: t.status === 'DONE' ? '#059669' : '#D1D5DB',
                            }}
                          >
                            <CheckCircle2 size={22} />
                          </button>
                          <div>
                            <div style={{
                              fontWeight: 600,
                              color: '#604634',
                              fontSize: '0.9rem',
                              textDecoration: t.status === 'DONE' ? 'line-through' : 'none',
                            }}>
                              {t.title}
                            </div>
                            {t.description && (
                              <div style={{ fontSize: '0.8rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                                {t.description}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#8C6E53', marginTop: '0.2rem' }}>
                              Hạn: {new Date(t.dueAt).toLocaleString('vi-VN')} • Ưu tiên: {t.priority}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: t.status === 'DONE' ? '#DCFCE7' : '#FEF3C7',
                          color: t.status === 'DONE' ? '#166534' : '#92400E',
                        }}>
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL: ADD INTERACTION */}
        {showInteractionModal && (
          <FocusTrap onEscape={() => setShowInteractionModal(false)}>
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
              onClick={() => setShowInteractionModal(false)}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '1.8rem',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif' }}>
                  Ghi Nhận Tương Tác CRM
                </h3>
                {actionError && (
                  <div style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{actionError}</div>
                )}
                <form onSubmit={handleAddInteraction} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Loại tương tác
                      </label>
                      <select
                        value={interactionForm.type}
                        onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as any })}
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
                      >
                        <option value="CONSULTATION_CALL">Cuộc gọi tư vấn</option>
                        <option value="ZALO">Trao đổi Zalo</option>
                        <option value="PHONE_CALL">Điện thoại</option>
                        <option value="EMAIL">Email</option>
                        <option value="IN_PERSON">Gặp trực tiếp</option>
                        <option value="FOLLOW_UP">Follow-up</option>
                        <option value="INTERNAL_NOTE">Ghi chú nội bộ</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Kênh liên lạc
                      </label>
                      <select
                        value={interactionForm.channel}
                        onChange={(e) => setInteractionForm({ ...interactionForm, channel: e.target.value as any })}
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
                      >
                        <option value="PHONE">Điện thoại</option>
                        <option value="ZALO">Zalo</option>
                        <option value="EMAIL">Email</option>
                        <option value="IN_PERSON">Tại studio</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Nội dung tóm tắt *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={interactionForm.summary}
                      onChange={(e) => setInteractionForm({ ...interactionForm, summary: e.target.value })}
                      placeholder="Chi tiết trao đổi với khách..."
                      className="mipa-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Kết quả / Đề xuất tiếp theo
                    </label>
                    <input
                      type="text"
                      value={interactionForm.outcome}
                      onChange={(e) => setInteractionForm({ ...interactionForm, outcome: e.target.value })}
                      placeholder="VD: Khách ưng concept Parisian, hẹn chiều mai chốt cọc"
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowInteractionModal(false)}
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
                      disabled={actionLoading}
                      style={{
                        padding: '0.5rem 1.2rem',
                        backgroundColor: '#604634',
                        color: '#FFFDF6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {actionLoading ? 'Đang lưu...' : 'Lưu Tương Tác'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </FocusTrap>
        )}

        {/* MODAL: ADD FOLLOW-UP TASK */}
        {showTaskModal && (
          <FocusTrap onEscape={() => setShowTaskModal(false)}>
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
              onClick={() => setShowTaskModal(false)}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '1.8rem',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif' }}>
                  Tạo Nhiệm Vụ Follow-up
                </h3>
                {actionError && (
                  <div style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{actionError}</div>
                )}
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Tiêu đề nhiệm vụ *
                    </label>
                    <input
                      required
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="VD: Gọi điện nhắc khách chọn ảnh..."
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Hạn xử lý (Due date) *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        value={taskForm.dueAt}
                        onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Mức độ ưu tiên
                      </label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
                      >
                        <option value="LOW">Thấp (Low)</option>
                        <option value="NORMAL">Bình thường (Normal)</option>
                        <option value="HIGH">Cao (High)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Ghi chú chi tiết
                    </label>
                    <textarea
                      rows={3}
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Hướng dẫn hoặc ngữ cảnh cụ thể..."
                      className="mipa-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowTaskModal(false)}
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
                      disabled={actionLoading}
                      style={{
                        padding: '0.5rem 1.2rem',
                        backgroundColor: '#8C6E53',
                        color: '#FFFDF6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {actionLoading ? 'Đang tạo...' : 'Tạo Nhiệm Vụ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </FocusTrap>
        )}

        {/* MODAL: RECORD PAYMENT RECEIPT */}
        {showPaymentModal && (
          <FocusTrap onEscape={() => setShowPaymentModal(false)}>
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
              onClick={() => setShowPaymentModal(false)}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '1.8rem',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif' }}>
                  Xác Nhận Đã Thu Tiền (Nội Bộ)
                </h3>
                {actionError && (
                  <div style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{actionError}</div>
                )}
                <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Chọn Booking
                    </label>
                    <select
                      value={paymentForm.bookingId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bookingId: e.target.value })}
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    >
                      {(data?.bookings || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.code} ({b.bookingDate}) — Tổng: {Number(b.totalAmount || 0).toLocaleString('vi-VN')}đ
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Số tiền thực thu (VNĐ) *
                      </label>
                      <input
                        required
                        type="number"
                        min="1000"
                        step="1000"
                        value={paymentForm.amount || ''}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                        placeholder="Số tiền thực thu"
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                        Hình thức thu
                      </label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                        className="mipa-input"
                        style={{ width: '100%', height: '38px' }}
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
                      value={paymentForm.referenceNote}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNote: e.target.value })}
                      placeholder="VD: Thu nốt tại studio sau buổi chụp..."
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
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
                      disabled={actionLoading}
                      style={{
                        padding: '0.5rem 1.2rem',
                        backgroundColor: '#047857',
                        color: '#FFFDF6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {actionLoading ? 'Đang ghi nhận...' : 'Ghi Nhận Thu Tiền'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </FocusTrap>
        )}

        {/* MODAL: ADD TAG */}
        {showAddTagModal && (
          <FocusTrap onEscape={() => setShowAddTagModal(false)}>
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
              onClick={() => setShowAddTagModal(false)}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  width: '100%',
                  maxWidth: '400px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.1rem', fontFamily: 'Cinzel, serif' }}>
                  Gắn Thẻ Khách Hàng
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {availableTags
                    .filter(t => !(data?.crm?.tags || []).some(ct => ct.id === t.id))
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleAddTag(t.id)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          borderRadius: '10px',
                          border: '1px solid #EFE6C9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#FFFDF6',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: t.color }}>{t.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#8C6E53' }}>{t.description}</span>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => setShowAddTagModal(false)}
                  style={{
                    marginTop: '1rem',
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#F3F4F6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </FocusTrap>
        )}
      </div>
    </div>
  );
};
