-- ==============================================
-- REMOVE UNUSED BRAND SETTINGS COLUMNS
-- ==============================================
-- This migration removes dashboard_title and footer_text columns
-- since we decided to use application_name for dashboard title
-- and copyrightText for footer instead

-- Remove unused columns
ALTER TABLE brand_settings 
DROP COLUMN IF EXISTS dashboard_title,
DROP COLUMN IF EXISTS footer_text;

-- Add helpful comments for remaining columns
COMMENT ON COLUMN brand_settings.login_title IS 'Title displayed on login page';
COMMENT ON COLUMN brand_settings.welcome_message IS 'Welcome message shown to users after login';
COMMENT ON COLUMN brand_settings.tagline IS 'Optional company tagline or slogan';
COMMENT ON COLUMN brand_settings.copyright_text IS 'Copyright text for footer';
COMMENT ON COLUMN brand_settings.logo_file_path IS 'Path to logo file in Supabase storage (shows text fallback if NULL)';

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the columns were removed
DO $$
BEGIN
    -- Check if dashboard_title was removed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'dashboard_title'
    ) THEN
        RAISE EXCEPTION 'Column dashboard_title still exists in brand_settings table - should have been removed';
    END IF;
    
    -- Check if footer_text was removed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'footer_text'
    ) THEN
        RAISE EXCEPTION 'Column footer_text still exists in brand_settings table - should have been removed';
    END IF;
    
    RAISE NOTICE 'Unused brand settings columns removed successfully';
END $$;
