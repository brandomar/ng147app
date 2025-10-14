-- Remove is_active column and fix RLS policies
-- This migration removes the unnecessary is_active column and ensures proper RLS

-- ==============================================
-- REMOVE is_active COLUMN FROM TABLES
-- ==============================================

-- Remove is_active column from clients table (if it exists)
ALTER TABLE clients DROP COLUMN IF EXISTS is_active;

-- Remove is_active column from other tables (if they exist)
DO $$
BEGIN
    -- Only drop columns from tables that actually exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_tabs') THEN
        ALTER TABLE client_tabs DROP COLUMN IF EXISTS is_active;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_sources') THEN
        ALTER TABLE data_sources DROP COLUMN IF EXISTS is_active;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discovered_metrics') THEN
        ALTER TABLE discovered_metrics DROP COLUMN IF EXISTS is_active;
    END IF;
END $$;

-- ==============================================
-- FIX RLS POLICIES - RE-ENABLE SECURITY
-- ==============================================

-- Re-enable RLS on users table (was disabled in migration 20250930000011)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on user_client_access table (was disabled in migration 20250930000011)  
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- UPDATE RPC FUNCTIONS TO REMOVE is_active FILTERS
-- ==============================================

-- Drop and recreate get_accessible_clients function to remove is_active filter
DROP FUNCTION IF EXISTS get_accessible_clients();

CREATE OR REPLACE FUNCTION get_accessible_clients()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    company_name TEXT,
    logo_url TEXT,
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
    -- Get the current user's global role
    SELECT global_role INTO user_role
    FROM users 
    WHERE user_id = auth.uid();
    
    -- If user not found, default to client role
    user_role := COALESCE(user_role, 'client');
    current_user_id := auth.uid();
    
    -- Return clients based on role (removed is_active filter)
    IF user_role = 'undeniable' THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
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
        ORDER BY c.name;
        
    ELSIF user_role = 'staff' THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
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
        ORDER BY c.name;
        
    ELSE
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
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
        ORDER BY c.name;
    END IF;
END;
$$;

-- ==============================================
-- DROP INDEXES THAT REFERENCE is_active
-- ==============================================

-- Drop indexes that reference is_active column
DROP INDEX IF EXISTS idx_data_sources_is_active;
DROP INDEX IF EXISTS idx_clients_is_active;
DROP INDEX IF EXISTS idx_client_tabs_is_active;
DROP INDEX IF EXISTS idx_discovered_metrics_is_active;

-- ==============================================
-- LOG SUCCESS
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Successfully removed is_active column from all tables';
    RAISE NOTICE 'Re-enabled RLS on users and user_client_access tables';
    RAISE NOTICE 'Updated get_accessible_clients function to remove is_active filters';
    RAISE NOTICE 'Dropped indexes that referenced is_active column';
END $$;
