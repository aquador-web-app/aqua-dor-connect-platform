-- Add admin settings table for system configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin settings
CREATE POLICY "Admins can manage all settings" 
ON public.admin_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Insert default cancellation window setting (24 hours)
INSERT INTO public.admin_settings (setting_key, setting_value, description) 
VALUES ('booking_cancellation_hours', '{"hours": 24}', 'Hours before class that bookings can be cancelled or modified')
ON CONFLICT (setting_key) DO NOTHING;

-- Add invoice generation fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add cancellation/modification tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_booking_invoice()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for booking invoice generation
DROP TRIGGER IF EXISTS booking_invoice_trigger ON public.bookings;
CREATE TRIGGER booking_invoice_trigger
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_invoice();

-- Create updated_at trigger for admin_settings
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();