-- Add Google Sheets Tab Discovery Functions
-- Generated: 2025-09-29
-- Enables discovery of available tabs in Google Sheets

-- ==============================================
-- GOOGLE SHEETS TAB DISCOVERY FUNCTIONS
-- ==============================================

-- Function to discover tabs in a Google Sheet
CREATE OR REPLACE FUNCTION discover_google_sheets_tabs(
    p_spreadsheet_id TEXT
)
RETURNS TABLE (
    tab_name TEXT,
    tab_gid TEXT,
    tab_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_spreadsheet_url TEXT;
BEGIN
    -- Construct the spreadsheet URL
    v_spreadsheet_url := 'https://docs.google.com/spreadsheets/d/' || p_spreadsheet_id || '/edit';
    
    -- TODO: Implement actual Google Sheets API call
    -- For now, return mock data for development
    RETURN QUERY
    SELECT 
        'Sales Data'::TEXT as tab_name,
        '0'::TEXT as tab_gid,
        (v_spreadsheet_url || '#gid=0')::TEXT as tab_url
    UNION ALL
    SELECT 
        'Marketing Metrics'::TEXT as tab_name,
        '123456789'::TEXT as tab_gid,
        (v_spreadsheet_url || '#gid=123456789')::TEXT as tab_url
    UNION ALL
    SELECT 
        'Lead Generation'::TEXT as tab_name,
        '987654321'::TEXT as tab_gid,
        (v_spreadsheet_url || '#gid=987654321')::TEXT as tab_url
    UNION ALL
    SELECT 
        'Revenue Tracking'::TEXT as tab_name,
        '456789123'::TEXT as tab_gid,
        (v_spreadsheet_url || '#gid=456789123')::TEXT as tab_url;
END;
$$;

-- Function to create multiple data sources from Google Sheets tabs
CREATE OR REPLACE FUNCTION create_google_sheets_data_sources(
    p_client_id UUID,
    p_base_name TEXT,
    p_spreadsheet_id TEXT,
    p_selected_tabs JSONB
)
RETURNS TABLE (
    data_source_id UUID,
    data_source_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tab JSONB;
    v_data_source_id UUID;
    v_data_source_name TEXT;
    v_display_order INTEGER := 0;
BEGIN
    -- Loop through selected tabs
    FOR v_tab IN SELECT * FROM jsonb_array_elements(p_selected_tabs)
    LOOP
        -- Generate unique data source name
        v_data_source_name := p_base_name || ' - ' || (v_tab->>'name');
        
        -- Create data source
        INSERT INTO data_sources (
            client_id,
            name,
            source_type,
            source_config,
            is_active,
            display_order
        ) VALUES (
            p_client_id,
            v_data_source_name,
            'google_sheets',
            jsonb_build_object(
                'spreadsheet_id', p_spreadsheet_id,
                'sheet_name', v_tab->>'name',
                'sheet_gid', v_tab->>'gid',
                'range', 'A:AZ',
                'auto_sync', true,
                'sync_frequency', 'daily'
            ),
            true,
            v_display_order
        ) RETURNING id INTO v_data_source_id;
        
        -- Return the created data source info
        RETURN QUERY SELECT v_data_source_id, v_data_source_name;
        
        -- Increment display order
        v_display_order := v_display_order + 1;
    END LOOP;
END;
$$;

-- Function to get data sources for a client with tab information
CREATE OR REPLACE FUNCTION get_client_data_sources(p_client_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    source_type TEXT,
    source_config JSONB,
    is_active BOOLEAN,
    display_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name,
        ds.source_type,
        ds.source_config,
        ds.is_active,
        ds.display_order,
        ds.created_at,
        ds.updated_at
    FROM data_sources ds
    WHERE ds.client_id = p_client_id
    ORDER BY ds.display_order, ds.created_at;
END;
$$;

-- ==============================================
-- RLS POLICIES FOR NEW FUNCTIONS
-- ==============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION discover_google_sheets_tabs(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_google_sheets_data_sources(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_data_sources(UUID) TO authenticated;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Google Sheets tab discovery functions created successfully';
    RAISE NOTICE 'discover_google_sheets_tabs function created';
    RAISE NOTICE 'create_google_sheets_data_sources function created';
    RAISE NOTICE 'get_client_data_sources function created';
    RAISE NOTICE 'Execute permissions granted to authenticated users';
END $$;
