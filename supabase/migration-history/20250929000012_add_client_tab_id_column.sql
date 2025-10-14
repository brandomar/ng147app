-- Add client_tab_id column to discovered_metrics table
-- Generated: 2025-01-29
-- Adds the missing client_tab_id column that the frontend expects

-- ==============================================
-- ADD CLIENT_TAB_ID COLUMN
-- ==============================================

-- Add client_tab_id column to discovered_metrics table
ALTER TABLE discovered_metrics 
ADD COLUMN IF NOT EXISTS client_tab_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_discovered_metrics_client_tab_id ON discovered_metrics(client_tab_id);

-- Add index for combined queries (user_id, client_id, client_tab_id)
CREATE INDEX IF NOT EXISTS idx_discovered_metrics_user_client_tab ON discovered_metrics(user_id, client_id, client_tab_id);

-- ==============================================
-- UPDATE EXISTING DATA
-- ==============================================

-- Set client_tab_id to NULL for existing staff records (where client_id is staff client ID)
UPDATE discovered_metrics 
SET client_tab_id = NULL 
WHERE client_id = '00000000-0000-0000-0000-000000000001';

-- For client records, set client_tab_id to the same as client_id initially
-- This maintains backward compatibility
UPDATE discovered_metrics 
SET client_tab_id = client_id 
WHERE client_id != '00000000-0000-0000-0000-000000000001' 
AND client_tab_id IS NULL;

-- ==============================================
-- UPDATE UNIQUE CONSTRAINT
-- ==============================================

-- Drop the old unique constraint
ALTER TABLE discovered_metrics DROP CONSTRAINT IF EXISTS discovered_metrics_user_id_client_id_google_sheet_id_sheet_name_key;

-- Add new unique constraint that includes client_tab_id
ALTER TABLE discovered_metrics 
ADD CONSTRAINT discovered_metrics_unique_user_client_tab_sheet 
UNIQUE (user_id, client_id, client_tab_id, google_sheet_id, sheet_name);

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'client_tab_id column added successfully to discovered_metrics table';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Existing data updated with appropriate client_tab_id values';
    RAISE NOTICE 'Unique constraint updated to include client_tab_id';
END $$;
