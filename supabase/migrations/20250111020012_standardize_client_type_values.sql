-- ==============================================
-- STANDARDIZE CLIENT TYPE VALUES
-- ==============================================
-- This migration standardizes client_type values from 'undeniable'/'admin' confusion
-- to 'primary'/'client' to properly represent primary dashboard vs client dashboards

-- Drop existing constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;

-- Update any existing 'undeniable' values to 'primary'
UPDATE clients 
SET client_type = 'primary' 
WHERE client_type = 'undeniable';

-- Add new constraint with standardized values
ALTER TABLE clients 
ADD CONSTRAINT clients_client_type_check 
CHECK (client_type IN ('primary', 'client'));

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clients_client_type_check'
    ) THEN
        RAISE EXCEPTION 'clients_client_type_check constraint was not created successfully';
    END IF;
    
    -- Check for any invalid client_type values
    IF EXISTS (
        SELECT 1 FROM clients 
        WHERE client_type NOT IN ('primary', 'client')
    ) THEN
        RAISE EXCEPTION 'Found invalid client_type values after migration';
    END IF;
    
    RAISE NOTICE 'Client type standardization completed successfully';
    RAISE NOTICE 'Updated constraint to allow: primary, client';
END $$;
