-- Fix email_logs table security by enabling RLS and adding policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_logs
CREATE POLICY "Admins can manage all email logs" 
ON public.email_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'co_admin'));

-- Add useful indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bookings_user_session ON public.bookings(user_id, class_session_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor ON public.class_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_student ON public.attendance(class_session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON public.enrollments(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_barcode ON public.profiles(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

-- Add email notification triggers table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on notification queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for notification queue
CREATE POLICY "Admins can manage all notifications" 
ON public.notification_queue 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for automatic booking confirmation emails
CREATE OR REPLACE FUNCTION public.trigger_booking_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for booking confirmations
CREATE OR REPLACE TRIGGER booking_notification_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_notification();

-- Add trigger for class reminder notifications (24h before)
CREATE OR REPLACE FUNCTION public.schedule_class_reminders()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for class reminders
CREATE OR REPLACE TRIGGER class_reminder_trigger
  AFTER INSERT OR UPDATE OF session_date ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_class_reminders();