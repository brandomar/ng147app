-- Cleanup Backup Table
-- Generated: 2025-09-29
-- Removes the user_access_control_backup table that was created during migration

-- ==============================================
-- DROP BACKUP TABLE
-- ==============================================

DROP TABLE IF EXISTS user_access_control_backup CASCADE;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Backup table cleanup completed successfully';
    RAISE NOTICE 'user_access_control_backup table dropped';
END $$;
