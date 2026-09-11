-- ==============================================================================
-- Maison MIPA Memories - Migration #9: Fix Mutual RLS Recursion between Bookings & Assignments
-- Migration: 20260911000003_fix_booking_assignments_rls_recursion.sql
-- Description:
--   Breaks circular dependency in RLS policies between public.bookings and
--   public.booking_assignments by utilizing SECURITY DEFINER helper functions.
-- ==============================================================================

-- 1. Helper function to check if booking belongs to customer without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_booking_customer(p_booking_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings WHERE id = p_booking_id AND customer_id = p_user_id
  );
$$;

-- 2. Helper function to check if booking is assigned to staff without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_booking_assigned_to_staff(p_booking_id UUID, p_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments WHERE booking_id = p_booking_id AND employee_id = p_staff_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_booking_customer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_booking_assigned_to_staff(UUID, UUID) TO authenticated;

-- 3. Recreate policy on public.booking_assignments using the SECURITY DEFINER check
DROP POLICY IF EXISTS "Staff and management read assignments" ON public.booking_assignments;
CREATE POLICY "Staff and management read assignments" ON public.booking_assignments
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    public.is_booking_customer(booking_id, auth.uid())
  );

-- 4. Recreate policy on public.bookings using the SECURITY DEFINER check
DROP POLICY IF EXISTS "Customers view own bookings" ON public.bookings;
CREATE POLICY "Customers view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.get_auth_user_status() = 'ACTIVE' AND
    (
      customer_id = auth.uid() OR
      public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
      (
        public.get_auth_role() = 'STAFF' AND (
          public.is_booking_assigned_to_staff(id, auth.uid()) OR
          (
            public.get_auth_staff_role() = 'RECEPTIONIST' AND
            date_trunc('day', start_at) = date_trunc('day', timezone('utc'::text, now()))
          )
        )
      )
    )
  );
