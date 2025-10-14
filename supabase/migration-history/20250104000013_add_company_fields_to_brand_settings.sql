-- Add company information fields back to brand_settings table
-- These are needed for whitelabeling functionality

-- Add company information fields
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT 'Dashboard';
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS company_description TEXT DEFAULT 'Multi-tenant dashboard platform';
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@dashboard.com';
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS application_name TEXT DEFAULT 'Dashboard';

-- Update existing record with proper values if it exists
UPDATE brand_settings SET
  company_name = 'Undeniable',
  company_description = 'Multi-tenant dashboard platform',
  support_email = 'support@undeniable.com',
  application_name = 'Undeniable Dashboard',
  ui = jsonb_set(
    COALESCE(ui, '{}'::jsonb),
    '{dashboardTitle}',
    '"Undeniable"'
  )
WHERE id = (SELECT id FROM brand_settings LIMIT 1);

-- If no record exists, create one
INSERT INTO brand_settings (
  company_name,
  company_description,
  support_email,
  application_name,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  text_color,
  tagline,
  copyright_text,
  ui
) VALUES (
  'Undeniable',
  'Multi-tenant dashboard platform',
  'support@undeniable.com',
  'Undeniable Dashboard',
  '#7B61FF',
  '#00FFB2',
  '#F3C969',
  '#0F0F0F',
  '#FFFFFF',
  'Your Business Intelligence Platform',
  '© 2024 Undeniable. All rights reserved.',
  '{"dashboardTitle": "Undeniable", "loginTitle": "Welcome to Undeniable", "welcomeMessage": "Welcome to your dashboard", "footerText": "© 2024 Undeniable. All rights reserved."}'::jsonb
) ON CONFLICT DO NOTHING;
