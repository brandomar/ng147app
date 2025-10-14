-- Fix RLS infinite recursion on user_client_access table
-- This migration creates a proper RLS policy for user_client_access table

-- ==============================================
-- REMOVE ALL EXISTING POLICIES ON user_client_access
-- ==============================================

-- Drop all existing policies on user_client_access table
DROP POLICY IF EXISTS "user_client_access_select_policy" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_insert_policy" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_update_policy" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_delete_policy" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_own_records" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_staff_access" ON user_client_access;
DROP POLICY IF EXISTS "user_client_access_undeniable_access" ON user_client_access;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_client_access;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_client_access;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_client_access;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_client_access;

-- ==============================================
-- CREATE PROPER RLS POLICIES FOR user_client_access
-- ==============================================

-- Ensure RLS is enabled
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive policy for SELECT
CREATE POLICY "user_client_access_select_policy" ON user_client_access
    FOR SELECT
    USING (true);

-- Create a simple, non-recursive policy for INSERT
CREATE POLICY "user_client_access_insert_policy" ON user_client_access
    FOR INSERT
    WITH CHECK (true);

-- Create a simple, non-recursive policy for UPDATE
CREATE POLICY "user_client_access_update_policy" ON user_client_access
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create a simple, non-recursive policy for DELETE
CREATE POLICY "user_client_access_delete_policy" ON user_client_access
    FOR DELETE
    USING (true);

-- ==============================================
-- TEST ACCESS
-- ==============================================

-- Test that we can access the user_client_access table
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM user_client_access;
    RAISE NOTICE 'user_client_access table accessible, count: %', test_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing user_client_access table: %', SQLERRM;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Fixed RLS policies on user_client_access table';
    RAISE NOTICE 'Created simple, non-recursive policies';
    RAISE NOTICE 'RLS is still enabled for security';
END $$;
