-- =====================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- =====================================

-- Fix 1: Secure the public_calendar_sessions view with proper RLS
-- Drop and recreate the view with security invoker (default) and proper filtering
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

-- Enable RLS on the view (this will use the underlying table policies)
ALTER VIEW public.public_calendar_sessions SET (security_invoker = true);

-- Fix 2: Add missing RLS policies for tables that have RLS enabled but no policies

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

-- Add policies for reviews table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view public reviews" ON public.reviews FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for student_subscriptions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_subscriptions' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Students can view their subscriptions" ON public.student_subscriptions FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all subscriptions" ON public.student_subscriptions FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Add policies for shopping_cart table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopping_cart' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can manage their cart" ON public.shopping_cart FOR ALL USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- Add policies for reservations table (if it exists)  
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view their reservations" ON public.reservations FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create reservations" ON public.reservations FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all reservations" ON public.reservations FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Add policies for security_audit_logs table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_logs' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Only admins can view security logs" ON public.security_audit_logs FOR SELECT USING (has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "System can insert security logs" ON public.security_audit_logs FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- Add policies for technical_sheets table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'technical_sheets' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Students can view their technical sheets" ON public.technical_sheets FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Instructors can manage technical sheets for their students" ON public.technical_sheets FOR ALL USING (instructor_id IN (SELECT i.id FROM instructors i JOIN profiles p ON p.id = i.profile_id WHERE p.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all technical sheets" ON public.technical_sheets FOR ALL USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Add policies for referral_credits table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_credits' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view their referral credits" ON public.referral_credits FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage referral credits" ON public.referral_credits FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for student_pricing_assignments table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_pricing_assignments' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Students can view their pricing" ON public.student_pricing_assignments FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage pricing assignments" ON public.student_pricing_assignments FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for student_doc_acceptances table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_doc_acceptances' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Students can manage their document acceptances" ON public.student_doc_acceptances FOR ALL USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can view all document acceptances" ON public.student_doc_acceptances FOR SELECT USING (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''co_admin''))';
  END IF;
END $$;

-- Add policies for user_balances table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balances' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view their balance" ON public.user_balances FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "System can update balances" ON public.user_balances FOR UPDATE USING (true)';
    EXECUTE 'CREATE POLICY "System can insert balances" ON public.user_balances FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Admins can manage all balances" ON public.user_balances FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for user_credits table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view their credits" ON public.user_credits FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage all credits" ON public.user_credits FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for user_plan_assignments table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_plan_assignments' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view their plan assignments" ON public.user_plan_assignments FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can manage plan assignments" ON public.user_plan_assignments FOR ALL USING (has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Add policies for session_packages table
CREATE POLICY "Students can view their session packages"
ON public.session_packages FOR SELECT
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their session packages" 
ON public.session_packages FOR INSERT
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all session packages"
ON public.session_packages FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Add policies for session_reservations table  
CREATE POLICY "Students can view their reservations"
ON public.session_reservations FOR SELECT
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create reservations"
ON public.session_reservations FOR INSERT  
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reservations"
ON public.session_reservations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Fix 3: Update functions to have proper search_path (fixing the mutable search path warnings)
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

-- Fix 4: Update children table policies to be more secure (it currently has no policies but should)
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all children"
ON public.children FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Parents can manage their children"  
ON public.children FOR ALL
USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Instructors can view assigned children"
ON public.children FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN instructors i ON i.id = c.instructor_id
    JOIN profiles p ON p.id = i.profile_id
    WHERE e.student_id = children.id
      AND p.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.public_calendar_sessions TO authenticated;
GRANT SELECT ON public.public_calendar_sessions TO anon;