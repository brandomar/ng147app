-- Add Missing RPC Functions
-- Generated: 2025-01-29
-- Adds critical RPC functions that the frontend needs

-- ==============================================
-- MISSING RPC FUNCTIONS
-- ==============================================

-- Get metrics by category function (critical for frontend)
CREATE OR REPLACE FUNCTION get_metrics_by_category(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_category VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    metric_name VARCHAR,
    value DECIMAL(15,2),
    date DATE,
    is_calculated BOOLEAN
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
        m.is_calculated
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_category IS NULL OR m.category = p_category)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;

-- Get configured metrics function
CREATE OR REPLACE FUNCTION get_configured_metrics(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    client_id UUID,
    category VARCHAR,
    metric_name VARCHAR,
    value DECIMAL(15,2),
    date DATE,
    is_calculated BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.user_id,
        m.client_id,
        m.category,
        m.metric_name,
        m.value,
        m.date,
        m.is_calculated,
        m.created_at,
        m.updated_at
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    ORDER BY m.date DESC, m.category, m.metric_name;
END;
$$;

-- Get staff sheet info function
CREATE OR REPLACE FUNCTION get_staff_sheet_info(
    p_user_id UUID
)
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
    WHERE dm.user_id = p_user_id
    AND dm.is_active = TRUE
    ORDER BY dm.created_at DESC;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Missing RPC functions added successfully';
    RAISE NOTICE 'Created get_metrics_by_category function';
    RAISE NOTICE 'Created get_configured_metrics function';
    RAISE NOTICE 'Created get_staff_sheet_info function';
END $$;
