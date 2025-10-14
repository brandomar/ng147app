-- ==============================================
-- ADD DATA SOURCE SEPARATION TO METRICS TABLE
-- ==============================================
-- This migration adds data source type separation to distinguish between
-- Google Sheets and Excel data while maintaining unified calculations

-- Add data source type column
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS data_source_type VARCHAR(20) DEFAULT 'google_sheets';

-- Add data source identifier for better tracking
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS data_source_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN metrics.data_source_type IS 'Type of data source: google_sheets, excel_import, csv_import';
COMMENT ON COLUMN metrics.data_source_id IS 'Unique identifier for the data source (spreadsheet ID, file name, etc.)';

-- ==============================================
-- UPDATE EXISTING DATA
-- ==============================================

-- Set data source type for existing Google Sheets data
UPDATE metrics 
SET 
  data_source_type = 'google_sheets',
  data_source_id = google_sheet_id
WHERE google_sheet_id IS NOT NULL 
AND google_sheet_id NOT LIKE 'excel-%';

-- Set data source type for existing Excel data
UPDATE metrics 
SET 
  data_source_type = 'excel_import',
  data_source_id = google_sheet_id
WHERE google_sheet_id IS NOT NULL 
AND google_sheet_id LIKE 'excel-%';

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Add indexes for data source filtering
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_type ON metrics(data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_id ON metrics(data_source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user_data_source ON metrics(user_id, data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_client_data_source ON metrics(client_id, data_source_type);

-- Composite index for efficient data source queries
CREATE INDEX IF NOT EXISTS idx_metrics_user_client_data_source ON metrics(user_id, client_id, data_source_type);

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get metrics by data source type
CREATE OR REPLACE FUNCTION get_metrics_by_data_source(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_data_source_type VARCHAR(20) DEFAULT NULL,
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
    data_source_type VARCHAR(20),
    data_source_id VARCHAR(255)
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
        m.data_source_type,
        m.data_source_id
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_data_source_type IS NULL OR m.data_source_type = p_data_source_type)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;

-- Function to get data source summary
CREATE OR REPLACE FUNCTION get_data_source_summary(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
    data_source_type VARCHAR(20),
    data_source_count BIGINT,
    total_metrics BIGINT,
    latest_date DATE,
    categories TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.data_source_type,
        COUNT(DISTINCT m.data_source_id) as data_source_count,
        COUNT(*) as total_metrics,
        MAX(m.date) as latest_date,
        ARRAY_AGG(DISTINCT m.category) as categories
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.data_source_type
    ORDER BY m.data_source_type;
END;
$$;

-- Function to get unified metrics across all data sources
CREATE OR REPLACE FUNCTION get_unified_metrics(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_include_data_sources TEXT[] DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    metric_name TEXT,
    total_value DECIMAL(15,2),
    avg_value DECIMAL(15,2),
    count BIGINT,
    category TEXT,
    data_sources TEXT[],
    latest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        SUM(m.value) as total_value,
        AVG(m.value) as avg_value,
        COUNT(*) as count,
        m.category,
        ARRAY_AGG(DISTINCT m.data_source_type) as data_sources,
        MAX(m.date) as latest_date
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_include_data_sources IS NULL OR m.data_source_type = ANY(p_include_data_sources))
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    GROUP BY m.metric_name, m.category
    ORDER BY total_value DESC;
END;
$$;

-- Function to get data source breakdown by sheet/tab
CREATE OR REPLACE FUNCTION get_data_source_breakdown(
    p_user_id UUID,
    p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
    data_source_type VARCHAR(20),
    sheet_name TEXT,
    tab_name TEXT,
    data_source_id VARCHAR(255),
    metrics_count BIGINT,
    categories TEXT[],
    latest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.data_source_type,
        m.sheet_name,
        m.tab_name,
        m.data_source_id,
        COUNT(*) as metrics_count,
        ARRAY_AGG(DISTINCT m.category) as categories,
        MAX(m.date) as latest_date
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.data_source_type, m.sheet_name, m.tab_name, m.data_source_id
    ORDER BY m.data_source_type, m.sheet_name, m.tab_name;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the data source separation
DO $$
DECLARE
    google_sheets_count INTEGER;
    excel_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Count Google Sheets data
    SELECT COUNT(*) INTO google_sheets_count 
    FROM metrics 
    WHERE data_source_type = 'google_sheets';
    
    -- Count Excel data
    SELECT COUNT(*) INTO excel_count 
    FROM metrics 
    WHERE data_source_type = 'excel_import';
    
    -- Count total
    SELECT COUNT(*) INTO total_count FROM metrics;
    
    RAISE NOTICE 'Data source separation verification:';
    RAISE NOTICE 'Google Sheets records: %', google_sheets_count;
    RAISE NOTICE 'Excel records: %', excel_count;
    RAISE NOTICE 'Total records: %', total_count;
    
    IF total_count = 0 THEN
        RAISE NOTICE 'No data found - this is expected for new installations';
    END IF;
    
    RAISE NOTICE 'Data source separation setup completed successfully';
END;
$$;
