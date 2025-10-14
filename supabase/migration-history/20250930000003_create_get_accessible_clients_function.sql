-- Create get_accessible_clients RPC Function
-- Generated: 2025-09-29
-- Implements role-based client access for all user types

-- ==============================================
-- RPC FUNCTION: get_accessible_clients
-- ==============================================

CREATE OR REPLACE FUNCTION get_accessible_clients()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    company_name TEXT,
    logo_url TEXT,
    is_active BOOLEAN,
    allowed_categories TEXT[],
    client_type TEXT,
    owner_id UUID,
    tabs JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the current user's global role
    SELECT global_role INTO user_role
    FROM users 
    WHERE user_id = auth.uid();
    
    -- If user not found, default to client role
    user_role := COALESCE(user_role, 'client');
    
    -- Return clients based on role
    IF user_role = 'undeniable' THEN
        -- Undeniable users can access ALL clients (no user_client_access needed)
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.is_active,
            c.allowed_categories,
            c.client_type,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        ORDER BY c.name;
        
    ELSIF user_role = 'staff' THEN
        -- Staff users can access clients they're assigned to
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.is_active,
            c.allowed_categories,
            c.client_type,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = auth.uid()
        ORDER BY c.name;
        
    ELSE
        -- Client users can only access their assigned clients
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.is_active,
            c.allowed_categories,
            c.client_type,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = auth.uid()
        ORDER BY c.name;
    END IF;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'get_accessible_clients function created successfully';
    RAISE NOTICE 'Supports undeniable, staff, and client roles';
    RAISE NOTICE 'Undeniable users get all clients';
    RAISE NOTICE 'Staff/Client users get assigned clients only';
END $$;
