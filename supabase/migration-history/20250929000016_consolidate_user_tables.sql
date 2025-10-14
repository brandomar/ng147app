-- Consolidate User Tables
-- Generated: 2025-09-29
-- Creates proper users table and separates client access

-- ==============================================
-- CREATE PROPER USERS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    global_role TEXT NOT NULL CHECK (global_role IN ('undeniable', 'staff', 'client')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- CREATE USER CLIENT ACCESS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS user_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('staff', 'client')),
    granted_by UUID REFERENCES auth.users(id),
    granted_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one role per user per client
    UNIQUE(user_id, client_id)
);

-- ==============================================
-- MIGRATE DATA FROM USER_ACCESS_CONTROL
-- ==============================================

-- Migrate global roles to users table
INSERT INTO users (user_id, email, first_name, last_name, global_role, created_at, updated_at)
SELECT 
    user_id,
    email,
    NULL as first_name,  -- Will be updated from auth.users later
    NULL as last_name,   -- Will be updated from auth.users later
    role,
    created_at,
    updated_at
FROM user_access_control 
WHERE client_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    global_role = EXCLUDED.global_role,
    updated_at = EXCLUDED.updated_at;

-- Migrate client-specific roles to user_client_access table
INSERT INTO user_client_access (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
SELECT 
    user_id,
    client_id,
    role,
    granted_by,
    granted_by_email,
    created_at,
    updated_at
FROM user_access_control 
WHERE client_id IS NOT NULL
ON CONFLICT (user_id, client_id) DO UPDATE SET
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    granted_by_email = EXCLUDED.granted_by_email,
    updated_at = EXCLUDED.updated_at;

-- ==============================================
-- UPDATE FUNCTIONS FOR NEW SCHEMA
-- ==============================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_profile(UUID);
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS get_all_users_with_roles_and_access();

-- Update get_user_profile to use users table
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    global_role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.global_role,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.user_id = p_user_id
    LIMIT 1;
END;
$$;

-- Update get_user_role to use users table
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT global_role INTO result
    FROM users 
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(result, 'client'); -- Default to client if not found
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'client'; -- Default to client on error
END;
$$;

-- Update get_all_users_with_roles_and_access to use new tables
CREATE OR REPLACE FUNCTION get_all_users_with_roles_and_access()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    global_role TEXT,
    client_access JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.global_role,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'client_id', uca.client_id,
                    'client_name', c.name,
                    'role', uca.role
                ) 
                ORDER BY c.name
            ) FILTER (WHERE uca.client_id IS NOT NULL),
            '[]'::jsonb
        ) as client_access
    FROM users u
    LEFT JOIN user_client_access uca ON u.user_id = uca.user_id
    LEFT JOIN clients c ON uca.client_id = c.id
    GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.global_role
    ORDER BY u.email;
END;
$$;

-- ==============================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

-- Undeniable users can manage all users
CREATE POLICY "Undeniable users can manage all users" ON users
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND global_role = 'undeniable'));

-- Staff users can read users for their assigned clients
CREATE POLICY "Staff users can read assigned client users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_client_access uca 
            WHERE uca.user_id = auth.uid() 
            AND uca.role = 'staff'
        )
    );

-- User client access policies
CREATE POLICY "Users can read own client access" ON user_client_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Undeniable users can manage all client access" ON user_client_access
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND global_role = 'undeniable'));

CREATE POLICY "Staff users can manage client access for assigned clients" ON user_client_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_client_access uca 
            WHERE uca.user_id = auth.uid() 
            AND uca.client_id = user_client_access.client_id
            AND uca.role = 'staff'
        )
    );

-- ==============================================
-- DROP OLD TABLE (AFTER DATA MIGRATION)
-- ==============================================

-- Drop the old user_access_control table
DROP TABLE IF EXISTS user_access_control CASCADE;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'User table consolidation completed successfully';
    RAISE NOTICE 'users table created with proper structure';
    RAISE NOTICE 'user_client_access table created for client permissions';
    RAISE NOTICE 'Data migrated from user_access_control';
    RAISE NOTICE 'Functions updated for new schema';
    RAISE NOTICE 'RLS policies applied to new tables';
    RAISE NOTICE 'Old user_access_control table dropped';
END $$;
