import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ManagerDashboard } from '../components/management/ManagerDashboard';
import { StudioCalendar } from '../components/management/StudioCalendar';
import { CustomerCRM } from '../components/management/CustomerCRM';
import { PortfolioCMS } from '../components/management/PortfolioCMS';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import { LayoutDashboard, Clock, Users, Camera, Shield, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Booking, BookingStatus, Employee, StudioRoom } from '../types';

interface ManagementPageProps {
  bookings: Booking[];
  employees: Employee[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => Promise<void>;
  onAssignStaff: (bookingId: string, employeeId: string) => Promise<void>;
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
  const [subTab, setSubTab] = useState<'dashboard' | 'calendar' | 'crm' | 'portfolio'>('dashboard');

  return (
    <RoleGuard
      allowedRoles={['MANAGER', 'ADMIN']}
      onRequireAuth={onRequireAuth}
    >
      <SeoHead
        title="Studio Manager OS — Quản Lý Vận Hành | Maison MIPA Memories"
        description="Hệ thống vận hành studio, quản lý lịch phòng, doanh thu và CRM khách hàng."
        noIndex={true}
      />

      {/* Sub Navigation Bar for Manager OS */}
      <div style={{
        backgroundColor: '#604634',
        color: '#EFE6C9',
        padding: '0.45rem 1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.82rem',
        borderBottom: '1px solid rgba(239, 230, 201, 0.15)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={() => setSubTab('dashboard')}
          style={{
            border: 'none',
            background: subTab === 'dashboard' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.9rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <LayoutDashboard size={15} color="#EFE6C9" /> Overview Dashboard
        </button>
        <button
          onClick={() => setSubTab('calendar')}
          style={{
            border: 'none',
            background: subTab === 'calendar' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.9rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Clock size={15} color="#EFE6C9" /> Lịch Phòng Studio
        </button>
        <button
          onClick={() => setSubTab('crm')}
          style={{
            border: 'none',
            background: subTab === 'crm' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.9rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={15} color="#EFE6C9" /> CRM & Khách Hàng
        </button>
        <button
          onClick={() => setSubTab('portfolio')}
          style={{
            border: 'none',
            background: subTab === 'portfolio' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.9rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Camera size={15} color="#EFE6C9" /> Portfolio & Concept CMS
        </button>

        {(user?.role === 'ADMIN' || isRootOwner) && (
          <Link
            to="/admin"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 253, 246, 0.08)',
              border: '1px solid rgba(198, 164, 95, 0.4)',
              color: '#FFFDF6',
              padding: '0.35rem 0.9rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginLeft: '0.5rem',
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
            if (tab === 'studio_calendar') setSubTab('calendar');
            else if (tab === 'customer_crm') setSubTab('crm');
            else if (tab === 'portfolio_cms') setSubTab('portfolio');
            else setSubTab('dashboard');
          }}
        />
      )}

      {subTab === 'calendar' && (
        <StudioCalendar
          bookings={bookings}
          studios={studios}
          onOpenBooking={onOpenBooking}
        />
      )}

      {subTab === 'crm' && (
        <CustomerCRM
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
