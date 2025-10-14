-- ==============================================
-- REMOVE TAGLINE COLUMN FROM BRAND_SETTINGS
-- ==============================================
-- This migration removes the tagline column from brand_settings table
-- since it's not being used

-- Remove tagline column
ALTER TABLE brand_settings 
DROP COLUMN IF EXISTS tagline;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the column was removed
DO $$
BEGIN
    -- Check if tagline was removed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'tagline'
    ) THEN
        RAISE EXCEPTION 'Column tagline still exists in brand_settings table - should have been removed';
    END IF;
    
    RAISE NOTICE 'Tagline column removed successfully from brand_settings table';
END $$;
