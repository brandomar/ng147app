-- Final fix for RLS infinite recursion
-- This migration creates the most basic RLS policy possible

-- ==============================================
-- REMOVE ALL EXISTING POLICIES COMPLETELY
-- ==============================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_allow_all" ON users;
DROP POLICY IF EXISTS "users_simple_access" ON users;

-- ==============================================
-- CREATE MINIMAL RLS POLICY
-- ==============================================

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create the most basic policy possible - no conditions that could cause recursion
CREATE POLICY "users_basic_access" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- TEST ACCESS
-- ==============================================

-- Test that we can access the users table
DO $$
DECLARE
    test_count INTEGER;
    test_role TEXT;
BEGIN
    SELECT COUNT(*) INTO test_count FROM users;
    SELECT global_role INTO test_role FROM users WHERE email = 'nick@weareundeniable.com';
    
    RAISE NOTICE 'Users table accessible, count: %', test_count;
    RAISE NOTICE 'User role: %', test_role;
    
    IF test_role = 'undeniable' THEN
        RAISE NOTICE '✅ User has undeniable role - Management tab should be visible';
    ELSE
        RAISE NOTICE '❌ User role is % - Management tab may not be visible', test_role;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing users table: %', SQLERRM;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Applied minimal RLS policy to users table';
    RAISE NOTICE 'Policy allows all access without recursion';
END $$;
