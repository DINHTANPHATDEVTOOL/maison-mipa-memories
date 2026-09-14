-- ==============================================================================
-- Maison MIPA Memories - Migration #8: Root Owner Only RBAC Hardening
-- Migration: 20260911000002_root_owner_rbac_hardening.sql
-- Description:
--   1. Creates public.root_owner_config table to store immutable owner UUID
--      enforcing exactly one active row via CHECK (id = true).
--   2. Defines public.is_root_owner(p_user_id UUID DEFAULT auth.uid()) function.
--   3. Hardens public.admin_update_user_role_and_status() so ONLY root owner can
--      assign roles (CUSTOMER, STAFF, MANAGER, ADMIN), staff roles, or account
--      status (ACTIVE, SUSPENDED, DISABLED).
--   4. Hardens public.prevent_role_escalation() trigger to block all non-root
--      callers (including normal ADMINs) from mutating roles or statuses.
--   5. Logs full audit details (actor, target, old/new roles/status/staff_roles).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Dedicated Root Owner Configuration Table (Enforcing Exactly 1 Active Row)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.root_owner_config (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  owner_user_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT single_owner_row_pk CHECK (id = true)
);

-- Enable RLS
ALTER TABLE public.root_owner_config ENABLE ROW LEVEL SECURITY;

-- Revoke all direct modification privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON public.root_owner_config FROM PUBLIC;
REVOKE ALL ON public.root_owner_config FROM anon;
REVOKE ALL ON public.root_owner_config FROM authenticated;

-- Allow authenticated users to SELECT only if they are the owner
GRANT SELECT ON public.root_owner_config TO authenticated;

DROP POLICY IF EXISTS "Root owner can read owner config" ON public.root_owner_config;
CREATE POLICY "Root owner can read owner config" ON public.root_owner_config
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. Centralized Root Owner Check Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_root_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT owner_user_id INTO v_owner_id
  FROM public.root_owner_config
  WHERE id = true;

  IF v_owner_id IS NULL THEN
    -- Fail closed: if no owner configured yet, nobody is root owner
    RETURN false;
  END IF;

  RETURN (v_owner_id = p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_root_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_root_owner(UUID) TO anon;

-- ------------------------------------------------------------------------------
-- 3. Hardened admin_update_user_role_and_status RPC (Root Owner Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_role_and_status(
  p_user_id UUID,
  p_new_role TEXT,
  p_new_staff_role TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT 'ACTIVE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_old_profile RECORD;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  -- AUTHORITATIVE ROOT OWNER ONLY CHECK
  IF NOT public.is_root_owner(v_caller_id) THEN
    RAISE EXCEPTION 'Access Denied: Only the Studio Root Owner is authorized to assign user roles and manage account status.'
      USING ERRCODE = '42501';
  END IF;

  -- Validate role
  IF p_new_role NOT IN ('CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role USING ERRCODE = '22023';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status USING ERRCODE = '22023';
  END IF;

  -- Validate staff_role if STAFF
  IF p_new_role = 'STAFF' AND p_new_staff_role IS NOT NULL THEN
    IF p_new_staff_role NOT IN ('PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST') THEN
      RAISE EXCEPTION 'Invalid staff role: %', p_new_staff_role USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT * INTO v_old_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Prevent owner from accidentally demoting or suspending themselves through this RPC
  IF p_user_id = v_caller_id AND (p_new_role != 'ADMIN' OR p_new_status != 'ACTIVE') THEN
    RAISE EXCEPTION 'Action Blocked: The Root Owner account cannot demote or suspend itself.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    role = p_new_role,
    staff_role = p_new_staff_role,
    status = p_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- Maintain employees table sync
  IF p_new_role = 'STAFF' AND p_new_staff_role IS NOT NULL THEN
    INSERT INTO public.employees (id, staff_role, active)
    VALUES (p_user_id, p_new_staff_role, (p_new_status = 'ACTIVE'))
    ON CONFLICT (id) DO UPDATE
    SET
      staff_role = EXCLUDED.staff_role,
      active = (p_new_status = 'ACTIVE'),
      updated_at = timezone('utc'::text, now());
  ELSIF p_new_role != 'STAFF' THEN
    UPDATE public.employees
    SET active = false, updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  END IF;

  -- Audit log: actor_user_id, target_user_id, old/new roles, old/new status, old/new staff_role
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    v_caller_id,
    'USER_ROLE',
    p_user_id::text,
    'OWNER_UPDATE_USER_ROLE_AND_STATUS',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'role', v_old_profile.role,
      'status', v_old_profile.status,
      'staff_role', v_old_profile.staff_role
    ),
    jsonb_build_object(
      'target_user_id', p_user_id,
      'role', p_new_role,
      'status', p_new_status,
      'staff_role', p_new_staff_role
    )
  );

  SELECT to_jsonb(p.*) INTO v_result FROM public.profiles p WHERE p.id = p_user_id;
  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Hardened prevent_role_escalation Trigger Function (Root Owner Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If neither role, status, nor staff_role is modified, allow update
  IF OLD.role = NEW.role AND OLD.status = NEW.status AND (OLD.staff_role IS NOT DISTINCT FROM NEW.staff_role) THEN
    RETURN NEW;
  END IF;

  -- Allow service_role key or internal postgres/auth operations
  IF current_setting('request.jwt.claim.role', true) IN ('service_role', 'supabase_admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Root Owner is the ONLY user who may mutate role, staff_role, or status
  IF public.is_root_owner(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- All other callers (normal ADMIN, MANAGER, STAFF, CUSTOMER) are DENIED
  IF OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Access Denied: Only the Studio Root Owner is authorized to modify user roles.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only the Studio Root Owner is authorized to modify account status.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.staff_role IS DISTINCT FROM NEW.staff_role THEN
    RAISE EXCEPTION 'Access Denied: Only the Studio Root Owner is authorized to modify staff roles.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
