-- Fix RLS policies for payments table to allow users to create their own payments
CREATE POLICY "Users can create their own payments" ON public.payments
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  ));

-- Also allow users to update their own payments (for status changes)
CREATE POLICY "Users can update their own payments" ON public.payments
  FOR UPDATE
  USING (user_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  ));