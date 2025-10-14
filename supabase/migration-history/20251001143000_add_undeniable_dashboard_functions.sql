-- Add RPC functions for undeniable dashboard data filtering
-- This ensures proper data separation between undeniable and client data

-- ==============================================
-- RPC FUNCTION: get_undeniable_dashboard_metrics
-- ==============================================

CREATE OR REPLACE FUNCTION get_undeniable_dashboard_metrics(
    p_user_id UUID,
    p_category VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    metric_name VARCHAR,
    value DECIMAL(15,2),
    date DATE,
    is_calculated BOOLEAN,
    client_id UUID,
    client_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.value,
        m.date,
        m.is_calculated,
        m.client_id,
        c.name as client_name
    FROM metrics m
    INNER JOIN clients c ON m.client_id = c.id
    WHERE m.user_id = p_user_id
    AND c.client_type = 'undeniable'  -- Only undeniable clients
    AND (p_category IS NULL OR m.category = p_category)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;

-- ==============================================
-- RPC FUNCTION: get_undeniable_discovered_metrics
-- ==============================================

CREATE OR REPLACE FUNCTION get_undeniable_discovered_metrics(
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
    INNER JOIN clients c ON dm.client_id = c.id
    WHERE dm.user_id = p_user_id
    AND c.client_type = 'undeniable'  -- Only undeniable clients
    ORDER BY dm.created_at DESC;
END;
$$;

-- ==============================================
-- RPC FUNCTION: get_undeniable_sync_status
-- ==============================================

CREATE OR REPLACE FUNCTION get_undeniable_sync_status(
    p_user_id UUID,
    p_google_sheet_id TEXT
)
RETURNS TABLE (
    sync_status TEXT,
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_error_message TEXT,
    total_sync_count INTEGER,
    successful_sync_count INTEGER,
    sheet_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.sync_status,
        ss.last_sync_at,
        ss.last_successful_sync_at,
        ss.sync_error_message,
        ss.total_sync_count,
        ss.successful_sync_count,
        ss.sheet_name
    FROM sync_status ss
    INNER JOIN clients c ON ss.client_id = c.id
    WHERE ss.user_id = p_user_id
    AND ss.google_sheet_id = p_google_sheet_id
    AND c.client_type = 'undeniable'  -- Only undeniable clients
    ORDER BY ss.created_at DESC
    LIMIT 1;
END;
$$;

-- ==============================================
-- LOG SUCCESS
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Added undeniable dashboard RPC functions';
    RAISE NOTICE 'get_undeniable_dashboard_metrics - filters metrics by undeniable clients only';
    RAISE NOTICE 'get_undeniable_discovered_metrics - filters discovered metrics by undeniable clients only';
    RAISE NOTICE 'get_undeniable_sync_status - filters sync status by undeniable clients only';
END $$;
