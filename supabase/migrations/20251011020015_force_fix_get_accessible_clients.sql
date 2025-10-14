-- Force fix get_accessible_clients function to use correct table names
-- The function was referencing the old user_client_access table
-- This migration ensures it uses the correct userRoles table

DROP FUNCTION IF EXISTS get_accessible_clients(UUID);

CREATE OR REPLACE FUNCTION get_accessible_clients(p_user_id UUID)
RETURNS SETOF public.clients AS $$
BEGIN
  -- If user is global admin, return all clients
  IF is_global_admin(p_user_id) THEN
    RETURN QUERY
    SELECT c.*
    FROM public.clients c
    ORDER BY c.name;
  ELSE
    -- Return only clients the user has access to via userRoles table
    RETURN QUERY
    SELECT c.*
    FROM public."userRoles" ur
    JOIN public.clients c ON ur.client_id = c.id
    WHERE ur.user_id = p_user_id
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_accessible_clients(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_accessible_clients(UUID) IS 'Returns all clients accessible to the user. Global admins see all clients, others see only assigned clients via userRoles table.';

