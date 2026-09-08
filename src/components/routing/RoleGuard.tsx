import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { AccessDeniedPage } from '../../pages/AccessDeniedPage';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onRequireAuth?: () => void;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  onRequireAuth,
}) => {
  const { user, role, isLoading } = useAuth();

  // 1. Loading state: Prevent UI flash while checking auth session
  if (isLoading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: '#8C6E53',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid #EFE6C9',
          borderTopColor: '#8C6E53',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  // 2. Unauthenticated check (Guest)
  if (!user || role === 'GUEST') {
    return (
      <AccessDeniedPage
        requiredRoles={allowedRoles}
        currentRole="GUEST"
        onOpenAuthModal={onRequireAuth}
      />
    );
  }

  // 3. Authenticated but insufficient role -> HTTP 403 Access Denied
  if (!allowedRoles.includes(role)) {
    return (
      <AccessDeniedPage
        requiredRoles={allowedRoles}
        currentRole={role}
      />
    );
  }

  // 4. Authorized -> Render protected route content
  return <>{children}</>;
};

export default RoleGuard;
