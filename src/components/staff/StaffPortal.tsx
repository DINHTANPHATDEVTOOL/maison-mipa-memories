// ==============================================================================
// Maison MIPA Memories - Staff Portal Dispatcher
// Hardened for Issue #7:
// Eliminates generic "one-size-fits-all" staff dashboard.
// Automatically routes staff member to their specialized operational workspace:
// - RECEPTIONIST -> ReceptionistPortal ("Lịch hôm nay", check-in only)
// - PHOTOGRAPHER -> PhotographerPortal ("Ca chụp của tôi", assigned shoots)
// - MAKEUP       -> MakeupPortal ("Lịch / Makeup Tasks", task tracking)
// - EDITOR       -> EditorPortal ("Hậu kỳ của tôi", editing & Drive delivery)
// ==============================================================================
import React, { useState } from 'react';
import type { Booking, BookingStatus, StaffRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ReceptionistPortal } from './ReceptionistPortal';
import { PhotographerPortal } from './PhotographerPortal';
import { MakeupPortal } from './MakeupPortal';
import { EditorPortal } from './EditorPortal';
import { Camera, UserCheck, Sparkles, Palette, Shield } from 'lucide-react';

interface StaffPortalProps {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ bookings, onUpdateStatus }) => {
  const { user, role } = useAuth();

  // Determine active staff role; default to PHOTOGRAPHER if not set
  const initialRole: StaffRole = user?.staffRole || 'PHOTOGRAPHER';
  const [activeRoleView, setActiveRoleView] = useState<StaffRole>(initialRole);

  // If user is Manager or Admin, allow role preview switcher
  const canSwitchRoles = role === 'MANAGER' || role === 'ADMIN';

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      
      {/* Role Switcher for Management/Supervision */}
      {canSwitchRoles && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFDF6',
          border: '1px solid #EFE6C9',
          borderRadius: '12px',
          padding: '0.6rem 1.2rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.8rem',
        }}>
          <div style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={16} /> Chế độ xem theo vai trò chuyên môn (Quản lý/Admin):
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'RECEPTIONIST' as StaffRole, label: 'Tiếp Tân', icon: UserCheck },
              { id: 'PHOTOGRAPHER' as StaffRole, label: 'Nhiếp Ảnh', icon: Camera },
              { id: 'MAKEUP' as StaffRole, label: 'Make-up', icon: Sparkles },
              { id: 'EDITOR' as StaffRole, label: 'Hậu Kỳ', icon: Palette },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRoleView(tab.id)}
                style={{
                  background: activeRoleView === tab.id ? '#8C6E53' : 'transparent',
                  color: activeRoleView === tab.id ? '#FFFDF6' : '#604634',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: activeRoleView === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <tab.icon size={13} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render Specific Workspace Based on Active Staff Role */}
      {activeRoleView === 'RECEPTIONIST' && (
        <ReceptionistPortal
          bookings={bookings}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {activeRoleView === 'PHOTOGRAPHER' && (
        <PhotographerPortal
          currentUser={user}
          bookings={bookings}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {activeRoleView === 'MAKEUP' && (
        <MakeupPortal
          currentUser={user}
          bookings={bookings}
        />
      )}

      {activeRoleView === 'EDITOR' && (
        <EditorPortal
          currentUser={user}
          bookings={bookings}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </div>
  );
};
