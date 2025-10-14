-- Update RLS Policies for New Permission System
-- This migration updates existing RLS policies to work with both old and new permission systems

-- ==============================================
-- UPDATE METRICS RLS POLICIES
-- ==============================================

-- Drop existing metrics policies
DROP POLICY IF EXISTS "Users can view their metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert their metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can update their metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can delete their metrics" ON public.metrics;

-- Create new metrics policies that work with both systems
CREATE POLICY "Users can view their metrics" ON public.metrics
  FOR SELECT USING (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = metrics.client_id
      )
      AND r.permissions->>'canViewAllData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = metrics.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

CREATE POLICY "Users can insert their metrics" ON public.metrics
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = metrics.client_id
      )
      AND r.permissions->>'canSyncData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = metrics.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

CREATE POLICY "Users can update their metrics" ON public.metrics
  FOR UPDATE USING (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = metrics.client_id
      )
      AND r.permissions->>'canSyncData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = metrics.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

CREATE POLICY "Users can delete their metrics" ON public.metrics
  FOR DELETE USING (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = metrics.client_id
      )
      AND r.permissions->>'canSyncData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = metrics.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

-- ==============================================
-- UPDATE CLIENTS RLS POLICIES
-- ==============================================

-- Drop existing clients policies
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update accessible clients" ON public.clients;

-- Create new clients policies
CREATE POLICY "Users can view accessible clients" ON public.clients
  FOR SELECT USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = clients.id
      )
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = clients.id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

CREATE POLICY "Users can update accessible clients" ON public.clients
  FOR UPDATE USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = clients.id
      )
      AND r.permissions->>'canManageClients' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = clients.id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
      AND uca.role IN ('undeniable', 'staff')
    )
  );

-- ==============================================
-- UPDATE SYNC_STATUS RLS POLICIES
-- ==============================================

-- Drop existing sync_status policies
DROP POLICY IF EXISTS "Users can view their sync status" ON public.sync_status;
DROP POLICY IF EXISTS "Users can update their sync status" ON public.sync_status;

-- Create new sync_status policies
CREATE POLICY "Users can view their sync status" ON public.sync_status
  FOR SELECT USING (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = sync_status.client_id
      )
      AND r.permissions->>'canSyncData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = sync_status.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

CREATE POLICY "Users can update their sync status" ON public.sync_status
  FOR UPDATE USING (
    user_id = auth.uid() OR
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = sync_status.client_id
      )
      AND r.permissions->>'canSyncData' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = sync_status.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
    )
  );

-- ==============================================
-- UPDATE INVITATIONS RLS POLICIES
-- ==============================================

-- Drop existing invitations policies
DROP POLICY IF EXISTS "Users can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON public.invitations;

-- Create new invitations policies
CREATE POLICY "Users can view invitations" ON public.invitations
  FOR SELECT USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = invitations.client_id
      )
      AND r.permissions->>'canInviteUsers' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = invitations.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
      AND uca.role IN ('undeniable', 'staff')
    )
  );

CREATE POLICY "Users can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = invitations.client_id
      )
      AND r.permissions->>'canInviteUsers' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = invitations.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
      AND uca.role IN ('undeniable', 'staff')
    )
  );

CREATE POLICY "Users can update invitations" ON public.invitations
  FOR UPDATE USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (
        ur.is_global = TRUE OR
        ur.client_id = invitations.client_id
      )
      AND r.permissions->>'canInviteUsers' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND (
        uca.client_id = invitations.client_id OR
        (uca.client_id IS NULL AND uca.role = 'undeniable')
      )
      AND uca.role IN ('undeniable', 'staff')
    )
  );

-- ==============================================
-- UPDATE BRAND_SETTINGS RLS POLICIES
-- ==============================================

-- Drop existing brand_settings policies
DROP POLICY IF EXISTS "Users can view brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can update brand settings" ON public.brand_settings;

-- Create new brand_settings policies
CREATE POLICY "Users can view brand settings" ON public.brand_settings
  FOR SELECT USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.permissions->>'canManageBranding' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND uca.client_id IS NULL
      AND uca.role = 'undeniable'
    )
  );

CREATE POLICY "Users can update brand settings" ON public.brand_settings
  FOR UPDATE USING (
    -- New permission system check
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.permissions->>'canManageBranding' = 'true'
    ) OR
    -- Legacy system check (fallback)
    EXISTS (
      SELECT 1 FROM public.user_client_access uca
      WHERE uca.user_id = auth.uid()
      AND uca.client_id IS NULL
      AND uca.role = 'undeniable'
    )
  );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated successfully for new permission system:';
    RAISE NOTICE '- Metrics policies updated with dual system support';
    RAISE NOTICE '- Clients policies updated with dual system support';
    RAISE NOTICE '- Sync status policies updated with dual system support';
    RAISE NOTICE '- Invitations policies updated with dual system support';
    RAISE NOTICE '- Brand settings policies updated with dual system support';
    RAISE NOTICE 'All policies now support both new and legacy permission systems';
END $$;
