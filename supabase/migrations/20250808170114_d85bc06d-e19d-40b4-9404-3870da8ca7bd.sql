-- Add address column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update handle_new_user to set role from signup metadata when available
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Determine role from metadata if provided, default to 'student'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'::app_role)
  );
  
  RETURN NEW;
END;
$$;

-- Allow students to insert/update their own attendance records
CREATE POLICY "Students can insert their own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);
