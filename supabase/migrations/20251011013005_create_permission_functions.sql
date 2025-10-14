-- Create Permission Functions
-- This migration creates helper functions for permission checks and user role management

-- ==============================================
-- FUNCTION TO CHECK IF USER HAS SPECIFIC PERMISSION
-- ==============================================

CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND (ur.is_global = TRUE OR ur.client_id IS NOT NULL)
    AND r.permissions->>p_permission = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNCTION TO GET USER'S EFFECTIVE PERMISSIONS
-- ==============================================

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_permissions JSONB := '{}'::JSONB;
  v_global_permissions JSONB := '{}'::JSONB;
  v_client_permissions JSONB := '{}'::JSONB;
BEGIN
  -- Get global permissions (from global roles)
  SELECT COALESCE(jsonb_agg(r.permissions), '{}'::JSONB)
  INTO v_global_permissions
  FROM public.userRoles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND ur.is_global = TRUE;
  
  -- Get client-specific permissions (if client_id provided)
  IF p_client_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(r.permissions), '{}'::JSONB)
    INTO v_client_permissions
    FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND ur.client_id = p_client_id
    AND ur.is_global = FALSE;
  END IF;
  
  -- Merge permissions (global permissions take precedence)
  v_permissions := v_global_permissions || v_client_permissions;
  
  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNCTION TO CHECK IF USER IS GLOBAL ADMIN
-- ==============================================

CREATE OR REPLACE FUNCTION is_global_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.userRoles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND ur.is_global = TRUE
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNCTION TO GET USER'S ROLES
-- ==============================================

CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS TABLE(
  role_id UUID,
  role_name TEXT,
  role_description TEXT,
  permissions JSONB,
  is_global BOOLEAN,
  client_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as role_id,
    r.name as role_name,
    r.description as role_description,
    r.permissions,
    ur.is_global,
    ur.client_id
  FROM public.userRoles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND (
    p_client_id IS NULL OR 
    ur.is_global = TRUE OR 
    ur.client_id = p_client_id
  )
  ORDER BY ur.is_global DESC, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNCTION TO CHECK CLIENT ACCESS
-- ==============================================

CREATE OR REPLACE FUNCTION can_access_client(p_user_id UUID, p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Global admins can access all clients
  IF is_global_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has specific access to this client
  RETURN EXISTS (
    SELECT 1 FROM public.userRoles ur
    WHERE ur.user_id = p_user_id
    AND ur.client_id = p_client_id
    AND ur.is_global = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNCTION TO GET ACCESSIBLE CLIENTS
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
    WHERE c.is_active = TRUE
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
    AND ur.is_global = FALSE
    AND c.is_active = TRUE
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the function creation
DO $$
BEGIN
    RAISE NOTICE 'Permission functions created successfully:';
    RAISE NOTICE '- has_permission(user_id, permission) - Check if user has specific permission';
    RAISE NOTICE '- get_user_permissions(user_id, client_id) - Get user effective permissions';
    RAISE NOTICE '- is_global_admin(user_id) - Check if user is global admin';
    RAISE NOTICE '- get_user_roles(user_id, client_id) - Get user roles';
    RAISE NOTICE '- can_access_client(user_id, client_id) - Check client access';
    RAISE NOTICE '- get_accessible_clients(user_id) - Get accessible clients';
    RAISE NOTICE 'All functions are SECURITY DEFINER for proper permission checking';
END $$;
