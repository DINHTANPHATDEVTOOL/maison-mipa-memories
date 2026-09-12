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
  | 'EDITING'
  | 'READY_FOR_REVIEW'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

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
  delivery?: BookingDelivery;
  albumId?: string;
  conceptId?: string;
  conceptIds?: string[];
  conceptName?: string;
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
  provider: 'GOOGLE_DRIVE';
  driveFolderId?: string;
  driveFolderUrl?: string;
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

