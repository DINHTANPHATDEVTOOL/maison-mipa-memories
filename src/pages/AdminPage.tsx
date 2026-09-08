import React from 'react';
import { AdminPortal } from '../components/admin/AdminPortal';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import type { User } from '../types';

interface AdminPageProps {
  usersList: User[];
  onUpdateUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  onRequireAuth?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  usersList,
  onUpdateUsersList,
  onRequireAuth,
}) => {
  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      onRequireAuth={onRequireAuth}
    >
      <SeoHead
        title="Quản Trị Hệ Thống Tối Cao | Maison MIPA Memories"
        description="Bảng điều khiển quản trị viên: phân quyền, cấu hình hệ thống và kiểm toán bảo mật."
        noIndex={true}
      />
      <AdminPortal
        usersList={usersList}
        onUpdateUsersList={onUpdateUsersList}
      />
    </RoleGuard>
  );
};

export default AdminPage;
