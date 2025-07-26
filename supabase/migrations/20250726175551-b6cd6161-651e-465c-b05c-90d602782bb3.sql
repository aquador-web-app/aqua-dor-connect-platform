-- Complete RLS policies for all tables using the new role system

-- RLS policies for email_logs
CREATE POLICY "Admins can manage email logs" 
ON public.email_logs 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own email logs" 
ON public.email_logs 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Recreate all RLS policies using the new role system

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

-- Enrollments policies
CREATE POLICY "Admins can manage all enrollments" 
ON public.enrollments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Instructors can view their class enrollments" 
ON public.enrollments 
FOR SELECT 
USING (class_id IN (
  SELECT c.id
  FROM classes c
  JOIN instructors i ON i.id = c.instructor_id
  JOIN profiles p ON p.id = i.profile_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Students can create their own enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (student_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (student_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Gallery items policies
CREATE POLICY "Admins can manage all gallery items" 
ON public.gallery_items 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Everyone can view active gallery items" 
ON public.gallery_items 
FOR SELECT 
USING (is_active = true);

-- Instructors policies
CREATE POLICY "Admins can manage all instructors" 
ON public.instructors 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Everyone can view active instructors" 
ON public.instructors 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Instructors can update their own profile" 
ON public.instructors 
FOR UPDATE 
USING (profile_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Parent child relationships policies
CREATE POLICY "Admins can view all relationships" 
ON public.parent_child_relationships 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Parents can manage their children" 
ON public.parent_child_relationships 
FOR ALL 
USING (parent_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Payments policies - Only full admins can manage payments
CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view payments" 
ON public.payments 
FOR SELECT 
USING (public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

-- Referrals policies - Only full admins can manage referrals
CREATE POLICY "Admins can manage all referrals" 
ON public.referrals 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view referrals" 
ON public.referrals 
FOR SELECT 
USING (public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their referrals" 
ON public.referrals 
FOR SELECT 
USING (
  referrer_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid()
  ) OR referred_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- Reviews policies
CREATE POLICY "Students can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (student_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view reviews for their classes" 
ON public.reviews 
FOR SELECT 
USING (
  student_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid()
  ) OR instructor_id IN (
    SELECT i.id
    FROM instructors i
    JOIN profiles p ON p.id = i.profile_id
    WHERE p.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'co_admin')
);

-- User balances policies - Only full admins can manage balances
CREATE POLICY "Admins can manage all balances" 
ON public.user_balances 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Co-admins can view balances" 
ON public.user_balances 
FOR SELECT 
USING (public.has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Users can view their own balance" 
ON public.user_balances 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM profiles 
  WHERE user_id = auth.uid()
));