-- ==============================================
-- FIX BRAND_SETTINGS POLICY FOR GLOBAL ADMINS
-- ==============================================
-- This migration simplifies the brand_settings policies to allow any global admin
-- to manage brand settings, regardless of specific permissions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can update brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can insert brand settings" ON public.brand_settings;

-- Create simplified policies that only check for global admin status
CREATE POLICY "Global admins can view brand settings" ON public.brand_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
    )
  );

CREATE POLICY "Global admins can update brand settings" ON public.brand_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
    )
  );

CREATE POLICY "Global admins can insert brand settings" ON public.brand_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
    )
  );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    -- Check if all policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Global admins can view brand settings'
    ) THEN
        RAISE EXCEPTION 'SELECT policy for brand_settings was not created successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Global admins can update brand settings'
    ) THEN
        RAISE EXCEPTION 'UPDATE policy for brand_settings was not created successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Global admins can insert brand settings'
    ) THEN
        RAISE EXCEPTION 'INSERT policy for brand_settings was not created successfully';
    END IF;
    
    RAISE NOTICE 'All brand settings policies created successfully for global admins';
END $$;
