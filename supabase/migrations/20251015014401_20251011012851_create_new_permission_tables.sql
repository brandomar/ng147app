-- Create New Permission Tables
-- This migration creates the new normalized permission system tables

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON public.roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.userRoles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.userRoles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON public.userRoles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_global ON public.userRoles(is_global);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_client ON public.userRoles(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userRoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

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

CREATE POLICY "Users can view their own roles" ON public.userRoles
  FOR SELECT USING (user_id = auth.uid());

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

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

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
