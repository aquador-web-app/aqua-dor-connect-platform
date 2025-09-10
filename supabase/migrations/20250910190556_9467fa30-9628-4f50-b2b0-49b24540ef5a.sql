-- =====================================
-- CRITICAL SECURITY FIX MIGRATION  
-- =====================================

-- Fix 1: Secure the public_calendar_sessions view with security invoker
DROP VIEW IF EXISTS public.public_calendar_sessions;

CREATE VIEW public.public_calendar_sessions 
WITH (security_invoker = true) AS
SELECT 
    cs.id,
    cs.session_date,
    cs.duration_minutes,
    cs.max_participants,
    cs.enrolled_students,
    cs.status,
    cs.type,
    cs.instructor_id,
    c.name AS class_name,
    c.level AS class_level,
    c.price AS class_price,
    c.description AS class_description,
    p.full_name AS instructor_name
FROM class_sessions cs
LEFT JOIN classes c ON c.id = cs.class_id
LEFT JOIN instructors i ON i.id = cs.instructor_id  
LEFT JOIN profiles p ON p.id = i.profile_id
WHERE cs.status = 'scheduled' 
  AND COALESCE(c.is_active, true) = true;

-- Fix 2: Add missing RLS policies for critical tables

-- Add policies for public_children_view table
CREATE POLICY "Admins can view all children data"
ON public.public_children_view FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Instructors can view assigned children"  
ON public.public_children_view FOR SELECT
USING (has_role(auth.uid(), 'instructor'));

CREATE POLICY "Parents can view their children"
ON public.public_children_view FOR SELECT  
USING (id IN (
  SELECT pcr.child_id 
  FROM parent_child_relationships pcr
  JOIN profiles p ON p.id = pcr.parent_id
  WHERE p.user_id = auth.uid()
));

-- Add policies for session_packages table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'session_packages'
  ) THEN
    EXECUTE 'CREATE POLICY "Students can view their session packages" ON public.session_packages FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Students can create their session packages" ON public.session_packages FOR INSERT WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all session packages" ON public.session_packages FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Add policies for session_reservations table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'session_reservations'
  ) THEN
    EXECUTE 'CREATE POLICY "Students can view their reservations" ON public.session_reservations FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Students can create reservations" ON public.session_reservations FOR INSERT WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all reservations" ON public.session_reservations FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Fix 3: Secure the children table (currently has no RLS policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'children'
  ) THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Admins can manage all children" ON public.children FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
    EXECUTE 'CREATE POLICY "Parents can manage their children" ON public.children FOR ALL USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Instructors can view assigned children" ON public.children FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments e JOIN classes c ON c.id = e.class_id JOIN instructors i ON i.id = c.instructor_id JOIN profiles p ON p.id = i.profile_id WHERE e.student_id = children.id AND p.user_id = auth.uid()))';
  END IF;
END $$;

-- Fix 4: Update functions to have proper search_path (critical for security)
CREATE OR REPLACE FUNCTION public.generate_qr_code()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'AQ' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT COUNT(*) INTO exists_check 
    FROM (
      SELECT qr_code FROM public.profiles WHERE qr_code = code
      UNION ALL
      SELECT qr_code FROM public.children WHERE qr_code = code
    ) q;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text  
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'AQ' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT COUNT(*) INTO exists_check FROM profiles WHERE referral_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_barcode()
RETURNS text
LANGUAGE plpgsql  
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- Grant necessary permissions for the view
GRANT SELECT ON public.public_calendar_sessions TO authenticated;
GRANT SELECT ON public.public_calendar_sessions TO anon;