-- Add foreign key constraint to profiles table to ensure synchronization with auth.users
-- This will automatically delete profile records when users are deleted from authentication

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;