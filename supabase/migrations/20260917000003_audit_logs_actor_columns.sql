-- ==============================================================================
-- Maison MIPA Memories - Migration #21: Add actor_id and actor_role to audit_logs
-- Provides schema alignment with Booking V2 functions (create_booking,
-- update_booking_consultation, confirm_booking_deposit, update_booking_status).
-- ==============================================================================

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;

-- Backfill existing rows if actor_id is null
UPDATE public.audit_logs
SET actor_id = actor_user_id
WHERE actor_id IS NULL AND actor_user_id IS NOT NULL;
