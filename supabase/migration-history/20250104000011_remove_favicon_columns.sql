-- Remove favicon columns from brand_settings table
-- These columns are no longer needed

-- Remove favicon file path column
ALTER TABLE brand_settings DROP COLUMN IF EXISTS favicon_file_path;

-- Verify the removal
DO $$
BEGIN
    -- Check if favicon_file_path column no longer exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' 
        AND column_name = 'favicon_file_path'
    ) THEN
        RAISE EXCEPTION 'favicon_file_path column still exists in brand_settings table';
    END IF;
    
    RAISE NOTICE 'favicon_file_path column successfully removed from brand_settings table';
END $$;
