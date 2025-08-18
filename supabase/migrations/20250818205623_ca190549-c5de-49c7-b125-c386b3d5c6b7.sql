-- Fix search path for existing functions
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invoice_num TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    invoice_num := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM bookings WHERE invoice_number = invoice_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN invoice_num;
END;
$$;

-- Fix search path for trigger function
CREATE OR REPLACE FUNCTION set_booking_invoice()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;