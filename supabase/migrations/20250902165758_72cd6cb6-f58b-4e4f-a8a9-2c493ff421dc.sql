-- Update existing payments table structure
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(10,2);

-- Update existing amount column to amount_usd if amount exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount') THEN
    UPDATE public.payments SET amount_usd = amount WHERE amount_usd IS NULL;
  END IF;
END $$;

-- Add missing columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'cash' CHECK (method IN ('cash','moncash','check','card'));

-- Create payment_events audit table
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) NOT NULL,
  type TEXT CHECK (type IN ('created','approved','rejected','refunded','cancelled')) NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create monthly revenue view
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  DATE_TRUNC('month', COALESCE(approved_at, paid_at, created_at)) as month,
  TO_CHAR(DATE_TRUNC('month', COALESCE(approved_at, paid_at, created_at)), 'YYYY-MM') as month_key,
  TO_CHAR(DATE_TRUNC('month', COALESCE(approved_at, paid_at, created_at)), 'Mon YYYY') as month_name,
  SUM(COALESCE(amount_usd, amount, 0)) as revenue,
  COUNT(*) as payment_count
FROM public.payments 
WHERE status IN ('approved', 'paid') 
GROUP BY DATE_TRUNC('month', COALESCE(approved_at, paid_at, created_at))
ORDER BY month DESC;

-- Add cancelled_at to enrollments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.enrollments ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create reservation_events table
CREATE TABLE IF NOT EXISTS public.reservation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.enrollments(id) NOT NULL,
  type TEXT CHECK (type IN ('created','cancelled','reactivated','completed')) NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on new tables
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_events
DROP POLICY IF EXISTS "Admins can manage payment events" ON public.payment_events;
CREATE POLICY "Admins can manage payment events" ON public.payment_events
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS policies for reservation_events  
DROP POLICY IF EXISTS "Admins can manage reservation events" ON public.reservation_events;
CREATE POLICY "Admins can manage reservation events" ON public.reservation_events
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

DROP POLICY IF EXISTS "Users can view their own reservation events" ON public.reservation_events;
CREATE POLICY "Users can view their own reservation events" ON public.reservation_events
  FOR SELECT USING (enrollment_id IN (
    SELECT id FROM enrollments WHERE student_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Function to approve payment with event
CREATE OR REPLACE FUNCTION public.approve_payment_with_event(
  p_payment_id UUID,
  p_actor_id UUID DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update payment
  UPDATE public.payments 
  SET status = 'approved', 
      approved_by = p_actor_id, 
      approved_at = now(), 
      updated_at = now()
  WHERE id = p_payment_id;
  
  -- Insert payment event
  INSERT INTO public.payment_events (payment_id, type, actor_id)
  VALUES (p_payment_id, 'approved', p_actor_id);
END;
$$;

-- Function to cancel enrollment with event
CREATE OR REPLACE FUNCTION public.cancel_enrollment_with_event(
  p_enrollment_id UUID,
  p_actor_id UUID DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update enrollment
  UPDATE public.enrollments 
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = p_enrollment_id;
  
  -- Insert reservation event
  INSERT INTO public.reservation_events (enrollment_id, type, actor_id)
  VALUES (p_enrollment_id, 'cancelled', p_actor_id);
END;
$$;