-- Add missing columns to brand_settings table
-- These columns were removed but need to be added back for the new structure

ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS application_name TEXT DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS copyright_text TEXT;

-- Update the existing record with proper values
UPDATE brand_settings SET
  company_name = 'Undeniable',
  company_description = 'Multi-tenant dashboard platform',
  support_email = 'support@undeniable.com',
  application_name = 'Undeniable Dashboard',
  tagline = 'Your Business Intelligence Platform',
  copyright_text = '© 2024 Undeniable. All rights reserved.',
  ui = '{
    "dashboardTitle": "Undeniable Dashboard",
    "loginTitle": "Welcome to Undeniable",
    "welcomeMessage": "Welcome to your dashboard",
    "footerText": "© 2024 Undeniable. All rights reserved."
  }'::jsonb
WHERE id IS NOT NULL;
