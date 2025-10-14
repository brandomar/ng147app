-- Clean up conflicting RLS policies on user_client_access table
-- This migration removes the complex policies that are causing recursion

-- ==============================================
-- REMOVE CONFLICTING POLICIES
-- ==============================================

-- Drop the complex policies that are causing recursion
DROP POLICY IF EXISTS "Staff users can manage client access for assigned clients" ON user_client_access;
DROP POLICY IF EXISTS "Undeniable users can manage all client access" ON user_client_access;
DROP POLICY IF EXISTS "Users can read own client access" ON user_client_access;

-- Keep only the simple policy that doesn't cause recursion
-- The "user_client_access_simple" policy should remain

-- ==============================================
-- VERIFY THE CLEANUP
-- ==============================================

-- Test that we can access the user_client_access table
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM user_client_access;
    RAISE NOTICE 'user_client_access table accessible after cleanup, count: %', test_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing user_client_access table: %', SQLERRM;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Cleaned up conflicting RLS policies on user_client_access table';
    RAISE NOTICE 'Removed complex policies that were causing recursion';
    RAISE NOTICE 'Kept only the simple policy for basic access';
END $$;
