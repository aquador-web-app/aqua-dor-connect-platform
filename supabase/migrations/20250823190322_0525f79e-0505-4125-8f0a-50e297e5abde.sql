-- Create referrals table for referral program
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_amount NUMERIC DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create influencer_accounts table
CREATE TABLE public.influencer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC DEFAULT 0.00,
  total_referrals INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pricing_plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_hours NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, description, duration_hours, price) VALUES
('Session Standard', 'Session de natation standard d''1 heure', 1, 60.00),
('Session Longue', 'Session de natation prolongée de 2 heures', 2, 85.00),
('Session Express', 'Session courte de 30 minutes', 0.5, 35.00);

-- Create user_pricing table to assign plans to users
CREATE TABLE public.user_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pricing_plan_id UUID REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pricing_plan_id)
);

-- Update referral_code generation function to use initials + birth year
CREATE OR REPLACE FUNCTION public.generate_referral_code_from_profile(profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  profile_rec RECORD;
  initials TEXT := '';
  birth_year TEXT := '';
  code TEXT;
  exists_check INTEGER;
BEGIN
  -- Get profile data
  SELECT full_name, date_of_birth INTO profile_rec
  FROM profiles WHERE id = profile_id;
  
  IF profile_rec.full_name IS NOT NULL THEN
    -- Extract initials (first letter of each word)
    SELECT string_agg(LEFT(word, 1), '') INTO initials
    FROM unnest(string_to_array(profile_rec.full_name, ' ')) AS word
    WHERE word != '';
    initials := UPPER(initials);
  END IF;
  
  IF profile_rec.date_of_birth IS NOT NULL THEN
    birth_year := RIGHT(EXTRACT(year FROM profile_rec.date_of_birth)::TEXT, 2);
  END IF;
  
  -- Generate code: Initials + Birth Year, fallback to random if missing data
  IF initials != '' AND birth_year != '' THEN
    code := initials || birth_year;
  ELSE
    code := 'AQ' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  END IF;
  
  -- Ensure uniqueness
  LOOP
    SELECT COUNT(*) INTO exists_check FROM profiles WHERE referral_code = code;
    EXIT WHEN exists_check = 0;
    -- If conflict, add random suffix
    code := code || FLOOR(RANDOM() * 10)::TEXT;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Enable RLS on all new tables
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals
FOR SELECT USING (
  referrer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  referred_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for influencer_accounts
CREATE POLICY "Users can view own influencer account" ON public.influencer_accounts
FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all influencer accounts" ON public.influencer_accounts
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for pricing_plans
CREATE POLICY "Everyone can view active pricing plans" ON public.pricing_plans
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage pricing plans" ON public.pricing_plans
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for user_pricing
CREATE POLICY "Users can view their pricing" ON public.user_pricing
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all user pricing" ON public.user_pricing
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_influencer_accounts_updated_at
  BEFORE UPDATE ON public.influencer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();