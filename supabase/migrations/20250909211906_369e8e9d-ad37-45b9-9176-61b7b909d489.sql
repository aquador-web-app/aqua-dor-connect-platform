-- Fix RLS policies for public access to class sessions and classes
-- This ensures visitors can view scheduled sessions without authentication

-- Add public read policy for class_sessions (visitors can see scheduled sessions)
DROP POLICY IF EXISTS "Public can view scheduled sessions" ON public.class_sessions;
CREATE POLICY "Public can view scheduled sessions"
ON public.class_sessions
FOR SELECT
USING (status = 'scheduled');

-- Add public read policy for classes (visitors can see active classes)  
DROP POLICY IF EXISTS "Public can view active classes" ON public.classes;
CREATE POLICY "Public can view active classes"
ON public.classes
FOR SELECT  
USING (is_active = true);

-- Add public read policy for instructors (visitors can see active instructors)
DROP POLICY IF EXISTS "Public can view active instructors" ON public.instructors;
CREATE POLICY "Public can view active instructors"
ON public.instructors
FOR SELECT
USING (is_active = true);

-- Add public read policy for profiles (visitors can see instructor names)
DROP POLICY IF EXISTS "Public can view instructor profiles" ON public.profiles;
CREATE POLICY "Public can view instructor profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.instructors 
    WHERE profile_id = profiles.id AND is_active = true
  )
);

-- Fix search path issues for existing functions
ALTER FUNCTION public.generate_qr_code() SET search_path = 'public';
ALTER FUNCTION public.generate_referral_code() SET search_path = 'public'; 
ALTER FUNCTION public.generate_barcode() SET search_path = 'public';
ALTER FUNCTION public.set_referral_code() SET search_path = 'public';

-- Create simplified view for public calendar data
CREATE OR REPLACE VIEW public.public_calendar_sessions AS
SELECT 
  cs.id,
  cs.session_date,
  cs.duration_minutes,
  cs.max_participants,
  cs.enrolled_students,
  cs.status,
  cs.type,
  cs.instructor_id,
  c.name as class_name,
  c.level as class_level,
  c.price as class_price,
  c.description as class_description,
  p.full_name as instructor_name
FROM public.class_sessions cs
LEFT JOIN public.classes c ON c.id = cs.class_id
LEFT JOIN public.instructors i ON i.id = cs.instructor_id  
LEFT JOIN public.profiles p ON p.id = i.profile_id
WHERE cs.status = 'scheduled' AND c.is_active = true;

-- Grant public access to the view
REVOKE ALL ON public.public_calendar_sessions FROM PUBLIC;
GRANT SELECT ON public.public_calendar_sessions TO anon;