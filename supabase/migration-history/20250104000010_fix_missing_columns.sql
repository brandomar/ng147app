-- Fix missing columns in brand_settings table
-- Ensure all required columns exist for the application to work

-- Add missing columns that the application expects
ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS application_name TEXT DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS copyright_text TEXT,
ADD COLUMN IF NOT EXISTS logo_file_path TEXT,
ADD COLUMN IF NOT EXISTS favicon_file_path TEXT,
ADD COLUMN IF NOT EXISTS background_image_file_path TEXT;

-- Verify the table structure
DO $$
BEGIN
    -- Check if application_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' 
        AND column_name = 'application_name'
    ) THEN
        RAISE EXCEPTION 'application_name column is missing from brand_settings table';
    END IF;
    
    RAISE NOTICE 'brand_settings table structure verified successfully';
END $$;
