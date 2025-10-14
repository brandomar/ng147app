-- ==============================================
-- ADD GOALS CONFIGURATION TO CLIENTS TABLE
-- ==============================================
-- This migration adds a goals_config JSONB column to store
-- monthly goal targets and projections for each client

-- Add goals_config column
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS goals_config JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN clients.goals_config IS 'Monthly goal targets and projections configuration. Structure: { "monthly_targets": { "ad_spend": number, "booked_calls": number, "offer_rate": number, "closes": number, "cpa": number, "sales": number }, "updated_at": timestamp, "updated_by": user_id }';

-- Create index for querying goals
CREATE INDEX IF NOT EXISTS idx_clients_goals_config ON clients USING gin(goals_config);

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'goals_config'
    ) THEN
        RAISE EXCEPTION 'Column goals_config missing from clients table';
    END IF;
    
    -- Check if index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'clients' AND indexname = 'idx_clients_goals_config'
    ) THEN
        RAISE EXCEPTION 'Index idx_clients_goals_config missing';
    END IF;
    
    RAISE NOTICE 'Goals configuration column added successfully to clients table';
END $$;

