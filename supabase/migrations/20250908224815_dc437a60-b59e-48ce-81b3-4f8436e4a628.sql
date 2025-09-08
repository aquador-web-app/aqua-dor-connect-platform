-- A'qua D'or comprehensive system implementation

-- Create documents table for PDF management
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rules', 'release', 'photo_consent')),
  url TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student document acceptances
CREATE TABLE public.student_doc_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_type TEXT NOT NULL CHECK (signature_type IN ('typed', 'drawn')),
  signature_data TEXT, -- Base64 signature or typed name
  ip_address INET,
  UNIQUE(user_id, document_id)
);

-- Update profiles table for enhanced fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('M', 'F'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS health_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_lesson BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_type TEXT CHECK (signup_type IN ('self_only', 'self_children', 'children_only'));

-- Create enhanced children table
DROP TABLE IF EXISTS public.children CASCADE;
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  date_of_birth DATE NOT NULL,
  health_notes TEXT,
  is_first_lesson BOOLEAN NOT NULL DEFAULT false,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_hours INTEGER NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update enrollments table
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id);
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS hours_used INTEGER DEFAULT 0;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS hours_remaining INTEGER DEFAULT 0;

-- Enhanced orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced attendance table
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('entry', 'exit'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS qr_scanned BOOLEAN DEFAULT false;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS consecutive_absences INTEGER DEFAULT 0;

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  invoice_type TEXT NOT NULL DEFAULT 'monthly' CHECK (invoice_type IN ('monthly', 'signup', 'penalty', 'product')),
  related_id UUID, -- Can reference order, enrollment, etc.
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced referrals table
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS first_payment_date TIMESTAMPTZ;

-- Create user balances table for credits/commissions
CREATE TABLE public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  earned_credits NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  used_credits NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  commission_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  commission_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced payments table updates
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS credits_used NUMERIC(10,2) DEFAULT 0.00;

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN ('welcome', 'invoice', 'reminder', 'receipt', 'referral')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin settings table for configuration
CREATE TABLE public.admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shopping cart table
CREATE TABLE public.shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create monthly revenue view
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT 
  DATE_TRUNC('month', p.created_at) AS month,
  TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') AS month_key,
  TO_CHAR(DATE_TRUNC('month', p.created_at), 'Mon YYYY') AS month_name,
  SUM(COALESCE(p.amount_usd, p.amount, 0)) AS revenue,
  COUNT(*) AS payment_count
FROM public.payments p
WHERE p.status IN ('approved', 'paid', 'completed')
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, duration_hours, price_usd) VALUES
('Plan 1 Heure', 1, 60.00),
('Plan 2 Heures', 2, 110.00),
('Plan Personnalisé', 0, 0.00);

-- Insert default admin configuration
INSERT INTO public.admin_config (key, value, description) VALUES
('inscription_fee', '60', 'Fee per account/child signup in USD'),
('reintegration_fee', '30', 'Penalty fee for 13+ absences in USD'),
('annual_fee', '100', 'Annual membership fee in USD'),
('invoice_due_days', '7', 'Days until invoice is due'),
('reminder_days', '[2, 7]', 'Days when to send reminders'),
('billing_timezone', 'America/Port-au-Prince', 'Timezone for billing operations'),
('auto_billing_enabled', 'true', 'Enable automatic billing on 25th'),
('block_checkin_unpaid', 'false', 'Block check-in when invoices unpaid');

-- Insert default documents
INSERT INTO public.documents (name, type, url, is_mandatory) VALUES
('Règlement Intérieur', 'rules', '/docs/rules.pdf', true),
('Décharge de Responsabilité', 'release', '/docs/release.pdf', true),
('Autorisation Photo/Vidéo', 'photo_consent', '/docs/photo_consent.pdf', false);

-- Create functions for QR code generation
CREATE OR REPLACE FUNCTION public.generate_qr_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_num TEXT;
  exists_check INTEGER;
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  LOOP
    invoice_num := 'INV-' || current_month || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM public.invoices WHERE invoice_number = invoice_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  exists_check INTEGER;
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  LOOP
    order_num := 'ORD-' || current_month || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM public.orders WHERE order_number = order_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate QR codes for profiles
CREATE OR REPLACE FUNCTION public.set_profile_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_profile_qr_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_qr_code();

-- Trigger to auto-generate QR codes for children
CREATE OR REPLACE FUNCTION public.set_child_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_child_qr_code
  BEFORE INSERT ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.set_child_qr_code();

-- Trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- Trigger to auto-generate order numbers  
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Function to create signup invoice
CREATE OR REPLACE FUNCTION public.create_signup_invoice(
  p_user_id UUID,
  p_signup_type TEXT,
  p_children_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
  base_fee NUMERIC := 60.00;
  total_amount NUMERIC;
BEGIN
  -- Calculate total based on signup type
  CASE p_signup_type
    WHEN 'self_only' THEN
      total_amount := base_fee;
    WHEN 'self_children' THEN
      total_amount := base_fee * (1 + p_children_count);
    WHEN 'children_only' THEN
      total_amount := base_fee * p_children_count;
    ELSE
      total_amount := base_fee;
  END CASE;

  -- Create invoice
  INSERT INTO public.invoices (user_id, amount_usd, due_date, invoice_type)
  VALUES (p_user_id, total_amount, CURRENT_DATE + INTERVAL '7 days', 'signup')
  RETURNING id INTO invoice_id;

  -- Add invoice items
  IF p_signup_type = 'self_only' OR p_signup_type = 'self_children' THEN
    INSERT INTO public.invoice_items (invoice_id, description, unit_price, total_price)
    VALUES (invoice_id, 'Inscription - Compte principal', base_fee, base_fee);
  END IF;

  IF p_children_count > 0 THEN
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price)
    VALUES (invoice_id, 'Inscription - Enfants', p_children_count, base_fee, base_fee * p_children_count);
  END IF;

  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on all new tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_doc_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;