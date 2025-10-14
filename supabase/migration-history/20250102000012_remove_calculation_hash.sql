-- ==============================================
-- REMOVE UNUSED CALCULATION_HASH COLUMN
-- ==============================================
-- This migration removes the unused calculation_hash column from the metrics table
-- The is_calculated boolean field serves the same purpose more efficiently

-- Drop the calculation_hash column
ALTER TABLE metrics DROP COLUMN IF EXISTS calculation_hash;

-- Add comment to document the removal
COMMENT ON COLUMN metrics.is_calculated IS 'Boolean flag indicating if this metric is calculated/derived (true) or raw data (false)';

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the column was removed
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if calculation_hash column still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'calculation_hash'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE EXCEPTION 'calculation_hash column still exists - removal failed';
    END IF;
    
    -- Verify is_calculated column still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'is_calculated'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'is_calculated column missing - this should not happen';
    END IF;
    
    RAISE NOTICE 'calculation_hash column successfully removed';
    RAISE NOTICE 'is_calculated column confirmed to exist';
    RAISE NOTICE 'Metrics table optimized for current usage patterns';
END;
$$;
