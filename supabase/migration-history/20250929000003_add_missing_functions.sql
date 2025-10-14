-- Add Missing Database Functions
-- Generated: 2025-01-23
-- Adds missing database functions that the application expects

-- ==============================================
-- ADD MISSING FUNCTIONS
-- ==============================================

-- Get accessible clients function (expected by AppContext.tsx)
CREATE OR REPLACE FUNCTION get_accessible_clients()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    is_active BOOLEAN,
    tabs JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all active clients for now (can be refined with proper access control later)
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        c.is_active,
        c.tabs,
        c.created_at,
        c.updated_at
    FROM clients c
    WHERE c.is_active = TRUE
    ORDER BY c.name;
END;
$$;

-- Get user role function (expected by useUserPermissions.ts)
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Check for global undeniable role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN 'undeniable';
    END IF;
    
    -- Check for global staff role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'staff'
        AND client_id IS NULL
    ) THEN
        RETURN 'staff';
    END IF;
    
    -- Check for global client role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'client'
        AND client_id IS NULL
    ) THEN
        RETURN 'client';
    END IF;
    
    -- Default to staff if no global role found
    RETURN 'staff';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'staff';
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Missing functions migration completed successfully';
    RAISE NOTICE 'Created get_accessible_clients function';
    RAISE NOTICE 'Created get_user_role function';
END $$;
