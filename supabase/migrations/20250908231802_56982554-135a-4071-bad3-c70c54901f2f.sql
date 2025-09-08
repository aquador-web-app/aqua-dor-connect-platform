-- Fix the monthly revenue view and add remaining schemas
DROP VIEW IF EXISTS public.v_monthly_revenue;

CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  date_trunc('month', approved_at) as month,
  extract(year from date_trunc('month', approved_at)) as year,
  extract(month from date_trunc('month', approved_at)) as month_num,
  to_char(date_trunc('month', approved_at), 'Mon YYYY') as month_name,
  sum(amount) as total_revenue,
  count(*) as payment_count
FROM public.payments_normalized 
WHERE status = 'approved' AND approved_at IS NOT NULL
GROUP BY date_trunc('month', approved_at)
ORDER BY month DESC;

-- Add QR code and barcode generation for existing users migration
CREATE OR REPLACE FUNCTION public.migrate_existing_users_qr_barcodes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profiles without QR codes
  UPDATE profiles 
  SET qr_code = public.generate_qr_code(),
      barcode = public.generate_barcode(),
      barcode_generated_at = now()
  WHERE qr_code IS NULL OR barcode IS NULL;
  
  -- Update children without QR codes
  UPDATE children 
  SET qr_code = public.generate_qr_code()
  WHERE qr_code IS NULL;
END;
$$;

-- Run the migration for existing users
SELECT public.migrate_existing_users_qr_barcodes();

-- Create notification bell table for admin
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

-- Enable RLS for notifications queue
ALTER TABLE public.admin_notifications_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications_queue_policy" ON public.admin_notifications_queue
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Create function to add admin notifications
CREATE OR REPLACE FUNCTION public.add_admin_notification(
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}',
  p_priority text DEFAULT 'normal'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO admin_notifications_queue (notification_type, title, message, data, priority)
  VALUES (p_type, p_title, p_message, p_data, p_priority)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger for payment pending notifications
CREATE OR REPLACE FUNCTION public.notify_payment_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    PERFORM public.add_admin_notification(
      'pending_payment',
      'Nouveau paiement en attente',
      format('Paiement de %s HTG en attente d''approbation', NEW.amount),
      jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'method', NEW.payment_method),
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_pending_notification
  AFTER INSERT OR UPDATE ON public.payments_normalized
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_pending();

-- Enhanced product categories for store
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url text;

-- Enhanced products for store
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku text UNIQUE,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS dimensions jsonb,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

-- Plans table for subscription management
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

-- User plan assignments
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

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_public" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "subscription_plans_admin" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "user_plan_assignments_users" ON public.user_plan_assignments
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'co_admin')
  );

CREATE POLICY "user_plan_assignments_admin" ON public.user_plan_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Add some default subscription plans
INSERT INTO public.subscription_plans (name, description, hours_included, price) VALUES
('Plan 1 Heure', 'Plan d''1 heure de cours de natation', 1, 150.00),
('Plan 2 Heures', 'Plan de 2 heures de cours de natation', 2, 280.00),
('Plan Mensuel', 'Plan mensuel illimité', 999, 500.00)
ON CONFLICT DO NOTHING;

-- Create function to apply plan pricing at booking
CREATE OR REPLACE FUNCTION public.get_user_plan_price(
  p_user_id uuid,
  p_default_price numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_price numeric;
BEGIN
  -- Check if user has an active plan assignment
  SELECT sp.price / sp.hours_included
  INTO v_plan_price
  FROM user_plan_assignments upa
  JOIN subscription_plans sp ON sp.id = upa.plan_id
  WHERE upa.user_id = p_user_id 
    AND upa.status = 'active'
    AND (upa.expires_at IS NULL OR upa.expires_at > now())
    AND upa.hours_remaining > 0
  ORDER BY upa.assigned_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_plan_price, p_default_price);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_plan_assignments_user_id ON public.user_plan_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_assignments_status ON public.user_plan_assignments(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_queue_created_at ON public.admin_notifications_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_queue_read_at ON public.admin_notifications_queue(read_at) WHERE read_at IS NULL;