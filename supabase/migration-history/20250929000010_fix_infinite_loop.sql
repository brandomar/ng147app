-- Fix Infinite Loop Issue
-- Generated: 2025-01-23
-- Removes the problematic auto-setup trigger

-- ==============================================
-- REMOVE PROBLEMATIC TRIGGER
-- ==============================================

-- Drop the trigger that's causing infinite loops
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function that's causing issues
DROP FUNCTION IF EXISTS handle_new_user();

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Infinite loop fix applied successfully';
    RAISE NOTICE 'Removed problematic auto-setup trigger';
    RAISE NOTICE 'User access control will be created manually when needed';
END $$;
