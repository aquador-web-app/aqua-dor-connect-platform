-- Fix function search path security warnings

-- Update generate_secure_password function with proper search path
CREATE OR REPLACE FUNCTION public.generate_secure_password(length INTEGER DEFAULT 12)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  result TEXT := '';
  i INTEGER;
  random_index INTEGER;
BEGIN
  -- Ensure minimum length
  IF length < 8 THEN
    length := 8;
  END IF;
  
  -- Generate secure random password
  FOR i IN 1..length LOOP
    random_index := 1 + (random() * (length(chars) - 1))::INTEGER;
    result := result || substr(chars, random_index, 1);
  END LOOP;
  
  RETURN result;
END;
$$;

-- Update log_security_event function with proper search path
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;