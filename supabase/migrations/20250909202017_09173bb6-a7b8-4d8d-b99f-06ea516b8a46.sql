-- Create session packages table for students to purchase
CREATE TABLE public.session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL, -- 'single', 'monthly', 'unlimited'
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  price_per_session NUMERIC(10,2) NOT NULL,
  total_paid NUMERIC(10,2) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session reservations table (replaces direct enrollment)
CREATE TABLE public.session_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.session_packages(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'attended', 'cancelled'
  reservation_notes TEXT,
  admin_confirmed_by UUID REFERENCES public.profiles(id),
  admin_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_session_id, student_id)
);

-- Create payment confirmations table for admin workflow
CREATE TABLE public.payment_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.session_packages(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.session_reservations(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL REFERENCES public.profiles(id),
  confirmation_type TEXT NOT NULL, -- 'package_purchase', 'session_reservation'
  amount_confirmed NUMERIC(10,2) NOT NULL,
  confirmation_notes TEXT,
  invoice_number TEXT,
  receipt_generated BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice/receipt tracking
CREATE TABLE public.financial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- 'invoice', 'receipt', 'pending_invoice'
  document_number TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  package_id UUID REFERENCES public.session_packages(id),
  reservation_id UUID REFERENCES public.session_reservations(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'cancelled'
  pdf_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_packages
CREATE POLICY "Students can view their own packages" ON public.session_packages
  FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own packages" ON public.session_packages
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all packages" ON public.session_packages
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for session_reservations
CREATE POLICY "Students can view their own reservations" ON public.session_reservations
  FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own reservations" ON public.session_reservations
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update their own reservations" ON public.session_reservations
  FOR UPDATE USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reservations" ON public.session_reservations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for payment_confirmations (admin only)
CREATE POLICY "Admins can manage payment confirmations" ON public.payment_confirmations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for financial_documents
CREATE POLICY "Students can view their own documents" ON public.financial_documents
  FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all documents" ON public.financial_documents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Create indexes for performance
CREATE INDEX idx_session_packages_student_id ON public.session_packages(student_id);
CREATE INDEX idx_session_packages_status ON public.session_packages(status);
CREATE INDEX idx_session_reservations_student_id ON public.session_reservations(student_id);
CREATE INDEX idx_session_reservations_session_id ON public.session_reservations(class_session_id);
CREATE INDEX idx_session_reservations_status ON public.session_reservations(status);
CREATE INDEX idx_payment_confirmations_package_id ON public.payment_confirmations(package_id);
CREATE INDEX idx_financial_documents_student_id ON public.financial_documents(student_id);
CREATE INDEX idx_financial_documents_type ON public.financial_documents(document_type);

-- Create function to update session counts when reservations are confirmed
CREATE OR REPLACE FUNCTION public.update_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update enrolled_students count on class_sessions
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.class_sessions 
    SET enrolled_students = (
      SELECT COUNT(*) 
      FROM public.session_reservations 
      WHERE class_session_id = NEW.class_session_id 
      AND status = 'confirmed'
    )
    WHERE id = NEW.class_session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.class_sessions 
    SET enrolled_students = (
      SELECT COUNT(*) 
      FROM public.session_reservations 
      WHERE class_session_id = OLD.class_session_id 
      AND status = 'confirmed'
    )
    WHERE id = OLD.class_session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for session count updates
CREATE TRIGGER update_session_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.session_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_session_counts();

-- Create function to generate financial document numbers
CREATE OR REPLACE FUNCTION public.generate_document_number(doc_type TEXT)
RETURNS TEXT AS $$
DECLARE
  doc_num TEXT;
  exists_check INTEGER;
  current_month TEXT;
  prefix TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  CASE doc_type
    WHEN 'invoice' THEN prefix := 'INV';
    WHEN 'receipt' THEN prefix := 'REC';
    WHEN 'pending_invoice' THEN prefix := 'PINV';
    ELSE prefix := 'DOC';
  END CASE;
  
  LOOP
    doc_num := prefix || '-' || current_month || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM financial_documents WHERE document_number = doc_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN doc_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to automatically set document numbers
CREATE OR REPLACE FUNCTION public.set_document_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_number IS NULL THEN
    NEW.document_number := public.generate_document_number(NEW.document_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic document numbering
CREATE TRIGGER set_document_number_trigger
  BEFORE INSERT ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_document_number();

-- Create function for package-based session reservation
CREATE OR REPLACE FUNCTION public.reserve_session_from_package(
  p_package_id UUID,
  p_class_session_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_package RECORD;
  v_session RECORD;
  v_reservation_id UUID;
  v_payment_id UUID;
BEGIN
  -- Get package details with lock
  SELECT * INTO v_package
  FROM public.session_packages
  WHERE id = p_package_id AND status = 'active'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
  END IF;
  
  -- Check if package has available sessions
  IF v_package.used_sessions >= v_package.total_sessions THEN
    RETURN jsonb_build_object('success', false, 'error', 'No sessions remaining in package');
  END IF;
  
  -- Get session details
  SELECT * INTO v_session
  FROM public.class_sessions cs
  WHERE cs.id = p_class_session_id AND cs.status = 'scheduled';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found or not available');
  END IF;
  
  -- Check if session has capacity
  IF COALESCE(v_session.enrolled_students, 0) >= COALESCE(v_session.max_participants, 10) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session is full');
  END IF;
  
  -- Create reservation
  INSERT INTO public.session_reservations (
    package_id, class_session_id, student_id, status, reservation_notes
  ) VALUES (
    p_package_id, p_class_session_id, v_package.student_id, 'pending', p_notes
  ) RETURNING id INTO v_reservation_id;
  
  -- Create payment record for this reservation
  INSERT INTO public.payments (
    user_id, amount, currency, status, payment_method
  ) VALUES (
    v_package.student_id, v_package.price_per_session, 'USD', 'pending', 'package'
  ) RETURNING id INTO v_payment_id;
  
  -- Create pending invoice
  INSERT INTO public.financial_documents (
    document_type, student_id, package_id, reservation_id, amount, status, created_by
  ) VALUES (
    'pending_invoice', v_package.student_id, p_package_id, v_reservation_id, 
    v_package.price_per_session, 'draft', v_package.student_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'payment_id', v_payment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;