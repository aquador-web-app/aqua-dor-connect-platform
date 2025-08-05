-- First, let's see what constraint exists and fix it
-- Check current constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%level%';

-- Drop the problematic constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'classes_level_check' 
               AND table_name = 'classes') THEN
        ALTER TABLE classes DROP CONSTRAINT classes_level_check;
    END IF;
END $$;

-- Add a proper constraint for valid level values
ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('débutant', 'intermédiaire', 'avancé', 'expert', 'beginner', 'intermediate', 'advanced', 'expert'));

-- Make sure the constraint allows the French level values we're using
COMMENT ON CONSTRAINT classes_level_check ON classes IS 'Allows both French and English level values';