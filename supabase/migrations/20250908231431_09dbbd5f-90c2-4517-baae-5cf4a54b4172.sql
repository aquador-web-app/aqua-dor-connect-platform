-- Core schema changes for production-ready A'qua D'or platform

-- 1. Enhanced enrollments table with status tracking
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS seats_taken integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_reason text,
ADD COLUMN IF NOT EXISTS archive_date timestamptz;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_archive_date ON public.enrollments(archive_date) WHERE archive_date IS NOT NULL;

-- 2. Enhanced attendance table with entry/exit tracking
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS entry_time timestamptz,
ADD COLUMN IF NOT EXISTS exit_time timestamptz,
ADD COLUMN IF NOT EXISTS pre_attendance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consecutive_absences integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_type text DEFAULT 'regular';

-- 3. Enhanced class_sessions with timezone and recurrence
ALTER TABLE public.class_sessions 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Port-au-Prince',
ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb,
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz,
ADD COLUMN IF NOT EXISTS seats_available integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS seats_taken integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_session_id uuid REFERENCES public.class_sessions(id);

-- Update existing sessions to have proper seat tracking
UPDATE public.class_sessions 
SET seats_available = max_participants, 
    seats_taken = enrolled_students 
WHERE seats_available IS NULL;

-- 4. Normalized payments table
CREATE TABLE IF NOT EXISTS public.payments_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  enrollment_id uuid REFERENCES public.enrollments(id),
  booking_id uuid REFERENCES public.bookings(id),
  order_id uuid REFERENCES public.orders(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'HTG',
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'moncash', 'check', 'card')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed', 'cancelled')),
  reference_number text,
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Payment events audit table
CREATE TABLE IF NOT EXISTS public.payment_events_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments_normalized(id),
  event_type text NOT NULL CHECK (event_type IN ('created', 'approved', 'failed', 'cancelled')),
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now()
);

-- 6. User credits table for referrals
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_type text NOT NULL CHECK (credit_type IN ('referral_bonus', 'discount_50', 'discount_100', 'cash_credit')),
  amount numeric(10,2) NOT NULL,
  used_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Enhanced orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS credits_applied numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- 8. Student document acceptances
CREATE TABLE IF NOT EXISTS public.student_doc_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id),
  accepted_at timestamptz DEFAULT now(),
  signature_data text,
  signature_type text CHECK (signature_type IN ('typed', 'drawn')),
  ip_address inet,
  user_agent text,
  UNIQUE(user_id, document_id)
);

-- 9. Monthly revenue view
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  date_trunc('month', approved_at) as month,
  extract(year from approved_at) as year,
  extract(month from approved_at) as month_num,
  to_char(approved_at, 'Mon YYYY') as month_name,
  sum(amount) as total_revenue,
  count(*) as payment_count
FROM public.payments_normalized 
WHERE status = 'approved' AND approved_at IS NOT NULL
GROUP BY date_trunc('month', approved_at), extract(year from approved_at), extract(month from approved_at)
ORDER BY month DESC;

-- 10. Atomic enrollment procedure
CREATE OR REPLACE FUNCTION public.create_enrollment_atomic(
  p_student_id uuid,
  p_class_session_id uuid,
  p_payment_method text DEFAULT 'cash'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seats_available integer;
  v_seats_taken integer;
  v_enrollment_id uuid;
  v_payment_id uuid;
  v_class_price numeric;
BEGIN
  -- Lock the session row for update
  SELECT seats_available, seats_taken, c.price
  INTO v_seats_available, v_seats_taken, v_class_price
  FROM class_sessions cs
  JOIN classes c ON c.id = cs.class_id
  WHERE cs.id = p_class_session_id
  FOR UPDATE;
  
  -- Check if seats are available
  IF v_seats_taken >= v_seats_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'No seats available');
  END IF;
  
  -- Create enrollment
  INSERT INTO enrollments (student_id, class_id, status, payment_status)
  SELECT p_student_id, cs.class_id, 'pending', 'pending'
  FROM class_sessions cs WHERE cs.id = p_class_session_id
  RETURNING id INTO v_enrollment_id;
  
  -- Create pending payment
  INSERT INTO payments_normalized (user_id, enrollment_id, amount, payment_method, status)
  VALUES (p_student_id, v_enrollment_id, v_class_price, p_payment_method, 'pending')
  RETURNING id INTO v_payment_id;
  
  -- Update seat count
  UPDATE class_sessions 
  SET seats_taken = seats_taken + 1,
      enrolled_students = enrolled_students + 1
  WHERE id = p_class_session_id;
  
  -- Log event
  INSERT INTO payment_events_audit (payment_id, event_type, metadata)
  VALUES (v_payment_id, 'created', jsonb_build_object('session_id', p_class_session_id));
  
  RETURN jsonb_build_object(
    'success', true, 
    'enrollment_id', v_enrollment_id,
    'payment_id', v_payment_id
  );
END;
$$;

-- 11. Archive cancelled enrollments function
CREATE OR REPLACE FUNCTION public.archive_cancelled_enrollments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE enrollments 
  SET archive_date = now(),
      status = 'archived'
  WHERE status = 'cancelled' 
    AND cancelled_at < (now() - interval '24 hours')
    AND archive_date IS NULL;
END;
$$;

-- 12. Generate referral code function
CREATE OR REPLACE FUNCTION public.generate_user_referral_code_enhanced(
  user_full_name text, 
  user_dob date
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initials text;
  birth_year_digits text;
  base_code text;
  final_code text;
  counter integer := 0;
  exists_check integer;
BEGIN
  -- Extract initials from full name
  SELECT string_agg(upper(substring(name_part, 1, 1)), '')
  INTO initials
  FROM unnest(string_to_array(trim(user_full_name), ' ')) AS name_part;
  
  -- Take first 2 characters if more than 2 initials
  IF length(initials) > 2 THEN
    initials := substring(initials, 1, 2);
  END IF;
  
  -- Get last 2 digits of birth year
  birth_year_digits := right(extract(year from user_dob)::text, 2);
  
  -- Combine initials and birth year digits
  base_code := initials || birth_year_digits;
  final_code := base_code;
  
  -- Check for uniqueness, append counter if needed
  LOOP
    SELECT count(*) INTO exists_check 
    FROM profiles 
    WHERE referral_code = final_code;
    
    EXIT WHEN exists_check = 0;
    
    counter := counter + 1;
    final_code := base_code || '-' || counter::text;
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- 13. Enable Row Level Security on new tables
ALTER TABLE public.payments_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_doc_acceptances ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "users_payments_normalized" ON public.payments_normalized
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'co_admin')
  );

CREATE POLICY "users_payment_events" ON public.payment_events_audit
  FOR SELECT USING (
    payment_id IN (SELECT id FROM payments_normalized WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'co_admin')
  );

CREATE POLICY "users_credits" ON public.user_credits
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "users_doc_acceptances" ON public.student_doc_acceptances
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin')
  );

-- 14. Enable realtime for critical tables
ALTER TABLE public.class_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.enrollments REPLICA IDENTITY FULL;
ALTER TABLE public.payments_normalized REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add tables to realtime publication
SELECT pg_notify('realtime', 'class_sessions,enrollments,payments_normalized,bookings');

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_normalized_status ON public.payments_normalized(status);
CREATE INDEX IF NOT EXISTS idx_payments_normalized_user_id ON public.payments_normalized(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_normalized_approved_at ON public.payments_normalized(approved_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_session_date ON public.class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON public.enrollments(student_id, class_id);

-- 16. Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS handle_payments_normalized_updated_at ON public.payments_normalized;
CREATE TRIGGER handle_payments_normalized_updated_at
  BEFORE UPDATE ON public.payments_normalized
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER handle_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();