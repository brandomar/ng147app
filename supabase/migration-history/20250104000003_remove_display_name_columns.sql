-- Remove redundant display name columns from brand_settings table
-- These were redundant with the main name fields

ALTER TABLE brand_settings 
DROP COLUMN IF EXISTS company_display_name,
DROP COLUMN IF EXISTS application_display_name;
