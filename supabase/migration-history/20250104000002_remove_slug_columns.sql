-- Remove slug columns from brand_settings table
-- These are no longer needed as we use client names for routing

ALTER TABLE brand_settings 
DROP COLUMN IF EXISTS company_slug,
DROP COLUMN IF EXISTS application_slug;
