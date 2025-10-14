-- Fix update_staff_sync_status function to match the expected parameters
-- Generated: 2025-01-01

-- Drop the existing function
DROP FUNCTION IF EXISTS update_staff_sync_status(TEXT, VARCHAR, UUID);

-- Create the correct function with the expected parameters
CREATE OR REPLACE FUNCTION update_staff_sync_status(
    p_user_id UUID,
    p_google_sheet_id TEXT,
    p_sync_status VARCHAR,
    p_last_sync_at TIMESTAMPTZ DEFAULT NULL,
    p_sheet_name TEXT DEFAULT 'staff'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update sync status for staff
    INSERT INTO sync_status (
        user_id,
        google_sheet_id,
        sheet_name,
        sync_status,
        last_sync_at,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_google_sheet_id,
        p_sheet_name,
        p_sync_status,
        COALESCE(p_last_sync_at, NOW()),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        last_sync_at = EXCLUDED.last_sync_at,
        updated_at = NOW();
        
    -- If sync is successful, update success counters
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = COALESCE(successful_sync_count, 0) + 1,
            total_sync_count = COALESCE(total_sync_count, 0) + 1
        WHERE user_id = p_user_id 
        AND google_sheet_id = p_google_sheet_id 
        AND sheet_name = p_sheet_name;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the sync
        RAISE WARNING 'Failed to update staff sync status: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_staff_sync_status(UUID, TEXT, VARCHAR, TIMESTAMPTZ, TEXT) TO authenticated;

-- Add notice
DO $$
BEGIN
    RAISE NOTICE 'Fixed update_staff_sync_status function with correct parameters';
END $$;
