// ==============================================================================
// Maison MIPA Memories - Customer Portal (Connected to Real Authenticated Data)
// Hardened for Issue #7:
// - Uses real authenticated user (auth.uid())
// - No hardcoded cust_01, Nguyen Minh Anh, or mock VIP stats
// - Acknowledgements: customer_schedule_confirmed_at, customer_shoot_ack_at
// - Reschedule & cancellation requests
// - Google Drive delivery integration point ("Lấy ảnh")
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  acknowledgeCustomerSchedule,
  acknowledgeCustomerShoot,
  requestBookingReschedule,
  requestBookingCancel,
} from '../../services/bookingService';
import {
  Calendar,
  Camera,
  Check,
  AlertCircle,
  FolderDown,
  User as UserIcon,
  Phone,
  Mail,
  X,
  KeyRound,
  ShieldCheck,
  Save,
  Send,
  CheckCircle,
} from 'lucide-react';

interface CustomerPortalProps {
  bookings: Booking[];
  onOpenBooking: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ bookings, onOpenBooking }) => {
  const { user, isRootOwner, updateProfile, resetPassword } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'profile'>(
    searchParams.get('tab') === 'profile' ? 'profile' : 'bookings'
  );
  const [actionNotice, setActionNotice] = useState<string>('');

  // Profile edit state
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password reset via email state
  const [isSendingPasswordEmail, setIsSendingPasswordEmail] = useState(false);
  const [passwordEmailSuccess, setPasswordEmailSuccess] = useState('');
  const [passwordEmailError, setPasswordEmailError] = useState('');
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get('tab') === 'profile') {
      setActiveSubTab('profile');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'bookings' | 'profile') => {
    setActiveSubTab(tab);
    if (tab === 'profile') {
      setSearchParams({ tab: 'profile' });
    } else {
      setSearchParams({});
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    if (!editFullName.trim()) {
      setProfileErrorMsg('Họ và tên không được để trống.');
      return;
    }

    setIsSavingProfile(true);
    const res = await updateProfile({
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
    });
    setIsSavingProfile(false);

    if (res.success) {
      setProfileSuccessMsg('✓ Đã lưu thay đổi thông tin cá nhân thành công!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } else {
      setProfileErrorMsg(res.error || 'Không thể lưu thay đổi.');
    }
  };

  const handleRequestPasswordResetEmail = async () => {
    if (!user?.email) {
      setPasswordEmailError('Không tìm thấy địa chỉ email của tài khoản.');
      return;
    }

    if (countdown > 0) return;

    setPasswordEmailError('');
    setPasswordEmailSuccess('');
    setIsSendingPasswordEmail(true);

    const res = await resetPassword(user.email);
    setIsSendingPasswordEmail(false);

    if (res.success) {
      setPasswordEmailSuccess(`✓ Đã gửi email xác nhận đổi mật khẩu tới ${user.email}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam) và nhấp vào liên kết để thiết lập mật khẩu mới.`);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPasswordEmailError(res.error || 'Không thể gửi email xác nhận đổi mật khẩu.');
    }
  };

  // Reschedule / Cancel Modal states
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Filter bookings strictly by authenticated user's ID
  const customerBookings = user ? bookings.filter(b => b.customerId === user.id) : [];

  const handleAcknowledgeSchedule = async (bookingId: string) => {
    try {
      await acknowledgeCustomerSchedule(bookingId);
      setActionNotice('✓ Đã xác nhận đồng ý lịch chụp với studio.');
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err: any) {
      alert(`Không thể xác nhận lịch: ${err.message}`);
    }
  };

  const handleAcknowledgeShoot = async (bookingId: string) => {
    try {
      await acknowledgeCustomerShoot(bookingId);
      setActionNotice('✓ Đã xác nhận hoàn thành buổi chụp cùng nhiếp ảnh gia.');
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err: any) {
      alert(`Không thể xác nhận buổi chụp: ${err.message}`);
    }
  };

  const handleSendRescheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || !rescheduleDate || !rescheduleSlot) return;

    try {
      await requestBookingReschedule(rescheduleBooking.id, rescheduleDate, rescheduleSlot, rescheduleReason);
      setRescheduleBooking(null);
      setRescheduleDate('');
      setRescheduleSlot('');
      setRescheduleReason('');
      setActionNotice('✓ Đã gửi yêu cầu đổi lịch tới bộ phận điều phối studio.');
      setTimeout(() => setActionNotice(''), 5000);
    } catch (err: any) {
      alert(`Lỗi gửi yêu cầu: ${err.message}`);
    }
  };

  const handleSendCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBooking) return;

    try {
      await requestBookingCancel(cancelBooking.id, cancelReason);
      setCancelBooking(null);
      setCancelReason('');
      setActionNotice('✓ Đã gửi yêu cầu hủy lịch tới quản lý studio.');
      setTimeout(() => setActionNotice(''), 5000);
    } catch (err: any) {
      alert(`Lỗi gửi yêu cầu: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>

      {/* Customer Header Welcome Card with Real Identity */}
      <div className="mipa-card-gold" style={{ padding: '2rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            backgroundColor: '#FFFDF6',
            border: '3px solid #C6A45F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8C6E53',
            fontSize: '1.8rem',
            fontWeight: 700,
          }}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              CUSTOMER PORTAL • TÀI KHOẢN KHÁCH HÀNG
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0' }}>
              Xin chào, {user?.fullName || 'Quý Khách'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#6E5F55', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> {user?.email}</span>
              {user?.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> {user.phone}</span>}
            </div>
          </div>
        </div>

        <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ padding: '0.75rem 1.6rem', fontSize: '0.92rem' }}>
          <Calendar size={16} /> Đặt Lịch Chụp Mới
        </button>
      </div>

      {actionNotice && (
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '12px',
          color: '#166534',
          fontWeight: 600,
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Check size={18} /> {actionNotice}
        </div>
      )}

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleTabChange('bookings')}
          style={{
            background: activeSubTab === 'bookings' ? '#8C6E53' : 'transparent',
            color: activeSubTab === 'bookings' ? '#FFFDF6' : '#604634',
            border: 'none',
            padding: '0.6rem 1.4rem',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Calendar size={16} /> Lịch Chụp Của Tôi ({customerBookings.length})
        </button>
        <button
          onClick={() => handleTabChange('profile')}
          style={{
            background: activeSubTab === 'profile' ? '#8C6E53' : 'transparent',
            color: activeSubTab === 'profile' ? '#FFFDF6' : '#604634',
            border: 'none',
            padding: '0.6rem 1.4rem',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
        >
          <UserIcon size={16} /> Thông Tin Cá Nhân & Đổi Mật Khẩu
        </button>
      </div>

      {/* SUBTAB 1: MY BOOKINGS */}
      {activeSubTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {customerBookings.length === 0 ? (
            <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px' }}>
              <Camera size={42} color="#C6A45F" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.5rem' }}>
                Quý khách chưa có đơn đặt lịch nào
              </h3>
              <p style={{ color: '#6E5F55', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Khám phá các gói chụp kỷ niệm thanh xuân, gia đình hoặc chân dung nghệ thuật tại Maison MIPA.
              </p>
              <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ padding: '0.75rem 2rem' }}>
                Đặt Lịch Ngay
              </button>
            </div>
          ) : (
            customerBookings.map((b) => (
              <div key={b.id} className="mipa-card" style={{ padding: '1.8rem', borderRadius: '18px' }}>
                {/* Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', borderBottom: '1px solid #EFE6C9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', letterSpacing: '0.05em' }}>
                      MÃ ĐƠN: {b.bookingCode}
                    </span>
                    <h3 style={{ fontSize: '1.4rem', color: '#604634', margin: '0.2rem 0' }}>
                      {b.packageName} — {b.serviceName}
                    </h3>
                    <div style={{ fontSize: '0.88rem', color: '#6E5F55' }}>
                      🗓️ Ngày chụp: <strong>{b.bookingDate}</strong> ({b.startTime} - {b.endTime}) • Phòng: <strong>{b.studioName}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                      ● {b.bookingStatus.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#8C6E53', marginTop: '0.4rem' }}>
                      {b.totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.8rem', color: b.paymentStatus === 'DEPOSIT_PAID' || b.paymentStatus === 'FULLY_PAID' ? '#047857' : '#D97706', fontWeight: 600 }}>
                      {b.paymentStatus === 'DEPOSIT_PAID'
                        ? `Đã cọc: ${b.depositAmount.toLocaleString('vi-VN')} đ`
                        : b.paymentStatus === 'FULLY_PAID'
                        ? 'Đã thanh toán đủ 100%'
                        : 'Chờ thanh toán cọc'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ backgroundColor: '#FFFDF6', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--mipa-beige)', marginBottom: '1.2rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8C6E53', marginBottom: '0.8rem' }}>
                    TIẾN ĐỘ BUỔI CHỤP:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.78rem' }}>
                    {[
                      { label: '1. Đã Nhận Cọc', done: b.paymentStatus === 'DEPOSIT_PAID' || b.paymentStatus === 'FULLY_PAID' },
                      { label: '2. Đã Check-in', done: ['CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus) },
                      { label: '3. Đang Chụp', done: ['SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus) },
                      { label: '4. Hậu Kỳ', done: ['EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus) },
                      { label: '5. Đã Giao Ảnh', done: ['READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.bookingStatus) || b.driveReadyForCustomer },
                    ].map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: step.done ? '#047857' : '#A39385', fontWeight: step.done ? 600 : 400 }}>
                        <Check size={14} color={step.done ? '#047857' : '#A39385'} />
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Acknowledgements & Delivery Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px dashed #EFE6C9', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {/* Schedule confirmation acknowledgement */}
                    {b.bookingStatus === 'CONFIRMED' && !b.customerScheduleConfirmedAt && (
                      <button
                        onClick={() => handleAcknowledgeSchedule(b.id)}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        ✓ Xác Nhận Lịch Chụp Này
                      </button>
                    )}

                    {b.customerScheduleConfirmedAt && (
                      <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Check size={15} /> Bạn đã xác nhận lịch chụp
                      </span>
                    )}

                    {/* Shoot completed acknowledgement */}
                    {(b.bookingStatus === 'SHOOT_COMPLETED' || b.bookingStatus === 'EDITING') && !b.customerShootAckAt && (
                      <button
                        onClick={() => handleAcknowledgeShoot(b.id)}
                        className="btn-mipa-secondary"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        📷 Xác Nhận Đã Chụp Xong
                      </button>
                    )}

                    {/* Google Drive Delivery Button (#8 integration) */}
                    {(b.driveReadyForCustomer || b.driveFolderUrl || b.bookingStatus === 'READY_FOR_REVIEW' || b.bookingStatus === 'DELIVERED') ? (
                      <a
                        href={b.driveFolderUrl || 'https://drive.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-mipa-gold"
                        style={{
                          fontSize: '0.88rem',
                          padding: '0.5rem 1.2rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: '#047857',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                        }}
                      >
                        <FolderDown size={16} /> Lấy Ảnh Google Drive
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#8C6E53' }}>
                        ⏳ Ảnh đang được hậu kỳ kỹ lưỡng
                      </span>
                    )}
                  </div>

                  {/* Reschedule / Cancel options */}
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    {['PENDING_PAYMENT', 'DEPOSIT_PAID', 'CONFIRMED'].includes(b.bookingStatus) && (
                      <>
                        <button
                          onClick={() => setRescheduleBooking(b)}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                          Yêu cầu đổi lịch
                        </button>
                        <button
                          onClick={() => setCancelBooking(b)}
                          style={{ background: 'none', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Yêu cầu hủy
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Notice if reschedule/cancel requested */}
                {b.rescheduleRequestedAt && (
                  <div style={{ marginTop: '0.8rem', padding: '0.6rem 1rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.82rem', color: '#92400E' }}>
                    ⚠️ Yêu cầu đổi sang ngày <strong>{b.rescheduleRequestedDate}</strong> lúc <strong>{b.rescheduleRequestedSlot}</strong> đang được quản lý xử lý.
                  </div>
                )}
                {b.cancelRequestedAt && (
                  <div style={{ marginTop: '0.8rem', padding: '0.6rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '0.82rem', color: '#991B1B' }}>
                    ⚠️ Yêu cầu hủy đơn đang chờ quản lý xem xét theo chính sách hoàn cọc.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 2: PROFILE & SECURITY */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1100px' }}>
          {/* CARD 1: PERSONAL INFORMATION & EDIT NAME */}
          <div className="mipa-card" style={{ padding: '2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(198, 164, 95, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UserIcon size={22} color="#8C6E53" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#604634', margin: 0 }}>
                  Thông Tin Cá Nhân
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#8C6E53' }}>
                  Cập nhật họ tên và số điện thoại liên hệ
                </span>
              </div>
            </div>

            {profileSuccessMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <CheckCircle size={18} color="#16A34A" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={18} color="#DC2626" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.35rem' }}>
                  Họ và Tên (Có thể chỉnh sửa) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ..."
                  className="mipa-input"
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    color: '#2C221E',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.35rem' }}>
                  Số Điện Thoại Liên Hệ
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#8C6E53" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="VD: 0908 123 456..."
                    className="mipa-input"
                    style={{
                      height: '42px',
                      paddingLeft: '38px',
                      borderRadius: '10px',
                      color: '#2C221E',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.35rem' }}>
                  Địa Chỉ Email (Cố định theo tài khoản)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#8C6E53" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={user?.email || ''}
                    className="mipa-input"
                    style={{
                      height: '42px',
                      paddingLeft: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#F9FAFB',
                      color: '#6B7280',
                      cursor: 'not-allowed',
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '11px',
                    fontSize: '0.75rem',
                    color: '#166534',
                    backgroundColor: '#DCFCE7',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}>
                    ✓ Đã xác thực
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.5rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#8C6E53', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Vai trò hệ thống:
                  </span>
                  <div style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: isRootOwner ? '#FEF3C7' : '#FFFDF6',
                    border: isRootOwner ? '1.5px solid #F59E0B' : '1px solid var(--mipa-beige)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isRootOwner ? '#B45309' : '#604634',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    {isRootOwner ? '👑 Root Owner' : user?.role || 'CUSTOMER'}
                  </div>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#8C6E53', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Trạng thái:
                  </span>
                  <div style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#166534',
                  }}>
                    ● {user?.status || 'ACTIVE'}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-mipa-gold"
                style={{
                  width: '100%',
                  height: '44px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                {isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
              </button>
            </form>
          </div>

          {/* CARD 2: SECURITY & PASSWORD CHANGE (VIA EMAIL CONFIRMATION) */}
          <div className="mipa-card" style={{ padding: '2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(157, 23, 77, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <KeyRound size={22} color="#9D174D" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#604634', margin: 0 }}>
                  Bảo Mật & Mật Khẩu
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#8C6E53' }}>
                  Xác thực danh tính qua email trước khi đổi mật khẩu
                </span>
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              marginBottom: '1.2rem',
              fontSize: '0.84rem',
              color: '#92400E',
              lineHeight: 1.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                <ShieldCheck size={18} color="#D97706" />
                <span>Quy trình bảo mật 2 lớp an toàn:</span>
              </div>
              Nhằm bảo đảm quyền sở hữu tài khoản, hệ thống sẽ gửi một <strong>liên kết xác nhận đổi mật khẩu</strong> đến email <strong>{user?.email}</strong>. Bạn chỉ cần mở email và nhấp vào liên kết để thiết lập mật khẩu mới an toàn.
            </div>

            {passwordEmailSuccess && (
              <div style={{
                padding: '0.9rem 1.1rem',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}>
                <CheckCircle size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{passwordEmailSuccess}</span>
              </div>
            )}

            {passwordEmailError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={18} color="#DC2626" />
                <span>{passwordEmailError}</span>
              </div>
            )}

            <div style={{
              padding: '1.2rem',
              backgroundColor: '#FFFDF6',
              border: '1px solid var(--mipa-beige)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                Email nhận liên kết xác nhận:
                <strong style={{ display: 'block', color: '#604634', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  ✉️ {user?.email}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleRequestPasswordResetEmail}
                disabled={isSendingPasswordEmail || countdown > 0}
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: countdown > 0 ? '#9CA3AF' : '#8C6E53',
                  color: '#FFFDF6',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: isSendingPasswordEmail || countdown > 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(96, 70, 52, 0.15)',
                }}
              >
                <Send size={16} />
                {isSendingPasswordEmail
                  ? 'Đang gửi email xác nhận...'
                  : countdown > 0
                  ? `Gửi lại sau ${countdown}s`
                  : 'Gửi Email Xác Nhận Đổi Mật Khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div className="mipa-card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#604634', fontSize: '1.2rem' }}>Yêu Cầu Đổi Lịch Chụp</h4>
              <button onClick={() => setRescheduleBooking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSendRescheduleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>Ngày mong muốn mới</label>
                <input type="date" required value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="mipa-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>Khung giờ mong muốn</label>
                <input type="time" required value={rescheduleSlot} onChange={e => setRescheduleSlot(e.target.value)} className="mipa-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>Lý do đổi lịch (tùy chọn)</label>
                <textarea rows={2} value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} className="mipa-input" style={{ width: '100%' }} />
              </div>
              <button type="submit" className="btn-mipa-gold" style={{ width: '100%', padding: '0.75rem' }}>Gửi Yêu Cầu Đổi Lịch</button>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelBooking && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div className="mipa-card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#991B1B', fontSize: '1.2rem' }}>Yêu Cầu Hủy Đơn #{cancelBooking.bookingCode}</h4>
              <button onClick={() => setCancelBooking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSendCancelRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#6E5F55', margin: 0 }}>
                Theo chính sách studio, hủy lịch trước 48h sẽ được bảo lưu cọc trong 6 tháng.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>Lý do hủy đơn</label>
                <textarea rows={3} required value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Vui lòng cho studio biết lý do..." className="mipa-input" style={{ width: '100%' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Xác Nhận Gửi Yêu Cầu Hủy
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
