-- Add data_source field to metrics table for tracking Excel vs Google Sheets data
-- This allows us to distinguish between data sources while maintaining unified dashboard

-- ==============================================
-- ADD DATA SOURCE FIELD
-- ==============================================

-- Add data_source column to metrics table
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'google-sheets' 
CHECK (data_source IN ('google-sheets', 'excel-import'));

-- Add comment for documentation
COMMENT ON COLUMN metrics.data_source IS 'Data source type: google-sheets or excel-import';

-- ==============================================
-- UPDATE EXISTING RECORDS
-- ==============================================

-- Set all existing records to 'google-sheets' (they were created via Google Sheets sync)
UPDATE metrics 
SET data_source = 'google-sheets' 
WHERE data_source IS NULL;

-- ==============================================
-- ADD INDEX FOR PERFORMANCE
-- ==============================================

-- Add index for data_source filtering
CREATE INDEX IF NOT EXISTS idx_metrics_data_source ON metrics(data_source);

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the column was added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' 
        AND column_name = 'data_source'
    ) THEN
        RAISE EXCEPTION 'data_source column was not added to metrics table';
    END IF;
    
    RAISE NOTICE 'data_source column successfully added to metrics table';
END $$;
