-- Clean up orphaned profile records and add foreign key constraint for synchronization

-- First, delete any profile records that don't have corresponding users in auth.users
DELETE FROM public.profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now add the foreign key constraint with CASCADE DELETE
-- This will ensure automatic deletion of profiles when users are deleted
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;