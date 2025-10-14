-- Remove User Preferences System
-- Generated: 2025-09-29
-- Eliminates unused user preferences and consolidates user data

-- ==============================================
-- DROP USER_SETTINGS TABLE
-- ==============================================

-- Drop the user_settings table entirely
DROP TABLE IF EXISTS user_settings CASCADE;

-- ==============================================
-- REMOVE PREFERENCES FROM USER_ACCESS_CONTROL
-- ==============================================

-- Remove preferences column if it exists (it shouldn't, but just in case)
ALTER TABLE user_access_control DROP COLUMN IF EXISTS preferences;

-- ==============================================
-- CLEAN UP FUNCTIONS
-- ==============================================

-- Drop preference-related functions
DROP FUNCTION IF EXISTS get_user_preferences(UUID);
DROP FUNCTION IF EXISTS create_user_preferences(UUID, JSONB);
DROP FUNCTION IF EXISTS update_user_preferences(UUID, JSONB);
DROP FUNCTION IF EXISTS delete_user_preferences(UUID);

-- ==============================================
-- UPDATE EXISTING FUNCTIONS
-- ==============================================

-- Update get_user_profile to remove preferences
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uac.id,
        uac.user_id,
        uac.email,
        uac.first_name,
        uac.last_name,
        uac.role,
        uac.created_at,
        uac.updated_at
    FROM user_access_control uac
    WHERE uac.user_id = p_user_id
    AND uac.client_id IS NULL -- Global role only
    LIMIT 1;
END;
$$;

-- Update get_all_users_with_roles_and_access to remove preferences
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
        uac.user_id,
        uac.email,
        uac.first_name,
        uac.last_name,
        uac.role as global_role,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'client_id', uac2.client_id,
                    'client_name', c.name,
                    'role', uac2.role
                ) 
                ORDER BY c.name
            ) FILTER (WHERE uac2.client_id IS NOT NULL),
            '[]'::jsonb
        ) as client_access
    FROM user_access_control uac
    LEFT JOIN user_access_control uac2 ON uac.user_id = uac2.user_id AND uac2.client_id IS NOT NULL
    LEFT JOIN clients c ON uac2.client_id = c.id
    WHERE uac.client_id IS NULL -- Global roles only
    GROUP BY uac.user_id, uac.email, uac.first_name, uac.last_name, uac.role
    ORDER BY uac.email;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'User preferences system removed successfully';
    RAISE NOTICE 'user_settings table dropped';
    RAISE NOTICE 'Preference-related functions removed';
    RAISE NOTICE 'User profile functions updated';
END $$;
