-- Fix any missing RLS policies and search path issues

-- Add public read policy for class_sessions so visitors can see available sessions
CREATE POLICY "Public can view scheduled sessions" ON public.class_sessions
  FOR SELECT USING (status = 'scheduled');

-- Ensure proper search paths for existing functions that might be missing them
CREATE OR REPLACE FUNCTION public.set_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_number IS NULL THEN
    NEW.document_number := public.generate_document_number(NEW.document_type);
  END IF;
  RETURN NEW;
END;
$$;

-- Create admin function to confirm reservations and generate receipts
CREATE OR REPLACE FUNCTION public.confirm_reservation_payment(
  p_reservation_id UUID,
  p_admin_profile_id UUID,
  p_confirmation_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_package RECORD;
  v_confirmation_id UUID;
  v_receipt_id UUID;
BEGIN
  -- Get reservation details
  SELECT sr.*, sp.price_per_session, sp.student_id as package_student_id
  INTO v_reservation
  FROM public.session_reservations sr
  JOIN public.session_packages sp ON sp.id = sr.package_id
  WHERE sr.id = p_reservation_id AND sr.status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or already confirmed');
  END IF;
  
  -- Update reservation status
  UPDATE public.session_reservations
  SET status = 'confirmed',
      admin_confirmed_by = p_admin_profile_id,
      admin_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;
  
  -- Update package used sessions
  UPDATE public.session_packages
  SET used_sessions = used_sessions + 1,
      updated_at = now()
  WHERE id = v_reservation.package_id;
  
  -- Create payment confirmation record
  INSERT INTO public.payment_confirmations (
    reservation_id, confirmed_by, confirmation_type, amount_confirmed, confirmation_notes
  ) VALUES (
    p_reservation_id, p_admin_profile_id, 'session_reservation', 
    v_reservation.price_per_session, p_confirmation_notes
  ) RETURNING id INTO v_confirmation_id;
  
  -- Generate receipt
  INSERT INTO public.financial_documents (
    document_type, student_id, package_id, reservation_id, amount, status, created_by
  ) VALUES (
    'receipt', v_reservation.package_student_id, v_reservation.package_id, 
    p_reservation_id, v_reservation.price_per_session, 'sent', p_admin_profile_id
  ) RETURNING id INTO v_receipt_id;
  
  -- Update payment status if exists
  UPDATE public.payments
  SET status = 'approved', 
      approved_by = p_admin_profile_id,
      approved_at = now(),
      admin_verified = true
  WHERE user_id = v_reservation.package_student_id 
    AND amount = v_reservation.price_per_session
    AND status = 'pending';
  
  RETURN jsonb_build_object(
    'success', true,
    'confirmation_id', v_confirmation_id,
    'receipt_id', v_receipt_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to purchase session packages
CREATE OR REPLACE FUNCTION public.purchase_session_package(
  p_student_id UUID,
  p_package_type TEXT,
  p_total_sessions INTEGER,
  p_price_per_session NUMERIC,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package_id UUID;
  v_payment_id UUID;
  v_invoice_id UUID;
  v_total_amount NUMERIC;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_total_amount := p_total_sessions * p_price_per_session;
  
  -- Set expiration based on package type
  CASE p_package_type
    WHEN 'single' THEN v_expires_at := NULL;
    WHEN 'monthly' THEN v_expires_at := now() + INTERVAL '30 days';
    WHEN 'unlimited' THEN v_expires_at := now() + INTERVAL '365 days';
    ELSE v_expires_at := now() + INTERVAL '90 days';
  END CASE;
  
  -- Create package
  INSERT INTO public.session_packages (
    student_id, package_type, total_sessions, price_per_session, 
    total_paid, expires_at, status
  ) VALUES (
    p_student_id, p_package_type, p_total_sessions, p_price_per_session,
    v_total_amount, v_expires_at, 'active'
  ) RETURNING id INTO v_package_id;
  
  -- Create payment record
  INSERT INTO public.payments (
    user_id, amount, currency, status, payment_method
  ) VALUES (
    p_student_id, v_total_amount, 'USD', 'pending', p_payment_method
  ) RETURNING id INTO v_payment_id;
  
  -- Create pending invoice
  INSERT INTO public.financial_documents (
    document_type, student_id, package_id, amount, status, created_by
  ) VALUES (
    'pending_invoice', p_student_id, v_package_id, v_total_amount, 'draft', p_student_id
  ) RETURNING id INTO v_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'package_id', v_package_id,
    'payment_id', v_payment_id,
    'invoice_id', v_invoice_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;