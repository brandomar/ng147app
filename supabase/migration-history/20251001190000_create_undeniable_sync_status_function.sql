-- Create update_undeniable_sync_status function for Undeniable Dashboard
-- Generated: 2025-01-01

-- Create the function for undeniable sync status updates
CREATE OR REPLACE FUNCTION update_undeniable_sync_status(
    p_user_id UUID,
    p_google_sheet_id TEXT,
    p_sync_status VARCHAR,
    p_last_sync_at TIMESTAMPTZ DEFAULT NULL,
    p_sheet_name TEXT DEFAULT 'undeniable',
    p_last_successful_sync_at TIMESTAMPTZ DEFAULT NULL,
    p_sync_error_message TEXT DEFAULT NULL,
    p_increment_total BOOLEAN DEFAULT TRUE,
    p_increment_successful BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update sync status for undeniable dashboard
    INSERT INTO sync_status (
        user_id,
        google_sheet_id,
        sheet_name,
        sync_status,
        last_sync_at,
        last_successful_sync_at,
        sync_error_message,
        total_sync_count,
        successful_sync_count,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_google_sheet_id,
        p_sheet_name,
        p_sync_status,
        COALESCE(p_last_sync_at, NOW()),
        p_last_successful_sync_at,
        p_sync_error_message,
        CASE WHEN p_increment_total THEN 1 ELSE 0 END,
        CASE WHEN p_increment_successful THEN 1 ELSE 0 END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        last_sync_at = EXCLUDED.last_sync_at,
        last_successful_sync_at = EXCLUDED.last_successful_sync_at,
        sync_error_message = EXCLUDED.sync_error_message,
        total_sync_count = sync_status.total_sync_count + CASE WHEN p_increment_total THEN 1 ELSE 0 END,
        successful_sync_count = sync_status.successful_sync_count + CASE WHEN p_increment_successful THEN 1 ELSE 0 END,
        updated_at = NOW();
        
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the sync
        RAISE WARNING 'Failed to update undeniable sync status: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_undeniable_sync_status(UUID, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- Add notice
DO $$
BEGIN
    RAISE NOTICE 'Created update_undeniable_sync_status function for Undeniable Dashboard';
END $$;
