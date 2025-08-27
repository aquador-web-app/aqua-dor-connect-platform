-- Fix critical security vulnerability: Restrict access to public_children_view
-- This view contains sensitive children's information and should not be publicly accessible

-- Apply Row Level Security to the public_children_view
ALTER TABLE public.public_children_view ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to only admins, co-admins, and instructors with proper permissions
CREATE POLICY "Admins and Co-Admins can view children data" 
ON public.public_children_view 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'co_admin')
);

-- Create policy for instructors to only see children in their assigned courses
CREATE POLICY "Instructors can view their assigned students only" 
ON public.public_children_view 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'instructor') AND 
  id IN (
    SELECT e.student_id
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN instructors i ON i.id = c.instructor_id
    JOIN profiles p ON p.id = i.profile_id
    WHERE p.user_id = auth.uid()
  )
);