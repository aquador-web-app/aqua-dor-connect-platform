-- Enable public viewing of class sessions for calendar display
-- Update RLS policies to allow unauthenticated access to view scheduled classes

-- Update class_sessions policy to allow public viewing of scheduled sessions
DROP POLICY IF EXISTS "Public can view scheduled classes" ON public.class_sessions;
CREATE POLICY "Public can view scheduled classes"
ON public.class_sessions 
FOR SELECT 
USING (status = 'scheduled'::text);

-- Update classes policy to allow public viewing of active classes  
DROP POLICY IF EXISTS "Public can view active classes" ON public.classes;
CREATE POLICY "Public can view active classes"
ON public.classes 
FOR SELECT 
USING (is_active = true);

-- Add booking status for pending enrollments
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'pending'::text;

-- Add payment approval workflow
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Create notification system for admin alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info'::text,
  data JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES public.profiles(id),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all notifications
CREATE POLICY "Admins can manage notifications"
ON public.admin_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'co_admin')
  )
);

-- Update trigger for timestamp
CREATE TRIGGER update_admin_notifications_updated_at
BEFORE UPDATE ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for clarity
COMMENT ON TABLE public.admin_notifications IS 'Real-time notifications for admin dashboard';
COMMENT ON COLUMN public.bookings.enrollment_status IS 'Tracks enrollment approval status: pending, approved, rejected';
COMMENT ON COLUMN public.payments.approved_at IS 'When payment was approved by admin';
COMMENT ON COLUMN public.payments.approved_by IS 'Admin who approved the payment';