-- Add preferred_day_of_week to enrollments to track assigned weekday for multi-day courses
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS preferred_day_of_week smallint CHECK (preferred_day_of_week BETWEEN 0 AND 6);

-- Optional index to speed up queries by class and day
CREATE INDEX IF NOT EXISTS idx_enrollments_class_day ON public.enrollments (class_id, preferred_day_of_week);
