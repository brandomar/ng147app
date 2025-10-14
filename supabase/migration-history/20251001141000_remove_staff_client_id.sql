-- Remove the STAFF_CLIENT_ID client that was causing confusion
-- The Undeniable Dashboard should not have a separate client entry

-- First, clean up any related data (only if tables exist)
DELETE FROM discovered_metrics WHERE client_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM user_client_access WHERE client_id = '00000000-0000-0000-0000-000000000001';

-- Remove the STAFF_CLIENT_ID client
DELETE FROM clients WHERE id = '00000000-0000-0000-0000-000000000001';

-- Log the removal
DO $$
BEGIN
    RAISE NOTICE 'Removed STAFF_CLIENT_ID client - Undeniable Dashboard should not have a separate client entry';
END $$;
