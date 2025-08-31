-- Remove coach assignment requirements and update class creation logic
-- Update class_sessions to allow NULL instructor_id (removing coach assignment requirement)
ALTER TABLE public.class_sessions 
ALTER COLUMN instructor_id DROP NOT NULL;

-- Update classes table to allow NULL instructor_id 
ALTER TABLE public.classes 
ALTER COLUMN instructor_id DROP NOT NULL;

-- Add comment to clarify that instructor assignment is optional
COMMENT ON COLUMN public.classes.instructor_id IS 'Optional instructor assignment - can be NULL if instructor not yet assigned';
COMMENT ON COLUMN public.class_sessions.instructor_id IS 'Optional instructor assignment - can be NULL if instructor not yet assigned';

-- Update any existing sessions that might fail due to missing instructors
UPDATE public.class_sessions 
SET instructor_id = NULL 
WHERE instructor_id IS NOT NULL 
AND instructor_id NOT IN (SELECT id FROM public.instructors);

-- Add a function to automatically update enrolled_students count when bookings change
CREATE OR REPLACE FUNCTION update_session_enrollment_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic enrollment count updates
DROP TRIGGER IF EXISTS trigger_update_enrollment_count ON public.bookings;
CREATE TRIGGER trigger_update_enrollment_count
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_session_enrollment_count();

-- Update existing enrollment counts to ensure accuracy
UPDATE public.class_sessions 
SET enrolled_students = (
  SELECT COUNT(*) 
  FROM public.bookings 
  WHERE class_session_id = class_sessions.id 
  AND status = 'confirmed'
);

-- Add indexes for better performance on calendar queries
CREATE INDEX IF NOT EXISTS idx_class_sessions_date_status 
ON public.class_sessions (session_date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_session_user_status 
ON public.bookings (class_session_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_student_date 
ON public.reservations (student_id, reservation_date, status);