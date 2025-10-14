-- Fix RLS on metric_definitions table
-- Generated: 2025-01-28
-- Add missing RLS policies for metric_definitions table

-- ==============================================
-- ENABLE RLS ON METRIC_DEFINITIONS
-- ==============================================

-- Enable RLS on metric_definitions table
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD RLS POLICIES FOR METRIC_DEFINITIONS
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view metric definitions" ON metric_definitions;
DROP POLICY IF EXISTS "Undeniable users can manage metric definitions" ON metric_definitions;

-- All authenticated users can view metric definitions (they're lookup data)
CREATE POLICY "Authenticated users can view metric definitions" ON metric_definitions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only undeniable users can manage metric definitions (create, update, delete)
CREATE POLICY "Undeniable users can manage metric definitions" ON metric_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        )
    );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: RLS policies added to metric_definitions table';
    RAISE NOTICE 'All authenticated users can view metric definitions';
    RAISE NOTICE 'Only undeniable users can manage metric definitions';
END $$;
