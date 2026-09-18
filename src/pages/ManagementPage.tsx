import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ManagerDashboard } from '../components/management/ManagerDashboard';
import { WorkforceScheduling } from '../components/management/WorkforceScheduling';
import { FinancialLedgerDashboard } from '../components/management/FinancialLedgerDashboard';
import { PortfolioCMS } from '../components/management/PortfolioCMS';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import {
  Users,
  DollarSign,
  Camera,
  CalendarCheck,
  Shield,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Booking, BookingStatus, Employee, StudioRoom } from '../types';

interface ManagementPageProps {
  bookings: Booking[];
  employees: Employee[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => Promise<void>;
  onAssignStaff: (bookingId: string, employeeId: string, role?: string) => Promise<void>;
  onRequireAuth?: () => void;
}

export const ManagementPage: React.FC<ManagementPageProps> = ({
  bookings,
  employees,
  studios,
  onOpenBooking,
  onUpdateStatus,
  onAssignStaff,
  onRequireAuth,
}) => {
  const { user, isRootOwner } = useAuth();
  const [subTab, setSubTab] = useState<'dashboard' | 'workforce' | 'finance' | 'portfolio'>('dashboard');

  return (
    <RoleGuard
      allowedRoles={['MANAGER', 'ADMIN']}
      onRequireAuth={onRequireAuth}
    >
      <SeoHead
        title="Studio Management System — Điều Phối & Vận Hành | Maison MIPA Memories"
        description="Hệ thống điều phối kíp chụp, quản lý tiến độ đơn hàng, nhân sự và doanh thu theo thời gian thực."
        noIndex={true}
      />

      {/* Sub Navigation Bar for Manager OS - Streamlined to 4 Core Tabs */}
      <div style={{
        backgroundColor: '#604634',
        color: '#EFE6C9',
        padding: '0.5rem 1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.6rem',
        fontSize: '0.85rem',
        borderBottom: '1px solid rgba(239, 230, 201, 0.15)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setSubTab('dashboard')}
          style={{
            border: 'none',
            background: subTab === 'dashboard' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CalendarCheck size={16} color={subTab === 'dashboard' ? '#FFFDF6' : '#EFE6C9'} />
          Lịch Booking & Vận Hành
        </button>

        <button
          onClick={() => setSubTab('workforce')}
          style={{
            border: 'none',
            background: subTab === 'workforce' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={16} color={subTab === 'workforce' ? '#FFFDF6' : '#EFE6C9'} />
          Nhân Sự & Lịch Làm Việc
        </button>

        <button
          onClick={() => setSubTab('finance')}
          style={{
            border: 'none',
            background: subTab === 'finance' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s ease',
          }}
        >
          <DollarSign size={16} color={subTab === 'finance' ? '#FFFDF6' : '#EFE6C9'} />
          Doanh Thu & Tài Chính
        </button>

        <button
          onClick={() => setSubTab('portfolio')}
          style={{
            border: 'none',
            background: subTab === 'portfolio' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Camera size={16} color={subTab === 'portfolio' ? '#FFFDF6' : '#EFE6C9'} />
          Portfolio & Concept CMS
        </button>

        {(user?.role === 'ADMIN' || isRootOwner) && (
          <Link
            to="/admin"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 253, 246, 0.08)',
              border: '1px solid rgba(198, 164, 95, 0.4)',
              color: '#FFFDF6',
              padding: '0.4rem 0.85rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            {isRootOwner ? <Crown size={14} color="#C6A45F" /> : <Shield size={14} color="#C6A45F" />}
            {isRootOwner ? 'Quản Trị Studio' : 'Admin Portal'}
          </Link>
        )}
      </div>

      {subTab === 'dashboard' && (
        <ManagerDashboard
          bookings={bookings}
          employees={employees}
          studios={studios}
          onOpenBooking={onOpenBooking}
          onUpdateStatus={onUpdateStatus}
          onAssignStaff={onAssignStaff}
          onNavigateTab={(tab) => {
            if (tab === 'workforce') setSubTab('workforce');
            else if (tab === 'finance') setSubTab('finance');
            else if (tab === 'portfolio_cms' || tab === 'portfolio') setSubTab('portfolio');
            else setSubTab('dashboard');
          }}
        />
      )}

      {subTab === 'workforce' && (
        <WorkforceScheduling />
      )}

      {subTab === 'finance' && (
        <FinancialLedgerDashboard
          bookings={bookings}
        />
      )}

      {subTab === 'portfolio' && (
        <PortfolioCMS />
      )}
    </RoleGuard>
  );
};

export default ManagementPage;
