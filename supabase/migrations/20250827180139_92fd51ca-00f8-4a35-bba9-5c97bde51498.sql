-- First, let's ensure the enrolled_students column is properly updated when bookings change

-- Create or replace the function to recalculate enrolled students
CREATE OR REPLACE FUNCTION public.recalc_enrolled_count(p_session uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.class_sessions cs
  SET enrolled_students = COALESCE((
    SELECT COUNT(1)
    FROM public.bookings b
    WHERE b.class_session_id = p_session
      AND b.status = 'confirmed'
  ), 0)
  WHERE cs.id = p_session;
END;
$function$;

-- Create or replace the trigger function for bookings
CREATE OR REPLACE FUNCTION public.bookings_enrolled_recalc_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.class_session_id IS NOT NULL THEN
      PERFORM public.recalc_enrolled_count(NEW.class_session_id);
    END IF;
    -- If session changed on update, also recalc old session
    IF TG_OP = 'UPDATE' AND (NEW.class_session_id IS DISTINCT FROM OLD.class_session_id) AND OLD.class_session_id IS NOT NULL THEN
      PERFORM public.recalc_enrolled_count(OLD.class_session_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.class_session_id IS NOT NULL THEN
      PERFORM public.recalc_enrolled_count(OLD.class_session_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS bookings_enrolled_count_trigger ON public.bookings;
CREATE TRIGGER bookings_enrolled_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_enrolled_recalc_trigger();

-- Update all current session counts to ensure data integrity
UPDATE public.class_sessions cs
SET enrolled_students = COALESCE((
  SELECT COUNT(1)
  FROM public.bookings b
  WHERE b.class_session_id = cs.id
    AND b.status = 'confirmed'
), 0);