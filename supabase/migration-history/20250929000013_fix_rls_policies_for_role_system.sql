-- Fix RLS Policies for Role-Based System
-- Generated: 2025-01-29
-- Updates RLS policies to work with the new simplified role system

-- ==============================================
-- DROP OLD POLICIES
-- ==============================================

-- Drop old policies that reference the old access_level system
DROP POLICY IF EXISTS "Users can view accessible discovered metrics" ON discovered_metrics;
DROP POLICY IF EXISTS "Users can insert discovered metrics" ON discovered_metrics;
DROP POLICY IF EXISTS "Users can update discovered metrics" ON discovered_metrics;
DROP POLICY IF EXISTS "Users can delete discovered metrics" ON discovered_metrics;

DROP POLICY IF EXISTS "Users can view accessible sync status" ON sync_status;
DROP POLICY IF EXISTS "Users can insert sync status" ON sync_status;
DROP POLICY IF EXISTS "Users can update sync status" ON sync_status;
DROP POLICY IF EXISTS "Users can delete sync status" ON sync_status;

-- ==============================================
-- CREATE NEW ROLE-BASED POLICIES
-- ==============================================

-- Discovered metrics policies (role-based)
CREATE POLICY "Users can view discovered metrics by role" ON discovered_metrics
    FOR SELECT USING (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can see everything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can see all records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can see their assigned client records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = discovered_metrics.client_id
        )
    );

CREATE POLICY "Users can insert discovered metrics by role" ON discovered_metrics
    FOR INSERT WITH CHECK (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can insert anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can insert anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can insert for their assigned clients
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = discovered_metrics.client_id
        )
    );

CREATE POLICY "Users can update discovered metrics by role" ON discovered_metrics
    FOR UPDATE USING (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can update anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can update anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can update their assigned client records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = discovered_metrics.client_id
        )
    );

CREATE POLICY "Users can delete discovered metrics by role" ON discovered_metrics
    FOR DELETE USING (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Only undeniable users can delete
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        )
    );

-- Sync status policies (role-based)
CREATE POLICY "Users can view sync status by role" ON sync_status
    FOR SELECT USING (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can see everything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can see all records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can see their assigned client records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = sync_status.client_id
        )
    );

CREATE POLICY "Users can insert sync status by role" ON sync_status
    FOR INSERT WITH CHECK (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can insert anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can insert anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can insert for their assigned clients
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = sync_status.client_id
        )
    );

CREATE POLICY "Users can update sync status by role" ON sync_status
    FOR UPDATE USING (
        -- User owns the record
        (user_id = auth.uid()) OR
        -- Undeniable users can update anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        ) OR
        -- Staff users can update anything
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'staff'
            AND uac.client_id IS NULL
        ) OR
        -- Client users can update their assigned client records
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = sync_status.client_id
        )
    );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated for role-based system';
    RAISE NOTICE 'Policies now use role-based access control instead of access_level';
    RAISE NOTICE 'Undeniable users: Full access to everything';
    RAISE NOTICE 'Staff users: Can view/insert/update all data';
    RAISE NOTICE 'Client users: Can only access their assigned clients';
END $$;
