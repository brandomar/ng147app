-- Create storage bucket for brand assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for brand assets bucket
CREATE POLICY "Only undeniable users can upload brand assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Only undeniable users can update brand assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Only undeniable users can delete brand assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets' AND
    EXISTS (
      SELECT 1 FROM user_client_access uca
      WHERE uca.user_id = auth.uid() 
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Anyone can view brand assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-assets');

-- Add logo storage fields to brand_settings table
ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS logo_file_path TEXT,
ADD COLUMN IF NOT EXISTS favicon_file_path TEXT,
ADD COLUMN IF NOT EXISTS background_image_file_path TEXT;

-- Add text configuration fields
ALTER TABLE brand_settings 
ADD COLUMN IF NOT EXISTS company_display_name TEXT,
ADD COLUMN IF NOT EXISTS application_display_name TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS copyright_text TEXT;
