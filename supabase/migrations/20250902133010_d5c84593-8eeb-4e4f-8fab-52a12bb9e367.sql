-- Fix remaining function search path issues
-- Let's update all functions to have proper search paths

CREATE OR REPLACE FUNCTION public.calculate_referral_credits(referrer_profile_id uuid)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';