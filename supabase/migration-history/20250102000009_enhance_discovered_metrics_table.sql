-- ==============================================
-- ENHANCE DISCOVERED_METRICS TABLE
-- ==============================================
-- This migration enhances the discovered_metrics table to be the single source of truth
-- for all metric data, replacing the current metrics table approach

-- Add missing columns to discovered_metrics
ALTER TABLE discovered_metrics 
ADD COLUMN IF NOT EXISTS tab_name TEXT,
ADD COLUMN IF NOT EXISTS tab_gid TEXT,
ADD COLUMN IF NOT EXISTS metric_values JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_data_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN discovered_metrics.tab_name IS 'Google Sheets worksheet name';
COMMENT ON COLUMN discovered_metrics.tab_gid IS 'Google Sheets tab GID for tracking';
COMMENT ON COLUMN discovered_metrics.metric_values IS 'Time series data for all metrics in this sheet/tab';
COMMENT ON COLUMN discovered_metrics.total_data_points IS 'Total number of data points stored';

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Add performance indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_discovered_metrics_configs 
ON discovered_metrics USING GIN (metric_configs);

CREATE INDEX IF NOT EXISTS idx_discovered_metrics_values 
ON discovered_metrics USING GIN (metric_values);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_discovered_metrics_user_sheet 
ON discovered_metrics(user_id, sheet_name);

CREATE INDEX IF NOT EXISTS idx_discovered_metrics_client_sheet 
ON discovered_metrics(client_id, sheet_name);

CREATE INDEX IF NOT EXISTS idx_discovered_metrics_tab 
ON discovered_metrics(tab_name);

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get metrics by sheet with JSONB queries
CREATE OR REPLACE FUNCTION get_discovered_metrics_by_sheet(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_sheet_name TEXT DEFAULT NULL,
    p_tab_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    sheet_name TEXT,
    tab_name TEXT,
    metric_configs JSONB,
    metric_values JSONB,
    total_configured_metrics INTEGER,
    total_data_points INTEGER,
    last_sync_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.sheet_name,
        dm.tab_name,
        dm.metric_configs,
        dm.metric_values,
        dm.total_configured_metrics,
        dm.total_data_points,
        dm.last_sync_at
    FROM discovered_metrics dm
    WHERE dm.user_id = p_user_id
    AND (p_client_id IS NULL OR dm.client_id = p_client_id)
    AND (p_sheet_name IS NULL OR dm.sheet_name = p_sheet_name)
    AND (p_tab_name IS NULL OR dm.tab_name = p_tab_name)
    AND dm.is_active = true
    ORDER BY dm.sheet_name, dm.tab_name;
END;
$$;

-- Function to get hierarchical data structure from discovered_metrics
CREATE OR REPLACE FUNCTION get_hierarchical_data_from_discovered_metrics(
    p_user_id UUID
)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    sheet_id UUID,
    sheet_name TEXT,
    tab_name TEXT,
    tab_gid TEXT,
    metrics_count BIGINT,
    data_points_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as client_id,
        c.name as client_name,
        dm.id as sheet_id,
        dm.sheet_name,
        dm.tab_name,
        dm.tab_gid,
        dm.total_configured_metrics as metrics_count,
        dm.total_data_points as data_points_count
    FROM clients c
    INNER JOIN discovered_metrics dm ON c.id = dm.client_id
    WHERE c.user_id = p_user_id
    AND dm.is_active = true
    ORDER BY c.name, dm.sheet_name, dm.tab_name;
END;
$$;

-- Function to search metrics within JSONB values
CREATE OR REPLACE FUNCTION search_metrics_in_discovered_metrics(
    p_user_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    sheet_name TEXT,
    tab_name TEXT,
    metric_name TEXT,
    value DECIMAL(15,2),
    date DATE,
    category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.sheet_name,
        dm.tab_name,
        (metric->>'metric_name')::TEXT as metric_name,
        (metric->>'value')::DECIMAL(15,2) as value,
        (metric->>'date')::DATE as date,
        (metric->>'category')::TEXT as category
    FROM discovered_metrics dm,
    LATERAL jsonb_array_elements(dm.metric_values) as metric
    WHERE dm.user_id = p_user_id
    AND dm.is_active = true
    AND (p_search_term IS NULL OR (metric->>'metric_name') ILIKE '%' || p_search_term || '%')
    AND (p_category IS NULL OR (metric->>'category') = p_category)
    AND (p_start_date IS NULL OR (metric->>'date')::DATE >= p_start_date)
    AND (p_end_date IS NULL OR (metric->>'date')::DATE <= p_end_date)
    ORDER BY (metric->>'date')::DATE DESC, (metric->>'metric_name')::TEXT;
END;
$$;

-- ==============================================
-- DATA MIGRATION FROM METRICS TABLE
-- ==============================================

-- Create temporary function to migrate data from metrics to discovered_metrics
CREATE OR REPLACE FUNCTION migrate_metrics_to_discovered_metrics()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    migration_count INTEGER := 0;
    sheet_record RECORD;
    metric_config JSONB;
    metric_values JSONB;
    total_migrated INTEGER := 0;
BEGIN
    -- Group metrics by user, client, and sheet
    FOR sheet_record IN 
        SELECT DISTINCT 
            m.user_id,
            m.client_id,
            COALESCE(m.sheet_name, 'Default Sheet') as sheet_name,
            COALESCE(m.tab_name, 'Default Tab') as tab_name,
            COALESCE(m.google_sheet_id, 'migrated-' || m.user_id) as google_sheet_id
        FROM metrics m
        WHERE m.user_id IS NOT NULL
        AND m.client_id IS NOT NULL
    LOOP
        -- Build metric configurations from unique metric names
        SELECT jsonb_agg(
            jsonb_build_object(
                'metric_name', metric_name,
                'is_enabled', true,
                'display_name', metric_name,
                'metric_type', 'number',
                'category', category
            )
        ) INTO metric_config
        FROM (
            SELECT DISTINCT metric_name, category
            FROM metrics m2
            WHERE m2.user_id = sheet_record.user_id
            AND m2.client_id = sheet_record.client_id
            AND COALESCE(m2.sheet_name, 'Default Sheet') = sheet_record.sheet_name
            AND COALESCE(m2.tab_name, 'Default Tab') = sheet_record.tab_name
        ) as unique_metrics;

        -- Build metric values from all data points
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', date,
                'metric_name', metric_name,
                'value', value,
                'category', category
            )
        ) INTO metric_values
        FROM metrics m3
        WHERE m3.user_id = sheet_record.user_id
        AND m3.client_id = sheet_record.client_id
        AND COALESCE(m3.sheet_name, 'Default Sheet') = sheet_record.sheet_name
        AND COALESCE(m3.tab_name, 'Default Tab') = sheet_record.tab_name
        ORDER BY date DESC;

        -- Insert or update discovered_metrics record
        INSERT INTO discovered_metrics (
            user_id,
            client_id,
            google_sheet_id,
            sheet_name,
            tab_name,
            metric_configs,
            metric_values,
            total_configured_metrics,
            total_data_points,
            is_active,
            last_sync_at
        ) VALUES (
            sheet_record.user_id,
            sheet_record.client_id,
            sheet_record.google_sheet_id,
            sheet_record.sheet_name,
            sheet_record.tab_name,
            metric_config,
            metric_values,
            jsonb_array_length(metric_config),
            jsonb_array_length(metric_values),
            true,
            NOW()
        )
        ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name, tab_name)
        DO UPDATE SET
            metric_configs = EXCLUDED.metric_configs,
            metric_values = EXCLUDED.metric_values,
            total_configured_metrics = EXCLUDED.total_configured_metrics,
            total_data_points = EXCLUDED.total_data_points,
            last_sync_at = EXCLUDED.last_sync_at,
            updated_at = NOW();

        migration_count := migration_count + 1;
    END LOOP;

    -- Count total migrated records
    SELECT COUNT(*) INTO total_migrated FROM discovered_metrics WHERE last_sync_at IS NOT NULL;

    RETURN 'Migration completed: ' || migration_count || ' sheets processed, ' || total_migrated || ' total records in discovered_metrics';
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the migration worked
DO $$
DECLARE
    metrics_count INTEGER;
    discovered_count INTEGER;
BEGIN
    -- Count records in metrics table
    SELECT COUNT(*) INTO metrics_count FROM metrics;
    
    -- Count records in discovered_metrics table
    SELECT COUNT(*) INTO discovered_count FROM discovered_metrics;
    
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE 'Metrics table records: %', metrics_count;
    RAISE NOTICE 'Discovered metrics table records: %', discovered_count;
    
    IF discovered_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: No records found in discovered_metrics table';
    END IF;
    
    RAISE NOTICE 'Enhanced discovered_metrics table setup completed successfully';
END;
$$;
