-- Fix the view conflict by dropping and recreating
DROP VIEW IF EXISTS public.v_monthly_revenue CASCADE;

-- Create the monthly revenue view with correct structure
CREATE VIEW public.v_monthly_revenue AS
SELECT 
  date_trunc('month', approved_at) as month,
  extract(year from date_trunc('month', approved_at)) as year,
  extract(month from date_trunc('month', approved_at)) as month_num,
  to_char(date_trunc('month', approved_at), 'Mon YYYY') as month_name,
  sum(amount) as total_revenue,
  count(*) as payment_count
FROM public.payments_normalized 
WHERE status = 'approved' AND approved_at IS NOT NULL
GROUP BY date_trunc('month', approved_at)
ORDER BY month DESC;

-- Create atomic enrollment function with proper error handling
CREATE OR REPLACE FUNCTION public.create_enrollment_atomic(
  p_student_id uuid,
  p_class_session_id uuid,
  p_payment_method text DEFAULT 'cash'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seats_available integer;
  v_seats_taken integer;
  v_enrollment_id uuid;
  v_payment_id uuid;
  v_class_price numeric;
  v_class_id uuid;
BEGIN
  -- Get class session details
  SELECT 
    COALESCE(cs.seats_available, cs.max_participants, 10) as seats_available,
    COALESCE(cs.seats_taken, cs.enrolled_students, 0) as seats_taken,
    cs.class_id,
    COALESCE(c.price, 100) as price
  INTO v_seats_available, v_seats_taken, v_class_id, v_class_price
  FROM class_sessions cs
  LEFT JOIN classes c ON c.id = cs.class_id
  WHERE cs.id = p_class_session_id
  FOR UPDATE;
  
  -- Check if session exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  -- Check if seats are available
  IF v_seats_taken >= v_seats_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'No seats available');
  END IF;
  
  -- Create enrollment
  INSERT INTO enrollments (student_id, class_id, status, payment_status)
  VALUES (p_student_id, v_class_id, 'pending', 'pending')
  RETURNING id INTO v_enrollment_id;
  
  -- Create pending payment in normalized table
  INSERT INTO payments_normalized (user_id, enrollment_id, amount, payment_method, status)
  VALUES (p_student_id, v_enrollment_id, v_class_price, p_payment_method, 'pending')
  RETURNING id INTO v_payment_id;
  
  -- Update seat count
  UPDATE class_sessions 
  SET seats_taken = COALESCE(seats_taken, 0) + 1,
      enrolled_students = COALESCE(enrolled_students, 0) + 1
  WHERE id = p_class_session_id;
  
  -- Log event
  INSERT INTO payment_events_audit (payment_id, event_type, metadata)
  VALUES (v_payment_id, 'created', jsonb_build_object('session_id', p_class_session_id));
  
  RETURN jsonb_build_object(
    'success', true, 
    'enrollment_id', v_enrollment_id,
    'payment_id', v_payment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create notification trigger
CREATE OR REPLACE FUNCTION public.notify_payment_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name text;
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Create admin notification
    INSERT INTO admin_notifications_queue (
      notification_type, 
      title, 
      message, 
      data, 
      priority
    ) VALUES (
      'pending_payment',
      'Nouveau paiement en attente',
      format('Paiement de %s HTG de %s en attente d''approbation', 
        NEW.amount, 
        COALESCE(v_user_name, 'Utilisateur inconnu')
      ),
      jsonb_build_object(
        'payment_id', NEW.id, 
        'amount', NEW.amount, 
        'method', NEW.payment_method,
        'user_id', NEW.user_id
      ),
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to payments_normalized table
DROP TRIGGER IF EXISTS payment_pending_notification ON public.payments_normalized;
CREATE TRIGGER payment_pending_notification
  AFTER INSERT OR UPDATE ON public.payments_normalized
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_pending();

-- Add some default subscription plans
INSERT INTO public.subscription_plans (name, description, hours_included, price) VALUES
('Plan 1 Heure', 'Plan d''1 heure de cours de natation', 1, 150.00),
('Plan 2 Heures', 'Plan de 2 heures de cours de natation', 2, 280.00),
('Plan Mensuel', 'Plan mensuel illimité', 999, 500.00)
ON CONFLICT DO NOTHING;