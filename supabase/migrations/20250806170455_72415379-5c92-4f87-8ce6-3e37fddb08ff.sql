-- Create reservations table for custom student bookings
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  reservation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reservations table
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for reservations
CREATE POLICY "Students can view their own reservations"
ON public.reservations
FOR SELECT
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can create their own reservations"
ON public.reservations
FOR INSERT
WITH CHECK (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can update their own reservations"
ON public.reservations
FOR UPDATE
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Students can delete their own reservations"
ON public.reservations
FOR DELETE
USING (student_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all reservations"
ON public.reservations
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Create trigger for automatic timestamp updates on reservations
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update attendance table to add marked_by field for tracking who marked attendance
ALTER TABLE public.attendance
ADD COLUMN marked_by UUID,
ADD COLUMN marked_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add foreign key constraint for marked_by
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_marked_by_fkey
FOREIGN KEY (marked_by) REFERENCES auth.users(id);

-- Update attendance policies to allow parents to mark attendance for their children
CREATE POLICY "Parents can mark attendance for their children"
ON public.attendance
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT pcr.child_id 
    FROM parent_child_relationships pcr
    JOIN profiles p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can update attendance for their children"
ON public.attendance
FOR UPDATE
USING (
  student_id IN (
    SELECT pcr.child_id 
    FROM parent_child_relationships pcr
    JOIN profiles p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view attendance for their children"
ON public.attendance
FOR SELECT
USING (
  student_id IN (
    SELECT pcr.child_id 
    FROM parent_child_relationships pcr
    JOIN profiles p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);