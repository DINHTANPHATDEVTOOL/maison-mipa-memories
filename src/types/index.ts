export type UserRole = 'GUEST' | 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

export type StaffRole = 'PHOTOGRAPHER' | 'MAKEUP' | 'EDITOR' | 'RECEPTIONIST' | 'MANAGER' | 'ADMIN';

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'DEPOSIT_PAID'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'SHOOTING'
  | 'SHOOT_COMPLETED'
  | 'AWAITING_SELECTION'
  | 'EDITING'
  | 'READY_FOR_REVIEW'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'CONSULTATION_REQUESTED'
  | 'CONSULTING';

export type PaymentStatus = 'UNPAID' | 'DEPOSIT_PAID' | 'FULLY_PAID' | 'REFUNDED';

export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';

export interface UserEmailIdentity {
  id: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  verifiedAt?: string;
}

export interface UserPhoneIdentity {
  id: string;
  userId: string;
  phoneRaw: string;
  phoneE164: string;
  isPrimary: boolean;
  verifiedAt?: string;
}

export interface User {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  staffRole?: StaffRole;
  status?: UserStatus;
  isRootOwner?: boolean;
  emails?: UserEmailIdentity[];
  phones?: UserPhoneIdentity[];
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  badge?: string;
}

export interface PackageItem {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
  conceptsCount: number;
  editedPhotosCount: number;
  features: string[];
  recommended?: boolean;
  popularTag?: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'makeup' | 'styling' | 'time' | 'concept' | 'album' | 'edit';
  durationMinutes?: number;
}

export interface StudioRoom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  status: 'ACTIVE' | 'MAINTENANCE';
  image: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: StaffRole;
  avatar: string;
  skills: string[];
  rating: number;
  totalSessions: number;
  status: 'ACTIVE' | 'OFF' | 'ON_LEAVE';
  shiftSchedule: { [dayOfWeek: string]: string }; // e.g. "Mon": "09:00 - 18:00"
  defaultWorkingHours?: Record<string, { start: string; end: string; isOff: boolean }>;
  hireDate?: string;
  notes?: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  customerCode?: string; // e.g. CUS-000128
  fullName: string;
  email: string;
  phone: string;
  birthday?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  firstVisit: string;
  lastVisit: string;
  totalBookings: number;
  totalSpent: number;
  notes?: string;
}

export interface BookingAssignment {
  id: string;
  bookingId: string;
  employeeId: string;
  employeeName: string;
  assignmentRole: StaffRole;
  startTime: string;
  endTime: string;
}

export interface PaymentRecord {
  paymentId: string;
  bookingId: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'MOMO' | 'CASH' | 'CARD';
  transactionReference: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paidAt: string;
}

export interface Booking {
  id: string; // Internal database ID
  bookingCode: string; // e.g. MIPA-260815-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  studioId: string;
  studioName: string;
  addons: Addon[];
  subtotal: number;
  discount: number;
  depositAmount: number;
  totalAmount: number;
  extraSlotTotal?: number;
  extraSlotsCount?: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  customerNote?: string;
  staffNote?: string;
  occasion?: string;
  assignments: BookingAssignment[];
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  startTimeActual?: string;
  endTimeActual?: string;
  editedPhotosUrl?: string;
  bookingHoldTTL?: number; // Temporary Redis hold TTL in seconds (e.g. 600s)
  customerScheduleConfirmedAt?: string;
  customerShootAckAt?: string;
  rescheduleRequestedAt?: string;
  rescheduleRequestedDate?: string;
  rescheduleRequestedSlot?: string;
  rescheduleRequestedReason?: string;
  cancelRequestedAt?: string;
  cancelRequestedReason?: string;
  driveFolderUrl?: string;
  driveReadyForCustomer?: boolean;
  albumId?: string;
  conceptId?: string;
  conceptIds?: string[];
  conceptName?: string;
  depositConfirmedAt?: string;
  depositConfirmedBy?: string;
  depositNote?: string;
  selectionLimit?: number;
  selectionSubmittedAt?: string;
  selectionSubmittedBy?: string;
  revisionNotes?: string;
  rawFolderId?: string;
  proofsFolderId?: string;
  finalFolderId?: string;
  finalFolderUrl?: string;
  proofFileCount?: number;
  finalFileCount?: number;
  selectedPhotoCount?: number;
  editingDueAt?: string;
  deliveryDueAt?: string;
  crewStatus?: 'CREW_READY' | 'CREW_INCOMPLETE' | 'CREW_CONFLICT';
  resourceStatus?: 'RESOURCE_READY' | 'RESOURCE_INCOMPLETE' | 'RESOURCE_CONFLICT';
  delivery?: BookingDelivery;
}

export type DeliveryStatus =
  | 'NOT_CREATED'
  | 'CREATING'
  | 'READY_FOR_UPLOAD'
  | 'READY_FOR_CUSTOMER'
  | 'ERROR'
  | 'REVOKED'
  | 'NEEDS_RECONCILE';

export interface BookingDelivery {
  id: string;
  bookingId: string;
  provider: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  rawFolderId?: string;
  proofsFolderId?: string;
  finalFolderId?: string;
  finalFolderUrl?: string;
  proofFileCount?: number;
  finalFileCount?: number;
  status: DeliveryStatus;
  customerPermissionId?: string;
  shareEmail?: string;
  createdBy?: string;
  readyBy?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
  readyAt?: string;
  revokedAt?: string;
  lastReconciledAt?: string;
  lastError?: string;
}

export interface BookingProofImage {
  id: string;
  bookingId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  sortOrder: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  selected?: boolean;
}

export interface BookingPhotoSelection {
  id: string;
  bookingId: string;
  proofImageId: string;
  selectedBy?: string;
  selectedAt: string;
  notes?: string;
  createdAt?: string;
}

export type PhotoType = 'RAW' | 'PREVIEW' | 'SELECTED' | 'FINAL';

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  filename: string;
  storageKey?: string; // S3 Key e.g., bookings/MM-20260815-001/final/MIPA001.jpg
  photoType?: PhotoType;
  isFavorite: boolean;
  isRetouched?: boolean;
  retouchRequested: boolean;
  comment?: string;
  uploadedAt?: string;
}

export interface Album {
  id: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  shootDate: string;
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'FINAL_DELIVERED';
  photos: Photo[];
  totalPhotos: number;
  retouchCount: number;
  galleryUrl: string;
  accessToken?: string; // High-entropy secure access token for gallery access
  expiresAt?: string;
}

export interface Promotion {
  id: string;
  code: string;
  discountPercent: number;
  discountAmount?: number;
  minOrder: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageCount: number;
  usageLimit: number;
  applicableServiceId?: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'payment' | 'album' | 'system';
  targetRole?: UserRole;
  link?: string;
  bookingCode?: string;
  bookingId?: string;
}

// ==============================================================================
// Portfolio CMS & Concept Collections Domain Models (#16)
// ==============================================================================

export interface Concept {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  serviceId?: string;
  active: boolean;
  bookable: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CollectionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface PhotoVariantInfo {
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface PhotoVariants {
  thumbnail?: PhotoVariantInfo;
  card?: PhotoVariantInfo;
  gallery?: PhotoVariantInfo;
  hero?: PhotoVariantInfo;
}

export interface PortfolioPhoto {
  id: string;
  collectionId: string;
  webAssetKey?: string;
  url: string;
  filename: string;
  width: number;
  height: number;
  focalX: number; // 0 - 100
  focalY: number; // 0 - 100
  altText: string;
  caption?: string;
  sortOrder: number;
  featured: boolean;
  variants?: PhotoVariants;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  conceptId?: string;
  conceptName?: string;
  conceptSlug?: string;
  serviceId?: string;
  category?: string;
  status: CollectionStatus;
  featured: boolean;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  createdBy?: string;
  publishedBy?: string;
  publishedAt?: string;
  displayOrder: number;
  photos?: PortfolioPhoto[];
  photosCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FocalPoint {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

// ==========================================
// CRM & CUSTOMER 360 TYPES
// ==========================================

export type CrmLifecycleStage =
  | 'NEW'
  | 'CONSULTATION'
  | 'QUALIFIED'
  | 'BOOKED'
  | 'ACTIVE'
  | 'DELIVERED'
  | 'RETURNING'
  | 'INACTIVE';

export type CrmInteractionType =
  | 'CONSULTATION_CALL'
  | 'ZALO'
  | 'PHONE_CALL'
  | 'EMAIL'
  | 'IN_PERSON'
  | 'FOLLOW_UP'
  | 'BOOKING_DISCUSSION'
  | 'CUSTOMER_REQUEST'
  | 'INTERNAL_NOTE';

export type CrmChannel = 'PHONE' | 'ZALO' | 'EMAIL' | 'IN_PERSON' | 'OTHER';

export type CrmTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type CrmTaskPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface CrmTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface CustomerCrmProfile {
  customerId: string;
  crmOwnerId?: string;
  lifecycleStage: CrmLifecycleStage;
  acquisitionSource?: string;
  firstContactAt: string;
  lastContactAt: string;
  nextFollowUpAt?: string;
  internalSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmInteraction {
  id: string;
  customerId: string;
  bookingId?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  interactionType: CrmInteractionType;
  channel: CrmChannel;
  outcome?: string;
  summary: string;
  occurredAt: string;
  nextFollowUpAt?: string;
  createdAt: string;
}

export interface CrmFollowUpTask {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  bookingId?: string;
  assignedTo?: string;
  assignedToName?: string;
  taskType: string;
  title: string;
  description?: string;
  dueAt: string;
  status: CrmTaskStatus;
  priority: CrmTaskPriority;
  completedAt?: string;
  completedBy?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmCustomerListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  accountStatus: UserStatus;
  lifecycleStage: CrmLifecycleStage;
  crmOwnerId?: string;
  crmOwnerName?: string;
  firstContactAt?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  tags: CrmTag[];
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  confirmedBookingValue: number;
  actualCashReceived: number;
  outstandingBalance: number;
  lastBookingAt?: string;
  nextBookingAt?: string;
  overdueTasksCount: number;
  todayTasksCount: number;
}

export interface Customer360 {
  identity: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    status: UserStatus;
    createdAt: string;
  };
  crm: {
    lifecycleStage: CrmLifecycleStage;
    crmOwnerId?: string;
    crmOwnerName?: string;
    acquisitionSource?: string;
    firstContactAt: string;
    lastContactAt: string;
    nextFollowUpAt?: string;
    internalSummary?: string;
    tags: CrmTag[];
    notesCount: number;
  };
  bookingsSummary: {
    totalBookings: number;
    consultationRequests: number;
    consulting: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    isRepeatCustomer: boolean;
    upcomingBooking?: {
      id: string;
      code: string;
      status: BookingStatus;
      bookingDate: string;
      startTime: string;
      serviceName?: string;
    } | null;
    previousBooking?: {
      id: string;
      code: string;
      status: BookingStatus;
      bookingDate: string;
      startTime: string;
      serviceName?: string;
    } | null;
  };
  financialSummary: {
    confirmedBookingValue: number;
    completedBookingValue: number;
    confirmedDeposits: number;
    actualCashReceived: number;
    outstandingBalance: number;
    totalRefunded: number;
  };
  preferences: {
    topServices: { id: string; name: string; count: number }[];
    topConcepts: { id: string; name: string; count: number }[];
    topAddons: { id: string; name: string; count: number }[];
  };
  bookings: Array<{
    id: string;
    code: string;
    status: BookingStatus;
    bookingDate: string;
    startTime: string;
    totalAmount: number;
    depositAmount: number;
    depositConfirmedAt?: string;
    serviceName?: string;
    packageName?: string;
    createdAt: string;
  }>;
  interactions: CrmInteraction[];
  financialTransactions: FinancialTransaction[];
  followUpTasks: CrmFollowUpTask[];
}

// ==========================================
// FINANCIAL LEDGER TYPES
// ==========================================

export type FinancialTransactionType =
  | 'DEPOSIT'
  | 'BALANCE'
  | 'ADDITIONAL_CHARGE'
  | 'REFUND'
  | 'ADJUSTMENT';

export type FinancialDirection = 'IN' | 'OUT';

export type FinancialPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER';

export interface FinancialTransaction {
  id: string;
  bookingId: string;
  bookingCode?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  transactionType: FinancialTransactionType;
  direction: FinancialDirection;
  amount: number;
  method: FinancialPaymentMethod;
  receivedAt: string;
  referenceNote?: string;
  idempotencyKey?: string;
  recordedBy: string;
  recordedByName?: string;
  createdAt: string;
}

export interface RecordPaymentReceiptInput {
  bookingId: string;
  transactionType: FinancialTransactionType;
  amount: number;
  method: FinancialPaymentMethod;
  receivedAt?: string;
  referenceNote?: string;
  idempotencyKey?: string;
}

// ==========================================
// BUSINESS INTELLIGENCE & KPI TYPES
// ==========================================

export interface BusinessDashboardSummary {
  period: {
    startAt: string;
    endAt: string;
  };
  funnel: {
    consultationRequests: number;
    consulting: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    consultationConversionRate: number;
    confirmedToCompletedRate: number;
  };
  financials: {
    confirmedBookingValue: number;
    completedBookingValue: number;
    confirmedDeposits: number;
    actualCashReceived: number;
    outstandingBalance: number;
    refundedAmount: number;
  };
  customers: {
    totalActiveCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    repeatCustomerRate: number;
  };
  operations: {
    upcomingShoots: number;
    overdueOperationalJobs: number;
    openFollowUps: number;
    overdueFollowUps: number;
  };
}

export interface FunnelStageMetric {
  stage: string;
  count: number;
  conversionRate: number;
  medianHoursFromPrevious: number | null;
}

export interface BookingFunnelMetrics {
  cohortTotalCreated: number;
  stages: FunnelStageMetric[];
}

export interface ServicePerformanceMetric {
  serviceId: string;
  serviceName: string;
  category: string;
  consultationRequests: number;
  confirmedBookings: number;
  completedBookings: number;
  confirmedBookingValue: number;
  actualCashReceived: number;
  conversionRate: number;
}

export interface ConceptPerformanceMetric {
  conceptId: string;
  conceptName: string;
  conceptSlug?: string;
  timesSelected: number;
  confirmedBookings: number;
  completedBookings: number;
  conversionRate: number;
}

export interface StudioUtilizationMetric {
  roomId: string;
  roomName: string;
  roomCode: string;
  capacity: number;
  confirmedBookingsCount: number;
  confirmedBookingHours: number;
  availableBusinessHours: number;
  utilizationRate: number;
  popularWeekday?: string;
  popularTimeRange?: string;
}

// ==============================================================================
// Studio Operations & Workforce Scheduling Types
// ==============================================================================

export interface StaffSkill {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  skillLevel: string;
  certified: boolean;
  skill?: StaffSkill;
}

export interface StaffWorkingHours {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isDayOff: boolean;
  timezone: string;
}

export type StaffLeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
export type StaffLeaveStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StaffLeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: StaffLeaveType;
  startAt: string;
  endAt: string;
  reason: string;
  status: StaffLeaveStatus;
  managerNote?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface StaffShift {
  id: string;
  employeeId: string;
  employeeName?: string;
  studioRoomId?: string | null;
  studioRoomName?: string | null;
  shiftDate: string;
  startAt: string;
  endAt: string;
  shiftType: string;
  notes?: string | null;
}

export interface CrewRequirement {
  id: string;
  serviceId?: string | null;
  packageId?: string | null;
  role: StaffRole;
  quantity: number;
  isMandatory: boolean;
  notes?: string | null;
}

export interface ResourceCategory {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  isConsumable: boolean;
  active: boolean;
}

export type ResourceCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type ResourceStatus = 'AVAILABLE' | 'RESERVED' | 'IN_USE' | 'MAINTENANCE' | 'DAMAGED' | 'LOST' | 'RETIRED';
export type ResourceCleaningStatus = 'AVAILABLE' | 'IN_USE' | 'NEEDS_CLEANING' | 'CLEANING';

export interface StudioResource {
  id: string;
  assetCode: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  currentLocation: string;
  condition: ResourceCondition;
  status: ResourceStatus;
  cleaningStatus?: ResourceCleaningStatus;
  isSerialized: boolean;
  quantityTotal: number;
  quantityAvailable: number;
  unit: string;
  reorderThreshold: number;
  nextMaintenanceDate?: string | null;
  propsMetadata?: {
    size?: string;
    color?: string;
    style?: string;
    season?: string;
    tags?: string[];
  } | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ResourceReservationStatus = 'RESERVED' | 'CHECKED_OUT' | 'RETURNED' | 'CANCELLED';

export interface ResourceReservation {
  id: string;
  bookingId: string;
  bookingCode?: string;
  resourceId: string;
  resourceName?: string;
  assetCode?: string;
  quantity: number;
  reservedFrom: string;
  reservedUntil: string;
  status: ResourceReservationStatus;
  notes?: string | null;
  reservedBy?: string | null;
}

export interface ResourceHandoff {
  id: string;
  reservationId: string;
  resourceId: string;
  bookingId: string;
  employeeId: string;
  employeeName?: string;
  handoffType: 'CHECKOUT' | 'RETURN';
  conditionState: ResourceCondition;
  actorId: string;
  notes?: string | null;
  createdAt: string;
}

export interface ResourceMaintenance {
  id: string;
  resourceId: string;
  resourceName?: string;
  assetCode?: string;
  maintenanceType: string;
  scheduledAt: string;
  completedAt?: string | null;
  vendor?: string | null;
  cost?: number | null;
  notes?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ResourceIncident {
  id: string;
  resourceId: string;
  resourceName?: string;
  bookingId?: string | null;
  reportedBy: string;
  reporterName?: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'REPAIRED' | 'RETIRED';
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface OperationsCalendarEvent {
  id: string;
  title: string;
  type: 'BOOKING' | 'STAFF_SHIFT' | 'STAFF_LEAVE' | 'MAINTENANCE';
  startAt: string;
  endAt: string;
  studioRoomId?: string | null;
  studioRoomName?: string | null;
  bookingCode?: string;
  serviceName?: string;
  customerName?: string;
  bookingStatus?: BookingStatus;
  crewStatus?: 'CREW_READY' | 'CREW_INCOMPLETE' | 'CREW_CONFLICT';
  resourceStatus?: 'RESOURCE_READY' | 'RESOURCE_INCOMPLETE' | 'RESOURCE_CONFLICT';
  staffName?: string;
  staffRole?: StaffRole;
  leaveType?: StaffLeaveType;
  metadata?: Record<string, any>;
}

export interface DailyOperationsBoardData {
  todayShoots: Booking[];
  upcomingCheckIns: Booking[];
  crewIssues: {
    bookingId: string;
    bookingCode: string;
    customerName: string;
    serviceName: string;
    startTime: string;
    missingRoles: string[];
    conflictRoles: string[];
  }[];
  resourceIssues: {
    bookingId: string;
    bookingCode: string;
    resourceName: string;
    issueType: 'MISSING' | 'OVERDUE_RETURN' | 'MAINTENANCE_CONFLICT';
  }[];
  postProductionDue: {
    bookingId: string;
    bookingCode: string;
    customerName: string;
    editorName?: string;
    status: BookingStatus;
    dueAt?: string;
    isOverdue: boolean;
  }[];
}


