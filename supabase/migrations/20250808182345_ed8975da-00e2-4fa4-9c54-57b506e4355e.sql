-- Add duration and type to class_sessions for class/event creation from calendar
DO $$ BEGIN
  ALTER TABLE public.class_sessions
    ADD COLUMN IF NOT EXISTS duration_minutes integer;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.class_sessions
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'class';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create children table for parent-managed child details
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  name text NOT NULL,
  age integer,
  swimming_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_children_parent_profile FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and co_admins manage all children
DROP POLICY IF EXISTS "Admins can manage all children" ON public.children;
CREATE POLICY "Admins can manage all children"
ON public.children
AS PERMISSIVE
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS: Parents manage their own children
DROP POLICY IF EXISTS "Parents manage their children" ON public.children;
CREATE POLICY "Parents manage their children"
ON public.children
AS PERMISSIVE
FOR ALL
USING (
  parent_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  parent_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_children_updated_at ON public.children;
CREATE TRIGGER trg_children_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
