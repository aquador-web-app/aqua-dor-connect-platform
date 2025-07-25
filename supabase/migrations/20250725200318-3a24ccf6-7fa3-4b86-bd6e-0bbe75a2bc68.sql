-- First, drop all existing RLS policies that depend on the role column

-- Drop policies from attendance table
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;

-- Drop policies from bookings table  
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- Drop policies from class_sessions table
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.class_sessions;

-- Drop policies from classes table
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;

-- Drop policies from content table
DROP POLICY IF EXISTS "Admins can manage all content" ON public.content;

-- Drop policies from enrollments table
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;

-- Drop policies from gallery_items table
DROP POLICY IF EXISTS "Admins can manage all gallery items" ON public.gallery_items;

-- Drop policies from instructors table
DROP POLICY IF EXISTS "Admins can manage all instructors" ON public.instructors;

-- Drop policies from parent_child_relationships table
DROP POLICY IF EXISTS "Admins can view all relationships" ON public.parent_child_relationships;

-- Drop policies from payments table
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Drop policies from profiles table
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Drop policies from referrals table
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;

-- Drop policies from reviews table
DROP POLICY IF EXISTS "Users can view reviews for their classes" ON public.reviews;

-- Drop policies from user_balances table
DROP POLICY IF EXISTS "Admins can manage all balances" ON public.user_balances;

-- Create user roles enum and table system
CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin', 'instructor', 'student', 'parent');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role::TEXT = role_name
  );
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());