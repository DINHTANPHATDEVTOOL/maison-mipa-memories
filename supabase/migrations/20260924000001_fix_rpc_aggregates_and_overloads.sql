-- ==============================================================================
-- Maison MIPA Memories - Migration: Fix RPC Aggregates & Ambiguous Overloads
-- 1. Drops ambiguous function overloads (get_crm_customers, assign_booking_staff_v2, return_booking_resource)
-- 2. Fixes nested aggregate calls and column references in get_concept_performance, get_service_performance, get_studio_utilization_metrics
-- 3. Reloads PostgREST schema cache
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP AMBIGUOUS OVERLOADS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_crm_customers(TEXT, TEXT, UUID, INT, INT);
DROP FUNCTION IF EXISTS public.assign_booking_staff_v2(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.return_booking_resource(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.return_booking_resource(UUID, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT);

-- ------------------------------------------------------------------------------
-- 2. RPC: get_service_performance (Clean CTE without nested aggregates)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_service_performance(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_services JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  WITH service_stats AS (
    SELECT 
      s.id AS service_id,
      s.name AS service_name,
      COALESCE(COUNT(b.id), 0) AS requests_count,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_count,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status = 'COMPLETED'), 0) AS completed_count,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_booking_value,
      COALESCE(SUM(b.total_amount), 0) AS total_amount,
      CASE 
        WHEN COUNT(b.id) > 0 THEN 
          ROUND((COUNT(b.id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'))::NUMERIC / COUNT(b.id)) * 100, 1)
        ELSE 0.0 
      END AS conversion_rate
    FROM public.services s
    LEFT JOIN public.bookings b ON b.service_id = s.id AND b.created_at >= v_start AND b.created_at <= v_end
    GROUP BY s.id, s.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'serviceId', service_id,
      'serviceName', service_name,
      'requestsCount', requests_count,
      'confirmedCount', confirmed_count,
      'completedCount', completed_count,
      'confirmedBookingValue', confirmed_booking_value,
      'conversionRate', conversion_rate
    ) ORDER BY total_amount DESC
  ) INTO v_services
  FROM service_stats;

  RETURN COALESCE(v_services, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_service_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_concept_performance (Fixed bc.id -> bc.concept_id & clean CTE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_concept_performance(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_concepts JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  WITH concept_stats AS (
    SELECT
      c.id AS concept_id,
      c.name AS concept_name,
      COUNT(bc.concept_id) AS times_selected,
      COUNT(bc.concept_id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS confirmed_bookings,
      COUNT(bc.concept_id) FILTER (WHERE b.booking_status = 'COMPLETED') AS completed_bookings
    FROM public.concepts c
    JOIN public.booking_concepts bc ON bc.concept_id = c.id
    JOIN public.bookings b ON b.id = bc.booking_id AND b.created_at >= v_start AND b.created_at <= v_end
    GROUP BY c.id, c.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'conceptId', concept_id,
      'conceptName', concept_name,
      'timesSelected', times_selected,
      'confirmedBookings', confirmed_bookings,
      'completedBookings', completed_bookings
    ) ORDER BY times_selected DESC
  ) INTO v_concepts
  FROM concept_stats;

  RETURN COALESCE(v_concepts, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_concept_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC: get_studio_utilization_metrics (Clean CTE without nested aggregates)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_studio_utilization_metrics(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_days NUMERIC;
  v_studios JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());
  v_days := GREATEST(1, EXTRACT(EPOCH FROM (v_end - v_start)) / 86400);

  WITH studio_stats AS (
    SELECT
      sr.id AS studio_id,
      sr.name AS studio_name,
      ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_at - b.start_at)) / 3600), 0)::NUMERIC, 1) AS booked_hours,
      ROUND((v_days * 12)::NUMERIC, 1) AS operating_hours_total,
      ROUND(LEAST(100.0, (COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_at - b.start_at)) / 3600), 0) / (v_days * 12)) * 100)::NUMERIC, 1) AS utilization_percent
    FROM public.studio_rooms sr
    LEFT JOIN public.bookings b ON b.studio_room_id = sr.id 
      AND b.start_at >= v_start AND b.start_at <= v_end
      AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')
    GROUP BY sr.id, sr.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'studioId', studio_id,
      'studioName', studio_name,
      'bookedHours', booked_hours,
      'operatingHoursTotal', operating_hours_total,
      'utilizationPercent', utilization_percent
    ) ORDER BY utilization_percent DESC
  ) INTO v_studios
  FROM studio_stats;

  RETURN COALESCE(v_studios, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_studio_utilization_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
