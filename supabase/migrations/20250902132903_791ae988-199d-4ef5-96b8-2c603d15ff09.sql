-- First, let's check if there are any triggers that create enrollments
-- We'll modify the reservation flow to properly handle class_id in enrollments

-- Create a function that properly creates enrollment with class_id when booking is made
CREATE OR REPLACE FUNCTION create_enrollment_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is confirmed, create an enrollment with the correct class_id
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    INSERT INTO public.enrollments (student_id, class_id, enrollment_date, status, payment_status)
    SELECT 
      NEW.user_id,
      cs.class_id,
      NEW.created_at,
      'active',
      'pending'
    FROM public.class_sessions cs
    WHERE cs.id = NEW.class_session_id
    ON CONFLICT DO NOTHING; -- Prevent duplicate enrollments
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create enrollment when booking is confirmed
DROP TRIGGER IF EXISTS create_enrollment_on_booking ON public.bookings;
CREATE TRIGGER create_enrollment_on_booking
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_enrollment_from_booking();