-- Fix RLS Policies Cleanup
-- This migration fixes RLS policy conflicts and ensures proper security policies

-- ==============================================
-- FIX USER_CLIENT_ACCESS POLICIES
-- ==============================================

-- Drop duplicate/conflicting policies on user_client_access
DROP POLICY IF EXISTS "user_client_access_simple" ON user_client_access;

-- Ensure we have the correct policy for user_client_access
DROP POLICY IF EXISTS "Authenticated users can access all user_client_access" ON user_client_access;
DROP POLICY IF EXISTS "Authenticated users can access user client access" ON user_client_access;

-- Create the correct, single policy for user_client_access
CREATE POLICY "Authenticated users can access user client access" ON user_client_access
    FOR ALL USING (auth.role() = 'authenticated');

-- ==============================================
-- FIX USER_NOTIFICATION_PREFERENCES POLICIES
-- ==============================================

-- Drop conflicting policies on user_notification_preferences
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can access their own preferences" ON user_notification_preferences;

-- Create a single, clear policy for user_notification_preferences (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_notification_preferences' 
        AND policyname = 'Users can manage their own notification preferences'
    ) THEN
        CREATE POLICY "Users can manage their own notification preferences" ON user_notification_preferences
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- ==============================================
-- FIX INVITATIONS TABLE POLICIES
-- ==============================================

-- Add missing policy for invitations table (RLS was enabled but no policies existed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invitations' 
        AND policyname = 'Authenticated users can manage invitations'
    ) THEN
        CREATE POLICY "Authenticated users can manage invitations" ON invitations
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ==============================================
-- RENAME GENERIC POLICIES FOR CLARITY
-- ==============================================

-- Rename generic policy names to be more descriptive (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'users_basic_access'
    ) THEN
        ALTER POLICY "users_basic_access" ON users RENAME TO "Authenticated users can access user profiles";
    END IF;
END $$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'RLS policies cleanup completed successfully';
    RAISE NOTICE 'Fixed user_client_access duplicate policies';
    RAISE NOTICE 'Fixed user_notification_preferences conflicting policies';
    RAISE NOTICE 'Added missing invitations table policy';
    RAISE NOTICE 'Renamed generic policies for clarity';
END $$;
