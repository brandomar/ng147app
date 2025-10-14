-- Add get_staff_discovered_metrics function for staff role
-- Generated: 2025-01-01

-- RPC FUNCTION: get_staff_discovered_metrics
-- ==============================================

CREATE OR REPLACE FUNCTION get_staff_discovered_metrics(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    client_id UUID,
    google_sheet_id TEXT,
    sheet_name TEXT,
    metric_configs JSONB,
    total_configured_metrics INTEGER,
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
        dm.metric_configs,
        dm.total_configured_metrics,
        dm.created_at,
        dm.updated_at
    FROM discovered_metrics dm
    JOIN clients c ON dm.client_id = c.id
    WHERE dm.user_id = p_user_id
    AND c.client_type = 'client'  -- Staff manages client dashboards, not undeniable
    ORDER BY dm.created_at DESC;
    
    RAISE NOTICE 'get_staff_discovered_metrics - filters discovered metrics by client type only';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_staff_discovered_metrics(UUID) TO authenticated;

-- Add notice
DO $$
BEGIN
    RAISE NOTICE 'Added get_staff_discovered_metrics function for staff role';
END $$;
