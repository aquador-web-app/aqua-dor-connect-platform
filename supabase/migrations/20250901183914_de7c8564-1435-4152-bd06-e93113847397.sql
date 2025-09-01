-- Drop the insecure public_children_view
DROP VIEW IF EXISTS public.public_children_view;

-- Create a secure children view table with RLS
CREATE TABLE public.public_children_view (
  id UUID PRIMARY KEY,
  first_name TEXT,
  swimming_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.public_children_view ENABLE ROW LEVEL SECURITY;

-- Policy for parents - can only view their own children
CREATE POLICY "Parents can view their own children"
ON public.public_children_view
FOR SELECT
USING (
  public.public_children_view.id IN (
    SELECT pcr.child_id
    FROM public.parent_child_relationships pcr
    JOIN public.profiles p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Policy for instructors - can only view children enrolled in their classes
CREATE POLICY "Instructors can view their assigned children"
ON public.public_children_view  
FOR SELECT
USING (
  has_role(auth.uid(), 'instructor') AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classes cl ON cl.id = e.class_id
    JOIN public.instructors instr ON instr.id = cl.instructor_id
    JOIN public.profiles ip ON ip.id = instr.profile_id
    WHERE e.student_id = public.public_children_view.id
      AND ip.user_id = auth.uid()
  )
);

-- Policy for admins and co-admins - full access
CREATE POLICY "Admins can view all children"
ON public.public_children_view
FOR SELECT  
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin')
);

-- Policy for admins to manage the view data
CREATE POLICY "Admins can manage children view data"
ON public.public_children_view
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin')
);

-- Create a function to populate/sync the view with children data
CREATE OR REPLACE FUNCTION public.sync_children_view()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.public_children_view (id, first_name, swimming_level)
    VALUES (NEW.id, split_part(NEW.name, ' ', 1), NEW.swimming_level)
    ON CONFLICT (id) DO UPDATE SET
      first_name = split_part(NEW.name, ' ', 1),
      swimming_level = NEW.swimming_level,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.public_children_view 
    SET 
      first_name = split_part(NEW.name, ' ', 1),
      swimming_level = NEW.swimming_level,
      updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_children_view WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to keep view in sync
CREATE TRIGGER sync_children_view_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.sync_children_view();

-- Populate the view with existing children data
INSERT INTO public.public_children_view (id, first_name, swimming_level)
SELECT id, split_part(name, ' ', 1) as first_name, swimming_level
FROM public.children
ON CONFLICT (id) DO NOTHING;