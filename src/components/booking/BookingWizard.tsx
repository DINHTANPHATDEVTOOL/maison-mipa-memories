import React, { useState } from 'react';
import type { ServiceCategory, PackageItem, Addon, StudioRoom, Booking } from '../../types';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS } from '../../mockData';
import { X, Check, Calendar as CalendarIcon, Clock, Sparkles, Heart, ChevronRight, ChevronLeft, CreditCard, ShieldCheck, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (newBooking: Booking) => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({ isOpen, onClose, onBookingSuccess }) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedService, setSelectedService] = useState<ServiceCategory>(INITIAL_SERVICES[0]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem>(INITIAL_PACKAGES[1]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-15');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('13:30');
  const [selectedStudio, setSelectedStudio] = useState<StudioRoom>(INITIAL_STUDIO_ROOMS[0]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([INITIAL_ADDONS[0]]); // default makeup
  
  // Customer details
  const [customerName, setCustomerName] = useState<string>('Nguyễn Minh Anh');
  const [customerPhone, setCustomerPhone] = useState<string>('0908 123 456');
  const [customerEmail, setCustomerEmail] = useState<string>('minhanh.nguyen@gmail.com');
  const [occasion, setOccasion] = useState<string>('Kỷ niệm');
  const [customerNote, setCustomerNote] = useState<string>('Mong muốn tone màu sáng tự nhiên & rèm lụa.');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isVoucherApplied, setIsVoucherApplied] = useState<boolean>(false);

  // Payment simulated state
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'BANK' | 'COUNTER'>('QR');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  if (!isOpen) return null;

  // Realtime calculations
  const addonTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
  const subtotal = selectedPackage.price + addonTotal;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const depositRequired = Math.round(grandTotal * 0.3); // 30% deposit

  // Resource availability mock engine
  const timeSlots = [
    { time: '09:00', label: '09:00 - 11:00', status: 'AVAILABLE' },
    { time: '10:30', label: '10:30 - 12:30', status: 'BOOKED', reason: 'Hết phòng Room 01' },
    { time: '12:00', label: '12:00 - 14:00', status: 'AVAILABLE' },
    { time: '13:30', label: '13:30 - 15:30', status: 'AVAILABLE', tag: 'Ưu tiên cho Couple' },
    { time: '15:00', label: '15:00 - 17:00', status: 'LIMITED', tag: 'Còn 1 slot' },
    { time: '16:30', label: '16:30 - 18:30', status: 'BOOKED', reason: 'Lịch bảo trì Studio' },
  ];

  const handleApplyVoucher = () => {
    if (voucherCode.trim().toUpperCase() === 'MIPA20') {
      const disc = Math.round(subtotal * 0.2);
      setDiscountAmount(disc);
      setIsVoucherApplied(true);
    } else if (voucherCode.trim().toUpperCase() === 'SUMMERMEMORY') {
      const disc = Math.round(subtotal * 0.1);
      setDiscountAmount(disc);
      setIsVoucherApplied(true);
    } else {
      alert('Mã giảm giá không hợp lệ. Thử mã MIPA20 hoặc SUMMERMEMORY');
    }
  };

  const handleToggleAddon = (addon: Addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleConfirmAndPay = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      // Generate custom unique booking code: MIPA-260815-xxx
      const randomSeq = Math.floor(100 + Math.random() * 900);
      const code = `MIPA-26${selectedDate.slice(5, 7)}${selectedDate.slice(8, 10)}-${randomSeq}`;

      const newBookingObj: Booking = {
        id: `bk_${Date.now()}`,
        bookingCode: code,
        customerId: 'cust_01',
        customerName,
        customerPhone,
        customerEmail,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
        bookingDate: selectedDate,
        startTime: selectedTimeSlot,
        endTime: '15:30',
        studioId: selectedStudio.id,
        studioName: selectedStudio.name,
        addons: selectedAddons,
        subtotal,
        discount: discountAmount,
        depositAmount: depositRequired,
        totalAmount: grandTotal,
        paymentStatus: 'DEPOSIT_PAID',
        bookingStatus: 'CONFIRMED',
        customerNote,
        occasion,
        assignments: [
          { id: `asg_${Date.now()}_1`, bookingId: code, employeeId: 'emp_minh', employeeName: 'Hoàng Minh (Tự động gán)', assignmentRole: 'PHOTOGRAPHER', startTime: selectedTimeSlot, endTime: '15:30' },
          { id: `asg_${Date.now()}_2`, bookingId: code, employeeId: 'emp_huong', employeeName: 'Phạm Thanh Hương (Tự động gán)', assignmentRole: 'MAKEUP', startTime: '12:30', endTime: selectedTimeSlot },
        ],
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };

      setConfirmedBooking(newBookingObj);
      setIsSubmitting(false);
      setStep(7); // Final step

      // Launch celebration confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#C6A45F', '#8C6E53', '#EFE6C9'],
        });
      } catch (e) {}

      onBookingSuccess(newBookingObj);
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{
        backgroundColor: '#FFFDF6',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(60, 40, 25, 0.25)',
        border: '1px solid var(--mipa-beige)',
        overflow: 'hidden',
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '1.2rem 1.8rem',
          borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
          backgroundColor: '#FFFDF6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              MAISON MIPA MEMORIES
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#604634', margin: 0 }}>
              {step === 7 ? 'Đặt lịch Thành Công!' : `Bước ${step}/6 — ${
                step === 1 ? 'Chọn Loại hình Dịch vụ' :
                step === 2 ? 'Chọn Gói Package phù hợp' :
                step === 3 ? 'Chọn Ngày & Giờ Chụp' :
                step === 4 ? 'Dịch vụ Bổ sung (Add-ons)' :
                step === 5 ? 'Thông tin Khách hàng' :
                'Xác nhận & Thanh toán Tiền cọc'
              }`}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--mipa-beige)',
              background: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#604634" />
          </button>
        </div>

        {/* Progress Bar */}
        {step <= 6 && (
          <div style={{ display: 'flex', height: '4px', backgroundColor: '#EFE6C9' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: i <= step ? '#8C6E53' : 'transparent',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Scrollable Step Content Body */}
        <div style={{ padding: '1.8rem', overflowY: 'auto', flex: 1 }}>
          
          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <div>
              <p style={{ color: '#6E5F55', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào cùng Maison MIPA?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
                {INITIAL_SERVICES.map((srv) => {
                  const isSelected = selectedService.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`mipa-card ${isSelected ? 'mipa-card-gold' : ''}`}
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#C6A45F' : 'rgba(140, 110, 83, 0.18)',
                        borderWidth: isSelected ? '2px' : '1px',
                        transform: isSelected ? 'translateY(-3px)' : 'none',
                      }}
                    >
                      <div style={{ position: 'relative', height: '130px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.8rem' }}>
                        <img src={srv.image} alt={srv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {srv.badge && (
                          <span style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#604634',
                            color: '#EFE6C9',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                          }}>
                            {srv.badge}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '1.15rem', color: '#604634', marginBottom: '0.25rem' }}>{srv.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#6E5F55', lineHeight: 1.4 }}>{srv.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PACKAGE SELECTION */}
          {step === 2 && (
            <div>
              <p style={{ color: '#6E5F55', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Gói dịch vụ chọn cho loại hình <strong>{selectedService.name}</strong>:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem' }}>
                {INITIAL_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`mipa-card ${isSelected ? 'mipa-card-gold' : ''}`}
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#C6A45F' : 'rgba(140, 110, 83, 0.18)',
                        borderWidth: isSelected ? '2px' : '1px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {pkg.popularTag && (
                          <div style={{
                            backgroundColor: '#C6A45F',
                            color: '#FFFDF6',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            display: 'inline-block',
                            marginBottom: '0.5rem',
                          }}>
                            ★ {pkg.popularTag}
                          </div>
                        )}
                        <h4 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.4rem' }}>{pkg.name}</h4>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8C6E53', marginBottom: '1rem' }}>
                          {pkg.price.toLocaleString('vi-VN')}đ
                        </div>
                        
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {pkg.features.map((feat, idx) => (
                            <li key={idx} style={{ fontSize: '0.82rem', color: '#4A3B32', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                              <Check size={14} color="#C6A45F" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button
                          className={isSelected ? 'btn-mipa-primary' : 'btn-mipa-secondary'}
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          {isSelected ? 'Đã Chọn Gói Này' : 'Chọn Gói Này'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DATE, TIME & RESOURCE CHECK */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="mipa-label">1. Chọn Ngày Chụp Mong Muốn</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mipa-input"
                    style={{ fontSize: '1rem', fontWeight: 600, padding: '0.8rem' }}
                  />

                  <div style={{ marginTop: '1.5rem' }}>
                    <label className="mipa-label">2. Chọn Phòng Studio / Phân khu</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {INITIAL_STUDIO_ROOMS.map((std) => {
                        const isSel = selectedStudio.id === std.id;
                        return (
                          <div
                            key={std.id}
                            onClick={() => setSelectedStudio(std)}
                            style={{
                              padding: '0.8rem 1rem',
                              borderRadius: '12px',
                              border: isSel ? '2px solid #8C6E53' : '1px solid var(--mipa-beige)',
                              backgroundColor: isSel ? '#FFFDF6' : '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#604634', fontSize: '0.9rem' }}>{std.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6E5F55' }}>Sức chứa: {std.capacity} người • {std.description.slice(0, 50)}...</div>
                            </div>
                            {isSel && <Check size={18} color="#8C6E53" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mipa-label">3. Kiểm tra Lịch Khả Dụng (Resource Scheduling Engine)</label>
                  <p style={{ fontSize: '0.8rem', color: '#8C6E53', marginBottom: '0.8rem' }}>
                    * Hệ thống tự động đồng bộ thời lượng gói ({selectedPackage.durationMinutes} phút) & kiểm tra lịch của Photographer + Makeup.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {timeSlots.map((slot) => {
                      const isSel = selectedTimeSlot === slot.time;
                      const isBooked = slot.status === 'BOOKED';
                      return (
                        <button
                          key={slot.time}
                          disabled={isBooked}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.8rem 1rem',
                            borderRadius: '12px',
                            border: isSel ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                            backgroundColor: isBooked ? '#F3F4F6' : isSel ? '#FFFDF6' : '#FFFFFF',
                            opacity: isBooked ? 0.5 : 1,
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Clock size={16} color={isSel ? '#C6A45F' : '#8C6E53'} />
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C221E' }}>{slot.time}</span>
                              <span style={{ fontSize: '0.8rem', color: '#6E5F55', marginLeft: '0.5rem' }}>({slot.label})</span>
                            </div>
                          </div>

                          <div>
                            {isBooked ? (
                              <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 600 }}>Hết chỗ ({slot.reason})</span>
                            ) : slot.tag ? (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>{slot.tag}</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>✓ Còn chỗ</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADDONS */}
          {step === 4 && (
            <div>
              <p style={{ color: '#6E5F55', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Chọn thêm dịch vụ đi kèm nâng cao trải nghiệm buổi chụp:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {INITIAL_ADDONS.map((addon) => {
                  const isChecked = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => handleToggleAddon(addon)}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: isChecked ? '2px solid #8C6E53' : '1px solid var(--mipa-beige)',
                        backgroundColor: isChecked ? '#FFFDF6' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div
                        style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: '#8C6E53' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#604634' }}>{addon.name}</h5>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8C6E53' }}>
                            +{addon.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#6E5F55', marginTop: '0.2rem' }}>{addon.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Realtime Calc Footer Summary */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.2rem',
                backgroundColor: '#F8F3E6',
                borderRadius: '12px',
                border: '1px solid rgba(198, 164, 95, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#604634' }}>
                    Gói <strong>{selectedPackage.name}</strong> ({selectedPackage.price.toLocaleString('vi-VN')}đ) + Add-ons ({addonTotal.toLocaleString('vi-VN')}đ)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8C6E53' }}>
                    Tiền cọc giữ lịch bắt buộc (30%): <strong>{depositRequired.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6E5F55' }}>TẠM TÍNH</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#8C6E53' }}>
                    {subtotal.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CUSTOMER INFORMATION */}
          {step === 5 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label className="mipa-label">Họ và tên Khách hàng *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mipa-input"
                    placeholder="Nhập họ tên đầy đủ..."
                  />
                </div>
                <div>
                  <label className="mipa-label">Số điện thoại liên hệ *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mipa-input"
                    placeholder="090x xxx xxx..."
                  />
                  <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={14} /> Tự động khởi tạo / liên kết Hồ sơ Khách hàng VIP theo SĐT này (Không bắt buộc tạo mật khẩu phức tạp).
                  </div>
                </div>
                <div>
                  <label className="mipa-label">Địa chỉ Email nhận album ảnh *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mipa-input"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="mipa-label">Dịp chụp hình đặc biệt</label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="mipa-input"
                  >
                    <option value="Kỷ niệm">Kỷ niệm tình yêu / Ngày cưới</option>
                    <option value="Sinh nhật">Sinh nhật / Tuổi mới</option>
                    <option value="Cưới">Chụp ảnh cưới / Studio Wedding</option>
                    <option value="Tốt nghiệp">Kỷ yếu / Tốt nghiệp</option>
                    <option value="Gia đình">Kỷ niệm Gia đình</option>
                    <option value="Cá nhân">Profile Cá nhân / Concept</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1.2rem' }}>
                <label className="mipa-label">Yêu cầu đặc biệt & Ghi chú cho Studio</label>
                <textarea
                  rows={3}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="mipa-input"
                  placeholder="Ghi chú về đạo cụ, makeup, tone màu mong muốn hoặc bé nhỏ đi cùng..."
                />
              </div>

              {/* Voucher Code Box */}
              <div style={{ marginTop: '1.2rem', padding: '1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--mipa-beige)' }}>
                <label className="mipa-label">Mã Giảm Giá / Voucher (VD: MIPA20 hoặc SUMMERMEMORY)</label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Nhập mã voucher..."
                    className="mipa-input"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button onClick={handleApplyVoucher} className="btn-mipa-secondary" style={{ flexShrink: 0 }}>
                    Áp dụng
                  </button>
                </div>
                {isVoucherApplied && (
                  <div style={{ marginTop: '0.5rem', color: '#047857', fontSize: '0.82rem', fontWeight: 600 }}>
                    ✓ Đã áp dụng voucher thành công! Giảm: -{discountAmount.toLocaleString('vi-VN')}đ
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMATION & DEPOSIT PAYMENT */}
          {step === 6 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                
                {/* Summary Card */}
                <div style={{ padding: '1.2rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--mipa-beige)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px dashed var(--mipa-beige)', paddingBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', color: '#604634', margin: 0 }}>{selectedService.name}</h4>
                      <span style={{ fontSize: '0.85rem', color: '#8C6E53', fontWeight: 600 }}>{selectedPackage.name}</span>
                    </div>
                    <span className="badge-status badge-pending">CHỜ ĐẶT CỌC</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Thời gian:</span>
                      <strong>{selectedDate} • {selectedTimeSlot} (120 phút)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Không gian chụp:</span>
                      <strong>{selectedStudio.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Khách hàng:</span>
                      <strong>{customerName} ({customerPhone})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Dịch vụ kèm theo:</span>
                      <strong>{selectedAddons.length > 0 ? selectedAddons.map(a => a.name).join(', ') : 'Không có'}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.2rem', borderTop: '1px dashed var(--mipa-beige)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6E5F55' }}>
                      <span>Giá gói gốc:</span>
                      <span>{selectedPackage.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6E5F55' }}>
                      <span>Tổng tiền Add-ons:</span>
                      <span>+{addonTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#047857' }}>
                        <span>Voucher giảm giá:</span>
                        <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: '#604634', marginTop: '0.5rem' }}>
                      <span>Tổng tiền dịch vụ:</span>
                      <span>{grandTotal.toLocaleString('vi-VN')}đ</span>
                    </div>

                    <div style={{
                      marginTop: '0.8rem',
                      padding: '0.75rem',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '8px',
                      color: '#92400E',
                      fontWeight: 700,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>TIỀN CỌC GIỮ LỊCH (30%):</span>
                      <span style={{ fontSize: '1.2rem' }}>{depositRequired.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>

                {/* QR Code / Payment Gateway Simulation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#F8F3E6', borderRadius: '16px', border: '1px solid #C6A45F', textAlign: 'center' }}>
                    <h5 style={{ fontSize: '0.95rem', color: '#604634', marginBottom: '0.5rem' }}>Quét Mã VietQR Thanh Toán Cọc</h5>
                    
                    {/* Simulated VietQR Generator Image */}
                    <div style={{
                      width: '170px',
                      height: '170px',
                      margin: '0.5rem auto',
                      backgroundColor: '#FFFFFF',
                      padding: '0.5rem',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MAISON_MIPA_DEPOSIT_${depositRequired}_${customerName}`}
                        alt="QR Code"
                        style={{ width: '140px', height: '140px' }}
                      />
                      <div style={{ position: 'absolute', background: '#604634', color: '#FFF', fontSize: '0.55rem', padding: '1px 6px', borderRadius: '4px' }}>
                        MIPA QR
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#604634', marginTop: '0.5rem' }}>
                      Ngân hàng: <strong>MB BANK — Maison MIPA</strong><br />
                      Số tài khoản: <strong>8888 6666 9999</strong><br />
                      Nội dung: <strong>COC {customerPhone}</strong>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    onClick={handleConfirmAndPay}
                    className="btn-mipa-gold"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
                  >
                    {isSubmitting ? (
                      <span>Đang xác nhận tiền cọc...</span>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        XÁC NHẬN ĐÃ CHUYỂN CỌC ({depositRequired.toLocaleString('vi-VN')}đ)
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* STEP 7: SUCCESS RECEPTION RECEIPT */}
          {step === 7 && confirmedBooking && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                border: '2px solid #A7F3D0',
              }}>
                <Check size={36} />
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#604634', marginBottom: '0.3rem' }}>Booking Của Bạn Đã Xác Nhận!</h2>
              <p style={{ color: '#6E5F55', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Maison MIPA trân trọng cảm ơn bạn. Thông tin xác nhận đã gửi đến email <strong>{confirmedBooking.customerEmail}</strong>.
              </p>

              {/* Receipt Ticket */}
              <div style={{
                maxWidth: '450px',
                margin: '0 auto',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '2px dashed #C6A45F',
                padding: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 8px 25px rgba(96, 70, 52, 0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EFE6C9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#8C6E53', fontWeight: 600, fontSize: '0.85rem' }}>MÃ BOOKING NỘI BỘ</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#604634' }}>{confirmedBooking.bookingCode}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>Gói chụp: <strong>{confirmedBooking.packageName}</strong> ({confirmedBooking.serviceName})</div>
                  <div>Thời gian: <strong>{confirmedBooking.bookingDate} lúc {confirmedBooking.startTime}</strong></div>
                  <div>Studio: <strong>{confirmedBooking.studioName}</strong></div>
                  <div>Trạng thái: <span className="badge-status badge-confirmed">ĐÃ XÁC NHẬN - ĐÃ CỌC 30%</span></div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #EFE6C9', fontSize: '0.8rem', color: '#8C6E53', textAlign: 'center' }}>
                  🌿 Maison MIPA hẹn gặp lại bạn vào ngày chụp!
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button onClick={onClose} className="btn-mipa-primary">
                  Đóng & Về Trang Chủ
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Wizard Controls */}
        {step <= 6 && (
          <div style={{
            padding: '1rem 1.8rem',
            borderTop: '1px solid rgba(140, 110, 83, 0.15)',
            backgroundColor: '#FFFDF6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-mipa-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#8C6E53', fontWeight: 600 }}>
                Tạm tính: {subtotal.toLocaleString('vi-VN')}đ
              </span>
              <button
                onClick={() => setStep(step + 1)}
                className="btn-mipa-primary"
                style={{ fontSize: '0.85rem' }}
              >
                {step === 6 ? 'Tiến Hành Đặt Cọc' : 'Tiếp Theo'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
