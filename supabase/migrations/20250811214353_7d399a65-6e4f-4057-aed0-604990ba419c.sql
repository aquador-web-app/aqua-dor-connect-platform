-- 1) Ensure RLS is enabled and enforced on children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children FORCE ROW LEVEL SECURITY;

-- 2) Replace existing policies with strict ones
DROP POLICY IF EXISTS "Admins can manage all children" ON public.children;
DROP POLICY IF EXISTS "Parents manage their children" ON public.children;

-- Admins & Co-Admins can read and edit all child records
CREATE POLICY "Admins and Co-Admins manage all children"
ON public.children
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin')
);

-- Parents can only read and edit records where they are the parent
CREATE POLICY "Parents manage own children"
ON public.children
FOR ALL
USING (
  parent_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  parent_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- NOTE: No SELECT policy for instructors on base table to prevent access to sensitive columns.
-- Coaches will access minimal fields via a secure view backed by a SECURITY DEFINER function.

-- 3) Function returning only minimal, safe fields, filtered by role
CREATE OR REPLACE FUNCTION public.get_public_children_for_instructor()
RETURNS TABLE (
  id uuid,
  first_name text,
  swimming_level text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id,
         split_part(c.name, ' ', 1) AS first_name,
         c.swimming_level
  FROM public.children c
  WHERE 
    -- Admins and Co-Admins: see all children (minimal fields only)
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'))
    OR
    -- Instructors: only children enrolled in their assigned courses
    (
      public.has_role(auth.uid(), 'instructor') AND EXISTS (
        SELECT 1
        FROM public.enrollments e
        JOIN public.classes cl ON cl.id = e.class_id
        JOIN public.instructors instr ON instr.id = cl.instructor_id
        JOIN public.profiles ip ON ip.id = instr.profile_id
        WHERE e.student_id = c.id
          AND ip.user_id = auth.uid()
      )
    );
$$;

-- 4) Secure filtered view exposing only minimal fields
CREATE OR REPLACE VIEW public.public_children_view AS
SELECT * FROM public.get_public_children_for_instructor();

-- 5) Lock down access to the view: allow only authenticated users
REVOKE ALL ON public.public_children_view FROM PUBLIC;
GRANT SELECT ON public.public_children_view TO authenticated;