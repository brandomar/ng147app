-- Update brand settings with correct values
-- This ensures the database has the proper "Undeniable" branding instead of defaults

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
