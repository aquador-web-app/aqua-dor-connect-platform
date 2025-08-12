-- Prevent role escalation at signup: always assign 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Always assign 'student' role on signup to prevent escalation
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Strengthen server-side password generator using pgcrypto and enforce character classes
CREATE OR REPLACE FUNCTION public.generate_secure_password(length integer DEFAULT 16)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  min_length integer := GREATEST(length, 12);
  upper text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  lower text := 'abcdefghijklmnopqrstuvwxyz';
  digits text := '0123456789';
  symbols text := '!@#$%^&*';
  all_chars text := upper || lower || digits || symbols;
  result text := '';
  i integer;
  rand_byte bytea;
  idx integer;
  ensure_chars text[];
BEGIN
  -- Ensure one char from each category
  ensure_chars := ARRAY[
    substr(upper, 1 + (get_byte(gen_random_bytes(1),0) % length(upper)), 1),
    substr(lower, 1 + (get_byte(gen_random_bytes(1),0) % length(lower)), 1),
    substr(digits, 1 + (get_byte(gen_random_bytes(1),0) % length(digits)), 1),
    substr(symbols, 1 + (get_byte(gen_random_bytes(1),0) % length(symbols)), 1)
  ];

  FOR i IN 1..(min_length - 4) LOOP
    rand_byte := gen_random_bytes(1);
    idx := 1 + (get_byte(rand_byte,0) % length(all_chars));
    result := result || substr(all_chars, idx, 1);
  END LOOP;

  -- Append required chars
  result := result || array_to_string(ensure_chars, '');

  -- Shuffle result characters
  SELECT string_agg(ch, '')
  INTO result
  FROM (
    SELECT ch
    FROM unnest(string_to_array(result, '')) AS ch
    ORDER BY gen_random_uuid()
  ) s;

  RETURN result;
END;
$function$;

-- Tighten visibility of class sessions: only authenticated users and scheduled sessions
DROP POLICY IF EXISTS "Everyone can view class sessions" ON public.class_sessions;

CREATE POLICY "Authenticated users can view scheduled sessions"
ON public.class_sessions
FOR SELECT
USING (auth.role() = 'authenticated' AND status = 'scheduled');