-- Fix get_accessible_clients Function for Role-Based Access
-- Generated: 2025-09-30
-- Implements proper role-based client access for undeniable users

-- ==============================================
-- DROP AND RECREATE FUNCTION WITH PROPER ROLE LOGIC
-- ==============================================

DROP FUNCTION IF EXISTS get_accessible_clients();

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
    data_source TEXT,
    google_sheets_url TEXT,
    google_sheets_tabs TEXT[],
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
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Get the current user's role from users table
    SELECT global_role INTO user_role
    FROM users 
    WHERE user_id = current_user_id;
    
    -- If user not found, default to client role
    user_role := COALESCE(user_role, 'client');
    
    -- Return clients based on role
    IF user_role = 'undeniable' THEN
        -- Undeniable users can access ALL clients
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
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        WHERE c.is_active = TRUE
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
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = current_user_id
        AND c.is_active = TRUE
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
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = current_user_id
        AND c.is_active = TRUE
        ORDER BY c.name;
    END IF;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'get_accessible_clients function updated with proper role-based logic';
    RAISE NOTICE 'Undeniable users: Access to ALL active clients';
    RAISE NOTICE 'Staff users: Access to assigned clients only';
    RAISE NOTICE 'Client users: Access to assigned clients only';
END $$;
