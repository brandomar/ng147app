-- Clean up brand_settings table schema inconsistencies
-- Remove duplicate columns and ensure proper schema

-- Remove old URL-based asset columns (keep file_path versions)
ALTER TABLE brand_settings DROP COLUMN IF EXISTS logo_url;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS favicon_url;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS background_image;

-- Remove slug columns that were supposed to be removed
ALTER TABLE brand_settings DROP COLUMN IF EXISTS company_slug;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS application_slug;

-- Ensure all required columns exist
ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS application_name TEXT DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS copyright_text TEXT,
ADD COLUMN IF NOT EXISTS logo_file_path TEXT,
ADD COLUMN IF NOT EXISTS favicon_file_path TEXT,
ADD COLUMN IF NOT EXISTS background_image_file_path TEXT;
