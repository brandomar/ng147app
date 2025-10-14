-- Fix get_accessible_clients to return all client columns
-- This migration updates the function to return the complete client record
-- including client_type, slug, data_source, and other essential fields

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
    -- Return only clients the user has access to
    RETURN QUERY
    SELECT c.*
    FROM public.userRoles ur
    JOIN public.clients c ON ur.client_id = c.id
    WHERE ur.user_id = p_user_id
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_accessible_clients(UUID) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Updated get_accessible_clients function to return complete client records';
  RAISE NOTICE 'Function now returns all columns from clients table including client_type';
END $$;

