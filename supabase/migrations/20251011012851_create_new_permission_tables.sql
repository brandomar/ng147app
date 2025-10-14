-- Create New Permission Tables
-- This migration creates the new normalized permission system tables
-- while keeping the old tables intact for gradual migration

-- ==============================================
-- CREATE ROLES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'admin', 'staff', 'client'
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}', -- Feature-based permissions
  is_system_role BOOLEAN DEFAULT FALSE, -- Prevent deletion of core roles
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- CREATE USER ROLES TABLE (replaces user_client_access)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.userRoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE, -- Admin with is_global=true bypasses client checks
  granted_by UUID REFERENCES auth.users(id),
  granted_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, role_id, client_id), -- One role per user per client
  CHECK (
    (is_global = TRUE AND client_id IS NULL) OR 
    (is_global = FALSE AND client_id IS NOT NULL)
  ) -- Global roles must have NULL client_id
);

-- ==============================================
-- CREATE PROFILES TABLE (replaces users)
-- ==============================================

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

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Roles table indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON public.roles(is_system_role);

-- UserRoles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.userRoles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.userRoles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON public.userRoles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_global ON public.userRoles(is_global);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_client ON public.userRoles(user_id, client_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==============================================
-- ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userRoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES FOR ROLES TABLE
-- ==============================================

-- System roles are read-only for all authenticated users
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only global admins can manage roles
CREATE POLICY "Global admins can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- ==============================================
-- RLS POLICIES FOR USER ROLES TABLE
-- ==============================================

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.userRoles
  FOR SELECT USING (user_id = auth.uid());

-- Global admins can manage all user roles
CREATE POLICY "Global admins can manage all user roles" ON public.userRoles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- Staff can manage client-specific roles for their clients
CREATE POLICY "Staff can manage client roles" ON public.userRoles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.client_id = userRoles.client_id
      AND r.name IN ('admin', 'staff')
    )
  );

-- ==============================================
-- RLS POLICIES FOR PROFILES TABLE
-- ==============================================

-- Users can view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Global admins can manage all profiles
CREATE POLICY "Global admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.userRoles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_global = TRUE
      AND r.name = 'admin'
    )
  );

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the creation
DO $$
BEGIN
    RAISE NOTICE 'New permission tables created successfully:';
    RAISE NOTICE '- public.roles';
    RAISE NOTICE '- public.userRoles';
    RAISE NOTICE '- public.profiles';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Indexes created for performance optimization';
END $$;
