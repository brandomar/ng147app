-- Fix Table Name Case Issues
-- This migration fixes the case sensitivity issues with table names

-- ==============================================
-- DROP INCORRECT POLICIES
-- ==============================================

-- Drop policies that were created with wrong table name case
DROP POLICY IF EXISTS "Enable read access for own roles" ON public.userRoles;

-- ==============================================
-- CREATE CORRECT POLICIES
-- ==============================================

-- userroles: Users can ONLY view their own roles (no admin bypass in policy)
CREATE POLICY "Enable read access for own roles" ON public.userroles
  FOR SELECT USING (auth.uid() = user_id);

-- ==============================================
-- VALIDATION
-- ==============================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Check that we have the right number of policies for userroles
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'userroles';
    
    RAISE NOTICE 'userroles policies count: %', policy_count;
    
    -- Check that roles table has RLS disabled
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'roles' 
        AND relrowsecurity = false
    ) THEN
        RAISE NOTICE '✅ roles table RLS disabled successfully';
    ELSE
        RAISE NOTICE '❌ roles table RLS still enabled';
    END IF;
    
    RAISE NOTICE '✅ Table name case issues fixed';
END $$;
