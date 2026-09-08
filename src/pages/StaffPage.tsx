import React from 'react';
import { StaffPortal } from '../components/staff/StaffPortal';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import type { Booking, BookingStatus } from '../types';

interface StaffPageProps {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => Promise<void>;
  onRequireAuth?: () => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({
  bookings,
  onUpdateStatus,
  onRequireAuth,
}) => {
  return (
    <RoleGuard
      allowedRoles={['STAFF', 'MANAGER', 'ADMIN']}
      onRequireAuth={onRequireAuth}
    >
      <SeoHead
        title="Không Gian Làm Việc Nhân Viên & Photographer | Maison MIPA Memories"
        description="Quản lý ca chụp, cập nhật trạng thái đơn và tải ảnh album cho khách."
        noIndex={true}
      />
      <StaffPortal
        bookings={bookings}
        onUpdateStatus={onUpdateStatus}
      />
    </RoleGuard>
  );
};

export default StaffPage;
