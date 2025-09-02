-- Fix security warnings by updating functions with proper search paths

-- Update the create_enrollment_from_booking function with secure search path
CREATE OR REPLACE FUNCTION public.create_enrollment_from_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is confirmed, create an enrollment with the correct class_id
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    INSERT INTO public.enrollments (student_id, class_id, enrollment_date, status, payment_status)
    SELECT 
      NEW.user_id,
      cs.class_id,
      NEW.created_at,
      'active',
      'pending'
    FROM public.class_sessions cs
    WHERE cs.id = NEW.class_session_id
    ON CONFLICT DO NOTHING; -- Prevent duplicate enrollments
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update other functions that might have search path issues
CREATE OR REPLACE FUNCTION public.update_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- When referral status changes to 'completed', update commission
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.commission_amount = 10.00; -- USD 10.00 per successful referral
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_influencer_balance()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';