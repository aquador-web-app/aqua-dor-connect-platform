-- Create instructor records for existing users with instructor role
INSERT INTO instructors (profile_id, experience_years, hourly_rate, is_active, bio, specializations, certifications)
SELECT 
  p.id,
  0,
  50.00,
  true,
  'Instructeur de natation expérimenté',
  ARRAY['Natation', 'Aquagym'],
  ARRAY['Certification de Sauvetage Aquatique']
FROM profiles p
JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'instructor'
AND p.id NOT IN (SELECT profile_id FROM instructors WHERE profile_id IS NOT NULL);