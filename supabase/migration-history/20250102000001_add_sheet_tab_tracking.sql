-- Add Sheet and Tab Tracking to Metrics Table
-- This enables Client → Sheet → Tab hierarchy for metric organization

-- ==============================================
-- ADD SHEET AND TAB TRACKING COLUMNS
-- ==============================================

-- Add sheet and tab tracking columns to metrics table
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS sheet_name TEXT,
ADD COLUMN IF NOT EXISTS tab_name TEXT,
ADD COLUMN IF NOT EXISTS tab_gid TEXT;

-- Add comments for documentation
COMMENT ON COLUMN metrics.sheet_name IS 'Name of the sheet where this metric was found';
COMMENT ON COLUMN metrics.tab_name IS 'Name of the tab where this metric was found';
COMMENT ON COLUMN metrics.tab_gid IS 'Google Sheets tab GID for tracking';

-- ==============================================
-- ADD INDEXES FOR PERFORMANCE
-- ==============================================

-- Add indexes for sheet and tab filtering
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_name ON metrics(sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_tab_name ON metrics(tab_name);
CREATE INDEX IF NOT EXISTS idx_metrics_tab_gid ON metrics(tab_gid);

-- Composite index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_metrics_client_sheet_tab ON metrics(client_id, sheet_name, tab_name);

-- ==============================================
-- UPDATE EXISTING RECORDS
-- ==============================================

-- Set default sheet and tab names for existing records
-- This will be updated when we sync the data with proper sheet/tab information
UPDATE metrics 
SET 
  sheet_name = 'Default Sheet',
  tab_name = 'Default Tab',
  tab_gid = '0'
WHERE sheet_name IS NULL;

-- ==============================================
-- CREATE SHEET MANAGEMENT TABLES
-- ==============================================

-- Create table for managing client sheets
CREATE TABLE IF NOT EXISTS client_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  sheet_url TEXT,
  sheet_type TEXT DEFAULT 'google-sheets' CHECK (sheet_type IN ('google-sheets', 'excel')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique sheet names per client
  UNIQUE(client_id, sheet_name)
);

-- Create table for managing sheet tabs
CREATE TABLE IF NOT EXISTS sheet_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES client_sheets(id) ON DELETE CASCADE,
  tab_name TEXT NOT NULL,
  tab_gid TEXT,
  tab_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique tab names per sheet
  UNIQUE(sheet_id, tab_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_sheets_client_id ON client_sheets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sheets_active ON client_sheets(is_active);
CREATE INDEX IF NOT EXISTS idx_sheet_tabs_sheet_id ON sheet_tabs(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_tabs_active ON sheet_tabs(is_active);

-- ==============================================
-- CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to get metrics by sheet and tab
CREATE OR REPLACE FUNCTION get_metrics_by_sheet_tab(
  p_user_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_sheet_name TEXT DEFAULT NULL,
  p_tab_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_name TEXT,
  value DECIMAL(15,2),
  date DATE,
  category TEXT,
  sheet_name TEXT,
  tab_name TEXT,
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
    m.category,
    m.sheet_name,
    m.tab_name,
    c.name as client_name
  FROM metrics m
  INNER JOIN clients c ON m.client_id = c.id
  WHERE m.user_id = p_user_id
  AND (p_client_id IS NULL OR m.client_id = p_client_id)
  AND (p_sheet_name IS NULL OR m.sheet_name = p_sheet_name)
  AND (p_tab_name IS NULL OR m.tab_name = p_tab_name)
  ORDER BY m.date DESC, m.metric_name;
END;
$$;

-- Function to get hierarchical data structure
CREATE OR REPLACE FUNCTION get_hierarchical_data_structure(p_user_id UUID)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  sheet_id UUID,
  sheet_name TEXT,
  sheet_url TEXT,
  sheet_type TEXT,
  tab_id UUID,
  tab_name TEXT,
  tab_gid TEXT,
  tab_url TEXT,
  metrics_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    cs.id as sheet_id,
    cs.sheet_name,
    cs.sheet_url,
    cs.sheet_type,
    st.id as tab_id,
    st.tab_name,
    st.tab_gid,
    st.tab_url,
    COUNT(m.id) as metrics_count
  FROM clients c
  LEFT JOIN client_sheets cs ON c.id = cs.client_id AND cs.is_active = true
  LEFT JOIN sheet_tabs st ON cs.id = st.sheet_id AND st.is_active = true
  LEFT JOIN metrics m ON c.id = m.client_id 
    AND (cs.sheet_name IS NULL OR m.sheet_name = cs.sheet_name)
    AND (st.tab_name IS NULL OR m.tab_name = st.tab_name)
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, cs.id, cs.sheet_name, cs.sheet_url, cs.sheet_type, 
           st.id, st.tab_name, st.tab_gid, st.tab_url
  ORDER BY c.name, cs.sheet_name, st.tab_name;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the columns were added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' 
        AND column_name = 'sheet_name'
    ) THEN
        RAISE EXCEPTION 'sheet_name column was not added to metrics table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' 
        AND column_name = 'tab_name'
    ) THEN
        RAISE EXCEPTION 'tab_name column was not added to metrics table';
    END IF;
    
    RAISE NOTICE 'Sheet and tab tracking columns successfully added to metrics table';
    RAISE NOTICE 'Client sheets and sheet tabs tables created';
    RAISE NOTICE 'Helper functions created for hierarchical data access';
END $$;
