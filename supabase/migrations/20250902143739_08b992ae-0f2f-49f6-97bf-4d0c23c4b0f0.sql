-- Fix remaining functions without search_path
-- Update all existing functions to have secure search path

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix set_booking_invoice function
CREATE OR REPLACE FUNCTION public.set_booking_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL AND NEW.status = 'confirmed' THEN
    NEW.invoice_number := generate_invoice_number();
    NEW.invoice_generated_at := now();
    
    -- Get class price for total amount
    SELECT c.price INTO NEW.total_amount
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.id = NEW.class_session_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix get_public_instructors function
CREATE OR REPLACE FUNCTION public.get_public_instructors()
RETURNS TABLE(id uuid, full_name text, bio text, specializations text[], certifications text[], experience_years integer, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT i.id,
         p.full_name,
         i.bio,
         i.specializations,
         i.certifications,
         i.experience_years,
         p.avatar_url
  FROM public.instructors i
  JOIN public.profiles p ON p.id = i.profile_id
  WHERE i.is_active = true;
$function$;