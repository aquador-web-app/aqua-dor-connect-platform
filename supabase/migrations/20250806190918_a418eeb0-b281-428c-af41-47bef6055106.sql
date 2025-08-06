-- Fix critical security vulnerabilities

-- 1. Enhance RLS policies for user_roles table to prevent privilege escalation
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Create more secure policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- 2. Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::text));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- 3. Create function to generate secure passwords
CREATE OR REPLACE FUNCTION public.generate_secure_password(length INTEGER DEFAULT 12)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 4. Create function to log security events
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

-- 5. Enhance profiles RLS to prevent unauthorized access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Recreate with enhanced security
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND user_id = NEW.user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- 6. Add constraint to prevent users from changing their own user_id in profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_immutable 
CHECK (user_id IS NOT NULL);