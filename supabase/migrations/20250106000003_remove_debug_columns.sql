-- Remove debug columns from user_notification_preferences table
-- Since we're using localStorage for debug settings, we don't need these columns

-- Drop the debug columns that were added for database-backed debug settings
ALTER TABLE public.user_notification_preferences 
DROP COLUMN IF EXISTS debug_enabled,
DROP COLUMN IF EXISTS debug_level,
DROP COLUMN IF EXISTS debug_auto_off_minutes,
DROP COLUMN IF EXISTS ui_preferences;
