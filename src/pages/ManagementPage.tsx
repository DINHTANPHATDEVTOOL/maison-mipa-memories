import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ManagerDashboard } from '../components/management/ManagerDashboard';
import { StudioCalendar } from '../components/management/StudioCalendar';
import { CustomerCRM } from '../components/management/CustomerCRM';
import { CrmFollowUpDashboard } from '../components/management/CrmFollowUpDashboard';
import { FinancialLedgerDashboard } from '../components/management/FinancialLedgerDashboard';
import { BusinessIntelligenceDashboard } from '../components/management/BusinessIntelligenceDashboard';
import { PortfolioCMS } from '../components/management/PortfolioCMS';
import { DailyOperationsBoard } from '../components/management/DailyOperationsBoard';
import { TomorrowPrepBoard } from '../components/management/TomorrowPrepBoard';
import { WorkforceScheduling } from '../components/management/WorkforceScheduling';
import { ResourceInventory } from '../components/management/ResourceInventory';
import { OperationsCalendar } from '../components/management/OperationsCalendar';
import { BookingCrewAndResourcePlanner } from '../components/management/BookingCrewAndResourcePlanner';
import { RoleGuard } from '../components/routing/RoleGuard';
import { SeoHead } from '../components/seo/SeoHead';
import {
  LayoutDashboard,
  Clock,
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Camera,
  Shield,
  Crown,
  Sparkles,
  CalendarCheck,
  Calendar as CalendarIcon,
  Package,
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
  const [subTab, setSubTab] = useState<
    | 'dashboard'
    | 'operations'
    | 'tomorrow'
    | 'calendar'
    | 'ops_calendar'
    | 'workforce'
    | 'resources'
    | 'crm'
    | 'followup'
    | 'finance'
    | 'analytics'
    | 'portfolio'
  >('dashboard');

  const [plannerBooking, setPlannerBooking] = useState<Booking | null>(null);

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

      {/* Sub Navigation Bar for Manager OS */}
      <div style={{
        backgroundColor: '#604634',
        color: '#EFE6C9',
        padding: '0.45rem 1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.82rem',
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
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <LayoutDashboard size={14} color="#EFE6C9" /> Tổng quan
        </button>

        <button
          onClick={() => setSubTab('operations')}
          style={{
            border: 'none',
            background: subTab === 'operations' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Sparkles size={14} color="#C6A45F" /> Hôm nay
        </button>

        <button
          onClick={() => setSubTab('tomorrow')}
          style={{
            border: 'none',
            background: subTab === 'tomorrow' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CalendarCheck size={14} color="#EFE6C9" /> Chuẩn bị ngày mai
        </button>

        <button
          onClick={() => setSubTab('ops_calendar')}
          style={{
            border: 'none',
            background: subTab === 'ops_calendar' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CalendarIcon size={14} color="#EFE6C9" /> Lịch vận hành
        </button>

        <button
          onClick={() => setSubTab('workforce')}
          style={{
            border: 'none',
            background: subTab === 'workforce' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={14} color="#EFE6C9" /> Nhân sự & Lịch trực
        </button>

        <button
          onClick={() => setSubTab('resources')}
          style={{
            border: 'none',
            background: subTab === 'resources' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Package size={14} color="#EFE6C9" /> Thiết bị & Kho
        </button>

        <button
          onClick={() => setSubTab('calendar')}
          style={{
            border: 'none',
            background: subTab === 'calendar' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Clock size={14} color="#EFE6C9" /> Lịch phòng
        </button>

        <button
          onClick={() => setSubTab('crm')}
          style={{
            border: 'none',
            background: subTab === 'crm' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={14} color="#EFE6C9" /> CRM khách hàng
        </button>

        <button
          onClick={() => setSubTab('followup')}
          style={{
            border: 'none',
            background: subTab === 'followup' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CheckCircle2 size={14} color="#EFE6C9" /> Follow-up
        </button>

        <button
          onClick={() => setSubTab('finance')}
          style={{
            border: 'none',
            background: subTab === 'finance' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <DollarSign size={14} color="#EFE6C9" /> Tài chính
        </button>

        <button
          onClick={() => setSubTab('analytics')}
          style={{
            border: 'none',
            background: subTab === 'analytics' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <TrendingUp size={14} color="#EFE6C9" /> Phân tích & BI
        </button>

        <button
          onClick={() => setSubTab('portfolio')}
          style={{
            border: 'none',
            background: subTab === 'portfolio' ? '#8C6E53' : 'transparent',
            color: '#FFFDF6',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Camera size={16} color="#EFE6C9" /> Portfolio & Concept CMS
        </button>

        {(user?.role === 'ADMIN' || isRootOwner) && (
          <Link
            to="/admin"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 253, 246, 0.08)',
              border: '1px solid rgba(198, 164, 95, 0.4)',
              color: '#FFFDF6',
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: '0.2rem',
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
            if (tab === 'studio_calendar' || tab === 'calendar') setSubTab('calendar');
            else if (tab === 'customer_crm' || tab === 'crm') setSubTab('crm');
            else if (tab === 'portfolio_cms' || tab === 'portfolio') setSubTab('portfolio');
            else if (tab === 'workforce') setSubTab('workforce');
            else if (tab === 'finance') setSubTab('finance');
            else if (tab === 'operations') setSubTab('operations');
            else if (tab === 'tomorrow') setSubTab('tomorrow');
            else if (tab === 'resources') setSubTab('resources');
            else setSubTab('dashboard');
          }}
        />
      )}

      {subTab === 'operations' && (
        <DailyOperationsBoard
          onNavigateToStaff={() => setSubTab('workforce')}
          onNavigateToResources={() => setSubTab('resources')}
          onOpenBookingDetails={(id) => {
            const b = bookings.find(item => item.id === id);
            if (b) setPlannerBooking(b);
          }}
        />
      )}

      {subTab === 'tomorrow' && (
        <TomorrowPrepBoard
          onOpenBookingDetails={(id) => {
            const b = bookings.find(item => item.id === id);
            if (b) setPlannerBooking(b);
          }}
          onOpenPlanner={(id) => {
            const b = bookings.find(item => item.id === id);
            if (b) setPlannerBooking(b);
          }}
        />
      )}

      {subTab === 'ops_calendar' && (
        <OperationsCalendar
          onOpenBooking={(id) => {
            const b = bookings.find(item => item.id === id);
            if (b) setPlannerBooking(b);
          }}
        />
      )}

      {subTab === 'workforce' && (
        <WorkforceScheduling employees={employees} />
      )}

      {subTab === 'resources' && (
        <ResourceInventory />
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

      {subTab === 'followup' && (
        <CrmFollowUpDashboard />
      )}

      {subTab === 'finance' && (
        <FinancialLedgerDashboard
          bookings={bookings}
        />
      )}

      {subTab === 'analytics' && (
        <BusinessIntelligenceDashboard />
      )}

      {subTab === 'portfolio' && (
        <PortfolioCMS />
      )}

      {plannerBooking && (
        <BookingCrewAndResourcePlanner
          booking={plannerBooking}
          onClose={() => setPlannerBooking(null)}
        />
      )}
    </RoleGuard>
  );
};

export default ManagementPage;
