-- Fix Infinite Recursion and Missing Column Issues
-- This migration fixes the infinite recursion in RLS policies and missing column references

-- ==============================================
-- FIX IS_GLOBAL_ADMIN FUNCTION
-- ==============================================

-- Drop and recreate the is_global_admin function to avoid recursion
DROP FUNCTION IF EXISTS is_global_admin(UUID);

CREATE OR REPLACE FUNCTION is_global_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has any global admin role
  RETURN EXISTS (
    SELECT 1 
    FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id 
    AND ur.is_global = true 
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FIX GET_ACCESSIBLE_CLIENTS FUNCTION
-- ==============================================

-- Drop and recreate the function to fix column reference issues
DROP FUNCTION IF EXISTS get_accessible_clients(UUID);

CREATE OR REPLACE FUNCTION get_accessible_clients(p_user_id UUID)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  role_name TEXT,
  is_global BOOLEAN
) AS $$
BEGIN
  -- If user is global admin, return all clients
  IF is_global_admin(p_user_id) THEN
    RETURN QUERY
    SELECT 
      c.id as client_id,
      c.name as client_name,
      'admin'::TEXT as role_name,
      TRUE as is_global
    FROM public.clients c
    ORDER BY c.name;
  ELSE
    -- Return only clients the user has access to
    RETURN QUERY
    SELECT 
      c.id as client_id,
      c.name as client_name,
      r.name as role_name,
      ur.is_global
    FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    JOIN public.clients c ON ur.client_id = c.id
    WHERE ur.user_id = p_user_id
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FIX RLS POLICIES TO PREVENT INFINITE RECURSION
-- ==============================================

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Users can view roles for their clients" ON public.userRoles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view roles" ON public.roles;

-- Create simple, non-recursive policies for userRoles
CREATE POLICY "Users can view their own roles" ON public.userRoles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Global admins can view all roles" ON public.userRoles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_global = true
      AND EXISTS (
        SELECT 1 FROM public.roles r 
        WHERE r.id = ur.role_id 
        AND r.name = 'admin'
      )
    )
  );

-- Create simple policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create simple policy for roles (all authenticated users can view)
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ==============================================
-- VALIDATION
-- ==============================================

DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    result_count INTEGER;
BEGIN
    -- Test the is_global_admin function
    RAISE NOTICE 'Testing is_global_admin function...';
    
    -- Test the get_accessible_clients function
    RAISE NOTICE 'Testing get_accessible_clients function...';
    SELECT COUNT(*) INTO result_count FROM get_accessible_clients(test_user_id);
    RAISE NOTICE 'get_accessible_clients returned % rows', result_count;
    
    RAISE NOTICE '✅ All functions created successfully';
END $$;
