-- Ensure safe_grant_client_access function exists
-- Generated: 2025-01-01

-- Drop and recreate the function to ensure it exists
DROP FUNCTION IF EXISTS safe_grant_client_access(UUID, UUID, TEXT, TEXT);

-- Create the safe_grant_client_access function
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
    -- Insert or update user access control
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
    VALUES (p_user_id, p_client_id, p_role, auth.uid(), p_granted_by_email, NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        granted_by_email = EXCLUDED.granted_by_email,
        updated_at = NOW();
        
    -- Log the access grant
    RAISE NOTICE 'Client access granted: user_id=%, client_id=%, role=%', p_user_id, p_client_id, p_role;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to grant client access: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION safe_grant_client_access(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Add notice
DO $$
BEGIN
    RAISE NOTICE 'Ensured safe_grant_client_access function exists';
END $$;
