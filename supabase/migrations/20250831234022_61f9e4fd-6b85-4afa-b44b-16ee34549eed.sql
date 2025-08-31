-- Create influencer pricing assignments table to track USD 0.00 classes
CREATE TABLE IF NOT EXISTS public.influencer_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    discounted_price NUMERIC(10,2) DEFAULT 0.00,
    original_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(profile_id, class_id)
);

-- Enable RLS on influencer_pricing
ALTER TABLE public.influencer_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for influencer_pricing
CREATE POLICY "Admins can manage influencer pricing" ON public.influencer_pricing
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Influencers can view their pricing" ON public.influencer_pricing
FOR SELECT USING (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Update referrals table to track commission automatically
CREATE OR REPLACE FUNCTION update_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- When referral status changes to 'completed', update commission
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.commission_amount = 10.00; -- USD 10.00 per successful referral
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic commission calculation
DROP TRIGGER IF EXISTS trigger_update_referral_commission ON public.referrals;
CREATE TRIGGER trigger_update_referral_commission
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION update_referral_commission();

-- Add balance tracking updates
CREATE OR REPLACE FUNCTION update_influencer_balance()
RETURNS TRIGGER AS $$
DECLARE
    influencer_profile_id UUID;
BEGIN
    -- Get the referrer's profile ID
    SELECT referrer_id INTO influencer_profile_id FROM public.referrals WHERE id = NEW.id;
    
    IF influencer_profile_id IS NOT NULL THEN
        -- Update or create balance record
        INSERT INTO public.user_balances (user_id, balance)
        VALUES (influencer_profile_id, NEW.commission_amount)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            balance = user_balances.balance + NEW.commission_amount,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update influencer balance when commission is earned
DROP TRIGGER IF EXISTS trigger_update_influencer_balance ON public.referrals;
CREATE TRIGGER trigger_update_influencer_balance
    AFTER UPDATE ON public.referrals
    FOR EACH ROW 
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_influencer_balance();