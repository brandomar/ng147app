-- Remove redundant data_sources table
-- The data_source column in metrics table provides sufficient functionality
-- Generated: 2025-01-02

-- ==============================================
-- REMOVE REDUNDANT DATA SOURCES TABLE
-- ==============================================

-- First, check if the table exists and has any data
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    -- Check if data_sources table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'data_sources'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Count records in data_sources table
        SELECT COUNT(*) INTO record_count FROM data_sources;
        
        RAISE NOTICE 'data_sources table exists with % records', record_count;
        
        -- Log any data that might be lost
        IF record_count > 0 THEN
            RAISE NOTICE 'WARNING: data_sources table contains % records that will be deleted', record_count;
            RAISE NOTICE 'Consider backing up data_sources table before proceeding';
        END IF;
    ELSE
        RAISE NOTICE 'data_sources table does not exist - nothing to remove';
    END IF;
END $$;

-- Drop the data_sources table and all related objects
DROP TABLE IF EXISTS data_sources CASCADE;

-- Drop any functions that reference data_sources table
DROP FUNCTION IF EXISTS create_data_sources_for_tabs(
    p_client_id UUID,
    p_selected_tabs JSONB,
    p_base_name TEXT,
    p_spreadsheet_id TEXT
) CASCADE;

DROP FUNCTION IF EXISTS get_client_data_sources(p_client_id UUID) CASCADE;

-- Drop any indexes related to data_sources
DROP INDEX IF EXISTS idx_data_sources_client_id;
DROP INDEX IF EXISTS idx_data_sources_source_type;
DROP INDEX IF EXISTS idx_data_sources_is_active;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the table was removed
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'data_sources'
    ) THEN
        RAISE EXCEPTION 'data_sources table still exists after removal attempt';
    ELSE
        RAISE NOTICE '✅ data_sources table successfully removed';
    END IF;
END $$;

-- Verify metrics table still has data_source column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' 
        AND column_name = 'data_source'
    ) THEN
        RAISE EXCEPTION 'metrics.data_source column is missing';
    ELSE
        RAISE NOTICE '✅ metrics.data_source column is intact';
    END IF;
END $$;

-- ==============================================
-- CLEANUP COMPLETE
-- ==============================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed successfully';
    RAISE NOTICE 'Redundant data_sources table removed';
    RAISE NOTICE 'metrics.data_source column preserved for data source tracking';
    RAISE NOTICE 'Database structure optimized';
END $$;
