-- Temporarily Disable RLS on user_client_access Table
-- This allows role detection to work while we fix the policy issues

-- ==============================================
-- DISABLE RLS TEMPORARILY
-- ==============================================

-- Disable RLS on user_client_access table to prevent infinite recursion
ALTER TABLE user_client_access DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DROP POLICY IF EXISTS "Users can view their own client access" ON user_client_access;
DROP POLICY IF EXISTS "Users can insert their own client access" ON user_client_access;
DROP POLICY IF EXISTS "Users can update their own client access" ON user_client_access;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_client_access;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_client_access;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_client_access;
