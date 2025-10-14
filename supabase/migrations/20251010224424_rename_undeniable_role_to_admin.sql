-- Rename "undeniable" role to "admin"
-- This migration updates all role references from "undeniable" to "admin" for better clarity

-- ==============================================
-- DROP ALL EXISTING ROLE CONSTRAINTS FIRST
-- ==============================================

-- Drop all existing role constraints to allow updates
ALTER TABLE user_client_access 
DROP CONSTRAINT IF EXISTS user_client_access_role_check;

ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_global_role_check;

-- ==============================================
-- UPDATE EXISTING ROLE VALUES
-- ==============================================

-- Temporarily disable RLS for the updates
ALTER TABLE user_client_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Update user_client_access table
UPDATE user_client_access 
SET role = 'admin' 
WHERE role = 'undeniable';

-- Update users table (if global_role column exists)
UPDATE users 
SET global_role = 'admin' 
WHERE global_role = 'undeniable';

-- Re-enable RLS after updates
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- UPDATE ROLE CONSTRAINTS
-- ==============================================

-- Update user_client_access role constraint to only allow new roles
ALTER TABLE user_client_access 
DROP CONSTRAINT IF EXISTS user_client_access_role_check;

ALTER TABLE user_client_access 
ADD CONSTRAINT user_client_access_role_check 
CHECK (role IN ('admin', 'staff', 'client'));

-- Update users global_role constraint to only allow new roles (if column exists)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_global_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_global_role_check 
CHECK (global_role IN ('admin', 'staff', 'client'));

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the changes
DO $$
DECLARE
    user_client_access_count INTEGER;
    users_count INTEGER;
BEGIN
    -- Count updated records
    SELECT COUNT(*) INTO user_client_access_count 
    FROM user_client_access 
    WHERE role = 'admin';
    
    SELECT COUNT(*) INTO users_count 
    FROM users 
    WHERE global_role = 'admin';
    
    RAISE NOTICE 'Role rename completed successfully';
    RAISE NOTICE 'Updated % records in user_client_access to admin role', user_client_access_count;
    RAISE NOTICE 'Updated % records in users to admin role', users_count;
    RAISE NOTICE 'Updated role constraints to allow admin, staff, client';
END $$;
