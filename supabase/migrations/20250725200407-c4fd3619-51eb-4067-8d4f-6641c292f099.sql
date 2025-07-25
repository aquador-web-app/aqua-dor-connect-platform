-- Fix security warnings by setting search_path and complete the migration

-- Fix function search_path warnings
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role::TEXT = role_name
  );
$$;

-- Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
       CASE 
         WHEN role = 'admin' THEN 'admin'::public.app_role
         WHEN role = 'instructor' THEN 'instructor'::public.app_role
         WHEN role = 'student' THEN 'student'::public.app_role
         ELSE 'student'::public.app_role
       END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Now drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Add barcode columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS barcode_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to generate unique barcode
CREATE OR REPLACE FUNCTION public.generate_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- Create trigger function for barcode generation
CREATE OR REPLACE FUNCTION public.set_profile_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := public.generate_barcode();
    NEW.barcode_generated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for barcode generation
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

-- Create email_logs table
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

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

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