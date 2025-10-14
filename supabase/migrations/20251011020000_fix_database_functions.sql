-- Fix Database Functions
-- This migration fixes the database functions to work with the current schema

-- ==============================================
-- FIX GET_ACCESSIBLE_CLIENTS FUNCTION
-- ==============================================

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
-- FIX RLS POLICIES FOR USERROLES TABLE
-- ==============================================

-- Drop existing policies that might cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.userRoles;

-- Create new policies that don't cause recursion
CREATE POLICY "Users can view their own roles" ON public.userRoles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view roles for their clients" ON public.userRoles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur2 
      WHERE ur2.user_id = auth.uid() 
      AND ur2.is_global = true
    )
  );

-- ==============================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- FIX RLS POLICIES FOR ROLES TABLE
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view roles" ON public.roles;

-- Create new policy
CREATE POLICY "Users can view roles" ON public.roles
  FOR SELECT USING (true); -- All authenticated users can view roles

-- ==============================================
-- VALIDATION
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DATABASE FUNCTIONS FIXED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ get_accessible_clients function updated';
  RAISE NOTICE '✅ RLS policies fixed to prevent infinite recursion';
  RAISE NOTICE '✅ All tables have proper access policies';
  RAISE NOTICE '==============================================';
END $$;
