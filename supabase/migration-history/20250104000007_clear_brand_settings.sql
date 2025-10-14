-- Clear any existing brand settings to start fresh
-- This ensures no "Undeniable" branding exists when user has no configuration

-- First, clear any existing records
DELETE FROM brand_settings;

-- Reset the sequence to start fresh
ALTER SEQUENCE IF EXISTS brand_settings_id_seq RESTART WITH 1;
