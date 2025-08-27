-- Create referral system tables for A'qua D'or Connect Platform

-- Create influencer_accounts table for influencer-specific data
CREATE TABLE IF NOT EXISTS public.influencer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- $10 per referral
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cashout_requests table for withdrawal management
CREATE TABLE IF NOT EXISTS public.cashout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
    payment_method TEXT,
    payment_details JSONB,
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_credits table for tracking bill payer credits
CREATE TABLE IF NOT EXISTS public.referral_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE,
    credit_amount NUMERIC(10,2) NOT NULL,
    credit_type TEXT NOT NULL CHECK (credit_type IN ('discount_50', 'discount_100', 'cash_credit')),
    used_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing_plans table for custom pricing per student
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_pricing_assignments table for custom pricing per student
CREATE TABLE IF NOT EXISTS public.student_pricing_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pricing_plan_id UUID REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, pricing_plan_id)
);

-- Enable RLS on all tables
ALTER TABLE public.influencer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_pricing_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for influencer_accounts
CREATE POLICY "Users can view their own influencer account" ON public.influencer_accounts
    FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own influencer account" ON public.influencer_accounts  
    FOR UPDATE USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all influencer accounts" ON public.influencer_accounts
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for cashout_requests
CREATE POLICY "Users can view their own cashout requests" ON public.cashout_requests
    FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own cashout requests" ON public.cashout_requests
    FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all cashout requests" ON public.cashout_requests
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for referral_credits
CREATE POLICY "Users can view their own referral credits" ON public.referral_credits
    FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all referral credits" ON public.referral_credits
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for pricing_plans
CREATE POLICY "Everyone can view active pricing plans" ON public.pricing_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all pricing plans" ON public.pricing_plans
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for student_pricing_assignments
CREATE POLICY "Students can view their own pricing assignments" ON public.student_pricing_assignments
    FOR SELECT USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all pricing assignments" ON public.student_pricing_assignments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_influencer_accounts_updated_at BEFORE UPDATE ON public.influencer_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate referral codes based on user data
CREATE OR REPLACE FUNCTION public.generate_user_referral_code(user_full_name TEXT, user_dob DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    initials TEXT;
    birth_year_digits TEXT;
    final_code TEXT;
    exists_check INTEGER;
BEGIN
    -- Extract initials from full name
    SELECT STRING_AGG(UPPER(SUBSTRING(name_part, 1, 1)), '')
    INTO initials
    FROM UNNEST(STRING_TO_ARRAY(TRIM(user_full_name), ' ')) AS name_part;
    
    -- Take first 2 characters if more than 2 initials
    IF LENGTH(initials) > 2 THEN
        initials := SUBSTRING(initials, 1, 2);
    END IF;
    
    -- Get last 2 digits of birth year
    birth_year_digits := RIGHT(EXTRACT(YEAR FROM user_dob)::TEXT, 2);
    
    -- Combine initials and birth year digits
    final_code := initials || birth_year_digits;
    
    -- Check if code already exists, if so add a random number
    SELECT COUNT(*) INTO exists_check FROM public.profiles WHERE referral_code = final_code;
    
    IF exists_check > 0 THEN
        final_code := final_code || FLOOR(RANDOM() * 99 + 1)::TEXT;
    END IF;
    
    RETURN final_code;
END;
$$;

-- Create function to calculate referral credits
CREATE OR REPLACE FUNCTION public.calculate_referral_credits(referrer_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_referrals INTEGER;
    credit_amount NUMERIC(10,2) := 0;
    credit_type TEXT;
BEGIN
    -- Count successful referrals
    SELECT COUNT(*) INTO total_referrals
    FROM public.referrals 
    WHERE referrer_id = referrer_profile_id AND status = 'completed';
    
    -- Determine credit based on referral count
    IF total_referrals = 5 THEN
        credit_amount := 50; -- 50% discount equivalent
        credit_type := 'discount_50';
    ELSIF total_referrals = 10 THEN
        credit_amount := 100; -- 100% discount equivalent  
        credit_type := 'discount_100';
    ELSIF total_referrals > 10 AND total_referrals % 1 = 0 THEN -- Every referral after 10
        credit_amount := 10;
        credit_type := 'cash_credit';
    END IF;
    
    -- Insert credit if applicable
    IF credit_amount > 0 THEN
        INSERT INTO public.referral_credits (profile_id, credit_amount, credit_type)
        VALUES (referrer_profile_id, credit_amount, credit_type);
    END IF;
END;
$$;

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, description, duration_minutes, price, created_by) 
VALUES 
    ('Cours Individuel Standard', 'Cours particulier de natation avec instructeur certifié', 60, 60.00, (SELECT id FROM public.profiles WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LIMIT 1)),
    ('Cours de Groupe', 'Cours en groupe (max 8 personnes)', 60, 35.00, (SELECT id FROM public.profiles WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LIMIT 1)),
    ('Cours Enfant', 'Cours spécialisé pour enfants (4-16 ans)', 45, 30.00, (SELECT id FROM public.profiles WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LIMIT 1)),
    ('Forfait 2h Individuel', 'Forfait de 2 cours individuels', 120, 85.00, (SELECT id FROM public.profiles WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') LIMIT 1))
ON CONFLICT DO NOTHING;