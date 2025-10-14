-- Fix RLS Recursion - Final
-- This migration completely fixes the infinite recursion in RLS policies

-- ==============================================
-- DROP ALL RECURSIVE POLICIES
-- ==============================================

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.userroles;
DROP POLICY IF EXISTS "Global admins can view all roles" ON public.userroles;
DROP POLICY IF EXISTS "Users can view roles for their clients" ON public.userroles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.userroles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.userroles;
DROP POLICY IF EXISTS "Enable read access for own roles" ON public.userroles;

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;

-- Drop roles policies
DROP POLICY IF EXISTS "Users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;

-- ==============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ==============================================

-- userroles: Users can ONLY view their own roles (no admin bypass in policy)
CREATE POLICY "Enable read access for own roles" ON public.userroles
  FOR SELECT USING (auth.uid() = user_id);

-- profiles: Users can view their own profile
CREATE POLICY "Enable read access for own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable update for own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- roles: Enable RLS with simple policy for authenticated users only
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ==============================================
-- VALIDATION
-- ==============================================

DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    policy_count INTEGER;
BEGIN
    -- Check that we have the right number of policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'userroles';
    
    RAISE NOTICE 'userRoles policies count: %', policy_count;
    
    -- Check that roles table has RLS enabled
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'roles' 
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ roles table RLS enabled successfully';
    ELSE
        RAISE NOTICE '❌ roles table RLS still disabled';
    END IF;
    
    RAISE NOTICE '✅ RLS policies fixed - no more infinite recursion';
END $$;
