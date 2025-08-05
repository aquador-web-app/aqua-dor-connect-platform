-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.trigger_booking_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_queue (user_id, email, notification_type, data)
  SELECT 
    p.user_id,
    p.email,
    'booking_confirmation',
    jsonb_build_object(
      'booking_id', NEW.id,
      'class_name', c.name,
      'session_date', cs.session_date,
      'instructor_name', ip.full_name
    )
  FROM profiles p
  JOIN class_sessions cs ON cs.id = NEW.class_session_id
  JOIN classes c ON c.id = cs.class_id
  JOIN instructors i ON i.id = cs.instructor_id
  JOIN profiles ip ON ip.id = i.profile_id
  WHERE p.id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_class_reminders()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Schedule reminder emails for all bookings of this session
  INSERT INTO public.notification_queue (user_id, email, notification_type, data, scheduled_for)
  SELECT 
    p.user_id,
    p.email,
    'class_reminder',
    jsonb_build_object(
      'booking_id', b.id,
      'class_name', c.name,
      'session_date', NEW.session_date,
      'instructor_name', ip.full_name
    ),
    NEW.session_date - INTERVAL '24 hours'
  FROM bookings b
  JOIN profiles p ON p.id = b.user_id
  JOIN classes c ON c.id = NEW.class_id
  JOIN instructors i ON i.id = NEW.instructor_id
  JOIN profiles ip ON ip.id = i.profile_id
  WHERE b.class_session_id = NEW.id
    AND NEW.session_date > now() + INTERVAL '24 hours';
  
  RETURN NEW;
END;
$$;