-- Fix RLS Policies for Users Table
-- Resolves infinite recursion in policy for relation "users"

-- ==============================================
-- DROP EXISTING POLICIES TO PREVENT CONFLICTS
-- ==============================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;

-- ==============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ==============================================

-- Allow users to read their own data
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own data
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- ENSURE RLS IS ENABLED
-- ==============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
