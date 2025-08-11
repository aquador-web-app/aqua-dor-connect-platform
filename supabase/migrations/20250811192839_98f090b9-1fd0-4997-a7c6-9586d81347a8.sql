-- Restrict public read access on instructors table and expose safe RPC

-- 1) Drop overly permissive public SELECT policy on instructors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'instructors' 
      AND policyname = 'Everyone can view active instructors'
  ) THEN
    EXECUTE 'DROP POLICY "Everyone can view active instructors" ON public.instructors';
  END IF;
END $$;

-- 2) Create a SECURITY DEFINER function to expose only safe, public instructor data
CREATE OR REPLACE FUNCTION public.get_public_instructors()
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  specializations text[],
  certifications text[],
  experience_years integer,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT i.id,
         p.full_name,
         i.bio,
         i.specializations,
         i.certifications,
         i.experience_years,
         p.avatar_url
  FROM public.instructors i
  JOIN public.profiles p ON p.id = i.profile_id
  WHERE i.is_active = true;
$$;

-- 3) Allow anonymous and authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.get_public_instructors() TO anon, authenticated;