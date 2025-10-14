-- Fix RLS policies for user_notification_preferences to handle upsert operations
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON user_notification_preferences;

-- Create new policies that allow both insert and update
CREATE POLICY "Users can manage their own notification preferences" ON user_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Also allow system to insert/update for any user (for service operations)
CREATE POLICY "System can manage notification preferences" ON user_notification_preferences
    FOR ALL WITH CHECK (true);
