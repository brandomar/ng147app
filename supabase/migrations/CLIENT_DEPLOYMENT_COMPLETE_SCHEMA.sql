/*
  ============================================================================
  COMPLETE DATABASE SCHEMA FOR CLIENT DEPLOYMENT
  ============================================================================

  This is a consolidated migration file that sets up the entire database schema
  for Dashboard Undeniable. Run this in the Supabase SQL Editor for new deployments.

  Version: 2025-01-15 (Post-Refactor)

  IMPORTANT: This file reflects the current state after the major refactoring that:
  - Introduced the new permission system (roles, userRoles, profiles)
  - Replaced user_client_access with userRoles
  - Replaced users table with profiles table
  - Added goals_config to clients
  - Updated all RLS policies

  DO NOT use the old complete_production_schema.sql file - it is outdated!

  ============================================================================
*/

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Brand Settings Table
CREATE TABLE IF NOT EXISTS public.brand_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_color TEXT DEFAULT '#7B61FF' NOT NULL,
    secondary_color TEXT DEFAULT '#00FFB2' NOT NULL,
    accent_color TEXT DEFAULT '#F3C969' NOT NULL,
    background_color TEXT DEFAULT '#0F0F0F' NOT NULL,
    text_color TEXT DEFAULT '#FFFFFF' NOT NULL,
    ui JSONB DEFAULT '{"footerText": "© 2024 Dashboard. All rights reserved.", "loginTitle": "Welcome to Dashboard", "dashboardTitle": "Dashboard", "welcomeMessage": "Welcome to your dashboard"}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    logo_file_path TEXT,
    background_image_file_path TEXT,
    copyright_text TEXT,
    application_name TEXT DEFAULT 'Dashboard',
    company_name TEXT DEFAULT 'Dashboard',
    company_description TEXT DEFAULT 'Multi-tenant dashboard platform',
    support_email TEXT DEFAULT 'support@dashboard.com'
);

-- Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tabs JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_name TEXT NOT NULL,
    logo_url TEXT,
    allowed_categories TEXT[] DEFAULT '{}',
    client_type TEXT DEFAULT 'client',
    owner_id UUID,
    data_source TEXT DEFAULT 'google-sheets',
    google_sheets_url TEXT,
    google_sheets_tabs TEXT[],
    sheet_type TEXT DEFAULT 'client-dashboard',
    google_sheets JSONB DEFAULT '[]',
    goals_config JSONB DEFAULT '{}',
    CHECK (client_type = ANY (ARRAY['client', 'undeniable']))
);

COMMENT ON COLUMN clients.goals_config IS 'Monthly goal targets and projections configuration. Structure: { "monthly_targets": { "ad_spend": number, "booked_calls": number, "offer_rate": number, "closes": number, "cpa": number, "sales": number }, "updated_at": timestamp, "updated_by": user_id }';

-- Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    invited_by UUID,
    invited_by_email TEXT,
    invitation_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (role = ANY (ARRAY['admin', 'staff', 'client']))
);

-- Metric Definitions Table
CREATE TABLE IF NOT EXISTS public.metric_definitions (
    metric_name VARCHAR PRIMARY KEY,
    categories TEXT[] NOT NULL,
    is_calculated BOOLEAN DEFAULT FALSE,
    calculation_formula TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics Table (Core Data)
CREATE TABLE IF NOT EXISTS public.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR NOT NULL,
    metric_name VARCHAR NOT NULL,
    value NUMERIC(15,2) NOT NULL,
    is_calculated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT DEFAULT 'google-sheets',
    google_sheet_id TEXT,
    sheet_name TEXT,
    tab_name TEXT,
    tab_gid TEXT,
    data_source_type VARCHAR(20) DEFAULT 'google_sheets',
    data_source_id VARCHAR(255),
    target_value NUMERIC(15,2),
    metric_type TEXT DEFAULT 'actual',
    CHECK (data_source = ANY (ARRAY['google-sheets', 'excel-import'])),
    UNIQUE (user_id, client_id, google_sheet_id, sheet_name, tab_name, date, category, metric_name, metric_type)
);

-- Sync Status Table
CREATE TABLE IF NOT EXISTS public.sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    google_sheet_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    sync_status VARCHAR DEFAULT 'pending',
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_error_message TEXT,
    total_sync_count INTEGER DEFAULT 0,
    successful_sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, client_id, google_sheet_id, sheet_name)
);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    sync_notifications BOOLEAN DEFAULT TRUE,
    error_alerts BOOLEAN DEFAULT TRUE,
    client_changes BOOLEAN DEFAULT TRUE,
    system_events BOOLEAN DEFAULT TRUE,
    edge_function_failures BOOLEAN DEFAULT TRUE,
    data_integrity_issues BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy Users Table (kept for backward compatibility during migration)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    global_role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (global_role = ANY (ARRAY['admin', 'staff', 'client']))
);

-- Legacy User Client Access Table (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS public.user_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    granted_by UUID,
    granted_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (role = ANY (ARRAY['admin', 'staff', 'client']))
);

-- ============================================================================
-- NEW PERMISSION SYSTEM TABLES
-- ============================================================================

-- Roles Table (replaces hardcoded roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UserRoles Table (replaces user_client_access)
CREATE TABLE IF NOT EXISTS public.userRoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,
  granted_by UUID REFERENCES auth.users(id),
  granted_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, client_id),
  CHECK (
    (is_global = TRUE AND client_id IS NULL) OR
    (is_global = FALSE AND client_id IS NOT NULL)
  )
);

-- Profiles Table (replaces users table)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SEED DEFAULT ROLES
-- ============================================================================

INSERT INTO public.roles (name, description, permissions, is_system_role) VALUES
('admin', 'Global administrator with full system access', '{
  "canManageUsers": true,
  "canManageClients": true,
  "canManageBranding": true,
  "canViewAllData": true,
  "canInviteUsers": true,
  "canManageRoles": true,
  "canSyncData": true,
  "canExportData": true
}', true),
('staff', 'Staff member with client management access', '{
  "canManageUsers": false,
  "canManageClients": true,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": true,
  "canManageRoles": false,
  "canSyncData": true,
  "canExportData": true
}', true),
('client', 'Client user with read-only access', '{
  "canManageUsers": false,
  "canManageClients": false,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": false,
  "canManageRoles": false,
  "canSyncData": false,
  "canExportData": false
}', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Brand Settings
CREATE UNIQUE INDEX IF NOT EXISTS brand_settings_single_record ON public.brand_settings ((1));

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_slug ON public.clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_goals_config ON public.clients USING gin(goals_config);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_client ON public.invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(invitation_token);

-- Metrics (extensive indexing for performance)
CREATE INDEX IF NOT EXISTS idx_metrics_category ON public.metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_category_type ON public.metrics(category, metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_client_data_source ON public.metrics(client_id, data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_client_sheet ON public.metrics(client_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source ON public.metrics(data_source);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_id ON public.metrics(data_source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_type ON public.metrics(data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_date_category ON public.metrics(date, category);
CREATE INDEX IF NOT EXISTS idx_metrics_google_sheet ON public.metrics(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON public.metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_type ON public.metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab ON public.metrics(sheet_name, tab_name);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab_date ON public.metrics(sheet_name, tab_name, date);

-- User Client Access (legacy)
CREATE INDEX IF NOT EXISTS idx_user_client_access_client ON public.user_client_access(client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_access_role ON public.user_client_access(role);
CREATE INDEX IF NOT EXISTS idx_user_client_access_user ON public.user_client_access(user_id);

-- User Notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);

-- Users (legacy)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_global_role ON public.users(global_role);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);

-- New Permission System Indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON public.roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.userRoles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.userRoles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON public.userRoles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_global ON public.userRoles(is_global);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_client ON public.userRoles(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userRoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - BRAND SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read brand settings" ON public.brand_settings;
CREATE POLICY "Anyone can read brand settings" ON public.brand_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Global admins can update brand settings" ON public.brand_settings;
CREATE POLICY "Global admins can update brand settings" ON public.brand_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES - CLIENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can read clients they have access to" ON public.clients;
CREATE POLICY "Users can read clients they have access to" ON public.clients
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT client_id FROM public.userRoles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and staff can manage clients" ON public.clients;
CREATE POLICY "Admins and staff can manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND (ur.is_global = TRUE OR ur.client_id = clients.id)
    )
  );

-- ============================================================================
-- RLS POLICIES - METRICS
-- ============================================================================

DROP POLICY IF EXISTS "Users can read metrics for accessible clients" ON public.metrics;
CREATE POLICY "Users can read metrics for accessible clients" ON public.metrics
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.userRoles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert metrics" ON public.metrics;
CREATE POLICY "Authenticated users can insert metrics" ON public.metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.userRoles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update metrics" ON public.metrics;
CREATE POLICY "Authenticated users can update metrics" ON public.metrics
  FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.userRoles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
    )
  );

-- ============================================================================
-- RLS POLICIES - USER NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
CREATE POLICY "Users can read own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - USER NOTIFICATION PREFERENCES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can read own notification preferences" ON public.user_notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON public.user_notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Global admins can manage roles" ON public.roles;
CREATE POLICY "Global admins can manage roles" ON public.roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES - USER ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.userRoles;
CREATE POLICY "Users can view their own roles" ON public.userRoles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Global admins can manage all user roles" ON public.userRoles;
CREATE POLICY "Global admins can manage all user roles" ON public.userRoles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can manage client roles" ON public.userRoles;
CREATE POLICY "Staff can manage client roles" ON public.userRoles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.client_id = userRoles.client_id
      AND r.name IN ('admin', 'staff')
    )
  );

-- ============================================================================
-- RLS POLICIES - PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Global admins can manage all profiles" ON public.profiles;
CREATE POLICY "Global admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- ============================================================================
-- LEGACY POLICIES (for backward compatibility)
-- ============================================================================

-- Users table (legacy)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO role_count
    FROM public.roles
    WHERE is_system_role = TRUE;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATABASE SCHEMA SETUP COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total tables created: %', table_count;
    RAISE NOTICE 'System roles created: %', role_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables:';
    RAISE NOTICE '- Core: brand_settings, clients, metrics';
    RAISE NOTICE '- Permissions: roles, userRoles, profiles';
    RAISE NOTICE '- Legacy: users, user_client_access';
    RAISE NOTICE '- Support: invitations, sync_status, notifications';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create your first admin user via Supabase Auth';
    RAISE NOTICE '2. Insert a userRoles record linking the user to admin role';
    RAISE NOTICE '3. Configure Google Sheets API credentials';
    RAISE NOTICE '4. Deploy Edge Functions';
    RAISE NOTICE '============================================';
END $$;
