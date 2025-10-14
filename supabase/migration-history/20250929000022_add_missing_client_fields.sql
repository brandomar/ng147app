-- Add Missing Client Fields
-- Generated: 2025-09-29
-- Adds company name, logo, categories, and client type fields to clients table

-- ==============================================
-- ADD MISSING CLIENT FIELDS
-- ==============================================

-- Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS allowed_categories TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'client' CHECK (client_type IN ('client', 'undeniable'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update existing clients to have company_name = name if company_name is null
UPDATE clients 
SET company_name = name 
WHERE company_name IS NULL;

-- ==============================================
-- LEGACY CATEGORIES (from old migrations)
-- ==============================================

-- These are the legacy categories that were used before the new metric categories
-- We'll use these for the frontend until the client decides on new categories
INSERT INTO metric_definitions (metric_name, categories, is_calculated, calculation_formula) VALUES
-- Legacy categories for backward compatibility
('growth', ARRAY['growth'], FALSE, NULL),
('performance', ARRAY['performance'], FALSE, NULL),
('cold-email', ARRAY['cold-email'], FALSE, NULL),
('ads', ARRAY['ads'], FALSE, NULL),
('spam-outreach', ARRAY['spam-outreach'], FALSE, NULL)
ON CONFLICT (metric_name) DO NOTHING;

-- ==============================================
-- UPDATE CLIENTS TABLE CONSTRAINTS
-- ==============================================

-- Make company_name required
ALTER TABLE clients ALTER COLUMN company_name SET NOT NULL;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Missing client fields added successfully';
    RAISE NOTICE 'Added: company_name, logo_url, allowed_categories, client_type, owner_id';
    RAISE NOTICE 'Legacy categories restored for backward compatibility';
END $$;
