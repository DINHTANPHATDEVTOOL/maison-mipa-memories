// ==============================================================================
// Maison MIPA Memories - Booking Wizard with Real Availability & Persistence
// Connected to Catalog, Pricing, Availability, and Booking Services.
// ==============================================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ServiceCategory, PackageItem, Addon, StudioRoom, Booking, Concept, Promotion } from '../../types';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS } from '../../mockData';
import { getServices, getPackages, getAddons, getStudioRooms, getPromotions } from '../../services/catalogService';
import { getPublicConcepts, DEMO_CONCEPTS } from '../../services/portfolioService';
import { getAvailableSlots, getAvailableSlotsSync, type TimeSlot } from '../../services/availabilityService';
import { isSupabaseConfigured, isDemoModeEnabled } from '../../lib/supabase';
import { calculatePricing, validatePromotion } from '../../services/pricingService';
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
import { dispatchBookingEmail } from '../../services/notificationService';
import { EditorialImagePlaceholder } from '../public/EditorialImagePlaceholder';

function getTodayVn(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function getInitialBookingDate(): string {
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(tomorrow);
  } catch {
    return getTodayVn();
  }
}

export type BookingPresentationMode = 'MODAL' | 'PAGE';
export type DraftRestoreStatus = 'IDLE' | 'WAITING_CATALOG' | 'RESTORING' | 'RESTORED' | 'INVALID';

export type PendingBookingDraft = {
  version?: 1;
  serviceId?: string;
  packageId?: string;
  studioId?: string;
  conceptIds: string[];
  addonIds: string[];
  date?: string;
  timeSlot?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  occasion?: string;
  customerNote?: string;
  voucherCode?: string;
};

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (newBooking: Booking) => void;
  existingBookings?: Booking[];
  initialConceptSlug?: string;
  initialServiceId?: string;
  initialPackageId?: string;
  onRequireAuth?: (tab?: 'LOGIN' | 'REGISTER', msg?: string) => void;
  presentation?: BookingPresentationMode;
  onFinish?: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  isOpen,
  onClose,
  onBookingSuccess,
  existingBookings,
  initialConceptSlug,
  initialServiceId,
  initialPackageId,
  onRequireAuth,
  presentation = 'MODAL',
  onFinish,
}) => {
  const [step, setStep] = useState<number>(1);
  const draftSlotRejectedRef = useRef<boolean>(false);
  const userSlotChoiceClearedRef = useRef<boolean>(false);
  const availabilityRequestIdRef = useRef<number>(0);
  const draftRestoredRef = useRef<boolean>(false);

  // Catalog State (Dynamic from Catalog Service with initial fallback)
  const demoMode = !isSupabaseConfigured() && isDemoModeEnabled();

  const [services, setServices] = useState<ServiceCategory[]>(demoMode ? INITIAL_SERVICES : []);
  const [packages, setPackages] = useState<PackageItem[]>(demoMode ? INITIAL_PACKAGES : []);
  const [addons, setAddons] = useState<Addon[]>(demoMode ? INITIAL_ADDONS : []);
  const [studios, setStudios] = useState<StudioRoom[]>(demoMode ? INITIAL_STUDIO_ROOMS : []);
  const [concepts, setConcepts] = useState<Concept[]>(demoMode ? DEMO_CONCEPTS : []);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsLoadError, setPromotionsLoadError] = useState<string | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [selectedConcepts, setSelectedConcepts] = useState<Concept[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(!demoMode);
  const [catalogReady, setCatalogReady] = useState<boolean>(false);
  const [draftRestoreStatus, setDraftRestoreStatus] = useState<DraftRestoreStatus>('IDLE');
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Form State
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(demoMode ? INITIAL_SERVICES[0] : null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(demoMode ? INITIAL_PACKAGES[1] : null);
  const [selectedDate, setSelectedDate] = useState<string>(getInitialBookingDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedStudio, setSelectedStudio] = useState<StudioRoom | null>(demoMode ? INITIAL_STUDIO_ROOMS[0] : null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);

  // Availability State
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>(() =>
    demoMode && INITIAL_STUDIO_ROOMS[0]
      ? getAvailableSlotsSync({
          date: getInitialBookingDate(),
          studioId: INITIAL_STUDIO_ROOMS[0].id,
          durationMinutes: 120,
        })
      : []
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeBankConfig, setActiveBankConfig] = useState<BusinessBankConfig | null>(null);

  // Customer details (pre-filled from authenticated user if available)
  const [customerName, setCustomerName] = useState<string>(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || '');
  const [occasion, setOccasion] = useState<string>('Kỷ niệm');
  const [customerNote, setCustomerNote] = useState<string>('');
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
  const [packageMismatchError, setPackageMismatchError] = useState<string | null>(null);

  // Load catalog, concepts, and payment settings on mount
  const loadInitialData = useCallback(async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    setCatalogReady(false);
    try {
      let srvs: ServiceCategory[] = [];
      let pkgs: PackageItem[] = [];
      let adds: Addon[] = [];
      let stds: StudioRoom[] = [];
      let bank: BusinessBankConfig | null = null;
      let cncs: Concept[] = [];
      let prms: Promotion[] = [];

      if (!demoMode) {
        const [loadedSrvs, loadedPkgs, loadedAdds, loadedStds, loadedBank, loadedCncs] = await Promise.all([
          getServices(),
          getPackages(),
          getAddons(),
          getStudioRooms(),
          getActivePaymentSettings(),
          getPublicConcepts(),
        ]);
        srvs = loadedSrvs;
        pkgs = loadedPkgs;
        adds = loadedAdds;
        stds = loadedStds;
        bank = loadedBank;
        cncs = loadedCncs;
      } else {
        srvs = INITIAL_SERVICES;
        pkgs = INITIAL_PACKAGES;
        adds = INITIAL_ADDONS;
        stds = INITIAL_STUDIO_ROOMS;
        cncs = DEMO_CONCEPTS;
        bank = await getActivePaymentSettings();
      }

      // Load promotions authoritatively (non-blocking for core catalog)
      try {
        prms = await getPromotions();
        setPromotions(prms);
        setPromotionsLoadError(null);
      } catch (promoErr: any) {
        console.warn('Failed to load promotions:', promoErr);
        setPromotions([]);
        setPromotionsLoadError('Không thể xác minh mã ưu đãi lúc này.');
      }

      setServices(srvs);
      setPackages(pkgs);
      setAddons(adds);
      setStudios(stds);
      setConcepts(cncs);
      setActiveBankConfig(bank);

      // Default addons & studio (only if no pending draft in storage)
      const hasDraft = (() => {
        try {
          return Boolean(sessionStorage.getItem('mipa_pending_booking'));
        } catch {
          return false;
        }
      })();

      if (!hasDraft) {
        setSelectedAddons([]);
      }

      if (stds.length > 0) {
        setSelectedStudio(stds[0]);
      } else {
        setSelectedStudio(null);
      }

      let targetService: ServiceCategory | null = null;
      let targetPackage: PackageItem | null = null;
      let targetConcept: Concept | null = null;

      // 1. Explicit Service param validation - HIGHEST PRIORITY
      if (initialServiceId) {
        const foundService = srvs.find(s => s.id === initialServiceId || s.slug === initialServiceId) || null;
        if (!foundService) {
          setErrorMessage('Dịch vụ được chọn không còn khả dụng.');
          setSelectedService(null);
          setSelectedPackage(null);
          setSelectedConcepts([]);
          setStep(1);
          setCatalogReady(true);
          return;
        }
        targetService = foundService;
      }

      // 2. Concept param validation
      if (initialConceptSlug) {
        const foundConcept = cncs.find(c => (c.slug === initialConceptSlug || c.id === initialConceptSlug) && c.active && c.bookable) || null;
        if (!foundConcept) {
          setErrorMessage('Concept được chọn không tồn tại hoặc đã ngừng cung cấp.');
          targetConcept = null;
          setSelectedConcepts([]);
        } else {
          targetConcept = foundConcept;
        }
      }

      // 3. Service derivation from concept if no explicit service was specified
      if (!targetService && targetConcept && targetConcept.serviceId) {
        const conceptService = srvs.find(s => s.id === targetConcept?.serviceId);
        if (conceptService) {
          targetService = conceptService;
        }
      }

      // 4. Flexible cross-service concepts:
      // Authoritative DB contract allows concept selection across services as long as active and bookable.
      // Do not reject targetConcept if targetConcept.serviceId != targetService.id.

      // If no explicit service param and no concept derived service, default to first available
      if (!initialServiceId && !targetService && srvs.length > 0) {
        targetService = srvs[0];
      }
      setSelectedService(targetService);

      // 5. Package param validation
      if (initialPackageId) {
        const foundPackage = pkgs.find(p => p.id === initialPackageId || p.name === initialPackageId) || null;
        if (foundPackage && targetService) {
          const belongs = !foundPackage.serviceId || foundPackage.serviceId === targetService.id;
          if (belongs) {
            targetPackage = foundPackage;
            setSelectedPackage(targetPackage);
            setPackageMismatchError(null);
          } else {
            // FAIL CLOSED: Mismatch! Do NOT switch service.
            setPackageMismatchError('Gói chụp không thuộc dịch vụ đã chọn. Vui lòng chọn lại gói chụp phù hợp.');
            setSelectedPackage(null);
            setStep(2);
          }
        } else {
          setPackageMismatchError('Gói chụp không tồn tại hoặc đã ngừng cung cấp. Vui lòng chọn gói chụp phù hợp.');
          setSelectedPackage(null);
          setStep(2);
        }
      } else if (targetService) {
        const matching = pkgs.filter(p => !p.serviceId || p.serviceId === targetService.id);
        setSelectedPackage(matching.find(p => p.recommended) || matching[0] || null);
        setPackageMismatchError(null);
      } else {
        setSelectedPackage(null);
      }

      // 6. Concept selection (strictly empty unless explicit initialConceptSlug is provided)
      if (initialConceptSlug) {
        if (targetConcept) {
          setSelectedConcepts([targetConcept]);
        } else {
          setSelectedConcepts([]);
        }
      } else {
        setSelectedConcepts([]);
      }

      setCatalogReady(true);
    } catch (err) {
      console.error('Failed to load booking catalog:', err);
      setCatalogError('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.');
      setServices([]);
      setPackages([]);
      setAddons([]);
      setStudios([]);
      setConcepts([]);
      setPromotions([]);
      setSelectedService(null);
      setSelectedPackage(null);
      setSelectedStudio(null);
      setSelectedConcepts([]);
      setCatalogReady(false);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [demoMode, initialConceptSlug, initialServiceId, initialPackageId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Restore guest booking draft from sessionStorage after authentication
  // STRICT: Waits for catalogReady && !isLoadingCatalog. Validates all IDs and availability authoritatively.
  useEffect(() => {
    if (draftRestoredRef.current) {
      return;
    }

    if (!catalogReady || isLoadingCatalog) {
      if (typeof window !== 'undefined' && sessionStorage.getItem('mipa_pending_booking')) {
        setDraftRestoreStatus('WAITING_CATALOG');
      }
      return;
    }

    let isCancelled = false;

    const restoreDraft = async () => {
      try {
        const saved = sessionStorage.getItem('mipa_pending_booking');
        if (!saved) {
          setDraftRestoreStatus('IDLE');
          return;
        }

        setDraftRestoreStatus('RESTORING');
        const draft: PendingBookingDraft = JSON.parse(saved);
        if (!draft || typeof draft !== 'object') {
          setDraftRestoreStatus('INVALID');
          return;
        }

        // 1. Validate service
        if (!draft.serviceId) {
          setDraftRestoreStatus('INVALID');
          setStep(1);
          setErrorMessage('Một số lựa chọn trước đó không còn khả dụng. Vui lòng chọn lại dịch vụ.');
          return;
        }
        const s = services.find(x => x.id === draft.serviceId || x.slug === draft.serviceId);
        if (!s) {
          setSelectedService(null);
          setSelectedPackage(null);
          setSelectedConcepts([]);
          setSelectedStudio(null);
          setStep(1);
          setErrorMessage('Một số lựa chọn trước đó không còn khả dụng. Vui lòng chọn lại dịch vụ.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        setSelectedService(s);

        // 2. Validate package & relationship to service
        if (!draft.packageId) {
          setSelectedPackage(null);
          setSelectedConcepts([]);
          setStep(2);
          setErrorMessage('Gói chụp trước đó không còn phù hợp với dịch vụ đã chọn.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        const p = packages.find(x => x.id === draft.packageId || x.name === draft.packageId);
        if (!p || (p.serviceId && p.serviceId !== s.id)) {
          setSelectedPackage(null);
          setSelectedConcepts([]);
          setStep(2);
          setErrorMessage('Gói chụp trước đó không còn phù hợp với dịch vụ đã chọn.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        setSelectedPackage(p);

        // 3. Validate concepts against active, bookable concepts (cross-service allowed by authoritative contract)
        const validConcepts = Array.isArray(draft.conceptIds)
          ? concepts.filter(c => c.active && c.bookable && (draft.conceptIds.includes(c.id) || draft.conceptIds.includes(c.slug)))
          : [];
        const maxC = p.conceptsCount || 1;
        setSelectedConcepts(validConcepts.slice(0, maxC));

        // 4. Validate studio
        if (!draft.studioId) {
          setSelectedStudio(null);
          setStep(3);
          setErrorMessage('Phòng studio trước đó không còn khả dụng. Vui lòng chọn phòng chụp khác.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        const std = studios.find(x => x.id === draft.studioId && (x.status ? x.status === 'ACTIVE' : true));
        if (!std) {
          setSelectedStudio(null);
          setStep(3);
          setErrorMessage('Phòng studio trước đó không còn khả dụng. Vui lòng chọn phòng chụp khác.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        setSelectedStudio(std);

        // 5. Restore addons (only valid existing ones; do NOT auto-add default addon)
        const validAddons: Addon[] = [];
        if (Array.isArray(draft.addonIds)) {
          const matchedAddons = addons.filter(a => draft.addonIds.includes(a.id));
          validAddons.push(...matchedAddons);
          setSelectedAddons(matchedAddons);
        } else {
          setSelectedAddons([]);
        }

        // 6. Restore customer contact info & metadata
        if (draft.customerName) setCustomerName(draft.customerName);
        if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
        if (draft.customerEmail) setCustomerEmail(draft.customerEmail);
        if (draft.occasion) setOccasion(draft.occasion);
        if (draft.customerNote) setCustomerNote(draft.customerNote);

        // Voucher revalidation: authoritatively validate against loaded promotions
        if (draft.voucherCode) {
          setVoucherCode(draft.voucherCode);
          setIsVoucherApplied(false);
          setAppliedPromotion(null);
          const rawCode = draft.voucherCode.trim().toUpperCase();
          const matchedPromo = promotions.find(pr => pr.code.toUpperCase() === rawCode);
          if (matchedPromo) {
            const draftSubtotal = (p.price || 0) + validAddons.reduce((sum, a) => sum + (a.price || 0), 0);
            const val = validatePromotion(matchedPromo, draftSubtotal, s.id);
            if (val.valid) {
              setIsVoucherApplied(true);
              setAppliedPromotion(matchedPromo);
            }
          }
        } else {
          setVoucherCode('');
          setIsVoucherApplied(false);
          setAppliedPromotion(null);
        }

        // 7. Authoritatively validate Date (untrusted input)
        // Must be present, valid format YYYY-MM-DD, and >= today in Asia/Ho_Chi_Minh
        const todayVn = getTodayVn();
        if (!draft.date || typeof draft.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date < todayVn) {
          draftSlotRejectedRef.current = true;
          setSelectedTimeSlot('');
          setStep(3);
          setErrorMessage('Ngày chụp trước đó không còn hợp lệ. Vui lòng chọn lại ngày và khung giờ.');
          setDraftRestoreStatus('INVALID');
          return;
        }
        setSelectedDate(draft.date);

        // 8. Authoritatively validate TimeSlot (untrusted input)
        if (!draft.timeSlot || typeof draft.timeSlot !== 'string') {
          draftSlotRejectedRef.current = true;
          setSelectedTimeSlot('');
          setStep(3);
          setErrorMessage('Khung giờ trước đó không còn khả dụng. Vui lòng chọn khung giờ khác.');
          setDraftRestoreStatus('INVALID');
          return;
        }

        // Calculate authoritative duration from single source of truth (pricingService)
        const draftPricing = calculatePricing({
          packageItem: p,
          addons: validAddons,
        });
        const durationMinutes = draftPricing.totalDurationMinutes;

        let slots: TimeSlot[] = [];
        try {
          if (isSupabaseConfigured()) {
            slots = await getAvailableSlots({
              date: draft.date,
              studioId: std.id,
              durationMinutes,
              existingBookings,
            });
          } else {
            slots = getAvailableSlotsSync({
              date: draft.date,
              studioId: std.id,
              durationMinutes,
              existingBookings,
            });
          }
        } catch (availErr: any) {
          if (isCancelled) return;
          console.warn('Draft restoration availability check failed:', availErr);
          setStep(3);
          setAvailableSlots([]);
          setSelectedTimeSlot('');
          setAvailabilityError('Không thể kiểm tra lịch trống lúc này. Vui lòng thử lại.');
          setErrorMessage('Không thể xác minh lịch trống lúc này. Lựa chọn của bạn vẫn được giữ lại. Vui lòng thử lại.');
          // Do NOT remove draft from sessionStorage!
          return;
        }

        if (isCancelled) return;
        setAvailableSlots(slots);

        const matchedSlot = slots.find(s => s.time === draft.timeSlot);
        if (!matchedSlot || matchedSlot.status !== 'AVAILABLE') {
          draftSlotRejectedRef.current = true;
          setSelectedTimeSlot('');
          setStep(3);
          setErrorMessage('Khung giờ trước đó không còn khả dụng. Vui lòng chọn khung giờ khác.');
          setDraftRestoreStatus('INVALID');
          return;
        }

        // Slot is authoritatively verified and AVAILABLE
        setSelectedTimeSlot(draft.timeSlot);
        draftSlotRejectedRef.current = false;
        userSlotChoiceClearedRef.current = false;

        // 9. Full successful restoration: advance to Step 5 and mark RESTORED
        draftRestoredRef.current = true;
        setStep(5);
        setDraftRestoreStatus('RESTORED');
      } catch (e) {
        console.warn('Could not restore pending booking draft:', e);
        if (!isCancelled) {
          setDraftRestoreStatus('INVALID');
        }
      }
    };

    restoreDraft();

    return () => {
      isCancelled = true;
    };
  }, [catalogReady, isLoadingCatalog, services, packages, concepts, studios, addons, promotions, existingBookings]);

  // Filter packages by selected service when service changes (or universal packages)
  const availablePackages = selectedService
    ? packages.filter(p => !p.serviceId || p.serviceId === selectedService.id)
    : [];
  const displayedPackages = availablePackages;

  // Auto-synchronize selectedPackage whenever selectedService or packages list changes
  useEffect(() => {
    if (!selectedService || packageMismatchError) return;
    const serviceId = selectedService.id;
    const matching = packages.filter(p => !p.serviceId || p.serviceId === serviceId);
    if (matching.length > 0) {
      setSelectedPackage(prev => {
        if (prev && matching.some(p => p.id === prev.id)) return prev;
        return matching.find(p => p.recommended) || matching[0];
      });
    } else {
      setSelectedPackage(null);
    }
  }, [selectedService, packages, packageMismatchError]);

  // Available concepts: all active && bookable concepts.
  // Order for UX:
  // 1. Same-service concepts
  // 2. Universal concepts
  // 3. Other service concepts
  const availableConcepts = useMemo(() => {
    const activeBookable = concepts.filter(c => c.active && c.bookable);
    if (!selectedService) return activeBookable;
    const sameService: Concept[] = [];
    const universal: Concept[] = [];
    const otherService: Concept[] = [];
    for (const c of activeBookable) {
      if (c.serviceId === selectedService.id) {
        sameService.push(c);
      } else if (!c.serviceId) {
        universal.push(c);
      } else {
        otherService.push(c);
      }
    }
    return [...sameService, ...universal, ...otherService];
  }, [selectedService, concepts]);

  // Keep selectedConcepts synchronized with active & bookable concepts
  useEffect(() => {
    if (concepts.length === 0) {
      setSelectedConcepts([]);
      return;
    }
    setSelectedConcepts(prev => prev.filter(sc => concepts.some(c => c.id === sc.id && c.active && c.bookable)));
  }, [concepts]);

  // Realtime Price & Duration Calculation (Single Source of Truth calculation)
  const pricing = useMemo(() => {
    let activePromo: Promotion | null = null;
    if (isVoucherApplied && appliedPromotion) {
      const currentSubtotal = (selectedPackage?.price || 0) + selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
      const val = validatePromotion(appliedPromotion, currentSubtotal, selectedService?.id);
      if (val.valid) {
        activePromo = appliedPromotion;
      }
    }
    return calculatePricing({
      packageItem: selectedPackage || { price: 0, durationMinutes: 60 },
      addons: selectedAddons,
      promotion: activePromo,
    });
  }, [selectedPackage, selectedAddons, isVoucherApplied, appliedPromotion, selectedService]);

  const { subtotal, addonTotal, discountTotal, totalAmount, depositAmount, totalDurationMinutes } = pricing;

  // Load availability slots whenever Date, Studio or Duration changes
  const loadSlots = useCallback(async () => {
    if (!selectedStudio || !selectedDate) return;
    const currentRequestId = ++availabilityRequestIdRef.current;
    setAvailabilityError(null);

    if (!isSupabaseConfigured()) {
      const slots = getAvailableSlotsSync({
        date: selectedDate,
        studioId: selectedStudio.id,
        durationMinutes: totalDurationMinutes,
        existingBookings,
      });
      if (currentRequestId !== availabilityRequestIdRef.current) return;
      setAvailableSlots(slots);
      const currentSlotObj = slots.find(s => s.time === selectedTimeSlot);
      if (selectedTimeSlot && (!currentSlotObj || currentSlotObj.status === 'BOOKED')) {
        // The slot previously selected is no longer available. Never silently auto-switch slot.
        setSelectedTimeSlot('');
        userSlotChoiceClearedRef.current = true;
      } else if (!selectedTimeSlot && !draftSlotRejectedRef.current && !userSlotChoiceClearedRef.current) {
        const firstAvail = slots.find(s => s.status === 'AVAILABLE');
        setSelectedTimeSlot(firstAvail ? firstAvail.time : '');
      }
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
      if (currentRequestId !== availabilityRequestIdRef.current) return;
      setAvailableSlots(slots);
      setAvailabilityError(null);

      const currentSlotObj = slots.find(s => s.time === selectedTimeSlot);
      if (selectedTimeSlot && (!currentSlotObj || currentSlotObj.status === 'BOOKED')) {
        // The slot previously selected is no longer available. Never silently auto-switch slot.
        setSelectedTimeSlot('');
        userSlotChoiceClearedRef.current = true;
      } else if (!selectedTimeSlot && !draftSlotRejectedRef.current && !userSlotChoiceClearedRef.current) {
        const firstAvail = slots.find(s => s.status === 'AVAILABLE');
        setSelectedTimeSlot(firstAvail ? firstAvail.time : '');
      }
    } catch (err: any) {
      if (currentRequestId !== availabilityRequestIdRef.current) return;
      console.warn('Availability loading error:', err);
      setAvailableSlots([]);
      setSelectedTimeSlot('');
      setAvailabilityError('Không thể kiểm tra lịch trống lúc này. Vui lòng thử lại.');
    } finally {
      if (currentRequestId === availabilityRequestIdRef.current) {
        setIsLoadingSlots(false);
      }
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

  const consumePendingBookingDraft = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mipa_pending_booking');
      }
    } catch (err) {
      console.warn('Could not remove pending booking draft from sessionStorage:', err);
    }
    draftRestoredRef.current = true;
    setDraftRestoreStatus('RESTORED');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadSlots();
  }, [isOpen, loadSlots]);

  // Revalidate applied voucher whenever package, addons, or service changes
  useEffect(() => {
    if (!isOpen) return;
    if (isVoucherApplied && appliedPromotion) {
      const currentSubtotal = (selectedPackage?.price || 0) + selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
      const valResult = validatePromotion(appliedPromotion, currentSubtotal, selectedService?.id);
      if (!valResult.valid) {
        setIsVoucherApplied(false);
        setAppliedPromotion(null);
        setErrorMessage(`Mã ưu đãi "${appliedPromotion.code}" không còn thỏa điều kiện cho lựa chọn mới: ${valResult.error}`);
      }
    }
  }, [isOpen, selectedPackage, selectedAddons, selectedService, isVoucherApplied, appliedPromotion]);

  if (!isOpen) return null;

  const handleApplyVoucher = () => {
    if (promotionsLoadError) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage('Không thể xác minh mã ưu đãi lúc này.');
      return;
    }
    const raw = voucherCode.trim().toUpperCase();
    if (!raw) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage('Vui lòng nhập mã ưu đãi.');
      return;
    }
    const matched = promotions.find(p => p.code.toUpperCase() === raw);
    if (!matched) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage('Mã ưu đãi không hợp lệ.');
      return;
    }
    const currentSubtotal = (selectedPackage?.price || 0) + selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
    const valResult = validatePromotion(matched, currentSubtotal, selectedService?.id);
    if (!valResult.valid) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage(valResult.error || 'Mã ưu đãi không hợp lệ.');
      return;
    }
    setIsVoucherApplied(true);
    setAppliedPromotion(matched);
    setErrorMessage(null);
  };

  const refreshAndValidateAppliedPromotion = async (): Promise<{ success: boolean; refreshedPromo?: Promotion }> => {
    if (!isVoucherApplied || !appliedPromotion) {
      return { success: true };
    }

    let latestPromotions: Promotion[];
    try {
      latestPromotions = await getPromotions();
      setPromotions(latestPromotions);
    } catch (err) {
      console.warn('Pre-submit promotion refresh failed:', err);
      setErrorMessage('Không thể xác minh mã ưu đãi lúc này. Vui lòng thử lại hoặc gỡ mã để tiếp tục.');
      return { success: false };
    }

    const rawCode = appliedPromotion.code.trim().toUpperCase();
    const refreshed = latestPromotions.find(p => p.code.trim().toUpperCase() === rawCode);
    if (!refreshed) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage('Mã ưu đãi không còn khả dụng.');
      return { success: false };
    }

    const currentSubtotal = (selectedPackage?.price || 0) + selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
    const valResult = validatePromotion(refreshed, currentSubtotal, selectedService?.id);
    if (!valResult.valid) {
      setIsVoucherApplied(false);
      setAppliedPromotion(null);
      setErrorMessage(valResult.error || 'Mã ưu đãi không còn hợp lệ.');
      return { success: false };
    }

    setAppliedPromotion(refreshed);
    return { success: true, refreshedPromo: refreshed };
  };

  const maxConcepts = selectedPackage?.conceptsCount || 1;

  const handleToggleConcept = (cnc: Concept) => {
    setErrorMessage(null);
    if (selectedConcepts.some(c => c.id === cnc.id)) {
      setSelectedConcepts(selectedConcepts.filter(c => c.id !== cnc.id));
    } else {
      if (selectedConcepts.length < maxConcepts) {
        setSelectedConcepts([...selectedConcepts, cnc]);
      } else if (maxConcepts === 1) {
        setSelectedConcepts([cnc]);
      } else {
        setErrorMessage(`Gói ${selectedPackage ? selectedPackage.name : 'đã chọn'} cho phép chọn tối đa ${maxConcepts} concept. Vui lòng bỏ chọn bớt một concept để đổi.`);
      }
    }
  };

  const handleGuestAuthRedirect = (tab: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    try {
      const pendingData: PendingBookingDraft = {
        version: 1,
        serviceId: selectedService?.id,
        packageId: selectedPackage?.id,
        studioId: selectedStudio?.id,
        conceptIds: selectedConcepts.map(c => c.id),
        addonIds: selectedAddons.map(a => a.id),
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        customerName,
        customerPhone,
        customerEmail,
        occasion,
        customerNote,
        voucherCode: voucherCode || '',
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
    if (!selectedService || !selectedPackage || !selectedStudio) {
      setErrorMessage('Thông tin đặt lịch chưa đầy đủ. Vui lòng kiểm tra lại dịch vụ, gói chụp và phòng studio.');
      return;
    }

    if (!selectedTimeSlot) {
      setErrorMessage('Khung giờ đã thay đổi hoặc không còn khả dụng. Vui lòng chọn lại.');
      setStep(3);
      return;
    }

    // Check slot availability locally before advancing
    const initialSlot = availableSlots.find(s => s.time === selectedTimeSlot);
    if (!initialSlot || initialSlot.status !== 'AVAILABLE') {
      setSelectedTimeSlot('');
      userSlotChoiceClearedRef.current = true;
      setErrorMessage('Khung giờ đã thay đổi hoặc không còn khả dụng. Vui lòng chọn lại.');
      setStep(3);
      return;
    }

    // If Supabase is active, enforce login before creating database booking
    if (isSupabaseConfigured() && !user) {
      handleGuestAuthRedirect('LOGIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Authoritatively re-fetch availability immediately before createBooking
      let freshSlots: TimeSlot[] = [];
      try {
        if (isSupabaseConfigured()) {
          freshSlots = await getAvailableSlots({
            date: selectedDate,
            studioId: selectedStudio.id,
            durationMinutes: totalDurationMinutes,
            existingBookings,
          });
        } else {
          freshSlots = getAvailableSlotsSync({
            date: selectedDate,
            studioId: selectedStudio.id,
            durationMinutes: totalDurationMinutes,
            existingBookings,
          });
        }
      } catch (availErr: any) {
        console.warn('Pre-submit availability check failed:', availErr);
        setStep(3);
        setAvailabilityError('Không thể kiểm tra lịch trống lúc này. Vui lòng thử lại.');
        setErrorMessage(availErr.message || 'Không thể kiểm tra lịch trống lúc này. Vui lòng thử lại.');
        setIsSubmitting(false);
        return;
      }
      setAvailableSlots(freshSlots);

      const authoritativeSlot = freshSlots.find(s => s.time === selectedTimeSlot);
      if (!authoritativeSlot || authoritativeSlot.status !== 'AVAILABLE') {
        setSelectedTimeSlot('');
        userSlotChoiceClearedRef.current = true;
        setErrorMessage('Khung giờ đã thay đổi hoặc không còn khả dụng. Vui lòng chọn lại.');
        setStep(3);
        setIsSubmitting(false);
        return;
      }

      // Pre-submit promotion refresh and authoritative verification
      let refreshedVoucherCode: string | undefined;
      if (isVoucherApplied && appliedPromotion) {
        const promoCheck = await refreshAndValidateAppliedPromotion();
        if (!promoCheck.success) {
          setIsSubmitting(false);
          return;
        }
        refreshedVoucherCode = promoCheck.refreshedPromo?.code;
      }

      const payload = {
        serviceId: selectedService.id,
        packageId: selectedPackage.id,
        studioId: selectedStudio.id,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        addonIds: selectedAddons.map(a => a.id),
        conceptIds: selectedConcepts.map(c => c.id),
        voucherCode: refreshedVoucherCode,
        customerName,
        customerPhone,
        customerEmail,
        occasion,
        customerNote,
      };

      if (!isSupabaseConfigured()) {
        const newBooking = createBookingInMemory(payload);
        setCreatedBooking(newBooking);
        consumePendingBookingDraft();
        const payment = createDepositPaymentSync(newBooking.id, 'BANK_TRANSFER');
        setCurrentPayment(payment);
        setStep(6);
        return;
      }

      const newBooking = await createBooking(payload);
      setCreatedBooking(newBooking);
      consumePendingBookingDraft();

      // Trigger asynchronous confirmation email dispatch in background
      dispatchBookingEmail(newBooking.id).catch((dispatchErr) => {
        console.warn('Notice: Background booking email dispatch:', dispatchErr);
      });

      // Create backend-authoritative deposit payment
      const payment = await createDepositPayment(newBooking.id, 'BANK_TRANSFER');
      setCurrentPayment(payment);
      setStep(6);
    } catch (err: any) {
      if (err instanceof BookingConflictError || err.name === 'BookingConflictError') {
        setErrorMessage(`⚠️ TRÙNG LỊCH: ${err.message || 'Phòng studio đã có người đặt trong khung giờ này.'} Vui lòng quay lại Bước 3 để chọn khung giờ khác.`);
        setStep(3);
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

  if (!isOpen && presentation !== 'PAGE') return null;

  return (
    <div className={presentation === 'PAGE' ? 'booking-wizard-page-wrapper' : 'modal-overlay'}>
      <div
        className={`booking-wizard-container ${presentation === 'PAGE' ? 'presentation-page' : 'modal-content'}`}
        data-catalog-ready={catalogReady ? 'true' : 'false'}
        data-draft-restore-status={draftRestoreStatus}
      >
        {/* Header Bar */}
        <div className="booking-wizard-header">
          <div>
            <span className="editorial-overline" style={{ marginBottom: '0.2rem' }}>
              MAISON MIPA / ĐẶT LỊCH
            </span>
            <h3 style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: '1.4rem',
              color: 'var(--editorial-brown)',
              margin: 0,
              fontWeight: 600,
            }}>
              {step === 7 ? 'Đặt lịch thành công' : `Bước ${step}/6 — ${
                step === 1 ? 'Chọn loại hình dịch vụ' :
                step === 2 ? 'Chọn gói chụp' :
                step === 3 ? 'Chọn ngày & giờ chụp' :
                step === 4 ? 'Dịch vụ bổ sung' :
                step === 5 ? 'Thông tin khách hàng' :
                'Xác nhận & thanh toán tiền cọc'
              }`}
            </h3>
          </div>
          {presentation !== 'PAGE' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--editorial-divider)',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--editorial-brown)',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {step <= 6 && (
          <div className="booking-progress-bar">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`booking-progress-step ${i <= step ? 'active' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Selection Continuity Summary Header (Only real selections, no dev IDs) */}
        <div
          className="booking-continuity-summary"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.75rem 1.8rem',
            backgroundColor: '#FAF8F3',
            borderBottom: '1px solid rgba(140, 110, 83, 0.16)',
            fontSize: '0.82rem',
          }}
        >
          {selectedService && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 600, textTransform: 'uppercase' }}>
                DỊCH VỤ:
              </span>
              <strong style={{ color: '#29231F' }}>{selectedService.name}</strong>
            </div>
          )}

          {selectedConcepts.length > 0 && selectedConcepts[0] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'rgba(140, 110, 83, 0.35)' }}>•</span>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 600, textTransform: 'uppercase' }}>
                CONCEPT:
              </span>
              <strong style={{ color: '#29231F' }}>{selectedConcepts[0].name}</strong>
            </div>
          )}

          {selectedPackage && !packageMismatchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'rgba(140, 110, 83, 0.35)' }}>•</span>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 600, textTransform: 'uppercase' }}>
                GÓI CHỤP:
              </span>
              <strong style={{ color: '#29231F' }}>{selectedPackage.name}</strong>
              <span style={{ color: '#8C6E53' }}>({selectedPackage.price.toLocaleString('vi-VN')} đ)</span>
            </div>
          )}
        </div>

        {/* Package Mismatch Fail-Closed Alert Banner */}
        {packageMismatchError && (
          <div
            style={{
              backgroundColor: '#FFF1F2',
              borderBottom: '1px solid #FECDD3',
              padding: '0.75rem 1.8rem',
              color: '#9F1239',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <AlertCircle size={18} color="#9F1239" style={{ flexShrink: 0 }} />
            <span>{packageMismatchError}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #FCA5A5',
            padding: '0.75rem 1.8rem',
            color: '#991B1B',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="#991B1B" />
              <span>{errorMessage}</span>
            </div>
            {step >= 4 && (
              <button
                onClick={() => { setErrorMessage(null); setStep(3); }}
                style={{
                  backgroundColor: '#991B1B',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Đổi khung giờ (Bước 3)
              </button>
            )}
          </div>
        )}

        {/* Scrollable Step Content Body */}
        <div key={step} className="booking-step-content" style={{ padding: '1.8rem', overflowY: 'auto', flex: 1 }}>
          
          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <div>
              {catalogError ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#FFFDF9', borderRadius: '4px', border: '1px solid #FECDD3' }}>
                  <AlertCircle size={40} color="#9F1239" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontFamily: 'var(--editorial-font-heading, serif)', fontSize: '1.4rem', marginBottom: '0.6rem', color: '#1E1815', fontWeight: 500 }}>
                    Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.
                  </h3>
                  <p style={{ color: '#6E5F55', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                    Hệ thống không thể kết nối tới cơ sở dữ liệu để lấy danh mục dịch vụ & gói chụp mới nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => loadInitialData()}
                    style={{
                      padding: '0.65rem 1.6rem',
                      backgroundColor: '#8C6E53',
                      color: '#FAF8F3',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <RefreshCw size={15} /> Thử lại
                  </button>
                </div>
              ) : !isLoadingCatalog && services.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#FAF8F3', borderRadius: '4px', border: '1px dashed rgba(140, 110, 83, 0.2)' }}>
                  <p style={{ color: '#6E5F55', fontSize: '0.95rem', margin: 0 }}>
                    Hiện chưa có dịch vụ nào khả dụng trên hệ thống.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ color: 'var(--editorial-text-secondary)', marginBottom: '1.4rem', fontSize: '0.95rem' }}>
                    Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào cùng Maison MIPA? {isLoadingCatalog && '(Đang tải danh mục...)'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {services.map((srv) => {
                      const isSelected = selectedService?.id === srv.id;
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          key={srv.id}
                          onClick={() => {
                            setSelectedService(srv);
                            setPackageMismatchError(null);
                            setErrorMessage(null);
                            const matching = packages.filter(p => !p.serviceId || p.serviceId === srv.id);
                            if (matching.length > 0) {
                              const preferred = matching.find(p => p.recommended) || matching[0];
                              setSelectedPackage(preferred);
                            } else {
                              setSelectedPackage(null);
                            }
                          }}
                          className={`booking-card-option ${isSelected ? 'selected' : ''}`}
                          style={{
                            cursor: 'pointer',
                            padding: '1.1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            width: '100%',
                            border: isSelected ? '2px solid var(--editorial-brown)' : '1px solid var(--editorial-divider)',
                            backgroundColor: isSelected ? '#FAF6EE' : '#FFFFFF',
                            borderRadius: '4px',
                          }}
                        >
                          <div style={{ position: 'relative', height: '140px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                            <img src={srv.image} alt={srv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {srv.badge && (
                              <span style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'var(--editorial-brown)',
                                color: 'var(--editorial-paper)',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.6rem',
                                borderRadius: '2px',
                                letterSpacing: '0.04em',
                              }}>
                                {srv.badge}
                              </span>
                            )}
                          </div>
                          <h4 style={{
                            fontFamily: 'var(--editorial-font-heading)',
                            fontSize: '1.25rem',
                            color: 'var(--editorial-brown)',
                            marginBottom: '0.3rem',
                            fontWeight: 600,
                          }}>
                            {srv.name}
                          </h4>
                          <p style={{ fontSize: '0.84rem', color: 'var(--editorial-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                            {srv.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: PACKAGE SELECTION */}
          {step === 2 && (
            <div>
              {packageMismatchError && (
                <div style={{
                  padding: '0.85rem 1.2rem',
                  backgroundColor: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  borderRadius: '4px',
                  color: '#9F1239',
                  fontSize: '0.88rem',
                  marginBottom: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertCircle size={18} color="#9F1239" style={{ flexShrink: 0 }} />
                  <span>{packageMismatchError}</span>
                </div>
              )}
              <p style={{ color: 'var(--editorial-text-secondary)', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Gói dịch vụ chọn cho loại hình <strong>{selectedService?.name || ''}</strong>:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                {displayedPackages.length === 0 ? (
                  <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '2.5rem', color: 'var(--editorial-brown-accent)', background: '#FAF6EE', borderRadius: '4px', border: '1px dashed var(--editorial-divider)' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>Đang cập nhật danh mục gói chụp cho dịch vụ này...</p>
                  </div>
                ) : (
                  displayedPackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setPackageMismatchError(null);
                          setErrorMessage(null);
                        }}
                        className={`booking-card-option ${isSelected ? 'selected' : ''}`}
                        style={{
                          padding: '1.4rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: 'none',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          width: '100%',
                          border: isSelected ? '2px solid var(--editorial-brown)' : '1px solid var(--editorial-divider)',
                          backgroundColor: isSelected ? '#FAF6EE' : '#FFFFFF',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <div>
                          {pkg.popularTag && (
                            <div style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--editorial-brown-accent)',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              marginBottom: '0.4rem',
                            }}>
                              {pkg.popularTag === 'POPULAR' ? 'Được chọn nhiều' : pkg.popularTag}
                            </div>
                          )}
                          <h4 style={{
                            fontFamily: 'var(--editorial-font-heading)',
                            fontSize: '1.35rem',
                            color: 'var(--editorial-brown)',
                            marginBottom: '0.4rem',
                            fontWeight: 600,
                          }}>
                            {pkg.name}
                          </h4>
                          <div style={{
                            fontFamily: 'var(--editorial-font-heading)',
                            fontSize: '1.65rem',
                            fontWeight: 600,
                            color: 'var(--editorial-brown)',
                            marginBottom: '1rem',
                          }}>
                            {pkg.price.toLocaleString('vi-VN')}đ
                          </div>
                          
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {pkg.features.map((feat, idx) => (
                              <li key={idx} style={{ fontSize: '0.84rem', color: 'var(--editorial-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                                <Check size={13} color="var(--editorial-brown-accent)" style={{ marginTop: '3px', flexShrink: 0 }} />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                          <span
                            className={isSelected ? 'public-btn-primary' : 'public-btn-secondary'}
                            style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem 1rem', display: 'inline-block', boxSizing: 'border-box' }}
                          >
                            {isSelected ? 'Đã chọn gói này' : 'Chọn gói này'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Concept Selection within Step 2 */}
              <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--editorial-divider)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: '1.3rem',
                      color: 'var(--editorial-brown)',
                      margin: 0,
                      fontWeight: 600,
                    }}>
                      Chọn concept (không bắt buộc) ({selectedConcepts.length}/{maxConcepts})
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--editorial-text-secondary)', margin: '0.2rem 0 0 0' }}>
                      Bạn có thể chọn tối đa {maxConcepts} concept.
                    </p>
                  </div>
                  {selectedConcepts.length > 0 && (
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#FAF6EE', color: 'var(--editorial-brown)', padding: '0.3rem 0.75rem', borderRadius: '3px', border: '1px solid var(--editorial-divider)', fontWeight: 500 }}>
                      Đã chọn: {selectedConcepts.map(c => c.name).join(', ')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {availableConcepts.length === 0 ? (
                    <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '2rem 1rem', color: '#6E5F55', background: '#FAF8F3', borderRadius: '4px', border: '1px dashed rgba(140, 110, 83, 0.2)' }}>
                      <p style={{ margin: 0, fontSize: '0.88rem' }}>
                        Hiện chưa có concept khả dụng cho dịch vụ này.
                      </p>
                    </div>
                  ) : (
                    availableConcepts.map((cnc) => {
                      const isSelected = selectedConcepts.some(c => c.id === cnc.id);
                      return (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          key={cnc.id}
                          onClick={() => handleToggleConcept(cnc)}
                          style={{
                            borderRadius: '4px',
                            border: isSelected ? '2px solid var(--editorial-brown)' : '1px solid var(--editorial-divider)',
                            backgroundColor: isSelected ? '#FAF6EE' : '#FFFFFF',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            transition: 'border-color 0.2s ease, background-color 0.2s ease',
                            boxShadow: 'none',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            padding: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ position: 'relative', height: '130px', width: '100%', backgroundColor: '#EDE4D8', overflow: 'hidden' }}>
                            {cnc.coverPhotoUrl ? (
                              <img
                                src={cnc.coverPhotoUrl}
                                alt={cnc.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <EditorialImagePlaceholder label={cnc.name} height="130px" minHeight="130px" />
                            )}
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                backgroundColor: 'var(--editorial-brown)',
                                color: '#FFF',
                                borderRadius: '2px',
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
                          <div style={{ padding: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--editorial-brown)', marginBottom: '0.2rem' }}>
                              {cnc.name}
                            </div>
                            {cnc.description ? (
                              <p style={{ fontSize: '0.78rem', color: 'var(--editorial-text-secondary)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {cnc.description}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DATE, TIME & STUDIO */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div>
                  <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    1. Chọn ngày chụp mong muốn
                  </label>
                  <input
                    type="date"
                    min={getTodayVn()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mipa-input"
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid var(--editorial-divider)',
                      backgroundColor: '#FFFFFF',
                    }}
                  />

                  <div style={{ marginTop: '1.8rem' }}>
                    <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      2. Chọn không gian studio
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {studios.map((std) => {
                        const isSel = selectedStudio?.id === std.id;
                        return (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={isSel}
                            key={std.id}
                            onClick={() => setSelectedStudio(std)}
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: '4px',
                              border: isSel ? '2px solid var(--editorial-brown)' : '1px solid var(--editorial-divider)',
                              backgroundColor: isSel ? '#FAF6EE' : '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'border-color 0.2s ease, background-color 0.2s ease',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              width: '100%',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--editorial-brown)', fontSize: '0.92rem' }}>{std.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--editorial-text-secondary)', marginTop: '0.15rem' }}>
                                Sức chứa: {std.capacity} người • {std.description ? `${std.description.slice(0, 48)}...` : ''}
                              </div>
                            </div>
                            {isSel && <Check size={16} color="var(--editorial-brown)" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600, margin: 0 }}>
                      3. Chọn giờ chụp
                    </label>
                    {isLoadingSlots && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--editorial-brown-accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <RefreshCw size={12} className="animate-spin" /> Đang kiểm tra...
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--editorial-text-secondary)', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                    Tổng thời lượng: <strong>{totalDurationMinutes} phút</strong> (Gói {selectedPackage?.durationMinutes || 0}p{pricing.totalDurationMinutes > (selectedPackage?.durationMinutes || 0) ? ` + dịch vụ thêm ${pricing.totalDurationMinutes - (selectedPackage?.durationMinutes || 0)}p` : ''}).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                    {availabilityError ? (
                      <div style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '4px',
                        color: '#9F1239',
                      }}>
                        <AlertCircle size={20} color="#9F1239" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                        <p style={{ margin: '0 0 0.8rem', fontSize: '0.88rem', fontWeight: 500 }}>
                          {availabilityError}
                        </p>
                        <button
                          type="button"
                          onClick={() => loadSlots()}
                          className="public-btn-secondary"
                          style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <RefreshCw size={13} />
                          Thử lại
                        </button>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--editorial-text-secondary)', fontSize: '0.88rem', background: '#FAF6EE', borderRadius: '4px', border: '1px dashed var(--editorial-divider)' }}>
                        Không có khung giờ khả dụng cho ngày này. Vui lòng chọn ngày khác.
                      </div>
                    ) : (
                      availableSlots.map((slot) => {
                        const isBooked = slot.status === 'BOOKED';
                        const isSel = !isBooked && selectedTimeSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isBooked}
                            aria-disabled={isBooked}
                            onClick={() => {
                              if (isBooked) return;
                              setSelectedTimeSlot(slot.time);
                              draftSlotRejectedRef.current = false;
                              userSlotChoiceClearedRef.current = false;
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '4px',
                              border: isBooked
                                ? '1px solid rgba(0, 0, 0, 0.08)'
                                : isSel
                                ? '2px solid var(--editorial-brown)'
                                : '1px solid var(--editorial-divider)',
                              backgroundColor: isBooked
                                ? '#F7F5F2'
                                : isSel
                                ? '#FAF6EE'
                                : '#FFFFFF',
                              opacity: isBooked ? 0.6 : 1,
                              cursor: isBooked ? 'not-allowed' : 'pointer',
                              pointerEvents: isBooked ? 'none' : 'auto',
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <Clock size={15} color={isBooked ? '#9E9287' : isSel ? 'var(--editorial-brown)' : 'var(--editorial-brown-accent)'} />
                              <div>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: '0.92rem',
                                    color: isBooked ? '#9E9287' : 'var(--editorial-text-primary)',
                                    textDecoration: isBooked ? 'line-through' : 'none',
                                  }}
                                >
                                  {slot.time}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: isBooked ? '#9E9287' : 'var(--editorial-text-secondary)', marginLeft: '0.5rem' }}>
                                  ({slot.label})
                                </span>
                              </div>
                            </div>

                            <div>
                              {isBooked ? (
                                <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 500 }}>
                                  Đã kín lịch
                                </span>
                              ) : slot.tag ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--editorial-brown-accent)', fontWeight: 500 }}>{slot.tag}</span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 500 }}>Còn chỗ</span>
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
              <p style={{ color: 'var(--editorial-text-secondary)', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
                Chọn thêm dịch vụ đi kèm để hoàn thiện buổi chụp:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {addons.map((addon) => {
                  const isChecked = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      key={addon.id}
                      onClick={() => handleToggleAddon(addon)}
                      style={{
                        padding: '1.1rem',
                        borderRadius: '4px',
                        border: isChecked ? '2px solid var(--editorial-brown)' : '1px solid var(--editorial-divider)',
                        backgroundColor: isChecked ? '#FAF6EE' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        transition: 'border-color 0.2s ease, background-color 0.2s ease',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        width: '100%',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        tabIndex={-1}
                        style={{ width: '16px', height: '16px', marginTop: '3px', accentColor: 'var(--editorial-brown)', pointerEvents: 'none' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--editorial-brown)', margin: 0 }}>{addon.name}</h5>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--editorial-brown-accent)' }}>
                            +{addon.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--editorial-text-secondary)', marginTop: '0.3rem', margin: '0.3rem 0 0 0', lineHeight: 1.4 }}>
                          {addon.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Summary of Selection */}
              <div style={{
                marginTop: '1.8rem',
                padding: '1.2rem',
                backgroundColor: '#FAF6EE',
                borderRadius: '4px',
                border: '1px solid var(--editorial-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--editorial-brown)' }}>
                    Gói <strong>{selectedPackage?.name || ''}</strong> ({selectedPackage ? selectedPackage.price.toLocaleString('vi-VN') : '0'}đ) + Dịch vụ thêm ({addonTotal.toLocaleString('vi-VN')}đ)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--editorial-text-secondary)', marginTop: '0.2rem' }}>
                    Tiền cọc giữ lịch (30%): <strong>{depositAmount.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--editorial-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    TẠM TÍNH
                  </span>
                  <div style={{
                    fontFamily: 'var(--editorial-font-heading)',
                    fontSize: '1.6rem',
                    fontWeight: 600,
                    color: 'var(--editorial-brown)',
                  }}>
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
                  padding: '1.2rem 1.4rem',
                  borderRadius: '4px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid var(--editorial-divider)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--editorial-brown)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LogIn size={16} color="var(--editorial-brown-accent)" /> Đang đặt lịch với tư cách Khách
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--editorial-text-secondary)', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                      Đăng nhập để đồng bộ lịch hẹn và theo dõi tiến độ bộ ảnh thuận tiện hơn. Lựa chọn của bạn sẽ được giữ nguyên vẹn.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => handleGuestAuthRedirect('LOGIN')}
                      className="public-btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                    >
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGuestAuthRedirect('REGISTER')}
                      className="public-btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                    >
                      Đăng ký
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Họ và tên *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mipa-input"
                    placeholder="Họ và tên"
                    style={{ borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}
                  />
                </div>
                <div>
                  <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Số điện thoại *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mipa-input"
                    placeholder="Số điện thoại"
                    style={{ borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--editorial-text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={13} color="var(--editorial-brown-accent)" /> Studio sẽ liên hệ xác nhận qua số điện thoại này.
                  </div>
                </div>
                <div>
                  <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mipa-input"
                    placeholder="Email"
                    style={{ borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}
                  />
                </div>
                <div>
                  <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Dịp chụp hình</label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="mipa-input"
                    style={{ borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}
                  >
                    <option value="Kỷ niệm">Kỷ niệm tình yêu / Ngày cưới</option>
                    <option value="Sinh nhật">Sinh nhật / Tuổi mới</option>
                    <option value="Cưới">Chụp ảnh cưới / Studio Wedding</option>
                    <option value="Tốt nghiệp">Kỷ yếu / Tốt nghiệp</option>
                    <option value="Gia đình">Kỷ niệm gia đình</option>
                    <option value="Cá nhân">Chân dung cá nhân</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1.2rem' }}>
                <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Ghi chú thêm cho studio</label>
                <textarea
                  rows={3}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="mipa-input"
                  placeholder="Ghi chú về đạo cụ, trang phục, makeup hoặc tone màu mong muốn..."
                  style={{ borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}
                />
              </div>

              {/* Voucher Code Box */}
              <div style={{ marginTop: '1.2rem', padding: '1rem 1.2rem', backgroundColor: '#FAF6EE', borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}>
                <label className="mipa-label" style={{ color: 'var(--editorial-brown)', fontWeight: 600 }}>Mã ưu đãi (nếu có)</label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVoucherCode(val);
                      if (isVoucherApplied && appliedPromotion && val.trim().toUpperCase() !== appliedPromotion.code.toUpperCase()) {
                        setIsVoucherApplied(false);
                        setAppliedPromotion(null);
                      }
                    }}
                    placeholder="Nhập mã ưu đãi..."
                    className="mipa-input"
                    style={{ textTransform: 'uppercase', borderRadius: '4px', border: '1px solid var(--editorial-divider)', maxWidth: '280px' }}
                  />
                  <button type="button" onClick={handleApplyVoucher} className="public-btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                    Áp dụng
                  </button>
                </div>
                {isVoucherApplied && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#047857', fontSize: '0.82rem', fontWeight: 500 }}>
                      ✓ Đã áp dụng mã {appliedPromotion?.code} (-{discountTotal.toLocaleString('vi-VN')}đ)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsVoucherApplied(false);
                        setAppliedPromotion(null);
                        setVoucherCode('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#991B1B',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0.2rem 0.4rem',
                      }}
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMATION & DEPOSIT PAYMENT */}
          {step === 6 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.8rem' }}>
                
                {/* Summary Card */}
                <div style={{ padding: '1.4rem', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid var(--editorial-divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--editorial-divider)', paddingBottom: '0.85rem' }}>
                    <div>
                      <h4 style={{
                        fontFamily: 'var(--editorial-font-heading)',
                        fontSize: '1.35rem',
                        color: 'var(--editorial-brown)',
                        margin: 0,
                        fontWeight: 600,
                      }}>
                        {selectedService?.name || ''}
                      </h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--editorial-brown-accent)' }}>{selectedPackage?.name || ''}</span>
                    </div>
                    {currentPayment?.status === 'PAID' ? (
                      <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>ĐÃ NHẬN CỌC</span>
                    ) : isTransferSubmitted ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--editorial-brown-accent)', fontWeight: 600 }}>CHỜ ĐỐI SOÁT</span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--editorial-brown)', fontWeight: 600 }}>CHỜ ĐẶT CỌC</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Mã đặt lịch:</span>
                      <strong style={{ color: 'var(--editorial-brown)' }}>{createdBooking?.bookingCode || 'Đang tạo...'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Thời gian:</span>
                      <strong>{selectedDate} • {selectedTimeSlot} ({totalDurationMinutes} phút)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Không gian chụp:</span>
                      <strong>{selectedStudio?.name || ''}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Khách hàng:</span>
                      <strong>{customerName} ({customerPhone})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Concept:</span>
                      <strong>{selectedConcepts.length > 0 ? selectedConcepts.map(c => c.name).join(', ') : 'Không chọn'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--editorial-text-secondary)' }}>Dịch vụ kèm theo:</span>
                      <strong>{selectedAddons.length > 0 ? selectedAddons.map(a => a.name).join(', ') : 'Không có'}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.4rem', borderTop: '1px solid var(--editorial-divider)', paddingTop: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--editorial-text-secondary)', marginBottom: '0.4rem' }}>
                      <span>Giá gói:</span>
                      <span>{selectedPackage ? `${selectedPackage.price.toLocaleString('vi-VN')}đ` : '0đ'}</span>
                    </div>
                    {addonTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--editorial-text-secondary)', marginBottom: '0.4rem' }}>
                        <span>Dịch vụ thêm:</span>
                        <span>+{addonTotal.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    {discountTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#047857', marginBottom: '0.4rem' }}>
                        <span>Giảm giá:</span>
                        <span>-{discountTotal.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 600, color: 'var(--editorial-brown)', marginTop: '0.6rem', borderTop: '1px dashed var(--editorial-divider)', paddingTop: '0.6rem' }}>
                      <span>Tổng tiền dịch vụ:</span>
                      <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
                    </div>

                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#FAF6EE',
                      borderRadius: '4px',
                      border: '1px solid var(--editorial-divider)',
                      color: 'var(--editorial-brown)',
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tiền cọc giữ lịch (30%):</span>
                      <span style={{
                        fontFamily: 'var(--editorial-font-heading)',
                        fontSize: '1.4rem',
                        fontWeight: 600,
                      }}>
                        {(currentPayment?.amount || depositAmount).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Transfer & VietQR Payment Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {!isValidProductionBankConfig(activeBankConfig) ? (
                    <div style={{
                      padding: '1.4rem',
                      backgroundColor: '#FAF6EE',
                      borderRadius: '4px',
                      border: '1px solid var(--editorial-divider)',
                      color: 'var(--editorial-brown)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={18} color="var(--editorial-brown-accent)" /> Tài khoản chuyển khoản studio
                      </div>
                      <p style={{ fontSize: '0.84rem', margin: 0, lineHeight: 1.6, color: 'var(--editorial-text-secondary)' }}>
                        Quý khách vui lòng liên hệ hotline <strong>0908 123 456</strong> để được studio hướng dẫn chuyển khoản đặt cọc trực tiếp.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '1.2rem', backgroundColor: '#FAF6EE', borderRadius: '4px', border: '1px solid var(--editorial-divider)', textAlign: 'center' }}>
                      <h5 style={{
                        fontFamily: 'var(--editorial-font-heading)',
                        fontSize: '1.15rem',
                        color: 'var(--editorial-brown)',
                        marginBottom: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontWeight: 600,
                      }}>
                        <QrCode size={16} color="var(--editorial-brown)" /> Quét mã VietQR chuyển khoản cọc
                      </h5>
                      <div style={{ fontSize: '0.78rem', color: 'var(--editorial-text-secondary)', marginBottom: '0.8rem' }}>
                        Mã đã tích hợp sẵn số tài khoản, số tiền và nội dung đối soát
                      </div>
                      
                      <div style={{
                        width: '160px',
                        height: '160px',
                        margin: '0.5rem auto 1rem',
                        backgroundColor: '#FFFFFF',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--editorial-divider)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <img
                          src={generateVietQrUrl(
                            currentPayment?.amount || depositAmount,
                            currentPayment?.transfer_reference || `MIPA ${customerPhone}`,
                            activeBankConfig
                          )}
                          alt="VietQR Code Maison MIPA"
                          style={{ width: '135px', height: '135px', objectFit: 'contain' }}
                        />
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--booking-text)', textAlign: 'left', backgroundColor: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: '4px', border: '1px solid var(--editorial-divider)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div>Ngân hàng: <strong>{activeBankConfig.bankName}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Số tài khoản: <strong>{activeBankConfig.accountNumber}</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--editorial-brown)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            <Copy size={12} /> {isCopiedAccount ? 'Đã sao chép' : 'Sao chép'}
                          </button>
                        </div>
                        <div>Chủ tài khoản: <strong>{activeBankConfig.accountName}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Số tiền cọc: <strong>{(currentPayment?.amount || depositAmount).toLocaleString('vi-VN')}đ</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyAmount}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--editorial-brown)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            <Copy size={12} /> {isCopiedAmount ? 'Đã sao chép' : 'Sao chép'}
                          </button>
                        </div>
                        <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAF6EE', padding: '0.4rem 0.6rem', borderRadius: '3px', border: '1px solid var(--editorial-divider)' }}>
                          <span>Nội dung CK: <strong style={{ color: 'var(--editorial-brown)' }}>{currentPayment?.transfer_reference || `MIPA ${customerPhone}`}</strong></span>
                          <button
                            type="button"
                            onClick={handleCopyTransferRef}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--editorial-brown)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            <Copy size={12} /> {isCopiedRef ? 'Đã sao chép' : 'Sao chép'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FAF6EE',
                    borderRadius: '4px',
                    border: '1px solid var(--editorial-divider)',
                    color: 'var(--editorial-brown)',
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>TỰ ĐỘNG XÁC NHẬN QUA ACB & PAYOS</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--editorial-text-secondary)', lineHeight: 1.4 }}>
                      Quý khách chỉ cần quét mã QR bằng ứng dụng ngân hàng và xác nhận. Hệ thống sẽ tự động cập nhật ngay khi nhận được tiền cọc.
                    </p>
                  </div>

                  {isTransferSubmitted && currentPayment?.status === 'PENDING' && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#FAF6EE',
                      borderRadius: '4px',
                      color: 'var(--editorial-brown)',
                      fontSize: '0.82rem',
                      textAlign: 'center',
                      border: '1px solid var(--editorial-divider)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đã gửi thông tin chuyển khoản. Đang chờ studio xác nhận...</span>
                    </div>
                  )}

                  <button
                    disabled={isSubmitting}
                    onClick={handleConfirmTransfer}
                    className="public-btn-primary"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem' }}
                  >
                    {isSubmitting ? (
                      <span>Đang xử lý thông tin...</span>
                    ) : isTransferSubmitted ? (
                      <span>ĐÃ GỬI XÁC NHẬN • CHỜ STUDIO XÁC NHẬN</span>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
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
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FAF6EE',
                color: 'var(--editorial-brown)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.2rem',
                border: '1px solid var(--editorial-divider)',
              }}>
                <Check size={28} />
              </div>
              <h2 style={{
                fontFamily: 'var(--editorial-font-heading)',
                fontSize: '2rem',
                color: 'var(--editorial-brown)',
                marginBottom: '0.4rem',
                fontWeight: 600,
              }}>
                Booking của bạn đã được xác nhận!
              </h2>
              <p style={{ color: 'var(--editorial-text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                Maison MIPA trân trọng cảm ơn bạn. Thông tin xác nhận chi tiết đã được gửi tới email <strong>{confirmedBooking.customerEmail}</strong>.
              </p>

              {/* Receipt Ticket */}
              <div style={{
                maxWidth: '480px',
                margin: '0 auto',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                border: '1px solid var(--editorial-divider)',
                padding: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--editorial-divider)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--editorial-text-muted)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mã booking</span>
                  <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--editorial-brown)' }}>{confirmedBooking.bookingCode}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <div>Gói chụp: <strong>{confirmedBooking.packageName}</strong> ({confirmedBooking.serviceName})</div>
                  <div>Thời gian: <strong>{confirmedBooking.bookingDate} lúc {confirmedBooking.startTime}</strong></div>
                  <div>Studio: <strong>{confirmedBooking.studioName}</strong></div>
                  <div>Tổng tiền: <strong>{confirmedBooking.totalAmount?.toLocaleString('vi-VN')}đ</strong></div>
                  <div>Trạng thái: <strong style={{ color: '#047857' }}>Đã xác nhận & nhận cọc 30%</strong></div>
                </div>

                <div style={{ marginTop: '1.2rem', paddingTop: '0.85rem', borderTop: '1px solid var(--editorial-divider)', fontSize: '0.82rem', color: 'var(--editorial-brown-accent)', textAlign: 'center' }}>
                  Maison MIPA hẹn gặp bạn trong buổi chụp tới.
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                <button
                  onClick={presentation === 'PAGE' ? (onFinish || onClose) : onClose}
                  className="public-btn-primary"
                >
                  {presentation === 'PAGE' ? 'Về trang chủ' : 'Đóng'}
                </button>
                {user && (
                  <a
                    href="/account"
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--editorial-brown-accent)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Xem lịch của tôi
                  </a>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Wizard Controls */}
        {step <= 6 && (
          <div className="booking-wizard-footer" style={{
            padding: '1rem 1.8rem',
            borderTop: '1px solid var(--editorial-divider)',
            backgroundColor: 'var(--editorial-paper)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => { setErrorMessage(null); setStep(step - 1); }}
                className="public-btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--editorial-brown)', fontWeight: 600 }}>
                Tạm tính: {subtotal.toLocaleString('vi-VN')}đ
              </span>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  if (step === 1) {
                    if (!selectedService) {
                      setErrorMessage('Vui lòng chọn một dịch vụ để tiếp tục.');
                      return;
                    }
                  }
                  if (step === 2) {
                    if (packageMismatchError || !selectedPackage) {
                      setErrorMessage('Vui lòng chọn một gói chụp hợp lệ cho dịch vụ này để tiếp tục.');
                      return;
                    }
                    const maxConcepts = selectedPackage.conceptsCount || 1;
                    if (selectedConcepts.length > maxConcepts) {
                      setErrorMessage(`Gói ${selectedPackage.name} cho phép chọn tối đa ${maxConcepts} concept.`);
                      return;
                    }
                  }
                  if (step === 3) {
                    if (availabilityError) {
                      setErrorMessage(availabilityError);
                      return;
                    }
                    if (!selectedStudio) {
                      setErrorMessage('Vui lòng chọn không gian studio để tiếp tục.');
                      return;
                    }
                    if (isLoadingSlots) {
                      setErrorMessage('Đang kiểm tra lịch khả dụng. Vui lòng đợi trong giây lát...');
                      return;
                    }
                    if (!selectedTimeSlot) {
                      setErrorMessage('Vui lòng chọn một khung giờ chụp ảnh còn trống.');
                      return;
                    }
                    const currentSlot = availableSlots.find(s => s.time === selectedTimeSlot);
                    if (!currentSlot || currentSlot.status === 'BOOKED') {
                      setErrorMessage('Khung giờ bạn chọn đã có khách đặt lịch. Vui lòng chọn một khung giờ khác còn trống.');
                      return;
                    }
                  }
                  if (step === 5) {
                    handleProceedToPayment();
                  } else if (step === 6) {
                    handleConfirmTransfer();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={isSubmitting || (step === 3 && (isLoadingSlots || Boolean(availabilityError)))}
                className="public-btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.6rem 1.4rem' }}
              >
                {step === 6 ? 'Xác nhận đặt lịch' : 'Tiếp theo'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
