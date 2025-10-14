-- Fix RLS policies for metrics table to allow Edge Function inserts
-- The Edge Function runs as service_role and needs permission to insert metrics
-- while still maintaining security for authenticated user access

-- ==============================================
-- ADD SERVICE ROLE INSERT POLICY
-- ==============================================

-- Allow Edge Function (service_role) to insert metrics
-- This is needed for the sync function to work
CREATE POLICY "Edge functions can insert metrics" ON public.metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ==============================================
-- VERIFY EXISTING USER POLICIES
-- ==============================================

-- Ensure authenticated users still have proper access control
-- Existing policies should handle SELECT/UPDATE/DELETE based on:
-- 1. user_id = auth.uid() OR
-- 2. User has permission via new permission system

-- List current policies for verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'metrics' AND schemaname = 'public';
  
  RAISE NOTICE 'Total RLS policies on metrics table: %', policy_count;
  RAISE NOTICE 'Added service_role INSERT policy for Edge Function';
  RAISE NOTICE 'Existing user policies remain unchanged for security';
END $$;

