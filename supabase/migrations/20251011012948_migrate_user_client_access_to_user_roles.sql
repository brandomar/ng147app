-- Migrate User Client Access to User Roles
-- This migration converts user_client_access records to userRoles with proper role mapping
-- and is_global flag handling

-- ==============================================
-- MIGRATE GLOBAL ADMIN ROLES
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
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- ==============================================
-- MIGRATE CLIENT-SPECIFIC ROLES
-- ==============================================

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
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- ==============================================
-- HANDLE USERS WITH GLOBAL_ROLE BUT NO USER_CLIENT_ACCESS
-- ==============================================

-- For users who have global_role in users table but no corresponding user_client_access record
-- Create appropriate userRoles entries based on their global_role
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
    SELECT 1 FROM public.user_client_access uca 
    WHERE uca.user_id = u.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.userRoles ur 
    WHERE ur.user_id = u.user_id
  )
ON CONFLICT (user_id, role_id, client_id) DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the migration results
DO $$
DECLARE
    uca_count INTEGER;
    user_roles_count INTEGER;
    global_admins INTEGER;
    client_roles INTEGER;
    users_with_global_role INTEGER;
BEGIN
    -- Count records in both tables
    SELECT COUNT(*) INTO uca_count FROM public.user_client_access;
    SELECT COUNT(*) INTO user_roles_count FROM public.userRoles;
    
    -- Count different types of roles
    SELECT COUNT(*) INTO global_admins 
    FROM public.userRoles 
    WHERE is_global = TRUE;
    
    SELECT COUNT(*) INTO client_roles 
    FROM public.userRoles 
    WHERE is_global = FALSE;
    
    SELECT COUNT(*) INTO users_with_global_role 
    FROM public.users 
    WHERE global_role IS NOT NULL;
    
    RAISE NOTICE 'User roles migration completed:';
    RAISE NOTICE '- Original user_client_access records: %', uca_count;
    RAISE NOTICE '- New userRoles records: %', user_roles_count;
    RAISE NOTICE '- Global admin roles: %', global_admins;
    RAISE NOTICE '- Client-specific roles: %', client_roles;
    RAISE NOTICE '- Users with global_role: %', users_with_global_role;
    
    -- Verify migration success
    IF user_roles_count > 0 THEN
        RAISE NOTICE 'User roles migration successful';
    ELSE
        RAISE WARNING 'No user roles were migrated';
    END IF;
    
    -- Check for any users without roles
    IF EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.user_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.userRoles ur 
            WHERE ur.user_id = u.user_id
        )
    ) THEN
        RAISE WARNING 'Some users do not have any roles assigned';
    ELSE
        RAISE NOTICE 'All users have at least one role assigned';
    END IF;
END $$;
