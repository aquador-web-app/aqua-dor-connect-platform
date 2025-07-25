-- Create user roles enum and table system

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin', 'instructor', 'student', 'parent');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role::TEXT = role_name
  );
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Update profiles table to work with new role system
-- Remove role column from profiles and use user_roles table instead
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Add barcode column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS barcode_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

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

DROP TRIGGER IF EXISTS set_profile_barcode_trigger ON public.profiles;
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
CREATE TABLE IF NOT EXISTS public.email_logs (
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
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own email logs" 
ON public.email_logs 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Update handle_new_user function to work with new role system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name'
  );
  
  -- Insert default role (student) into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$$;