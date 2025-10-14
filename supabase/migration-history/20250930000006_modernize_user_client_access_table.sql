-- Modernize user_client_access Table
-- Generated: 2025-09-30
-- Updates table to support modern role system with undeniable role

-- ==============================================
-- UPDATE ROLE CONSTRAINT
-- ==============================================

-- Drop the old constraint that only allows 'staff' and 'client'
ALTER TABLE user_client_access DROP CONSTRAINT IF EXISTS user_client_access_role_check;

-- Add new constraint that supports all modern roles
ALTER TABLE user_client_access ADD CONSTRAINT user_client_access_role_check 
    CHECK (role IN ('undeniable', 'staff', 'client'));

-- ==============================================
-- UPDATE TABLE STRUCTURE FOR MODERN STANDARDS
-- ==============================================

-- Allow NULL client_id for global undeniable access
ALTER TABLE user_client_access ALTER COLUMN client_id DROP NOT NULL;

-- Update the unique constraint to handle NULL client_id properly
-- First drop the constraint, then recreate the index
ALTER TABLE user_client_access DROP CONSTRAINT IF EXISTS user_client_access_user_id_client_id_key;
CREATE UNIQUE INDEX user_client_access_user_id_client_id_unique 
    ON user_client_access (user_id, client_id) 
    WHERE client_id IS NOT NULL;

-- Add separate unique constraint for global access (client_id IS NULL)
CREATE UNIQUE INDEX user_client_access_user_id_global_unique 
    ON user_client_access (user_id) 
    WHERE client_id IS NULL;

-- ==============================================
-- UPDATE RLS POLICIES FOR MODERN ROLE SYSTEM
-- ==============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can read own client access" ON user_client_access;
DROP POLICY IF EXISTS "Undeniable users can manage all client access" ON user_client_access;
DROP POLICY IF EXISTS "Staff users can manage client access for assigned clients" ON user_client_access;

-- Create modern RLS policies
CREATE POLICY "Users can read own client access" ON user_client_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Undeniable users can manage all client access" ON user_client_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND global_role = 'undeniable'
        )
    );

CREATE POLICY "Staff users can manage client access for assigned clients" ON user_client_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_client_access uca 
            WHERE uca.user_id = auth.uid() 
            AND uca.client_id = user_client_access.client_id
            AND uca.role IN ('staff', 'undeniable')
        )
    );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'user_client_access table modernized successfully';
    RAISE NOTICE 'Role constraint updated to support undeniable, staff, client';
    RAISE NOTICE 'NULL client_id now allowed for global access';
    RAISE NOTICE 'Unique constraints updated for modern role system';
    RAISE NOTICE 'RLS policies updated for modern role system';
END $$;
