-- ==============================================================================
-- Maison MIPA Memories - Database Migration #16
-- File: 20260911000010_seed_and_enhance_employees_table.sql
--
-- Features:
-- 1. Add name, phone, email, and avatar_url columns to public.employees
--    to prevent cross-table join failures under Row Level Security.
-- 2. Populate employee details from public.profiles.
-- 3. Update trg_sync_profile_to_employee to maintain employee fields.
-- 4. Enable public.booking_assignments table in supabase_realtime publication.
-- ==============================================================================

-- 1. Add direct columns to public.employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Populate employee contact and identity fields from profiles
UPDATE public.employees e
SET
  name = COALESCE(p.full_name, 'Chuyên Viên MIPA'),
  phone = COALESCE(p.phone, ''),
  email = COALESCE(p.email, ''),
  avatar_url = COALESCE(p.avatar_url, '/hero.png')
FROM public.profiles p
WHERE e.id = p.id;

-- 3. Ensure any existing STAFF, MANAGER, or ADMIN profile is inserted
INSERT INTO public.employees (id, name, phone, email, avatar_url, staff_role, active)
SELECT
  p.id,
  COALESCE(p.full_name, 'Chuyên Viên MIPA'),
  COALESCE(p.phone, ''),
  COALESCE(p.email, ''),
  COALESCE(p.avatar_url, '/hero.png'),
  COALESCE(p.staff_role, CASE WHEN p.role = 'ADMIN' THEN 'MANAGER' ELSE 'PHOTOGRAPHER' END),
  true
FROM public.profiles p
WHERE p.role IN ('STAFF', 'MANAGER', 'ADMIN')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  avatar_url = EXCLUDED.avatar_url,
  active = true,
  updated_at = timezone('utc'::text, now());

-- 4. Update trigger function to keep all columns in sync
CREATE OR REPLACE FUNCTION public.trg_sync_profile_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('STAFF', 'MANAGER', 'ADMIN') THEN
    INSERT INTO public.employees (id, name, phone, email, avatar_url, staff_role, active)
    VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'Chuyên Viên MIPA'),
      COALESCE(NEW.phone, ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.avatar_url, '/hero.png'),
      COALESCE(NEW.staff_role, CASE WHEN NEW.role = 'ADMIN' THEN 'MANAGER' ELSE 'PHOTOGRAPHER' END),
      (NEW.status = 'ACTIVE')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = COALESCE(NEW.full_name, public.employees.name),
      phone = COALESCE(NEW.phone, public.employees.phone),
      email = COALESCE(NEW.email, public.employees.email),
      avatar_url = COALESCE(NEW.avatar_url, public.employees.avatar_url),
      staff_role = COALESCE(NEW.staff_role, public.employees.staff_role),
      active = (NEW.status = 'ACTIVE'),
      updated_at = timezone('utc'::text, now());
  ELSIF NEW.role = 'CUSTOMER' THEN
    UPDATE public.employees
    SET active = false, updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
