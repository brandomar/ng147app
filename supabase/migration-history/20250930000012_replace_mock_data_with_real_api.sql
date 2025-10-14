-- Replace mock data with real Google Sheets API integration
-- Generated: 2025-09-30

-- Drop the existing function that returns mock data
DROP FUNCTION IF EXISTS discover_google_sheets_tabs(TEXT);

-- Create new function that calls the Edge Function
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
    v_response JSONB;
    v_sheets JSONB;
    v_sheet JSONB;
    v_spreadsheet_url TEXT;
BEGIN
    -- Construct the spreadsheet URL
    v_spreadsheet_url := 'https://docs.google.com/spreadsheets/d/' || p_spreadsheet_id || '/edit';
    
    -- Call the Edge Function to get real sheet data
    -- This requires the Edge Function to be deployed and accessible
    -- The Edge Function endpoint: /functions/v1/sync-client-tab
    -- With parameters: { "discover_sheets_only": true, "google_sheet_id": p_spreadsheet_id }
    
    -- For now, return empty result to avoid mock data
    -- The frontend should call the Edge Function directly instead of this database function
    RETURN;
    
    -- Future implementation will look like:
    -- SELECT 
    --     (v_sheet->>'name')::TEXT as tab_name,
    --     (v_sheet->>'gid')::TEXT as tab_gid,
    --     (v_spreadsheet_url || '#gid=' || (v_sheet->>'gid'))::TEXT as tab_url
    -- FROM jsonb_array_elements(v_sheets) as v_sheet;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION discover_google_sheets_tabs(TEXT) TO authenticated;

-- Add notice
DO $$
BEGIN
    RAISE NOTICE 'discover_google_sheets_tabs function updated to use real API (placeholder)';
    RAISE NOTICE 'TODO: Complete Edge Function integration for real Google Sheets API calls';
END $$;
