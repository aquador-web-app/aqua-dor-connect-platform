-- First, add the admin_settings table for calendar indicators if it doesn't exist with proper configuration
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'calendar_indicators',
  '{
    "admin_class": {
      "color": "#3b82f6",
      "label": "Cours Admin"
    },
    "student_booking": {
      "color": "#ef4444",
      "label": "Réservation Étudiant"
    },
    "instructor_schedule": {
      "color": "#22c55e",
      "label": "Planning Instructeur"
    }
  }'::jsonb,
  'Configuration des indicateurs visuels du calendrier'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Create the bulletin system tables
CREATE TABLE IF NOT EXISTS public.bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  swimming_level TEXT,
  technical_skills JSONB DEFAULT '{}',
  behavior_notes TEXT,
  progress_notes TEXT,
  recommendations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'sent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ
);

-- Create technical sheet table
CREATE TABLE IF NOT EXISTS public.technical_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  skills JSONB DEFAULT '{}',
  techniques JSONB DEFAULT '{}',
  evaluations JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'sent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ
);

-- Enable RLS on new tables
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bulletins
CREATE POLICY "Instructors can manage bulletins for their students" ON public.bulletins
FOR ALL USING (
  instructor_id IN (
    SELECT i.id FROM instructors i
    JOIN profiles p ON p.id = i.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all bulletins" ON public.bulletins
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Students can view their own bulletins" ON public.bulletins
FOR SELECT USING (
  student_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Create RLS policies for technical sheets
CREATE POLICY "Instructors can manage technical sheets for their students" ON public.technical_sheets
FOR ALL USING (
  instructor_id IN (
    SELECT i.id FROM instructors i
    JOIN profiles p ON p.id = i.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all technical sheets" ON public.technical_sheets
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Students can view their own technical sheets" ON public.technical_sheets
FOR SELECT USING (
  student_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_bulletins_updated_at
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_sheets_updated_at
  BEFORE UPDATE ON public.technical_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the invoice number generation to include month
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invoice_num TEXT;
  exists_check INTEGER;
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  LOOP
    invoice_num := 'INV-' || current_month || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM bookings WHERE invoice_number = invoice_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN invoice_num;
END;
$function$;

-- Update payment status handling - fix the payment logic
-- Add a payment verification status
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false;

-- Create subscription plans table for payment system
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  duration_months INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for subscription plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for subscription plans
CREATE POLICY "Everyone can view active subscription plans" ON public.subscription_plans
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, currency, duration_months, features) VALUES
('Cours Découverte', 'Cours d''essai pour nouveaux étudiants', 25.00, 'USD', 1, '["1 cours d''essai", "Évaluation de niveau", "Conseils personnalisés"]'),
('Forfait Mensuel', 'Accès illimité aux cours pour un mois', 120.00, 'USD', 1, '["Cours illimités", "Suivi personnalisé", "Accès aux installations"]'),
('Forfait Trimestriel', 'Accès illimité aux cours pour trois mois', 320.00, 'USD', 3, '["Cours illimités", "Suivi personnalisé", "Accès aux installations", "10% de réduction"]'),
('Forfait Annuel', 'Accès illimité aux cours pour un an', 1200.00, 'USD', 12, '["Cours illimités", "Suivi personnalisé", "Accès aux installations", "20% de réduction", "Cours particuliers inclus"]');