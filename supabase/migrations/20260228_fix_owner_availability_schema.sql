-- Update owner_availability to match React component expectations
ALTER TABLE public.owner_availability 
DROP COLUMN IF EXISTS available_day,
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT '{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}',
ADD COLUMN IF NOT EXISTS time_slots TEXT[] DEFAULT '{"10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"}';