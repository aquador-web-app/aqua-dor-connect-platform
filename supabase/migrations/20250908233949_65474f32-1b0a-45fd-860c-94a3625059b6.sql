-- First, create all the required tables
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

CREATE TABLE IF NOT EXISTS public.payment_events_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments_normalized(id),
  event_type text NOT NULL CHECK (event_type IN ('created', 'approved', 'failed', 'cancelled')),
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.admin_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN ('pending_payment', 'pending_booking', 'system_alert')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read_at timestamptz,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  hours_included integer NOT NULL,
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'HTG',
  duration_months integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  hours_remaining integer,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.payments_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies  
CREATE POLICY "users_payments_normalized" ON public.payments_normalized
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'co_admin')
  );

CREATE POLICY "admin_notifications_queue_policy" ON public.admin_notifications_queue
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "subscription_plans_public" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "subscription_plans_admin" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_normalized_status ON public.payments_normalized(status);
CREATE INDEX IF NOT EXISTS idx_payments_normalized_user_id ON public.payments_normalized(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_normalized_approved_at ON public.payments_normalized(approved_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_queue_created_at ON public.admin_notifications_queue(created_at);

-- Enable realtime
ALTER TABLE public.payments_normalized REPLICA IDENTITY FULL;
ALTER TABLE public.admin_notifications_queue REPLICA IDENTITY FULL;