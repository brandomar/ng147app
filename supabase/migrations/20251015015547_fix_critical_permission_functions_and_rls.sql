-- Fix Critical Permission Functions and RLS Policies
-- This migration adds missing functions and fixes infinite recursion

-- ==============================================
-- CREATE MISSING FUNCTIONS
-- ==============================================

CREATE OR REPLACE FUNCTION is_global_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION get_accessible_clients(p_user_id UUID)
RETURNS SETOF public.clients AS $$
BEGIN
  IF is_global_admin(p_user_id) THEN
    RETURN QUERY SELECT c.* FROM public.clients c ORDER BY c.name;
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM public.userRoles ur
    JOIN public.clients c ON ur.client_id = c.id
    WHERE ur.user_id = p_user_id
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_permissions JSONB := '{}'::JSONB;
BEGIN
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::JSONB)
  INTO v_permissions
  FROM (
    SELECT DISTINCT ON (key) key, value
    FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    CROSS JOIN LATERAL jsonb_each(r.permissions)
    WHERE ur.user_id = p_user_id
    AND (ur.is_global = TRUE OR ur.client_id = p_client_id)
    ORDER BY key, ur.is_global DESC
  ) subq;
  
  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_global_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_clients(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID, UUID) TO authenticated;

-- ==============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ==============================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.userRoles;
DROP POLICY IF EXISTS "Global admins can manage all user roles" ON public.userRoles;
DROP POLICY IF EXISTS "Staff can manage client roles" ON public.userRoles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Global admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Global admins can manage all profiles" ON public.profiles;

-- Create SIMPLE, non-recursive policies

-- userRoles: Users can ONLY see their OWN roles (no nested queries)
CREATE POLICY "Users can view own roles" ON public.userRoles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- userRoles: Admins need bypassRLS or service_role to manage
-- DO NOT create admin policies that query userRoles from within userRoles

-- roles: All authenticated users can view roles
CREATE POLICY "Anyone can view roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- profiles: Users can view/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
