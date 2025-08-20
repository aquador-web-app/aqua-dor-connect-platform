-- Add admin settings for calendar indicator colors
INSERT INTO admin_settings (setting_key, setting_value, description) 
VALUES 
  ('calendar_indicators', '{
    "admin_class": {"color": "#3b82f6", "label": "Cours Admin"},
    "student_booking": {"color": "#ef4444", "label": "Réservation Étudiant"},
    "instructor_session": {"color": "#22c55e", "label": "Session Instructeur"},
    "maintenance": {"color": "#f59e0b", "label": "Maintenance"}
  }', 'Configuration des indicateurs de couleur pour le calendrier')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();