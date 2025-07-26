-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Instructors can manage attendance for their classes" ON public.attendance;
DROP POLICY IF EXISTS "Students can view their attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Everyone can view class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Instructors can manage their sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Everyone can view active classes" ON public.classes;
DROP POLICY IF EXISTS "Everyone can view active content" ON public.content;
DROP POLICY IF EXISTS "Instructors can view their class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can create their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Everyone can view active gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Everyone can view active instructors" ON public.instructors;
DROP POLICY IF EXISTS "Instructors can update their own profile" ON public.instructors;
DROP POLICY IF EXISTS "Parents can manage their children" ON public.parent_child_relationships;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
DROP POLICY IF EXISTS "Students can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;

-- Now create the policies for the new role system

-- Profiles policies  
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

-- Attendance policies
CREATE POLICY "Admins can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Instructors can manage attendance for their classes" 
ON public.attendance 
FOR ALL 
USING (class_session_id IN (
  SELECT cs.id
  FROM class_sessions cs
  JOIN instructors i ON i.id = cs.instructor_id
  JOIN profiles p ON p.id = i.profile_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Students can view their attendance" 
ON public.attendance 
FOR SELECT 
USING (student_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Bookings policies
CREATE POLICY "Admins can manage all bookings" 
ON public.bookings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Class sessions policies
CREATE POLICY "Admins can manage all sessions" 
ON public.class_sessions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Everyone can view class sessions" 
ON public.class_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Instructors can manage their sessions" 
ON public.class_sessions 
FOR ALL 
USING (instructor_id IN (
  SELECT i.id
  FROM instructors i
  JOIN profiles p ON p.id = i.profile_id
  WHERE p.user_id = auth.uid()
));

-- Classes policies
CREATE POLICY "Admins can manage all classes" 
ON public.classes 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Everyone can view active classes" 
ON public.classes 
FOR SELECT 
USING (is_active = true);

-- Content policies
CREATE POLICY "Admins can manage all content" 
ON public.content 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Everyone can view active content" 
ON public.content 
FOR SELECT 
USING (is_active = true);