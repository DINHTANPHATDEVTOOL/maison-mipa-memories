-- ==============================================================================
-- Maison MIPA Memories - Database Migration #15
-- File: 20260911000009_sync_staff_profiles_to_employees.sql
--
-- Features:
-- 1. Sync all existing STAFF, MANAGER, ADMIN profiles into public.employees.
-- 2. Add automatic trigger trg_profile_to_employee to keep public.employees
--    updated whenever profile roles change.
-- 3. Grant SELECT on public.employees to authenticated and anon.
-- ==============================================================================

-- 1. Grant SELECT on public.employees
GRANT SELECT ON public.employees TO anon, authenticated, service_role;

-- 2. Populate public.employees from existing staff/admin profiles
INSERT INTO public.employees (id, staff_role, active)
SELECT id, COALESCE(staff_role, CASE WHEN role = 'ADMIN' THEN 'MANAGER' ELSE 'PHOTOGRAPHER' END), true
FROM public.profiles
WHERE role IN ('STAFF', 'MANAGER', 'ADMIN')
ON CONFLICT (id) DO UPDATE
SET
  staff_role = COALESCE(public.employees.staff_role, EXCLUDED.staff_role),
  active = true,
  updated_at = timezone('utc'::text, now());

-- 3. Trigger Function: Sync profiles to employees
CREATE OR REPLACE FUNCTION public.trg_sync_profile_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('STAFF', 'MANAGER', 'ADMIN') THEN
    INSERT INTO public.employees (id, staff_role, active)
    VALUES (NEW.id, COALESCE(NEW.staff_role, CASE WHEN NEW.role = 'ADMIN' THEN 'MANAGER' ELSE 'PHOTOGRAPHER' END), (NEW.status = 'ACTIVE'))
    ON CONFLICT (id) DO UPDATE
    SET
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

DROP TRIGGER IF EXISTS trg_profile_to_employee ON public.profiles;
CREATE TRIGGER trg_profile_to_employee
  AFTER INSERT OR UPDATE OF role, staff_role, status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_profile_to_employee();
