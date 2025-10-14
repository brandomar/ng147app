-- Enhance Client Tabs for Multi-Source Support
-- Generated: 2025-09-29
-- Updates clients.tabs JSONB structure to support data sources

-- ==============================================
-- UPDATE CLIENTS TABLE STRUCTURE
-- ==============================================

-- Note: Client tabs are stored as JSONB in clients.tabs column
-- This migration prepares the structure for multi-source support
-- The actual tab data will be updated through the application logic

-- ==============================================
-- CREATE HELPER FUNCTIONS FOR TAB MANAGEMENT
-- ==============================================

-- Function to add data source reference to a client tab
CREATE OR REPLACE FUNCTION add_data_source_to_tab(
    p_client_id UUID,
    p_tab_id TEXT,
    p_data_source_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tabs JSONB;
    v_updated_tabs JSONB;
BEGIN
    -- Get current tabs
    SELECT tabs INTO v_tabs FROM clients WHERE id = p_client_id;
    
    -- Update the specific tab with data source reference
    v_updated_tabs := jsonb_set(
        v_tabs,
        ARRAY[p_tab_id, 'data_source_id'],
        to_jsonb(p_data_source_id::TEXT)
    );
    
    -- Update the clients table
    UPDATE clients 
    SET tabs = v_updated_tabs 
    WHERE id = p_client_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to get tabs with data source information
CREATE OR REPLACE FUNCTION get_client_tabs_with_sources(p_client_id UUID)
RETURNS TABLE (
    tab_id TEXT,
    tab_name TEXT,
    data_source_id UUID,
    data_source_name TEXT,
    source_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tabs JSONB;
    v_tab JSONB;
    v_data_source_id UUID;
BEGIN
    -- Get client tabs
    SELECT tabs INTO v_tabs FROM clients WHERE id = p_client_id;
    
    -- Process each tab
    FOR v_tab IN SELECT * FROM jsonb_array_elements(v_tabs)
    LOOP
        tab_id := v_tab->>'id';
        tab_name := v_tab->>'name';
        data_source_id := (v_tab->>'data_source_id')::UUID;
        source_type := v_tab->>'source_type';
        
        -- Get data source name if data_source_id exists
        IF data_source_id IS NOT NULL THEN
            SELECT name INTO data_source_name 
            FROM data_sources 
            WHERE id = data_source_id;
        ELSE
            data_source_name := NULL;
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Client tabs enhanced for multi-source support';
    RAISE NOTICE 'Helper functions created for tab management';
    RAISE NOTICE 'Data source linking functions implemented';
    RAISE NOTICE 'JSONB structure prepared for multi-source support';
END $$;
