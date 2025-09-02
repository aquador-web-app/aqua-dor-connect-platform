-- Create reactivate enrollment function
CREATE OR REPLACE FUNCTION public.reactivate_enrollment_with_event(p_enrollment_id uuid, p_actor_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update enrollment to active status and clear cancelled_at
  UPDATE public.enrollments 
  SET status = 'active', 
      cancelled_at = NULL
  WHERE id = p_enrollment_id;
  
  -- Insert reservation event
  INSERT INTO public.reservation_events (enrollment_id, type, actor_id)
  VALUES (p_enrollment_id, 'reactivated', p_actor_id);
END;
$function$;