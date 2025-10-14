-- Comprehensive Permission System Validation
-- This migration validates the new permission system and provides detailed reporting

-- ==============================================
-- VALIDATION FUNCTIONS
-- ==============================================

-- Function to validate data integrity
CREATE OR REPLACE FUNCTION validate_permission_system()
RETURNS TABLE(
  validation_type TEXT,
  status TEXT,
  details TEXT,
  count INTEGER
) AS $$
BEGIN
  -- Check if new tables exist
  RETURN QUERY
  SELECT 
    'Table Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'roles table exists'::TEXT,
    1::INTEGER;
    
  RETURN QUERY
  SELECT 
    'Table Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'userroles') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'userRoles table exists'::TEXT,
    1::INTEGER;
    
  RETURN QUERY
  SELECT 
    'Table Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'profiles table exists'::TEXT,
    1::INTEGER;

  -- Check if default roles exist
  RETURN QUERY
  SELECT 
    'Default Roles'::TEXT,
    CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Default roles (admin, staff, client) exist'::TEXT,
    COUNT(*)::INTEGER
  FROM public.roles WHERE is_system_role = TRUE;

  -- Check if all users have profiles
  RETURN QUERY
  SELECT 
    'Profile Migration'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Users without profiles'::TEXT,
    COUNT(*)::INTEGER
  FROM public.users u
  WHERE u.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.user_id);

  -- Check if all users have roles
  RETURN QUERY
  SELECT 
    'Role Assignment'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Users without roles'::TEXT,
    COUNT(*)::INTEGER
  FROM public.users u
  WHERE u.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.userRoles ur WHERE ur.user_id = u.user_id);

  -- Check for orphaned user roles
  RETURN QUERY
  SELECT 
    'Data Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Orphaned user roles (invalid user_id)'::TEXT,
    COUNT(*)::INTEGER
  FROM public.userRoles ur
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ur.user_id);

  -- Check for orphaned role references
  RETURN QUERY
  SELECT 
    'Data Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Orphaned role references (invalid role_id)'::TEXT,
    COUNT(*)::INTEGER
  FROM public.userRoles ur
  WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.id = ur.role_id);

  -- Check for orphaned client references
  RETURN QUERY
  SELECT 
    'Data Integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Orphaned client references (invalid client_id)'::TEXT,
    COUNT(*)::INTEGER
  FROM public.userRoles ur
  WHERE ur.client_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = ur.client_id);

  -- Check global admin constraints
  RETURN QUERY
  SELECT 
    'Constraint Validation'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Global roles with client_id'::TEXT,
    COUNT(*)::INTEGER
  FROM public.userRoles ur
  WHERE ur.is_global = TRUE AND ur.client_id IS NOT NULL;

  -- Check non-global roles without client_id
  RETURN QUERY
  SELECT 
    'Constraint Validation'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Non-global roles without client_id'::TEXT,
    COUNT(*)::INTEGER
  FROM public.userRoles ur
  WHERE ur.is_global = FALSE AND ur.client_id IS NULL;

  -- Check permission functions exist
  RETURN QUERY
  SELECT 
    'Function Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'has_permission') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'has_permission function exists'::TEXT,
    1::INTEGER;
    
  RETURN QUERY
  SELECT 
    'Function Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_permissions') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'get_user_permissions function exists'::TEXT,
    1::INTEGER;
    
  RETURN QUERY
  SELECT 
    'Function Existence'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_global_admin') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'is_global_admin function exists'::TEXT,
    1::INTEGER;

END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- RUN VALIDATION
-- ==============================================

-- Run validation and display results
DO $$
DECLARE
    rec RECORD;
    pass_count INTEGER := 0;
    fail_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PERMISSION SYSTEM VALIDATION REPORT';
    RAISE NOTICE '==============================================';

    FOR rec IN SELECT * FROM validate_permission_system() ORDER BY validation_type, status DESC LOOP
        total_count := total_count + 1;

        IF rec.status = 'PASS' THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '[PASS] %: % (Count: %)', rec.validation_type, rec.details, rec.count;
        ELSE
            fail_count := fail_count + 1;
            RAISE NOTICE '[FAIL] %: % (Count: %)', rec.validation_type, rec.details, rec.count;
        END IF;
    END LOOP;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VALIDATION SUMMARY:';
    RAISE NOTICE 'Total Checks: %', total_count;
    RAISE NOTICE 'Passed: %', pass_count;
    RAISE NOTICE 'Failed: %', fail_count;
    RAISE NOTICE 'Success Rate: %', ROUND((pass_count::DECIMAL / total_count::DECIMAL) * 100, 2) || '%';

    IF fail_count = 0 THEN
        RAISE NOTICE '🎉 ALL VALIDATIONS PASSED! Permission system is ready.';
    ELSE
        RAISE WARNING '⚠️  % VALIDATIONS FAILED. Please review and fix issues.', fail_count;
    END IF;

    RAISE NOTICE '==============================================';
END $$;

-- ==============================================
-- DATA MIGRATION SUMMARY
-- ==============================================

DO $$
DECLARE
    users_count INTEGER;
    profiles_count INTEGER;
    uca_count INTEGER;
    user_roles_count INTEGER;
    global_admins INTEGER;
    client_roles INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO users_count FROM public.users WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO uca_count FROM public.user_client_access;
    SELECT COUNT(*) INTO user_roles_count FROM public.userRoles;
    SELECT COUNT(*) INTO global_admins FROM public.userRoles WHERE is_global = TRUE;
    SELECT COUNT(*) INTO client_roles FROM public.userRoles WHERE is_global = FALSE;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DATA MIGRATION SUMMARY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Users (legacy): %', users_count;
    RAISE NOTICE 'Profiles (new): %', profiles_count;
    RAISE NOTICE 'User Client Access (legacy): %', uca_count;
    RAISE NOTICE 'User Roles (new): %', user_roles_count;
    RAISE NOTICE 'Global Admin Roles: %', global_admins;
    RAISE NOTICE 'Client-Specific Roles: %', client_roles;
    RAISE NOTICE '==============================================';
    
    -- Check migration completeness
    IF profiles_count = users_count THEN
        RAISE NOTICE '✅ Profile migration: COMPLETE';
    ELSE
        RAISE WARNING '⚠️  Profile migration: INCOMPLETE (% profiles vs % users)', profiles_count, users_count;
    END IF;
    
    IF user_roles_count > 0 THEN
        RAISE NOTICE '✅ Role migration: COMPLETE';
    ELSE
        RAISE WARNING '⚠️  Role migration: INCOMPLETE (0 user roles)';
    END IF;
    
    RAISE NOTICE '==============================================';
END $$;

-- ==============================================
-- CLEANUP VALIDATION FUNCTION
-- ==============================================

-- Drop the validation function after use
DROP FUNCTION IF EXISTS validate_permission_system();
