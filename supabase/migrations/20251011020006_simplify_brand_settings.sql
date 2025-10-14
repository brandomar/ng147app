-- ==============================================
-- SIMPLIFY BRAND SETTINGS TABLE
-- ==============================================
-- This migration simplifies the brand_settings table by removing redundant fields,
-- flattening the ui JSONB column, and cleaning up metadata bloat

-- Add new columns from ui JSONB
ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS login_title TEXT DEFAULT 'Welcome to Dashboard',
ADD COLUMN IF NOT EXISTS dashboard_title TEXT DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Welcome to your dashboard',
ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT '© 2024 Dashboard. All rights reserved.';

-- Migrate data from ui JSONB to new columns
UPDATE brand_settings
SET 
  login_title = COALESCE(ui->>'loginTitle', 'Welcome to Dashboard'),
  dashboard_title = COALESCE(ui->>'dashboardTitle', application_name, 'Dashboard'),
  welcome_message = COALESCE(ui->>'welcomeMessage', 'Welcome to your dashboard'),
  footer_text = COALESCE(ui->>'footerText', '© 2024 Dashboard. All rights reserved.');

-- Fix tagline (convert "None" string to NULL)
UPDATE brand_settings
SET tagline = NULL
WHERE tagline = 'None';

-- Fix copyright_text to use company name
UPDATE brand_settings
SET copyright_text = '© ' || EXTRACT(YEAR FROM CURRENT_DATE) || ' ' || company_name || '. All rights reserved.'
WHERE copyright_text = 'Copyright' OR copyright_text IS NULL;

-- Drop redundant/unused columns
ALTER TABLE brand_settings 
DROP COLUMN IF EXISTS ui,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS company_description,
DROP COLUMN IF EXISTS background_image_file_path,
DROP COLUMN IF EXISTS background_color;

-- Add helpful comments
COMMENT ON COLUMN brand_settings.login_title IS 'Title displayed on login page';
COMMENT ON COLUMN brand_settings.dashboard_title IS 'Title displayed in dashboard header';
COMMENT ON COLUMN brand_settings.welcome_message IS 'Welcome message shown to users after login';
COMMENT ON COLUMN brand_settings.footer_text IS 'Footer text displayed across the application';
COMMENT ON COLUMN brand_settings.tagline IS 'Optional company tagline or slogan';
COMMENT ON COLUMN brand_settings.copyright_text IS 'Copyright text for footer';
COMMENT ON COLUMN brand_settings.logo_file_path IS 'Path to logo file in Supabase storage (shows text fallback if NULL)';

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the simplified table structure
DO $$
BEGIN
    -- Check if new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'login_title'
    ) THEN
        RAISE EXCEPTION 'Column login_title missing from brand_settings table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'dashboard_title'
    ) THEN
        RAISE EXCEPTION 'Column dashboard_title missing from brand_settings table';
    END IF;
    
    -- Check if old columns were removed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'ui'
    ) THEN
        RAISE EXCEPTION 'Column ui still exists in brand_settings table - should have been removed';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_settings' AND column_name = 'company_description'
    ) THEN
        RAISE EXCEPTION 'Column company_description still exists in brand_settings table - should have been removed';
    END IF;
    
    RAISE NOTICE 'Brand settings table simplified successfully';
END $$;
