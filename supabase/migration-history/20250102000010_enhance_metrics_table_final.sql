-- ==============================================
-- ENHANCE METRICS TABLE - SINGLE SOURCE OF TRUTH
-- ==============================================
-- This migration enhances the metrics table to be the single source of truth
-- for all metric data, replacing the discovered_metrics table approach

-- Add missing columns to metrics table
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
ADD COLUMN IF NOT EXISTS sheet_name TEXT,
ADD COLUMN IF NOT EXISTS tab_name TEXT,
ADD COLUMN IF NOT EXISTS tab_gid TEXT;

-- Add comments for documentation
COMMENT ON COLUMN metrics.google_sheet_id IS 'Google Sheets spreadsheet ID';
COMMENT ON COLUMN metrics.sheet_name IS 'Google Sheets spreadsheet name';
COMMENT ON COLUMN metrics.tab_name IS 'Google Sheets worksheet name';
COMMENT ON COLUMN metrics.tab_gid IS 'Google Sheets tab GID for tracking';

-- ==============================================
-- UPDATE UNIQUE CONSTRAINT
-- ==============================================

-- Drop existing unique constraint
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_user_id_client_id_date_category_metric_name_key;

-- Create new unique constraint with sheet/tab information
ALTER TABLE metrics ADD CONSTRAINT metrics_unique_per_sheet_tab 
UNIQUE(user_id, client_id, google_sheet_id, sheet_name, tab_name, date, category, metric_name);

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_user_sheet ON metrics(user_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_client_sheet ON metrics(client_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab ON metrics(sheet_name, tab_name);
CREATE INDEX IF NOT EXISTS idx_metrics_google_sheet ON metrics(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date_category ON metrics(date, category);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON metrics(metric_name);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_metrics_user_client_sheet ON metrics(user_id, client_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab_date ON metrics(sheet_name, tab_name, date);

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get metrics by sheet and tab
CREATE OR REPLACE FUNCTION get_metrics_by_sheet_tab(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_sheet_name TEXT DEFAULT NULL,
    p_tab_name TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    metric_name TEXT,
    value DECIMAL(15,2),
    date DATE,
    category TEXT,
    sheet_name TEXT,
    tab_name TEXT,
    google_sheet_id TEXT
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
        m.category,
        m.sheet_name,
        m.tab_name,
        m.google_sheet_id
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_sheet_name IS NULL OR m.sheet_name = p_sheet_name)
    AND (p_tab_name IS NULL OR m.tab_name = p_tab_name)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;

-- Function to get hierarchical data structure
CREATE OR REPLACE FUNCTION get_hierarchical_data_from_metrics(
    p_user_id UUID
)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    sheet_name TEXT,
    tab_name TEXT,
    tab_gid TEXT,
    google_sheet_id TEXT,
    metrics_count BIGINT,
    latest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as client_id,
        c.name as client_name,
        m.sheet_name,
        m.tab_name,
        m.tab_gid,
        m.google_sheet_id,
        COUNT(DISTINCT m.metric_name) as metrics_count,
        MAX(m.date) as latest_date
    FROM clients c
    INNER JOIN metrics m ON c.id = m.client_id
    WHERE c.user_id = p_user_id
    GROUP BY c.id, c.name, m.sheet_name, m.tab_name, m.tab_gid, m.google_sheet_id
    ORDER BY c.name, m.sheet_name, m.tab_name;
END;
$$;

-- Function to get available sheets for a user
CREATE OR REPLACE FUNCTION get_available_sheets_for_user(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
    sheet_name TEXT,
    tab_name TEXT,
    google_sheet_id TEXT,
    metrics_count BIGINT,
    latest_sync TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.sheet_name,
        m.tab_name,
        m.google_sheet_id,
        COUNT(DISTINCT m.metric_name) as metrics_count,
        MAX(m.created_at) as latest_sync
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.sheet_name, m.tab_name, m.google_sheet_id
    ORDER BY m.sheet_name, m.tab_name;
END;
$$;

-- Function to get metric configurations (available metrics)
CREATE OR REPLACE FUNCTION get_metric_configurations(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_sheet_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    metric_name TEXT,
    category TEXT,
    sheet_name TEXT,
    tab_name TEXT,
    total_entries BIGINT,
    latest_date DATE,
    avg_value DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.category,
        m.sheet_name,
        m.tab_name,
        COUNT(*) as total_entries,
        MAX(m.date) as latest_date,
        AVG(m.value) as avg_value
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_sheet_name IS NULL OR m.sheet_name = p_sheet_name)
    GROUP BY m.metric_name, m.category, m.sheet_name, m.tab_name
    ORDER BY m.sheet_name, m.tab_name, m.metric_name;
END;
$$;

-- ==============================================
-- DROP DISCOVERED_METRICS TABLE
-- ==============================================

-- Drop discovered_metrics table and all related functions
DROP TABLE IF EXISTS discovered_metrics CASCADE;

-- Drop any functions that reference discovered_metrics
DROP FUNCTION IF EXISTS get_discovered_metrics_by_sheet(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_hierarchical_data_from_discovered_metrics(UUID);
DROP FUNCTION IF EXISTS search_metrics_in_discovered_metrics(UUID, TEXT, TEXT, DATE, DATE);

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the enhanced metrics table structure
DO $$
DECLARE
    has_google_sheet_id BOOLEAN;
    has_tab_name BOOLEAN;
    has_tab_gid BOOLEAN;
    discovered_metrics_exists BOOLEAN;
BEGIN
    -- Check if new columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'google_sheet_id'
    ) INTO has_google_sheet_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'tab_name'
    ) INTO has_tab_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'tab_gid'
    ) INTO has_tab_gid;
    
    -- Check if discovered_metrics table was dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'discovered_metrics'
    ) INTO discovered_metrics_exists;
    
    -- Verify results
    IF NOT has_google_sheet_id THEN
        RAISE EXCEPTION 'google_sheet_id column was not added to metrics table';
    END IF;
    
    IF NOT has_tab_name THEN
        RAISE EXCEPTION 'tab_name column was not added to metrics table';
    END IF;
    
    IF NOT has_tab_gid THEN
        RAISE EXCEPTION 'tab_gid column was not added to metrics table';
    END IF;
    
    IF discovered_metrics_exists THEN
        RAISE EXCEPTION 'discovered_metrics table was not dropped';
    END IF;
    
    RAISE NOTICE 'Enhanced metrics table setup completed successfully';
    RAISE NOTICE 'discovered_metrics table removed';
    RAISE NOTICE 'New columns added: google_sheet_id, tab_name, tab_gid';
    RAISE NOTICE 'Performance indexes created';
    RAISE NOTICE 'Helper functions created';
END;
$$;
