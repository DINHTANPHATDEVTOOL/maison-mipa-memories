import React from 'react';
import { CustomerPortal } from '../components/customer/CustomerPortal';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import type { Booking } from '../types';

interface AccountPageProps {
  bookings: Booking[];
  onOpenBooking: () => void;
  onRequireAuth?: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  bookings,
  onOpenBooking,
  onRequireAuth,
}) => {
  return (
    <RoleGuard
      allowedRoles={['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN']}
      onRequireAuth={onRequireAuth}
    >
      <SeoHead
        title="Quản Lý Lịch Hẹn & Album Cá Nhân | Maison MIPA Memories"
        description="Khu vực quản lý lịch chụp và duyệt album ảnh trực tuyến của khách hàng."
        noIndex={true}
      />
      <CustomerPortal
        bookings={bookings}
        onOpenBooking={onOpenBooking}
      />
    </RoleGuard>
  );
};

export default AccountPage;
