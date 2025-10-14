-- Fix User Roles Migration
-- This migration fixes the issue where user roles were not properly migrated

-- ==============================================
-- DEBUG: Check current state
-- ==============================================

DO $$
DECLARE
    users_count INTEGER;
    uca_count INTEGER;
    user_roles_count INTEGER;
    profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM public.users WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO uca_count FROM public.user_client_access;
    SELECT COUNT(*) INTO user_roles_count FROM public.userRoles;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '- Users with user_id: %', users_count;
    RAISE NOTICE '- User client access records: %', uca_count;
    RAISE NOTICE '- User roles records: %', user_roles_count;
    RAISE NOTICE '- Profiles records: %', profiles_count;
END $$;

-- ==============================================
-- FIX: Migrate user roles properly
-- ==============================================

-- First, let's see what's in the user_client_access table
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'User client access records:';
    FOR rec IN SELECT * FROM public.user_client_access LOOP
        RAISE NOTICE 'User: %, Client: %, Role: %', rec.user_id, rec.client_id, rec.role;
    END LOOP;
END $$;

-- Now let's see what's in the users table
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Users table records:';
    FOR rec IN SELECT * FROM public.users WHERE user_id IS NOT NULL LOOP
        RAISE NOTICE 'User: %, Global Role: %', rec.user_id, rec.global_role;
    END LOOP;
END $$;

-- ==============================================
-- MIGRATE USER ROLES FROM USERS TABLE
-- ==============================================

-- For users who have global_role in users table, create userRoles entries
INSERT INTO public.userRoles (user_id, role_id, client_id, is_global, granted_by_email, created_at, updated_at)
SELECT 
  u.user_id,
  (SELECT id FROM public.roles WHERE name = 
    CASE u.global_role 
      WHEN 'undeniable' THEN 'admin'
      WHEN 'staff' THEN 'staff'
      WHEN 'client' THEN 'client'
    END
  ),
  NULL, -- client_id is NULL for global roles
  TRUE, -- is_global = true
  'system@migration',
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.user_id IS NOT NULL
  AND u.global_role IN ('undeniable', 'staff', 'client')
  AND NOT EXISTS (
    SELECT 1 FROM public.userRoles ur 
    WHERE ur.user_id = u.user_id
  )
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- ==============================================
-- MIGRATE USER ROLES FROM USER_CLIENT_ACCESS TABLE
-- ==============================================

-- Migrate global admin roles (undeniable with NULL client_id)
INSERT INTO public.userRoles (user_id, role_id, client_id, is_global, granted_by_email, created_at, updated_at)
SELECT 
  uca.user_id,
  (SELECT id FROM public.roles WHERE name = 'admin'),
  NULL, -- client_id is NULL for global
  TRUE, -- is_global = true
  uca.granted_by_email,
  uca.created_at,
  uca.updated_at
FROM public.user_client_access uca
WHERE uca.role = 'undeniable' 
  AND uca.client_id IS NULL
  AND uca.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.userRoles ur 
    WHERE ur.user_id = uca.user_id AND ur.is_global = TRUE
  )
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- Migrate client-specific roles
INSERT INTO public.userRoles (user_id, role_id, client_id, is_global, granted_by_email, created_at, updated_at)
SELECT 
  uca.user_id,
  (SELECT id FROM public.roles WHERE name = 
    CASE uca.role 
      WHEN 'undeniable' THEN 'admin'
      WHEN 'staff' THEN 'staff'
      WHEN 'client' THEN 'client'
    END
  ),
  uca.client_id,
  FALSE, -- is_global = false
  uca.granted_by_email,
  uca.created_at,
  uca.updated_at
FROM public.user_client_access uca
WHERE uca.client_id IS NOT NULL
  AND uca.user_id IS NOT NULL
  AND uca.role IN ('undeniable', 'staff', 'client')
  AND NOT EXISTS (
    SELECT 1 FROM public.userRoles ur 
    WHERE ur.user_id = uca.user_id AND ur.client_id = uca.client_id
  )
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
DECLARE
    user_roles_count INTEGER;
    global_admins INTEGER;
    client_roles INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_roles_count FROM public.userRoles;
    SELECT COUNT(*) INTO global_admins FROM public.userRoles WHERE is_global = TRUE;
    SELECT COUNT(*) INTO client_roles FROM public.userRoles WHERE is_global = FALSE;
    
    RAISE NOTICE 'User roles migration fix completed:';
    RAISE NOTICE '- Total userRoles records: %', user_roles_count;
    RAISE NOTICE '- Global admin roles: %', global_admins;
    RAISE NOTICE '- Client-specific roles: %', client_roles;
    
    IF user_roles_count > 0 THEN
        RAISE NOTICE 'User roles migration successful';
    ELSE
        RAISE WARNING 'No user roles were migrated';
    END IF;
END $$;
