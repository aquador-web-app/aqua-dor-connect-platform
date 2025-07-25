-- Add Co-Admin role and barcode functionality

-- Update role enum to include co_admin
ALTER TYPE public.app_role ADD VALUE 'co_admin';

-- Add barcode column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN barcode TEXT UNIQUE,
ADD COLUMN barcode_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to generate unique barcode
CREATE OR REPLACE FUNCTION public.generate_barcode()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  barcode_prefix TEXT := 'AQ';
  barcode_suffix TEXT;
  full_barcode TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8-digit random number
    barcode_suffix := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    full_barcode := barcode_prefix || barcode_suffix;
    
    -- Check if barcode already exists
    SELECT COUNT(*) INTO exists_check FROM profiles WHERE barcode = full_barcode;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN full_barcode;
END;
$$;

-- Create trigger to auto-generate barcode for new profiles
CREATE OR REPLACE FUNCTION public.set_profile_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := public.generate_barcode();
    NEW.barcode_generated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_barcode_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_barcode();

-- Update existing profiles to have barcodes
UPDATE public.profiles 
SET barcode = public.generate_barcode(), 
    barcode_generated_at = now()
WHERE barcode IS NULL;

-- Create email_logs table for tracking email notifications
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Admins can manage email logs" 
ON public.email_logs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'co_admin')
));

CREATE POLICY "Users can view their own email logs" 
ON public.email_logs 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Create security definer function to check user roles safely
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update existing RLS policies to use the security definer function
-- This prevents infinite recursion issues

-- Update attendance policies
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admins can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update bookings policies  
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" 
ON public.bookings 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update class_sessions policies
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.class_sessions;
CREATE POLICY "Admins can manage all sessions" 
ON public.class_sessions 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update classes policies
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
CREATE POLICY "Admins can manage all classes" 
ON public.classes 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update content policies
DROP POLICY IF EXISTS "Admins can manage all content" ON public.content;
CREATE POLICY "Admins can manage all content" 
ON public.content 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update enrollments policies
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage all enrollments" 
ON public.enrollments 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update gallery_items policies
DROP POLICY IF EXISTS "Admins can manage all gallery items" ON public.gallery_items;
CREATE POLICY "Admins can manage all gallery items" 
ON public.gallery_items 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update instructors policies
DROP POLICY IF EXISTS "Admins can manage all instructors" ON public.instructors;
CREATE POLICY "Admins can manage all instructors" 
ON public.instructors 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Update parent_child_relationships policies
DROP POLICY IF EXISTS "Admins can view all relationships" ON public.parent_child_relationships;
CREATE POLICY "Admins can view all relationships" 
ON public.parent_child_relationships 
FOR SELECT 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Payments - Only full admins can manage payments (not co_admins)
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (public.get_user_role() = 'admin');

-- Co-admins can only view payments
CREATE POLICY "Co-admins can view payments" 
ON public.payments 
FOR SELECT 
USING (public.get_user_role() = 'co_admin');

-- Update profiles policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_user_role() IN ('admin', 'co_admin'));

-- Referrals - Only full admins can manage referrals (not co_admins)  
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
CREATE POLICY "Admins can manage all referrals" 
ON public.referrals 
FOR ALL 
USING (public.get_user_role() = 'admin');

CREATE POLICY "Co-admins can view referrals" 
ON public.referrals 
FOR SELECT 
USING (public.get_user_role() = 'co_admin');

-- Update reviews policies
DROP POLICY IF EXISTS "Users can view reviews for their classes" ON public.reviews;
CREATE POLICY "Users can view reviews for their classes" 
ON public.reviews 
FOR SELECT 
USING (
  student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  instructor_id IN (
    SELECT i.id FROM instructors i 
    JOIN profiles p ON p.id = i.profile_id 
    WHERE p.user_id = auth.uid()
  ) OR
  public.get_user_role() IN ('admin', 'co_admin')
);

-- User balances - Only full admins can manage balances (not co_admins)
DROP POLICY IF EXISTS "Admins can manage all balances" ON public.user_balances;
CREATE POLICY "Admins can manage all balances" 
ON public.user_balances 
FOR ALL 
USING (public.get_user_role() = 'admin');

CREATE POLICY "Co-admins can view balances" 
ON public.user_balances 
FOR SELECT 
USING (public.get_user_role() = 'co_admin');