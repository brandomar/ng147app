-- Simplify brand_settings table to focus only on visual branding
-- Remove columns that duplicate other tables or aren't brand-specific

-- Remove business logic columns that belong in other tables
ALTER TABLE brand_settings DROP COLUMN IF EXISTS company_name;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS company_description;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS support_email;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS application_name;

-- Remove configuration columns that duplicate other tables
ALTER TABLE brand_settings DROP COLUMN IF EXISTS default_sheets;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS metric_categories;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS default_time_frame;

-- Remove hardcoded business logic
ALTER TABLE brand_settings DROP COLUMN IF EXISTS features;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS roles;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS sections;
ALTER TABLE brand_settings DROP COLUMN IF EXISTS functions;

-- Keep only visual branding and UI text columns
-- (logo_file_path, favicon_file_path, background_image_file_path, colors, ui text, etc.)
