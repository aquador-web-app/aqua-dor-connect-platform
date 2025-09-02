-- Fix function search path security issue
-- Update existing functions to have secure search path

-- Function to create admin notification (for pending bookings)
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_title TEXT,
  p_message TEXT, 
  p_type TEXT DEFAULT 'info',
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.admin_notifications (title, message, type, data)
  VALUES (p_title, p_message, p_type, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle pending booking notifications
CREATE OR REPLACE FUNCTION public.notify_pending_booking()
RETURNS TRIGGER AS $$
DECLARE
  class_info RECORD;
  user_info RECORD;
BEGIN
  -- Get class and user information
  SELECT 
    c.name as class_name,
    cs.session_date,
    p.full_name as student_name
  INTO class_info
  FROM public.class_sessions cs
  JOIN public.classes c ON c.id = cs.class_id  
  JOIN public.profiles p ON p.id = NEW.user_id
  WHERE cs.id = NEW.class_session_id;
  
  -- Create notification for admins when booking is pending
  IF NEW.enrollment_status = 'pending' THEN
    PERFORM public.create_admin_notification(
      'Nouvelle demande d''inscription',
      format('%s a demandé une inscription pour %s le %s', 
        class_info.student_name, 
        class_info.class_name, 
        to_char(class_info.session_date, 'DD/MM/YYYY à HH24:MI')
      ),
      'booking_pending',
      jsonb_build_object(
        'booking_id', NEW.id,
        'user_id', NEW.user_id,
        'class_session_id', NEW.class_session_id,
        'student_name', class_info.student_name,
        'class_name', class_info.class_name,
        'session_date', class_info.session_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for pending booking notifications
DROP TRIGGER IF EXISTS notify_pending_booking_trigger ON public.bookings;
CREATE TRIGGER notify_pending_booking_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_pending_booking();