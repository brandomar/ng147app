-- Create brand_settings table for white-label configuration
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Dashboard',
  company_slug TEXT NOT NULL DEFAULT 'dashboard',
  company_description TEXT,
  support_email TEXT,
  
  -- Application Information
  application_name TEXT NOT NULL DEFAULT 'Dashboard',
  application_slug TEXT NOT NULL DEFAULT 'dashboard',
  
  -- Visual Branding
  primary_color TEXT NOT NULL DEFAULT '#7B61FF',
  secondary_color TEXT NOT NULL DEFAULT '#00FFB2',
  accent_color TEXT NOT NULL DEFAULT '#F3C969',
  background_color TEXT NOT NULL DEFAULT '#0F0F0F',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  
  -- Assets
  logo_url TEXT,
  favicon_url TEXT,
  background_image TEXT,
  
  -- Dashboard Configuration
  default_sheets JSONB DEFAULT '["Sheet1", "Sheet2", "Sheet3"]'::jsonb,
  metric_categories JSONB DEFAULT '["ads", "growth", "performance", "cold-email", "spam-outreach"]'::jsonb,
  default_time_frame TEXT NOT NULL DEFAULT '30d',
  
  -- Feature Flags
  features JSONB DEFAULT '{
    "enableUserManagement": true,
    "enableClientManagement": true,
    "enableAnalytics": true,
    "enableExport": false,
    "enableNotifications": true
  }'::jsonb,
  
  -- Role Configuration
  roles JSONB DEFAULT '{
    "admin": "undeniable",
    "staff": "staff", 
    "client": "client"
  }'::jsonb,
  
  -- Section Names
  sections JSONB DEFAULT '{
    "admin": "undeniable",
    "client": "client"
  }'::jsonb,
  
  -- Function Names
  functions JSONB DEFAULT '{
    "syncGoogleSheets": "syncGoogleSheetsUndeniable",
    "getSyncStatus": "getUndeniableSyncStatus",
    "updateSyncStatus": "updateUndeniableSyncStatus",
    "getMetricConfigurations": "getUndeniableMetricConfigurations"
  }'::jsonb,
  
  -- UI Text
  ui JSONB DEFAULT '{
    "dashboardTitle": "Dashboard",
    "loginTitle": "Welcome to Dashboard",
    "welcomeMessage": "Welcome to your dashboard",
    "footerText": "© 2024 Dashboard. All rights reserved."
  }'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to ensure only one brand setting record
CREATE UNIQUE INDEX IF NOT EXISTS brand_settings_single_record ON brand_settings ((1));

-- Enable RLS
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Only undeniable users can view brand settings" ON brand_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Only undeniable users can update brand settings" ON brand_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Only undeniable users can insert brand settings" ON brand_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

-- Insert default brand settings
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
  logo_url,
  favicon_url,
  default_sheets,
  metric_categories,
  default_time_frame,
  features,
  roles,
  sections,
  functions,
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
  '/logo.svg',
  '/favicon.ico',
  '["Sheet1", "Sheet2", "Sheet3"]'::jsonb,
  '["ads", "growth", "performance", "cold-email", "spam-outreach"]'::jsonb,
  '30d',
  '{
    "enableUserManagement": true,
    "enableClientManagement": true,
    "enableAnalytics": true,
    "enableExport": false,
    "enableNotifications": true
  }'::jsonb,
  '{
    "admin": "undeniable",
    "staff": "staff",
    "client": "client"
  }'::jsonb,
  '{
    "admin": "undeniable",
    "client": "client"
  }'::jsonb,
  '{
    "syncGoogleSheets": "syncGoogleSheetsUndeniable",
    "getSyncStatus": "getUndeniableSyncStatus",
    "updateSyncStatus": "updateUndeniableSyncStatus",
    "getMetricConfigurations": "getUndeniableMetricConfigurations"
  }'::jsonb,
  '{
    "dashboardTitle": "Undeniable Dashboard",
    "loginTitle": "Welcome to Undeniable",
    "welcomeMessage": "Welcome to your dashboard",
    "footerText": "© 2024 Undeniable. All rights reserved."
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_settings_updated_at();
