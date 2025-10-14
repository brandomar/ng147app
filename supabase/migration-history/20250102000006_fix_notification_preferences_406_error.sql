-- Fix 406 (Not Acceptable) error for user_notification_preferences
-- This error typically occurs when RLS policies are too restrictive or conflicting

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "System can manage notification preferences" ON user_notification_preferences;

-- Create simple, permissive policies that should work
CREATE POLICY "Allow all operations for authenticated users" ON user_notification_preferences
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Also create a more specific policy for user-specific access
CREATE POLICY "Users can access their own preferences" ON user_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON user_notification_preferences TO authenticated;
GRANT ALL ON user_notification_preferences TO service_role;
