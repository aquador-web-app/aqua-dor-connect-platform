-- Fix security warnings by setting proper search paths for functions

-- Fix function search path for generate_user_referral_code
CREATE OR REPLACE FUNCTION public.generate_user_referral_code(user_full_name TEXT, user_dob DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix function search path for calculate_referral_credits
CREATE OR REPLACE FUNCTION public.calculate_referral_credits(referrer_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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