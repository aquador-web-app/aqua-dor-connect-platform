-- Fix the search_path issue for update_session_enrollment_count function
CREATE OR REPLACE FUNCTION public.update_session_enrollment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the enrolled_students count for the affected session
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.class_sessions 
    SET enrolled_students = (
      SELECT COUNT(*) 
      FROM public.bookings 
      WHERE class_session_id = NEW.class_session_id 
      AND status = 'confirmed'
    )
    WHERE id = NEW.class_session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.class_sessions 
    SET enrolled_students = (
      SELECT COUNT(*) 
      FROM public.bookings 
      WHERE class_session_id = OLD.class_session_id 
      AND status = 'confirmed'
    )
    WHERE id = OLD.class_session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;