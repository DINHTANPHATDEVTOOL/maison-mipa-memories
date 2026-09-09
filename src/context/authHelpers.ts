// ==============================================================================
// Maison MIPA Memories - Auth Mapping Helpers
// ==============================================================================
import type { User, StaffRole } from '../types';
import type { ProfileRow } from '../types/database';

/**
 * Maps database ProfileRow to frontend User entity
 */
export const mapProfileToUser = (profile: ProfileRow): User => {
  return {
    id: profile.id,
    fullName: profile.full_name || 'Khách Hàng MIPA',
    email: profile.email,
    phone: profile.phone || '',
    role: profile.role,
    staffRole: (profile.staff_role as StaffRole) || undefined,
    status: profile.status,
    avatar: profile.avatar_url || '/favicon.svg',
    lastLoginAt: new Date().toISOString(),
  };
};
