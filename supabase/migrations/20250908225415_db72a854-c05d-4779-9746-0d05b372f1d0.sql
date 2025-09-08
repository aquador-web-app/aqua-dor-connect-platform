-- A'qua D'or RLS Policies and Security Fixes

-- Documents policies
CREATE POLICY "Everyone can view documents" ON public.documents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage documents" ON public.documents
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Student document acceptances policies
CREATE POLICY "Users can view their own document acceptances" ON public.student_doc_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own document acceptances" ON public.student_doc_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all document acceptances" ON public.student_doc_acceptances
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Children policies
CREATE POLICY "Parents can manage their children" ON public.children
  FOR ALL USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all children" ON public.children
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoices policies
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all invoices" ON public.invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoice items policies
CREATE POLICY "Users can view their invoice items" ON public.invoice_items
  FOR SELECT USING (invoice_id IN (
    SELECT id FROM invoices WHERE user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User balances policies
CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own balance" ON public.user_balances
  FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all balances" ON public.user_balances
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Email templates policies
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Admin config policies  
CREATE POLICY "Admins can manage config" ON public.admin_config
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.generate_qr_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'AQ' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT COUNT(*) INTO exists_check 
    FROM (
      SELECT qr_code FROM public.profiles WHERE qr_code = code
      UNION ALL
      SELECT qr_code FROM public.children WHERE qr_code = code
    ) q;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_profile_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_child_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;