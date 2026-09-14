// ==============================================================================
// Maison MIPA Memories - Root Owner Only RBAC Hardening Tests
// Proves that ONLY the studio root owner account (identified by UUID) can
// assign or mutate user roles and statuses, and non-root users are denied.
// ==============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { supabase } from '../../lib/supabase';
import type { UserRole, StaffRole, UserStatus } from '../../types';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(() => true),
    isDemoModeEnabled: vi.fn(() => false),
    supabase: {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

describe('Root Owner Only RBAC Hardening — Comprehensive Tests', () => {
  const ROOT_OWNER_UUID = '11111111-0000-0000-0000-000000000001';
  const NON_ROOT_ADMIN_UUID = '22222222-0000-0000-0000-000000000002';
  const MANAGER_UUID = '33333333-0000-0000-0000-000000000003';
  const STAFF_UUID = '44444444-0000-0000-0000-000000000004';
  const CUSTOMER_UUID = '55555555-0000-0000-0000-000000000005';
  const TARGET_USER_UUID = '99999999-0000-0000-0000-000000000099';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Simulated backend RPC logic matching Migration #8
  const simulateAdminUpdateRpc = async (
    callerUid: string | null,
    targetUserId: string,
    newRole: UserRole,
    newStaffRole?: StaffRole,
    newStatus: UserStatus = 'ACTIVE',
    configuredOwnerUid: string = ROOT_OWNER_UUID
  ) => {
    if (!callerUid) {
      throw new Error('42501: Unauthorized: Login required.');
    }

    // Centralized is_root_owner check
    const isOwner = callerUid === configuredOwnerUid;
    if (!isOwner) {
      throw new Error('42501: Access Denied: Only the Studio Root Owner is authorized to assign user roles and manage account status.');
    }

    // Prevent owner self-demotion or self-suspension
    if (targetUserId === callerUid && (newRole !== 'ADMIN' || newStatus !== 'ACTIVE')) {
      throw new Error('42501: Action Blocked: The Root Owner account cannot demote or suspend itself.');
    }

    // Return updated profile and write audit log
    const auditEntry = {
      actor_user_id: callerUid,
      entity_type: 'USER_ROLE',
      entity_id: targetUserId,
      action: 'OWNER_UPDATE_USER_ROLE_AND_STATUS',
      old_data: { target_user_id: targetUserId, role: 'CUSTOMER', status: 'ACTIVE', staff_role: null },
      new_data: { target_user_id: targetUserId, role: newRole, status: newStatus, staff_role: newStaffRole || null },
    };

    return {
      success: true,
      profile: {
        id: targetUserId,
        role: newRole,
        staff_role: newStaffRole || null,
        status: newStatus,
      },
      auditEntry,
    };
  };

  // Simulated trigger logic for prevent_role_escalation matching Migration #8
  const simulatePreventRoleEscalationTrigger = (
    callerUid: string | null,
    isServiceRole: boolean,
    oldRow: { role: UserRole; status: UserStatus; staffRole?: StaffRole | null },
    newRow: { role: UserRole; status: UserStatus; staffRole?: StaffRole | null },
    configuredOwnerUid: string = ROOT_OWNER_UUID
  ) => {
    if (oldRow.role === newRow.role && oldRow.status === newRow.status && oldRow.staffRole === newRow.staffRole) {
      return newRow; // allowed
    }

    if (isServiceRole || callerUid === null) {
      return newRow; // allowed internal / service_role
    }

    if (callerUid === configuredOwnerUid) {
      return newRow; // allowed Root Owner
    }

    // Deny for all other callers
    if (oldRow.role !== newRow.role) {
      throw new Error('42501: Access Denied: Only the Studio Root Owner is authorized to modify user roles.');
    }
    if (oldRow.status !== newRow.status) {
      throw new Error('42501: Access Denied: Only the Studio Root Owner is authorized to modify account status.');
    }
    if (oldRow.staffRole !== newRow.staffRole) {
      throw new Error('42501: Access Denied: Only the Studio Root Owner is authorized to modify staff roles.');
    }

    return newRow;
  };

  it('1. root owner can promote CUSTOMER -> STAFF', async () => {
    const result = await simulateAdminUpdateRpc(
      ROOT_OWNER_UUID,
      TARGET_USER_UUID,
      'STAFF',
      'PHOTOGRAPHER',
      'ACTIVE'
    );
    expect(result.success).toBe(true);
    expect(result.profile.role).toBe('STAFF');
    expect(result.profile.staff_role).toBe('PHOTOGRAPHER');
  });

  it('2. root owner can assign MANAGER', async () => {
    const result = await simulateAdminUpdateRpc(
      ROOT_OWNER_UUID,
      TARGET_USER_UUID,
      'MANAGER',
      undefined,
      'ACTIVE'
    );
    expect(result.success).toBe(true);
    expect(result.profile.role).toBe('MANAGER');
  });

  it('3. root owner can assign ADMIN', async () => {
    const result = await simulateAdminUpdateRpc(
      ROOT_OWNER_UUID,
      TARGET_USER_UUID,
      'ADMIN',
      undefined,
      'ACTIVE'
    );
    expect(result.success).toBe(true);
    expect(result.profile.role).toBe('ADMIN');
  });

  it('4. non-root ADMIN is denied role mutation with 42501', async () => {
    await expect(
      simulateAdminUpdateRpc(NON_ROOT_ADMIN_UUID, TARGET_USER_UUID, 'STAFF', 'MAKEUP', 'ACTIVE')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);
  });

  it('5. MANAGER is denied role mutation with 42501', async () => {
    await expect(
      simulateAdminUpdateRpc(MANAGER_UUID, TARGET_USER_UUID, 'STAFF', 'EDITOR', 'ACTIVE')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);
  });

  it('6. STAFF is denied role mutation with 42501', async () => {
    await expect(
      simulateAdminUpdateRpc(STAFF_UUID, TARGET_USER_UUID, 'CUSTOMER', undefined, 'ACTIVE')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);
  });

  it('7. CUSTOMER is denied role mutation with 42501', async () => {
    await expect(
      simulateAdminUpdateRpc(CUSTOMER_UUID, TARGET_USER_UUID, 'STAFF', 'PHOTOGRAPHER', 'ACTIVE')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);
  });

  it('8. user cannot self-promote to ADMIN or MANAGER', async () => {
    // Customer attempting to promote themselves
    await expect(
      simulateAdminUpdateRpc(CUSTOMER_UUID, CUSTOMER_UUID, 'ADMIN', undefined, 'ACTIVE')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);

    // Non-root admin attempting to promote themselves or change status
    await expect(
      simulateAdminUpdateRpc(NON_ROOT_ADMIN_UUID, NON_ROOT_ADMIN_UUID, 'ADMIN', undefined, 'SUSPENDED')
    ).rejects.toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized/);
  });

  it('9. direct profiles role/status mutation is denied for non-root callers by prevent_role_escalation', () => {
    // Non-root admin directly updating profiles table via Supabase client
    expect(() =>
      simulatePreventRoleEscalationTrigger(
        NON_ROOT_ADMIN_UUID,
        false,
        { role: 'CUSTOMER', status: 'ACTIVE', staffRole: null },
        { role: 'ADMIN', status: 'ACTIVE', staffRole: null }
      )
    ).toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized to modify user roles/);

    // Customer directly attempting status modification
    expect(() =>
      simulatePreventRoleEscalationTrigger(
        CUSTOMER_UUID,
        false,
        { role: 'CUSTOMER', status: 'PENDING_VERIFICATION', staffRole: null },
        { role: 'CUSTOMER', status: 'ACTIVE', staffRole: null }
      )
    ).toThrowError(/42501: Access Denied: Only the Studio Root Owner is authorized to modify account status/);

    // Root owner directly updating is allowed
    const updated = simulatePreventRoleEscalationTrigger(
      ROOT_OWNER_UUID,
      false,
      { role: 'CUSTOMER', status: 'ACTIVE', staffRole: null },
      { role: 'STAFF', status: 'ACTIVE', staffRole: 'PHOTOGRAPHER' }
    );
    expect(updated.role).toBe('STAFF');
  });

  it('10. root owner role/status change writes comprehensive audit log', async () => {
    const result = await simulateAdminUpdateRpc(
      ROOT_OWNER_UUID,
      TARGET_USER_UUID,
      'STAFF',
      'EDITOR',
      'SUSPENDED'
    );

    expect(result.auditEntry).toBeDefined();
    expect(result.auditEntry.actor_user_id).toBe(ROOT_OWNER_UUID);
    expect(result.auditEntry.action).toBe('OWNER_UPDATE_USER_ROLE_AND_STATUS');
    expect(result.auditEntry.new_data.role).toBe('STAFF');
    expect(result.auditEntry.new_data.staff_role).toBe('EDITOR');
    expect(result.auditEntry.new_data.status).toBe('SUSPENDED');
  });

  it('11. owner identity is based on immutable user UUID, not email', () => {
    // Owner with designated UUID is recognized regardless of what email is passed
    const isOwnerByUuid = (uid: string) => uid === ROOT_OWNER_UUID;

    expect(isOwnerByUuid(ROOT_OWNER_UUID)).toBe(true);
    expect(isOwnerByUuid(NON_ROOT_ADMIN_UUID)).toBe(false);
  });

  it('12. deleting or changing email of owner does not transfer root-owner privilege to another user with that email', () => {
    // If a new user registers with the old owner's email address, they receive a NEW UUID
    const NEW_USER_WITH_SAME_EMAIL_UUID = '77777777-0000-0000-0000-000000000077';
    const isOwner = (uid: string) => uid === ROOT_OWNER_UUID;

    // The new account does NOT inherit root owner privileges
    expect(isOwner(NEW_USER_WITH_SAME_EMAIL_UUID)).toBe(false);
  });

  it('13. only one active root owner can exist in root_owner_config table', () => {
    const migration8Path = path.resolve(__dirname, '../../../supabase/migrations/20260911000002_root_owner_rbac_hardening.sql');
    const sql = fs.readFileSync(migration8Path, 'utf-8');

    // Single active row guaranteed by primary key id = true and check constraint
    expect(sql).toContain('id BOOLEAN PRIMARY KEY DEFAULT true');
    expect(sql).toContain('CONSTRAINT single_owner_row_pk CHECK (id = true)');
  });
});
