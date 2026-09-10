// ==============================================================================
// Maison MIPA Memories - Booking Wizard with Real Availability & Persistence
// Connected to Catalog, Pricing, Availability, and Booking Services.
// ==============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import type { ServiceCategory, PackageItem, Addon, StudioRoom, Booking, Concept } from '../../types';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS } from '../../mockData';
import { getServices, getPackages, getAddons, getStudioRooms } from '../../services/catalogService';
import { getPublicConcepts, DEMO_CONCEPTS } from '../../services/portfolioService';
import { getAvailableSlots, getAvailableSlotsSync, type TimeSlot } from '../../services/availabilityService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { calculatePricing } from '../../services/pricingService';
import { createBooking, createBookingInMemory, BookingConflictError } from '../../services/bookingService';
import {
  createDepositPayment,
  createDepositPaymentSync,
  markTransferSubmitted,
  markTransferSubmittedSync,
  confirmManualPaymentSync,
  subscribePaymentStatus,
} from '../../services/paymentService';
import { generateVietQrUrl } from '../../config/bankConfig';
import {
  getActivePaymentSettings,
  isValidProductionBankConfig,
  type BusinessBankConfig,
} from '../../services/paymentSettingsService';
import { useAuth } from '../../context/AuthContext';
import type { PaymentRow } from '../../types/database';
import { X, Check, Clock, ChevronRight, ChevronLeft, ShieldCheck, AlertCircle, RefreshCw, Copy, QrCode, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (newBooking: Booking) => void;
  existingBookings?: Booking[];
  initialConceptSlug?: string;
  onRequireAuth?: (tab?: 'LOGIN' | 'REGISTER', msg?: string) => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  isOpen,
  onClose,
  onBookingSuccess,
  existingBookings,
  initialConceptSlug,
  onRequireAuth,
}) => {
  const [step, setStep] = useState<number>(1);

  // Catalog State (Dynamic from Catalog Service with initial fallback)
  const [services, setServices] = useState<ServiceCategory[]>(INITIAL_SERVICES);
  const [packages, setPackages] = useState<PackageItem[]>(INITIAL_PACKAGES);
  const [addons, setAddons] = useState<Addon[]>(INITIAL_ADDONS);
  const [studios, setStudios] = useState<StudioRoom[]>(INITIAL_STUDIO_ROOMS);
  const [concepts, setConcepts] = useState<Concept[]>(DEMO_CONCEPTS);
  const [selectedConcepts, setSelectedConcepts] = useState<Concept[]>([DEMO_CONCEPTS[0]]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  // Form State
  const [selectedService, setSelectedService] = useState<ServiceCategory>(INITIAL_SERVICES[0]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem>(INITIAL_PACKAGES[1]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-15');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('13:30');
  const [selectedStudio, setSelectedStudio] = useState<StudioRoom>(INITIAL_STUDIO_ROOMS[0]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([INITIAL_ADDONS[0]]); // default makeup

  // Availability State
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>(() =>
    getAvailableSlotsSync({
      date: '2026-08-15',
      studioId: INITIAL_STUDIO_ROOMS[0].id,
      durationMinutes: 120,
    })
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const { user } = useAuth();
  const [activeBankConfig, setActiveBankConfig] = useState<BusinessBankConfig | null>(null);

  // Customer details (pre-filled from authenticated user if available)
  const [customerName, setCustomerName] = useState<string>(user?.fullName || 'Khách Hàng MIPA');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '0908 123 456');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || 'khachhang@maisonmipa.vn');
  const [occasion, setOccasion] = useState<string>('Kỷ niệm');
  const [customerNote, setCustomerNote] = useState<string>('Mong muốn tone màu sáng tự nhiên & rèm lụa.');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [isVoucherApplied, setIsVoucherApplied] = useState<boolean>(false);

  // Sync user info if user logs in during booking
  useEffect(() => {
    if (user) {
      if (user.fullName) setCustomerName(user.fullName);
      if (user.phone) setCustomerPhone(user.phone);
      if (user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentRow | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isCopiedRef, setIsCopiedRef] = useState<boolean>(false);
  const [isCopiedAccount, setIsCopiedAccount] = useState<boolean>(false);
  const [isCopiedAmount, setIsCopiedAmount] = useState<boolean>(false);
  const [isTransferSubmitted, setIsTransferSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load catalog, concepts, and payment settings on mount
  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      if (isSupabaseConfigured()) {
        setIsLoadingCatalog(true);
        try {
          const [srvs, pkgs, adds, stds, bank, cncs] = await Promise.all([
            getServices(),
            getPackages(),
            getAddons(),
            getStudioRooms(),
            getActivePaymentSettings(),
            getPublicConcepts(),
          ]);
          if (mounted) {
            if (srvs.length > 0) setServices(srvs);
            if (pkgs.length > 0) setPackages(pkgs);
            if (adds.length > 0) setAddons(adds);
            if (stds.length > 0) setStudios(stds);
            if (cncs.length > 0) {
              setConcepts(cncs);
              if (initialConceptSlug) {
                const match = cncs.find(c => c.slug === initialConceptSlug);
                if (match) {
                  setSelectedConcepts([match]);
                  const matchedSrv = srvs.find(s => s.id === match.serviceId);
                  if (matchedSrv) setSelectedService(matchedSrv);
                }
              }
            }
            setActiveBankConfig(bank);
          }
        } catch (err) {
          console.warn('Could not load data dynamically:', err);
        } finally {
          if (mounted) setIsLoadingCatalog(false);
        }
      } else {
        const bank = await getActivePaymentSettings();
        if (mounted) {
          setActiveBankConfig(bank);
          if (initialConceptSlug) {
            const match = DEMO_CONCEPTS.find(c => c.slug === initialConceptSlug);
            if (match) {
              setSelectedConcepts([match]);
              const matchedSrv = INITIAL_SERVICES.find(s => s.id === match.serviceId);
              if (matchedSrv) setSelectedService(matchedSrv);
            }
          }
        }
      }
    }
    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [initialConceptSlug]);

  // Restore guest booking draft from sessionStorage after authentication
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mipa_pending_booking');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.serviceId) {
          const s = services.find(x => x.id === draft.serviceId);
          if (s) setSelectedService(s);
        }
        if (draft.packageId) {
          const p = packages.find(x => x.id === draft.packageId);
          if (p) setSelectedPackage(p);
        }
        if (draft.conceptIds && Array.isArray(draft.conceptIds)) {
          const matched = concepts.filter(c => draft.conceptIds.includes(c.id));
          if (matched.length > 0) setSelectedConcepts(matched);
        }
        if (draft.studioId) {
          const std = studios.find(x => x.id === draft.studioId);
          if (std) setSelectedStudio(std);
        }
        if (draft.date) setSelectedDate(draft.date);
        if (draft.timeSlot) setSelectedTimeSlot(draft.timeSlot);
        if (draft.occasion) setOccasion(draft.occasion);
        if (draft.customerNote) setCustomerNote(draft.customerNote);
        if (draft.voucherCode) {
          setVoucherCode(draft.voucherCode);
          setIsVoucherApplied(true);
        }
        setStep(5);
        sessionStorage.removeItem('mipa_pending_booking');
      }
    } catch (e) {
      console.warn('Could not restore pending booking draft:', e);
    }
  }, [services, packages, concepts, studios]);

  // Filter packages by selected service when service changes
  const availablePackages = packages.filter(p => p.serviceId === selectedService.id);
  const displayedPackages = availablePackages.length > 0 ? availablePackages : packages;

  // Realtime Price & Duration Calculation (Single Source of Truth calculation)
  const promo = isVoucherApplied ? {
    discountPercent: voucherCode.trim().toUpperCase() === 'MIPA20' ? 20 : voucherCode.trim().toUpperCase() === 'SUMMERMEMORY' ? 10 : 0,
    minOrder: 500000,
    isActive: true,
  } : null;

  const pricing = calculatePricing({
    packageItem: selectedPackage,
    addons: selectedAddons,
    promotion: promo,
  });

  const { subtotal, addonTotal, discountTotal, totalAmount, depositAmount, totalDurationMinutes } = pricing;

  // Load availability slots whenever Date, Studio or Duration changes
  const loadSlots = useCallback(async () => {
    if (!selectedStudio || !selectedDate) return;
    if (!isSupabaseConfigured()) {
      const slots = getAvailableSlotsSync({
        date: selectedDate,
        studioId: selectedStudio.id,
        durationMinutes: totalDurationMinutes,
        existingBookings,
      });
      setAvailableSlots(slots);
      return;
    }

    setIsLoadingSlots(true);
    try {
      const slots = await getAvailableSlots({
        date: selectedDate,
        studioId: selectedStudio.id,
        durationMinutes: totalDurationMinutes,
        existingBookings,
      });
      setAvailableSlots(slots);

      // Auto-select first available slot if current slot is booked or absent
      const currentSlotObj = slots.find(s => s.time === selectedTimeSlot);
      if (!currentSlotObj || currentSlotObj.status === 'BOOKED') {
        const firstAvail = slots.find(s => s.status === 'AVAILABLE');
        if (firstAvail) {
          setSelectedTimeSlot(firstAvail.time);
        }
      }
    } catch (err) {
      console.warn('Availability loading error:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDate, selectedStudio, totalDurationMinutes, existingBookings, selectedTimeSlot]);

  // Realtime subscription for payment status updates
  useEffect(() => {
    if (!isOpen || !currentPayment?.id) return;
    const unsubscribe = subscribePaymentStatus(currentPayment.id, (updatedPay) => {
      setCurrentPayment(updatedPay);
      if (updatedPay.status === 'PAID') {
        if (createdBooking) {
          const finalB: Booking = {
            ...createdBooking,
            paymentStatus: 'DEPOSIT_PAID',
            bookingStatus: 'CONFIRMED',
          };
          setConfirmedBooking(finalB);
          onBookingSuccess(finalB);
        }
        setStep(7);
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#C6A45F', '#8C6E53', '#EFE6C9'],
          });
        } catch {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentPayment?.id, createdBooking, onBookingSuccess]);

  useEffect(() => {
    if (!isOpen) return;
    loadSlots();
  }, [isOpen, loadSlots]);

  if (!isOpen) return null;

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (code === 'MIPA20' || code === 'SUMMERMEMORY') {
      setIsVoucherApplied(true);
      setErrorMessage(null);
    } else {
      setIsVoucherApplied(false);
      setErrorMessage('Mã voucher không hợp lệ. Vui lòng thử mã MIPA20 hoặc SUMMERMEMORY.');
    }
  };

  const maxConcepts = selectedPackage.conceptsCount || 1;

  const handleToggleConcept = (concept: Concept) => {
    if (selectedConcepts.some(c => c.id === concept.id)) {
      if (selectedConcepts.length > 1) {
        setSelectedConcepts(selectedConcepts.filter(c => c.id !== concept.id));
      }
    } else {
      if (selectedConcepts.length < maxConcepts) {
        setSelectedConcepts([...selectedConcepts, concept]);
      } else if (maxConcepts === 1) {
        // Quick 1-click replacement when single concept allowed
        setSelectedConcepts([concept]);
      } else {
        setErrorMessage(`Gói ${selectedPackage.name} cho phép chọn tối đa ${maxConcepts} concept. Vui lòng bỏ chọn bớt một concept để đổi.`);
      }
    }
  };

  const handleGuestAuthRedirect = (tab: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    try {
      const pendingData = {
        serviceId: selectedService.id,
        packageId: selectedPackage.id,
        studioId: selectedStudio.id,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        addonIds: selectedAddons.map(a => a.id),
        conceptIds: selectedConcepts.map(c => c.id),
        occasion,
        customerNote,
        voucherCode: isVoucherApplied ? voucherCode : '',
      };
      sessionStorage.setItem('mipa_pending_booking', JSON.stringify(pendingData));
    } catch {}

    if (onRequireAuth) {
      onRequireAuth(tab, 'Lựa chọn đặt lịch của bạn đã được ghi nhớ. Vui lòng đăng nhập để hoàn tất xác nhận và đặt cọc.');
    } else {
      setErrorMessage('Lựa chọn đặt lịch đã được lưu lại. Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục.');
    }
  };

  const handleToggleAddon = (addon: Addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Proceed from Step 5 to Step 6: Create Booking and Authoritative Payment
  const handleProceedToPayment = async () => {
    // If Supabase is active, enforce login before creating database booking
    if (isSupabaseConfigured() && !user) {
      handleGuestAuthRedirect('LOGIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        serviceId: selectedService.id,
        packageId: selectedPackage.id,
        studioId: selectedStudio.id,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        addonIds: selectedAddons.map(a => a.id),
        conceptIds: selectedConcepts.map(c => c.id),
        voucherCode: isVoucherApplied ? voucherCode.trim().toUpperCase() : undefined,
        customerName,
        customerPhone,
        customerEmail,
        occasion,
        customerNote,
      };

      if (!isSupabaseConfigured()) {
        const newBooking = createBookingInMemory(payload);
        setCreatedBooking(newBooking);
        const payment = createDepositPaymentSync(newBooking.id, 'BANK_TRANSFER');
        setCurrentPayment(payment);
        setStep(6);
        return;
      }

      const newBooking = await createBooking(payload);
      setCreatedBooking(newBooking);

      // Create backend-authoritative deposit payment
      const payment = await createDepositPayment(newBooking.id, 'BANK_TRANSFER');
      setCurrentPayment(payment);
      setStep(6);
    } catch (err: any) {
      if (err instanceof BookingConflictError || err.name === 'BookingConflictError') {
        setErrorMessage(`⚠️ TRÙNG LỊCH: ${err.message || 'Phòng studio đã có người đặt trong khung giờ này.'} Vui lòng quay lại Bước 3 để chọn khung giờ khác.`);
      } else {
        setErrorMessage(err.message || 'Không thể tạo đơn đặt lịch. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 6: Customer clicks "Xác Nhận Đã Chuyển Cọc"
  const handleConfirmTransfer = async () => {
    if (!currentPayment) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    // In offline / demo mode, emulate instant manager confirmation
    if (!isSupabaseConfigured()) {
      const updated = markTransferSubmittedSync(currentPayment.id);
      setCurrentPayment(updated);
      setIsTransferSubmitted(true);

      setTimeout(() => {
        try {
          const confirmedPay = confirmManualPaymentSync(currentPayment.id, 'Tự động duyệt cọc (Chế độ Thử nghiệm)');
          setCurrentPayment(confirmedPay);
          if (createdBooking) {
            const finalB: Booking = {
              ...createdBooking,
              paymentStatus: 'DEPOSIT_PAID',
              bookingStatus: 'CONFIRMED',
            };
            setConfirmedBooking(finalB);
            onBookingSuccess(finalB);
          }
          setStep(7);
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#C6A45F', '#8C6E53', '#EFE6C9'],
            });
          } catch {}
        } catch (e: any) {
          console.warn('Auto confirmation error:', e);
        } finally {
          setIsSubmitting(false);
        }
      }, 50);
      return;
    }

    try {
      const updated = await markTransferSubmitted(currentPayment.id);
      setCurrentPayment(updated);
      setIsTransferSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể ghi nhận thông tin chuyển khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTransferRef = () => {
    const textToCopy = currentPayment?.transfer_reference || `MIPA ${customerPhone}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopiedRef(true);
      setTimeout(() => setIsCopiedRef(false), 2000);
    }
  };

  const handleCopyAccount = () => {
    if (!activeBankConfig?.accountNumber) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeBankConfig.accountNumber);
      setIsCopiedAccount(true);
      setTimeout(() => setIsCopiedAccount(false), 2000);
    }
  };

  const handleCopyAmount = () => {
    const amt = (currentPayment?.amount || depositAmount).toString();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(amt);
      setIsCopiedAmount(true);
      setTimeout(() => setIsCopiedAmount(false), 2000);
    }
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

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #F87171',
            padding: '0.75rem 1.8rem',
            color: '#B91C1C',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="#B91C1C" />
              <span>{errorMessage}</span>
            </div>
            {step === 6 && (
              <button
                onClick={() => { setErrorMessage(null); setStep(3); }}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đổi khung giờ (Bước 3)
              </button>
            )}
          </div>
        )}

        {/* Scrollable Step Content Body */}
        <div style={{ padding: '1.8rem', overflowY: 'auto', flex: 1 }}>
          
          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <div>
              <p style={{ color: '#6E5F55', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào cùng Maison MIPA? {isLoadingCatalog && '(Đang đồng bộ...)'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
                {services.map((srv) => {
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                {displayedPackages.map((pkg) => {
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

              {/* Concept Selection within Step 2 */}
              <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', color: '#604634', margin: 0, fontWeight: 600 }}>
                      Chọn Concept Nghệ Thuật ({selectedConcepts.length}/{maxConcepts})
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#6E5F55', margin: '0.2rem 0 0 0' }}>
                      Gói <strong>{selectedPackage.name}</strong> hỗ trợ tối đa <strong>{maxConcepts}</strong> Concept phong cách
                    </p>
                  </div>
                  {selectedConcepts.length > 0 && (
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#EFE6C9', color: '#604634', padding: '0.3rem 0.75rem', borderRadius: '12px', fontWeight: 600 }}>
                      Đã chọn: {selectedConcepts.map(c => c.name).join(', ')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {concepts.filter(c => c.active && c.bookable).map((cnc) => {
                    const isSelected = selectedConcepts.some(c => c.id === cnc.id);
                    return (
                      <div
                        key={cnc.id}
                        onClick={() => handleToggleConcept(cnc)}
                        style={{
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #8C6E53' : '1px solid var(--mipa-beige)',
                          backgroundColor: isSelected ? '#FFFDF6' : '#FFFFFF',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(140, 110, 83, 0.15)' : 'none',
                        }}
                      >
                        <div style={{ position: 'relative', height: '120px', backgroundColor: '#EDE4D8' }}>
                          <img
                            src={cnc.coverPhotoUrl || '/hero.png'}
                            alt={cnc.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              backgroundColor: '#8C6E53',
                              color: '#FFF',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#604634', marginBottom: '0.2rem' }}>
                            {cnc.name}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#6E5F55', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {cnc.description || 'Phong cách nghệ thuật tinh tế'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                      {studios.map((std) => {
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
                              <div style={{ fontSize: '0.75rem', color: '#6E5F55' }}>
                                Sức chứa: {std.capacity} người • {std.description ? `${std.description.slice(0, 45)}...` : ''}
                              </div>
                            </div>
                            {isSel && <Check size={18} color="#8C6E53" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="mipa-label">3. Kiểm tra Lịch Khả Dụng (Real Engine)</label>
                    {isLoadingSlots && (
                      <span style={{ fontSize: '0.75rem', color: '#8C6E53', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <RefreshCw size={12} className="animate-spin" /> Đang tính toán...
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#8C6E53', marginBottom: '0.8rem' }}>
                    * Tổng thời lượng buổi chụp: <strong>{totalDurationMinutes} phút</strong> (Gói {selectedPackage.durationMinutes}p + Add-ons {pricing.totalDurationMinutes - selectedPackage.durationMinutes}p).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {availableSlots.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#6E5F55', fontSize: '0.85rem' }}>
                        Không có khung giờ khả dụng cho ngày này. Vui lòng chọn ngày khác.
                      </div>
                    ) : (
                      availableSlots.map((slot) => {
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
                              opacity: isBooked ? 0.55 : 1,
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
                                <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 600 }}>{slot.reason || 'Đã có lịch'}</span>
                              ) : slot.tag ? (
                                <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>{slot.tag}</span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>✓ Còn chỗ</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
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
                {addons.map((addon) => {
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
                    Tiền cọc giữ lịch bắt buộc (30%): <strong>{depositAmount.toLocaleString('vi-VN')}đ</strong>
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
              {!user && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.2rem',
                  borderRadius: '14px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid #E6DAC4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#3A2E26', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LogIn size={18} color="#8C6E53" /> Đang đặt lịch với tư cách Khách
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#6E5F55', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                      Đăng nhập để đồng bộ lịch hẹn, nhận ảnh bảo mật và xác thực thanh toán tức thì. Lựa chọn của bạn sẽ được giữ nguyên vẹn.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => handleGuestAuthRedirect('LOGIN')}
                      className="btn-mipa-secondary"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                    >
                      Đăng Nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGuestAuthRedirect('REGISTER')}
                      className="btn-mipa-primary"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                    >
                      Đăng Ký
                    </button>
                  </div>
                </div>
              )}

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
                    <ShieldCheck size={14} /> Hồ sơ Khách hàng liên kết theo SĐT này.
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
                    ✓ Đã áp dụng voucher thành công! Giảm: -{discountTotal.toLocaleString('vi-VN')}đ
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
                    {currentPayment?.status === 'PAID' ? (
                      <span className="badge-status badge-confirmed">ĐÃ NHẬN CỌC</span>
                    ) : isTransferSubmitted ? (
                      <span className="badge-status badge-pending" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>CHỜ ĐỐI SOÁT</span>
                    ) : (
                      <span className="badge-status badge-pending">CHỜ ĐẶT CỌC</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Mã đặt lịch:</span>
                      <strong>{createdBooking?.bookingCode || 'Đang tạo...'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6E5F55' }}>Thời gian:</span>
                      <strong>{selectedDate} • {selectedTimeSlot} ({totalDurationMinutes} phút)</strong>
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
                      <span style={{ color: '#6E5F55' }}>Concept nghệ thuật:</span>
                      <strong>{selectedConcepts.length > 0 ? selectedConcepts.map(c => c.name).join(', ') : 'Mặc định'}</strong>
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
                    {discountTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#047857' }}>
                        <span>Voucher giảm giá:</span>
                        <span>-{discountTotal.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: '#604634', marginTop: '0.5rem' }}>
                      <span>Tổng tiền dịch vụ:</span>
                      <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
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
                      <span style={{ fontSize: '1.2rem' }}>
                        {(currentPayment?.amount || depositAmount).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Transfer & VietQR Payment Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {!isValidProductionBankConfig(activeBankConfig) ? (
                    <div style={{
                      padding: '1.2rem',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '16px',
                      border: '1px solid #F59E0B',
                      color: '#92400E',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={20} color="#D97706" /> Chưa cấu hình tài khoản nhận cọc
                      </div>
                      <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                        Hệ thống ngân hàng nhận thanh toán đang được cấu hình. Quý khách vui lòng liên hệ Studio Hotline <strong>0908 123 456</strong> để được hỗ trợ chuyển khoản đối soát trực tiếp.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', backgroundColor: '#F8F3E6', borderRadius: '16px', border: '1px solid #C6A45F', textAlign: 'center' }}>
                      <h5 style={{ fontSize: '0.95rem', color: '#604634', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <QrCode size={18} color="#8C6E53" /> Quét Mã VietQR Thanh Toán Cọc
                      </h5>
                      <div style={{ fontSize: '0.75rem', color: '#8C6E53', marginBottom: '0.6rem' }}>
                        Tự động điền số tài khoản, số tiền & cú pháp đối soát chính xác
                      </div>
                      
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
                          src={generateVietQrUrl(
                            currentPayment?.amount || depositAmount,
                            currentPayment?.transfer_reference || `MIPA ${customerPhone}`,
                            activeBankConfig
                          )}
                          alt="Maison MIPA VietQR Code"
                          style={{ width: '140px', height: '140px', objectFit: 'contain' }}
                        />
                        <div style={{ position: 'absolute', bottom: '4px', background: '#604634', color: '#FFF', fontSize: '0.52rem', padding: '1px 6px', borderRadius: '4px' }}>
                          MIPA VIETQR
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#604634', marginTop: '0.5rem', textAlign: 'left', backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '10px', border: '1px solid #EFE6C9', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div>Ngân hàng: <strong>{activeBankConfig.bankName}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Số tài khoản: <strong>{activeBankConfig.accountNumber}</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#92400E',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Copy size={13} /> {isCopiedAccount ? 'Đã sao chép!' : 'Sao chép'}
                          </button>
                        </div>
                        <div>Chủ tài khoản: <strong>{activeBankConfig.accountName}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Số tiền cọc: <strong style={{ color: '#B45309' }}>{(currentPayment?.amount || depositAmount).toLocaleString('vi-VN')}đ</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyAmount}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#92400E',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Copy size={13} /> {isCopiedAmount ? 'Đã sao chép!' : 'Sao chép'}
                          </button>
                        </div>
                        <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF3C7', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                          <span>Nội dung CK: <strong style={{ color: '#B45309' }}>{currentPayment?.transfer_reference || `MIPA ${customerPhone}`}</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyTransferRef}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#92400E',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Copy size={13} /> {isCopiedRef ? 'Đã sao chép!' : 'Sao chép'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '12px',
                    border: '1px solid #FCD34D',
                    color: '#92400E',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>TỰ ĐỘNG XÁC NHẬN QUA ACB & PAYOS</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#78350F', lineHeight: 1.4 }}>
                      Quý khách chỉ cần quét mã QR bằng ứng dụng ngân hàng và xác nhận. Hệ thống sẽ tự động chuyển sang trang Hoàn tất ngay khi ACB nhận được tiền (không bắt buộc ấn nút dưới nếu đã thanh toán qua app).
                    </p>
                  </div>

                  {isTransferSubmitted && currentPayment?.status === 'PENDING' && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '10px',
                      color: '#92400E',
                      fontSize: '0.82rem',
                      textAlign: 'center',
                      border: '1px solid #FCD34D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đã gửi thông tin chuyển khoản. Đang chờ Studio đối soát & xác nhận...</span>
                    </div>
                  )}

                  <button
                    disabled={isSubmitting}
                    onClick={handleConfirmTransfer}
                    className="btn-mipa-gold"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
                  >
                    {isSubmitting ? (
                      <span>Đang xử lý thông tin...</span>
                    ) : isTransferSubmitted ? (
                      <span>ĐÃ GỬI XÁC NHẬN • CHỜ STUDIO XÁC NHẬN</span>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        XÁC NHẬN ĐÃ CHUYỂN CỌC ({(currentPayment?.amount || depositAmount).toLocaleString('vi-VN')}đ)
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
                onClick={() => { setErrorMessage(null); setStep(step - 1); }}
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
                onClick={() => {
                  setErrorMessage(null);
                  if (step === 5) {
                    handleProceedToPayment();
                  } else if (step === 6) {
                    handleConfirmTransfer();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={isSubmitting}
                className="btn-mipa-primary"
                style={{ fontSize: '0.85rem' }}
              >
                {step === 6 ? 'Xác Nhận Đặt Lịch' : 'Tiếp Theo'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
