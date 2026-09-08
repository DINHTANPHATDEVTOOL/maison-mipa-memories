-- ==============================================================================
-- Maison MIPA Memories - Production Supabase Auth & RBAC Schema Migration
-- Migration: 20260908000001_auth_rbac_schema.sql
-- Description: Sets up profiles table, RBAC roles, RLS policies, and secure triggers
-- ==============================================================================

-- 1. Create Profiles Table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN')),
  staff_role TEXT CHECK (staff_role IN ('PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST', 'MANAGER', 'ADMIN')),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Function to query current user role without causing recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Trigger Function: Automatically create CUSTOMER profile upon signup in auth.users
-- CRITICAL SECURITY RULE: Role is ALWAYS 'CUSTOMER', never taken from user metadata input!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'CUSTOMER', -- Forced to CUSTOMER on registration. No user can register as STAFF/MANAGER/ADMIN.
    'ACTIVE',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Trigger Function: Prevent unauthorized role escalation
-- Users cannot modify their own or others' roles unless they are already ADMIN or service_role.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If role is not being modified, allow update
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Allow service_role key to manage roles
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Verify if current caller is ADMIN in profiles table
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators are authorized to modify user roles.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 6. Trigger Function: Update timestamp on profile modifications
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies
-- Policy A: Individual users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy B: Staff, Managers, and Admins can view customer and staff profiles for operations
CREATE POLICY "Staff and management can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
  );

-- Policy C: Users can update their own profile fields (full_name, phone, avatar_url)
-- Note: Role elevation is strictly blocked by trg_prevent_role_escalation trigger above
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy D: Admins have full access to update or delete profiles
CREATE POLICY "Admins have full access to all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');
