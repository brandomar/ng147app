-- Simplify User Access Control
-- Generated: 2025-01-28
-- Consolidates access_level and global_role into a single, clear role system

-- ==============================================
-- BACKUP EXISTING DATA
-- ==============================================

-- Create backup table
CREATE TABLE IF NOT EXISTS user_access_control_backup AS 
SELECT * FROM user_access_control;

-- ==============================================
-- SIMPLIFIED ROLE SYSTEM
-- ==============================================

-- Drop the old table and recreate with simplified structure
DROP TABLE IF EXISTS user_access_control CASCADE;

CREATE TABLE user_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('undeniable', 'staff', 'client')),
    granted_by UUID REFERENCES auth.users(id),
    granted_by_email TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one role per user per client
    UNIQUE(user_id, client_id)
);

-- ==============================================
-- MIGRATE EXISTING DATA
-- ==============================================

-- Migrate global roles (undeniable users)
INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, email, created_at, updated_at)
SELECT 
    user_id, 
    NULL as client_id, 
    role,
    granted_by,
    granted_by_email,
    email,
    created_at,
    updated_at
FROM user_access_control_backup 
WHERE role IS NOT NULL 
AND client_id IS NULL;

-- Migrate client-specific roles
INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, email, created_at, updated_at)
SELECT 
    user_id, 
    client_id, 
    COALESCE(role, 'client') as role,
    granted_by,
    granted_by_email,
    email,
    created_at,
    updated_at
FROM user_access_control_backup 
WHERE client_id IS NOT NULL;

-- ==============================================
-- RECREATE INDEXES
-- ==============================================

CREATE INDEX idx_user_access_control_user_client ON user_access_control(user_id, client_id);
CREATE INDEX idx_user_access_control_role ON user_access_control(role);
CREATE INDEX idx_user_access_control_user_role ON user_access_control(user_id, role);

-- ==============================================
-- SIMPLIFIED FUNCTIONS
-- ==============================================

-- Get user role (simplified)
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Check for global role first
    SELECT role INTO result
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id IS NULL
    LIMIT 1;
    
    -- Return global role if found, otherwise default to 'client'
    RETURN COALESCE(result, 'client');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'client';
END;
$$;

-- Get user access level for a specific client (simplified)
CREATE OR REPLACE FUNCTION get_user_access_level(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    client_access TEXT;
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
    SELECT role INTO client_access
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id = p_client_id
    LIMIT 1;
    
    -- Convert role to access level
    RETURN CASE 
        WHEN client_access = 'client' THEN 'read'  -- Client role = read access
        WHEN user_role = 'staff' THEN 'write'       -- Staff can write to any client
        ELSE 'none'
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;

-- Check if user can access client (simplified)
CREATE OR REPLACE FUNCTION can_access_client(p_user_id UUID, p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Undeniable users can access everything
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Staff users can access any client
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'staff'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Client users can only access their assigned clients
    RETURN EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id = p_client_id
    );
END;
$$;

-- Grant user access (simplified)
CREATE OR REPLACE FUNCTION grant_user_access(
    p_user_id UUID,
    p_role TEXT,
    p_client_id UUID DEFAULT NULL,
    p_granted_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, p_client_id, p_role, COALESCE(p_granted_by, auth.uid()), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        updated_at = NOW();
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify migration worked
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM user_access_control_backup;
    SELECT COUNT(*) INTO new_count FROM user_access_control;
    
    RAISE NOTICE 'Migration completed: % old records -> % new records', old_count, new_count;
END;
$$;
