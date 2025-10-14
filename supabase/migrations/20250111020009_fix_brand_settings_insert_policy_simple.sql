-- ==============================================
-- FIX BRAND_SETTINGS INSERT POLICY (SIMPLE VERSION)
-- ==============================================
-- This migration adds the missing INSERT policy for brand_settings table
-- using only the new permission system

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert brand settings" ON public.brand_settings;

-- Create new INSERT policy using only new permission system
CREATE POLICY "Users can insert brand settings" ON public.brand_settings
  FOR INSERT WITH CHECK (
    -- New permission system check only
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.permissions->>'canManageBranding' = 'true'
    )
  );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    -- Check if INSERT policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Users can insert brand settings'
    ) THEN
        RAISE EXCEPTION 'INSERT policy for brand_settings was not created successfully';
    END IF;
    
    RAISE NOTICE 'Brand settings INSERT policy created successfully with new permission system';
END $$;
