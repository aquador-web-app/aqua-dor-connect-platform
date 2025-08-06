-- Add missing columns to support comprehensive user management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create enrollments table for course assignments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  payment_status TEXT DEFAULT 'pending',
  progress_level INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for enrollments
CREATE POLICY "Admins can manage all enrollments" 
ON public.enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'co_admin'::text));

CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create attendance table for session attendance tracking
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_session_id)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance
CREATE POLICY "Admins can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'co_admin'::text));

CREATE POLICY "Students can view their attendance" 
ON public.attendance 
FOR SELECT 
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can view attendance for their children" 
ON public.attendance 
FOR SELECT 
USING (student_id IN (
  SELECT pcr.child_id 
  FROM parent_child_relationships pcr 
  JOIN profiles p ON p.id = pcr.parent_id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Parents can mark attendance for their children" 
ON public.attendance 
FOR INSERT 
WITH CHECK (student_id IN (
  SELECT pcr.child_id 
  FROM parent_child_relationships pcr 
  JOIN profiles p ON p.id = pcr.parent_id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Parents can update attendance for their children" 
ON public.attendance 
FOR UPDATE 
USING (student_id IN (
  SELECT pcr.child_id 
  FROM parent_child_relationships pcr 
  JOIN profiles p ON p.id = pcr.parent_id 
  WHERE p.user_id = auth.uid()
));

-- Create reservations table for pool rental/custom sessions
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reservation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for reservations
CREATE POLICY "Admins can manage all reservations" 
ON public.reservations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'co_admin'::text));

CREATE POLICY "Students can view their own reservations" 
ON public.reservations 
FOR SELECT 
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update their own reservations" 
ON public.reservations 
FOR UPDATE 
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can delete their own reservations" 
ON public.reservations 
FOR DELETE 
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add instructor_id to class_sessions if not exists
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES instructors(id);

-- Add updated_at trigger for new tables
CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();