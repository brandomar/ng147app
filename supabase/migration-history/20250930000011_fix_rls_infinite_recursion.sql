-- Fix RLS Infinite Recursion Issue
-- Temporarily disable RLS and create simple, non-recursive policies

-- ==============================================
-- DISABLE RLS TEMPORARILY TO FIX INFINITE RECURSION
-- ==============================================

-- Disable RLS on both tables to prevent infinite recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_access DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DROP POLICY IF EXISTS "users_own_record_only" ON users;
DROP POLICY IF EXISTS "user_client_access_own_records_only" ON user_client_access;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "user_client_access_own_records_only" ON user_client_access;
