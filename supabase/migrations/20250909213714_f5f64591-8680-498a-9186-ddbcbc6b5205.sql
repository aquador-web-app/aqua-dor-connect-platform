-- Fix the security definer view warning
-- Replace the view with direct table access since we now have proper RLS policies

DROP VIEW IF EXISTS public.public_calendar_sessions;

-- Instead, we'll use the tables directly with our RLS policies
-- Let's add some missing RLS policies for the new tables we created

-- Add RLS policies for session_packages table
ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own packages"
ON public.session_packages
FOR SELECT
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can create their own packages"  
ON public.session_packages
FOR INSERT
WITH CHECK (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all packages"
ON public.session_packages  
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Add RLS policies for session_reservations table
ALTER TABLE public.session_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own reservations"
ON public.session_reservations
FOR SELECT
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can create their own reservations"
ON public.session_reservations
FOR INSERT  
WITH CHECK (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all reservations"
ON public.session_reservations
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Add RLS policies for payment_confirmations table  
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment confirmations"
ON public.payment_confirmations
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Add RLS policies for financial_documents table
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own documents"
ON public.financial_documents
FOR SELECT
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all documents"
ON public.financial_documents
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));