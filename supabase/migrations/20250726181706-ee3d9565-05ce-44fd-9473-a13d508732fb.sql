-- Complete all remaining RLS policies

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