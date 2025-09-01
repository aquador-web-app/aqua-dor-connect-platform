-- Add payment_method and admin_verified fields to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);

-- Add payment status options
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'paid', 'failed', 'cancelled'));

-- Add payment method options
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_method_check 
CHECK (payment_method IN ('cash', 'moncash', 'check', 'card'));