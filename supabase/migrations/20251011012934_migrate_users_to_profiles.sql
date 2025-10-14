-- Migrate Users to Profiles
-- This migration copies data from the old users table to the new profiles table
-- while removing the global_role field (which will be handled by userRoles table)

-- ==============================================
-- MIGRATE PROFILE DATA
-- ==============================================

-- Migrate users -> profiles (remove global_role)
INSERT INTO public.profiles (user_id, email, first_name, last_name, created_at, updated_at)
SELECT 
  user_id, 
  email, 
  first_name, 
  last_name, 
  created_at, 
  updated_at
FROM public.users
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate inserts

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the migration results
DO $$
DECLARE
    users_count INTEGER;
    profiles_count INTEGER;
    migrated_count INTEGER;
BEGIN
    -- Count records in both tables
    SELECT COUNT(*) INTO users_count FROM public.users WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    
    -- Calculate how many were migrated
    migrated_count := profiles_count;
    
    RAISE NOTICE 'Profile migration completed:';
    RAISE NOTICE '- Users table records: %', users_count;
    RAISE NOTICE '- Profiles table records: %', profiles_count;
    RAISE NOTICE '- Successfully migrated: %', migrated_count;
    
    -- Verify migration success
    IF migrated_count = users_count THEN
        RAISE NOTICE 'All user profiles migrated successfully';
    ELSE
        RAISE WARNING 'Migration incomplete: Expected % profiles, but found %', users_count, migrated_count;
    END IF;
    
    -- Check for any users without profiles
    IF EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.user_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = u.user_id
        )
    ) THEN
        RAISE WARNING 'Some users were not migrated to profiles table';
    ELSE
        RAISE NOTICE 'All users have corresponding profiles';
    END IF;
END $$;
