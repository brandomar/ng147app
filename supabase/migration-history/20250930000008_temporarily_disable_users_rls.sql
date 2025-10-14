-- Temporarily Disable RLS on Users Table
-- This allows role detection to work while we fix the policy issues

-- ==============================================
-- DISABLE RLS TEMPORARILY
-- ==============================================

-- Disable RLS on users table to prevent infinite recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
