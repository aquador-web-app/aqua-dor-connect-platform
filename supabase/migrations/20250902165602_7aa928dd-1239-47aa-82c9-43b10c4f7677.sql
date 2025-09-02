-- Create payments table with proper schema
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  booking_id UUID REFERENCES public.bookings(id),
  amount_usd NUMERIC(10,2) NOT NULL,
  method TEXT CHECK (method IN ('cash','moncash','check','card')) NOT NULL,
  status TEXT CHECK (status IN ('pending','approved','rejected','refunded','cancelled')) NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
  DATE_TRUNC('month', approved_at) as month,
  TO_CHAR(DATE_TRUNC('month', approved_at), 'YYYY-MM') as month_key,
  TO_CHAR(DATE_TRUNC('month', approved_at), 'Mon YYYY') as month_name,
  SUM(amount_usd) as revenue,
  COUNT(*) as payment_count
FROM public.payments 
WHERE status = 'approved' AND approved_at IS NOT NULL
GROUP BY DATE_TRUNC('month', approved_at)
ORDER BY month DESC;

-- Add cancelled_at to enrollments if not exists
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

-- Add available_seats to classes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'available_seats') THEN
    ALTER TABLE public.classes ADD COLUMN available_seats INTEGER;
    -- Initialize available_seats based on capacity and active enrollments
    UPDATE public.classes SET available_seats = capacity - COALESCE((
      SELECT COUNT(*) FROM public.enrollments 
      WHERE class_id = classes.id AND status IN ('active','completed')
    ), 0);
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS policies for payment_events
CREATE POLICY "Admins can manage payment events" ON public.payment_events
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS policies for reservation_events
CREATE POLICY "Admins can manage reservation events" ON public.reservation_events
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own reservation events" ON public.reservation_events
  FOR SELECT USING (enrollment_id IN (
    SELECT id FROM enrollments WHERE student_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Function to update available seats
CREATE OR REPLACE FUNCTION public.update_class_available_seats(class_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.classes 
  SET available_seats = capacity - COALESCE((
    SELECT COUNT(*) FROM public.enrollments 
    WHERE class_id = class_uuid AND status IN ('active','completed')
  ), 0)
  WHERE id = class_uuid;
END;
$$;

-- Trigger to update available seats when enrollment status changes
CREATE OR REPLACE FUNCTION public.enrollment_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update available seats for the affected class
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_class_available_seats(NEW.class_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_class_available_seats(OLD.class_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS enrollment_status_change ON public.enrollments;
CREATE TRIGGER enrollment_status_change
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enrollment_status_change_trigger();

-- Function to create payment with event
CREATE OR REPLACE FUNCTION public.create_payment_with_event(
  p_user_id UUID,
  p_enrollment_id UUID,
  p_booking_id UUID,
  p_amount_usd NUMERIC,
  p_method TEXT,
  p_actor_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id UUID;
BEGIN
  -- Insert payment
  INSERT INTO public.payments (user_id, enrollment_id, booking_id, amount_usd, method)
  VALUES (p_user_id, p_enrollment_id, p_booking_id, p_amount_usd, p_method)
  RETURNING id INTO payment_id;
  
  -- Insert payment event
  INSERT INTO public.payment_events (payment_id, type, actor_id)
  VALUES (payment_id, 'created', p_actor_id);
  
  RETURN payment_id;
END;
$$;

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
  SET status = 'approved', approved_by = p_actor_id, approved_at = now(), updated_at = now()
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

-- Enable realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;