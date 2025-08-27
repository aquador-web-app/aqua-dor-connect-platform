-- Create sample class sessions using existing instructor and classes

-- First get the existing instructor ID
DO $$
DECLARE
    existing_instructor_id UUID;
    existing_class_ids UUID[];
BEGIN
    -- Get the existing instructor
    SELECT id INTO existing_instructor_id FROM instructors LIMIT 1;
    
    -- Get existing class IDs
    SELECT ARRAY_AGG(id) INTO existing_class_ids FROM classes LIMIT 5;
    
    -- Create sample class sessions for the next 2 weeks using existing instructor and classes
    INSERT INTO public.class_sessions (id, class_id, instructor_id, session_date, max_participants, status, duration_minutes, type)
    VALUES 
      -- This week
      ('950e8400-e29b-41d4-a716-446655440001', existing_class_ids[1], existing_instructor_id, '2025-08-28 09:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440002', existing_class_ids[2], existing_instructor_id, '2025-08-28 10:30:00+00', 6, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440003', existing_class_ids[3], existing_instructor_id, '2025-08-28 14:00:00+00', 6, 'scheduled', 45, 'class'),
      ('950e8400-e29b-41d4-a716-446655440004', existing_class_ids[1], existing_instructor_id, '2025-08-28 16:00:00+00', 4, 'scheduled', 60, 'class'),
      
      ('950e8400-e29b-41d4-a716-446655440005', existing_class_ids[2], existing_instructor_id, '2025-08-29 09:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440006', existing_class_ids[3], existing_instructor_id, '2025-08-29 14:00:00+00', 6, 'scheduled', 45, 'class'),
      ('950e8400-e29b-41d4-a716-446655440007', existing_class_ids[4], existing_instructor_id, '2025-08-29 17:00:00+00', 4, 'scheduled', 75, 'class'),
      
      ('950e8400-e29b-41d4-a716-446655440008', existing_class_ids[1], existing_instructor_id, '2025-08-30 10:30:00+00', 6, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440009', existing_class_ids[2], existing_instructor_id, '2025-08-30 16:00:00+00', 4, 'scheduled', 60, 'class'),
      
      -- Weekend
      ('950e8400-e29b-41d4-a716-446655440010', existing_class_ids[1], existing_instructor_id, '2025-08-31 10:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440011', existing_class_ids[3], existing_instructor_id, '2025-08-31 11:30:00+00', 6, 'scheduled', 45, 'class'),
      
      -- Next week  
      ('950e8400-e29b-41d4-a716-446655440012', existing_class_ids[1], existing_instructor_id, '2025-09-02 09:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440013', existing_class_ids[2], existing_instructor_id, '2025-09-02 10:30:00+00', 6, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440014', existing_class_ids[3], existing_instructor_id, '2025-09-02 14:00:00+00', 6, 'scheduled', 45, 'class'),
      ('950e8400-e29b-41d4-a716-446655440015', existing_class_ids[4], existing_instructor_id, '2025-09-02 17:00:00+00', 4, 'scheduled', 75, 'class'),
      
      ('950e8400-e29b-41d4-a716-446655440016', existing_class_ids[1], existing_instructor_id, '2025-09-03 09:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440017', existing_class_ids[3], existing_instructor_id, '2025-09-03 14:00:00+00', 6, 'scheduled', 45, 'class'),
      
      ('950e8400-e29b-41d4-a716-446655440018', existing_class_ids[2], existing_instructor_id, '2025-09-04 10:30:00+00', 6, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440019', existing_class_ids[1], existing_instructor_id, '2025-09-04 16:00:00+00', 4, 'scheduled', 60, 'class'),
      
      ('950e8400-e29b-41d4-a716-446655440020', existing_class_ids[1], existing_instructor_id, '2025-09-05 09:00:00+00', 8, 'scheduled', 60, 'class'),
      ('950e8400-e29b-41d4-a716-446655440021', existing_class_ids[3], existing_instructor_id, '2025-09-05 14:00:00+00', 6, 'scheduled', 45, 'class'),
      ('950e8400-e29b-41d4-a716-446655440022', existing_class_ids[4], existing_instructor_id, '2025-09-05 17:00:00+00', 4, 'scheduled', 75, 'class')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Create some sample content for dynamic display
INSERT INTO public.content (id, type, title, content, media_url, is_active, display_order)
VALUES 
  ('a50e8400-e29b-41d4-a716-446655440001', 'announcement', 'Nouveau programme été 2025', 'Découvrez notre nouveau programme d''été avec des cours intensifs et des activités spéciales pour toute la famille!', null, true, 1),
  ('a50e8400-e29b-41d4-a716-446655440002', 'featured', 'Cours de sauvetage disponibles', 'Apprenez les techniques de sauvetage aquatique avec nos instructeurs certifiés. Formation complète et certification officielle.', null, true, 2),
  ('a50e8400-e29b-41d4-a716-446655440003', 'banner', 'Promo rentrée: -20% sur tous les forfaits', 'Profitez de notre promotion spéciale rentrée! Réduction de 20% sur tous nos forfaits de cours. Offre limitée.', null, true, 3)
ON CONFLICT (id) DO NOTHING;

-- Insert default calendar color indicators setting
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'calendar_indicators',
  '{
    "admin_classes": {"color": "#1b1464", "label": "Cours administrateur"},
    "student_reservations": {"color": "#dc2626", "label": "Réservations étudiantes"}, 
    "special_events": {"color": "#f7931e", "label": "Événements spéciaux"},
    "instructor_sessions": {"color": "#29abe2", "label": "Sessions instructeur"}
  }',
  'Indicateurs de couleur pour le calendrier'
)
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();