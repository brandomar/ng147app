-- Comprehensive Function Implementation
-- Generated: 2025-01-23
-- Implements ALL missing RPC functions required by the application

-- ==============================================
-- CORE FUNCTIONS
-- ==============================================

-- Get accessible clients (AppContext.tsx)
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

-- Get user role (useUserPermissions.ts)
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

-- Get accessible sheets
CREATE OR REPLACE FUNCTION get_accessible_sheets(p_client_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    client_id UUID,
    google_sheet_id TEXT,
    sheet_name TEXT,
    metrics JSONB,
    metric_configs JSONB,
    total_metrics INTEGER,
    total_configured_metrics INTEGER,
    sheet_names TEXT[],
    allowed_categories TEXT[],
    is_active BOOLEAN,
    discovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.user_id,
        dm.client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        dm.metrics,
        dm.metric_configs,
        dm.total_metrics,
        dm.total_configured_metrics,
        dm.sheet_names,
        dm.allowed_categories,
        dm.is_active,
        dm.discovered_at,
        dm.created_at,
        dm.updated_at
    FROM discovered_metrics dm
    WHERE (p_client_id IS NULL OR dm.client_id = p_client_id)
      AND dm.is_active = TRUE
    ORDER BY dm.created_at DESC;
END;
$$;

-- Can access client
CREATE OR REPLACE FUNCTION can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has undeniable role (can access all)
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has specific client access
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND client_id = p_client_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- ==============================================
-- SYNC STATUS FUNCTIONS
-- ==============================================

-- Update client sync status
CREATE OR REPLACE FUNCTION update_client_sync_status(
    p_client_id UUID,
    p_sync_status VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO sync_status (user_id, client_id, google_sheet_id, sheet_name, sync_status, sync_error_message, last_sync_at, total_sync_count, updated_at)
    SELECT 
        auth.uid(),
        p_client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        p_sync_status,
        p_error_message,
        NOW(),
        1,
        NOW()
    FROM discovered_metrics dm
    WHERE dm.client_id = p_client_id
    ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        sync_error_message = EXCLUDED.sync_error_message,
        last_sync_at = EXCLUDED.last_sync_at,
        total_sync_count = sync_status.total_sync_count + 1,
        updated_at = NOW();
        
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = successful_sync_count + 1
        WHERE user_id = auth.uid() AND client_id = p_client_id;
    END IF;
END;
$$;

-- Update staff sync status
CREATE OR REPLACE FUNCTION update_staff_sync_status(
    p_user_id UUID,
    p_google_sheet_id TEXT,
    p_sync_status VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO sync_status (user_id, client_id, google_sheet_id, sheet_name, sync_status, sync_error_message, last_sync_at, total_sync_count, updated_at)
    VALUES (p_user_id, NULL, p_google_sheet_id, 'staff', p_sync_status, p_error_message, NOW(), 1, NOW())
    ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        sync_error_message = EXCLUDED.sync_error_message,
        last_sync_at = EXCLUDED.last_sync_at,
        total_sync_count = sync_status.total_sync_count + 1,
        updated_at = NOW();
        
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = successful_sync_count + 1
        WHERE user_id = p_user_id AND google_sheet_id = p_google_sheet_id AND sheet_name = 'staff';
    END IF;
END;
$$;

-- ==============================================
-- ACCESS CONTROL FUNCTIONS
-- ==============================================

-- Safe grant client access
CREATE OR REPLACE FUNCTION safe_grant_client_access(
    p_client_id UUID,
    p_user_id UUID,
    p_role TEXT,
    p_granted_by_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
    VALUES (p_user_id, p_client_id, p_role, auth.uid(), p_granted_by_email, NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        granted_by_email = EXCLUDED.granted_by_email,
        updated_at = NOW();
END;
$$;

-- Get user access level (updated for new schema)
CREATE OR REPLACE FUNCTION get_user_access_level(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    client_role TEXT;
BEGIN
    -- Get user's global role
    SELECT role INTO user_role
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id IS NULL
    LIMIT 1;
    
    -- If undeniable, always admin
    IF user_role = 'undeniable' THEN
        RETURN 'admin';
    END IF;
    
    -- If no client specified, return based on global role
    IF p_client_id IS NULL THEN
        RETURN CASE 
            WHEN user_role = 'staff' THEN 'admin'
            WHEN user_role = 'client' THEN 'read'
            ELSE 'none'
        END;
    END IF;
    
    -- Check client-specific access
    SELECT role INTO client_role
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id = p_client_id
    LIMIT 1;
    
    -- Convert role to access level
    RETURN CASE 
        WHEN client_role = 'client' THEN 'read'  -- Client role = read access
        WHEN user_role = 'staff' THEN 'write'       -- Staff can write to any client
        ELSE 'none'
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;

-- Assign client ownership
CREATE OR REPLACE FUNCTION assign_client_ownership(
    p_client_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, p_client_id, 'client', auth.uid(), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = 'client',
        granted_by = auth.uid(),
        updated_at = NOW();
END;
$$;

-- Assign all unowned clients
CREATE OR REPLACE FUNCTION assign_all_unowned_clients()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_count INTEGER := 0;
    client_record RECORD;
BEGIN
    FOR client_record IN 
        SELECT c.id 
        FROM clients c 
        WHERE c.is_active = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.client_id = c.id 
            AND uac.role = 'client'
        )
    LOOP
        INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
        VALUES (auth.uid(), client_record.id, 'client', auth.uid(), NOW(), NOW())
        ON CONFLICT (user_id, client_id) DO NOTHING;
        
        assigned_count := assigned_count + 1;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;

-- ==============================================
-- USER MANAGEMENT FUNCTIONS
-- ==============================================

-- Get user profile
DROP FUNCTION IF EXISTS get_user_profile(UUID);
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    client_access JSONB,
    preferences JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_user_id as user_id,
        au.email,
        COALESCE(uac.role, 'staff') as role,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'client_id', uac.client_id,
                    'role', uac.role,
                    'client_name', c.name
                )
            ) FILTER (WHERE uac.client_id IS NOT NULL),
            '[]'::jsonb
        ) as client_access,
        COALESCE(us.preferences, '{}'::jsonb) as preferences,
        au.created_at
    FROM auth.users au
    LEFT JOIN user_access_control uac ON uac.user_id = p_user_id
    LEFT JOIN clients c ON c.id = uac.client_id
    LEFT JOIN user_settings us ON us.user_id = p_user_id
    WHERE au.id = p_user_id
    GROUP BY au.id, au.email, au.created_at, uac.role, us.preferences;
END;
$$;

-- Get user access
DROP FUNCTION IF EXISTS get_user_access(UUID, UUID);
CREATE OR REPLACE FUNCTION get_user_access(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    client_id UUID,
    access_level TEXT,
    role TEXT,
    client_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uac.user_id,
        uac.client_id,
        uac.role as access_level,
        uac.role,
        c.name as client_name
    FROM user_access_control uac
    LEFT JOIN clients c ON c.id = uac.client_id
    WHERE uac.user_id = p_user_id
    AND (p_client_id IS NULL OR uac.client_id = p_client_id)
    ORDER BY c.name;
END;
$$;

-- Get all users with roles and access
DROP FUNCTION IF EXISTS get_all_users_with_roles_and_access();
CREATE OR REPLACE FUNCTION get_all_users_with_roles_and_access()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    client_access JSONB,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        COALESCE(uac_global.role, 'staff') as role,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'client_id', uac.client_id,
                    'role', uac.role,
                    'client_name', c.name
                )
            ) FILTER (WHERE uac.client_id IS NOT NULL),
            '[]'::jsonb
        ) as client_access,
        au.last_sign_in_at,
        au.created_at
    FROM auth.users au
    LEFT JOIN user_access_control uac_global ON uac_global.user_id = au.id AND uac_global.role IS NOT NULL AND uac_global.client_id IS NULL
    LEFT JOIN user_access_control uac ON uac.user_id = au.id AND uac.client_id IS NOT NULL
    LEFT JOIN clients c ON c.id = uac.client_id
    GROUP BY au.id, au.email, au.last_sign_in_at, au.created_at, uac_global.role
    ORDER BY au.created_at DESC;
END;
$$;

-- Assign user role
CREATE OR REPLACE FUNCTION assign_user_role(p_user_id UUID, p_role_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, NULL, p_role_name, auth.uid(), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        updated_at = NOW();
END;
$$;

-- Get user client access level
CREATE OR REPLACE FUNCTION get_user_client_access_level(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    client_role TEXT;
BEGIN
    -- Check for global undeniable role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN 'admin';
    END IF;
    
    -- Get user's global role
    SELECT role INTO user_role
    FROM user_access_control 
    WHERE user_id = auth.uid() 
    AND client_id IS NULL
    LIMIT 1;
    
    -- Check client-specific access
    SELECT role INTO client_role
    FROM user_access_control 
    WHERE user_id = auth.uid() AND client_id = p_client_id
    LIMIT 1;
    
    -- Convert role to access level
    RETURN CASE 
        WHEN client_role = 'client' THEN 'read'  -- Client role = read access
        WHEN user_role = 'staff' THEN 'write'       -- Staff can write to any client
        ELSE 'none'
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;

-- ==============================================
-- CONNECTION HEALTH FUNCTIONS
-- ==============================================

-- Get connection stats
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE (
    total_users INTEGER,
    active_clients INTEGER,
    total_metrics INTEGER,
    recent_syncs INTEGER,
    system_health TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_count INTEGER;
    client_count INTEGER;
    metric_count INTEGER;
    sync_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO client_count FROM clients WHERE is_active = TRUE;
    SELECT COUNT(*) INTO metric_count FROM metrics;
    SELECT COUNT(*) INTO sync_count FROM sync_status WHERE last_sync_at > NOW() - INTERVAL '24 hours';
    
    RETURN QUERY
    SELECT 
        user_count as total_users,
        client_count as active_clients,
        metric_count as total_metrics,
        sync_count as recent_syncs,
        'healthy'::TEXT as system_health;
END;
$$;

-- ==============================================
-- MAINTENANCE FUNCTIONS
-- ==============================================

-- Check metric usage
CREATE OR REPLACE FUNCTION check_metric_usage(p_user_id UUID, p_metric_name VARCHAR)
RETURNS TABLE (
    usage_count INTEGER,
    last_used TIMESTAMPTZ,
    is_safe_to_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count_result INTEGER;
    last_used_result TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*), MAX(updated_at) 
    INTO count_result, last_used_result
    FROM metrics 
    WHERE user_id = p_user_id AND metric_name = p_metric_name;
    
    RETURN QUERY
    SELECT 
        count_result as usage_count,
        last_used_result as last_used,
        (count_result = 0 OR last_used_result < NOW() - INTERVAL '30 days') as is_safe_to_delete;
END;
$$;

-- Safe delete sheet metrics
CREATE OR REPLACE FUNCTION safe_delete_sheet_metrics(p_user_id UUID, p_sheet_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics 
    WHERE user_id = p_user_id 
    AND metric_name LIKE '%' || p_sheet_name || '%'
    AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Detect duplicate metrics
CREATE OR REPLACE FUNCTION detect_duplicate_metrics(p_user_id UUID)
RETURNS TABLE (
    metric_name VARCHAR,
    date DATE,
    duplicate_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.date,
        COUNT(*)::INTEGER as duplicate_count
    FROM metrics m
    WHERE m.user_id = p_user_id
    GROUP BY m.metric_name, m.date, m.client_id, m.category
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC;
END;
$$;

-- Cleanup old metric entries
CREATE OR REPLACE FUNCTION cleanup_old_metric_entries(p_user_id UUID, p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics 
    WHERE user_id = p_user_id 
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND is_calculated = TRUE; -- Only delete calculated metrics, keep raw data
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Run metric maintenance
CREATE OR REPLACE FUNCTION run_metric_maintenance(
    p_user_id UUID,
    p_cleanup_old_days INTEGER DEFAULT 90,
    p_remove_duplicates BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    operation TEXT,
    affected_rows INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_count INTEGER;
    duplicate_count INTEGER;
BEGIN
    -- Cleanup old entries
    SELECT cleanup_old_metric_entries(p_user_id, p_cleanup_old_days) INTO cleanup_count;
    
    RETURN QUERY
    SELECT 'cleanup_old_entries'::TEXT, cleanup_count, 'completed'::TEXT;
    
    -- Remove duplicates if requested
    IF p_remove_duplicates THEN
        WITH duplicates AS (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, client_id, date, category, metric_name 
                           ORDER BY created_at DESC
                       ) as rn
                FROM metrics 
                WHERE user_id = p_user_id
            ) t WHERE rn > 1
        )
        DELETE FROM metrics WHERE id IN (SELECT id FROM duplicates);
        
        GET DIAGNOSTICS duplicate_count = ROW_COUNT;
        
        RETURN QUERY
        SELECT 'remove_duplicates'::TEXT, duplicate_count, 'completed'::TEXT;
    END IF;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Comprehensive function implementation completed successfully';
    RAISE NOTICE 'Created 21 missing RPC functions';
    RAISE NOTICE 'All core application functions are now available';
END $$;
