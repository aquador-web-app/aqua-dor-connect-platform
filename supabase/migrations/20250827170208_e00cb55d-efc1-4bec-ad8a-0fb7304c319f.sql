-- Create sample data safely for A'qua D'or Connect Platform demonstration

-- Create sample classes (these should work regardless of existing profiles)
INSERT INTO public.classes (id, name, description, level, price, capacity, duration_minutes, is_active)
VALUES 
  ('850e8400-e29b-41d4-a716-446655440001', 'Natation Débutant', 'Cours de natation pour débutants - Apprenez les bases de la natation dans un environnement sécurisé', 'beginner', 35.00, 8, 60, true),
  ('850e8400-e29b-41d4-a716-446655440002', 'Natation Intermédiaire', 'Perfectionnez votre technique de nage et développez votre endurance', 'intermediate', 40.00, 6, 60, true),
  ('850e8400-e29b-41d4-a716-446655440003', 'Cours Enfants (4-12 ans)', 'Cours spécialement conçu pour les enfants - Ludique et sécurisé', 'beginner', 30.00, 6, 45, true),
  ('850e8400-e29b-41d4-a716-446655440004', 'Cours Privé Adulte', 'Cours particulier personnalisé pour adulte', 'beginner', 60.00, 1, 60, true),
  ('850e8400-e29b-41d4-a716-446655440005', 'Natation Avancée', 'Cours pour nageurs expérimentés souhaitant perfectionner leur technique', 'advanced', 45.00, 4, 75, true)
ON CONFLICT (id) DO NOTHING;

-- Create sample class sessions for the next 2 weeks (without requiring specific instructors)
INSERT INTO public.class_sessions (id, class_id, session_date, max_participants, status, duration_minutes, type)
VALUES 
  -- This week
  ('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '2025-08-28 09:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', '2025-08-28 10:30:00+00', 6, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440003', '2025-08-28 14:00:00+00', 6, 'scheduled', 45, 'class'),
  ('950e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440004', '2025-08-28 16:00:00+00', 1, 'scheduled', 60, 'class'),
  
  ('950e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440001', '2025-08-29 09:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440003', '2025-08-29 14:00:00+00', 6, 'scheduled', 45, 'class'),
  ('950e8400-e29b-41d4-a716-446655440007', '850e8400-e29b-41d4-a716-446655440005', '2025-08-29 17:00:00+00', 4, 'scheduled', 75, 'class'),
  
  ('950e8400-e29b-41d4-a716-446655440008', '850e8400-e29b-41d4-a716-446655440002', '2025-08-30 10:30:00+00', 6, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440009', '850e8400-e29b-41d4-a716-446655440004', '2025-08-30 16:00:00+00', 1, 'scheduled', 60, 'class'),
  
  -- Weekend
  ('950e8400-e29b-41d4-a716-446655440010', '850e8400-e29b-41d4-a716-446655440001', '2025-08-31 10:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440011', '850e8400-e29b-41d4-a716-446655440003', '2025-08-31 11:30:00+00', 6, 'scheduled', 45, 'class'),
  
  -- Next week  
  ('950e8400-e29b-41d4-a716-446655440012', '850e8400-e29b-41d4-a716-446655440001', '2025-09-02 09:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440013', '850e8400-e29b-41d4-a716-446655440002', '2025-09-02 10:30:00+00', 6, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440014', '850e8400-e29b-41d4-a716-446655440003', '2025-09-02 14:00:00+00', 6, 'scheduled', 45, 'class'),
  ('950e8400-e29b-41d4-a716-446655440015', '850e8400-e29b-41d4-a716-446655440005', '2025-09-02 17:00:00+00', 4, 'scheduled', 75, 'class'),
  
  ('950e8400-e29b-41d4-a716-446655440016', '850e8400-e29b-41d4-a716-446655440001', '2025-09-03 09:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440017', '850e8400-e29b-41d4-a716-446655440003', '2025-09-03 14:00:00+00', 6, 'scheduled', 45, 'class'),
  
  ('950e8400-e29b-41d4-a716-446655440018', '850e8400-e29b-41d4-a716-446655440002', '2025-09-04 10:30:00+00', 6, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440019', '850e8400-e29b-41d4-a716-446655440004', '2025-09-04 16:00:00+00', 1, 'scheduled', 60, 'class'),
  
  ('950e8400-e29b-41d4-a716-446655440020', '850e8400-e29b-41d4-a716-446655440001', '2025-09-05 09:00:00+00', 8, 'scheduled', 60, 'class'),
  ('950e8400-e29b-41d4-a716-446655440021', '850e8400-e29b-41d4-a716-446655440003', '2025-09-05 14:00:00+00', 6, 'scheduled', 45, 'class'),
  ('950e8400-e29b-41d4-a716-446655440022', '850e8400-e29b-41d4-a716-446655440005', '2025-09-05 17:00:00+00', 4, 'scheduled', 75, 'class')
ON CONFLICT (id) DO NOTHING;

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