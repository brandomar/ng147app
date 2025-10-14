-- Create Invitation System and Default Client Setup
-- Generated: 2025-01-29
-- Handles proper role assignment based on invitation type

-- ==============================================
-- CREATE INVITATION SYSTEM
-- ==============================================

-- Invitations table to track pending invitations
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('undeniable', 'staff', 'client')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by_email TEXT,
    invitation_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_client ON invitations(client_id);

-- ==============================================
-- CREATE DEFAULT CLIENT FOR UNASSIGNED USERS
-- ==============================================

-- Create a default "Unassigned" client for users without proper invitations
INSERT INTO clients (id, name, slug, is_active, tabs) VALUES
('00000000-0000-0000-0000-000000000000', 'Unassigned', 'unassigned', true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- UPDATE USER ROLE FUNCTION
-- ==============================================

-- Update get_user_role to handle the new invitation system
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Check for global undeniable role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN 'undeniable';
    END IF;
    
    -- Check for global staff role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'staff'
        AND client_id IS NULL
    ) THEN
        RETURN 'staff';
    END IF;
    
    -- Check for global client role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'client'
        AND client_id IS NULL
    ) THEN
        RETURN 'client';
    END IF;
    
    -- Check if user has any client assignments
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id IS NOT NULL
    ) THEN
        -- User has client assignments, return their primary role
        SELECT role INTO result
        FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id IS NOT NULL
        ORDER BY created_at ASC
        LIMIT 1;
        
        RETURN COALESCE(result, 'client');
    END IF;
    
    -- No role found - this shouldn't happen with proper invitation system
    -- But fallback to client for safety
    RETURN 'client';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'client';
END;
$$;

-- ==============================================
-- INVITATION FUNCTIONS
-- ==============================================

-- Create invitation function
CREATE OR REPLACE FUNCTION create_invitation(
    p_email TEXT,
    p_client_id UUID,
    p_role TEXT,
    p_invited_by_email TEXT,
    p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_token TEXT;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Generate unique invitation token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Calculate expiration time
    expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    
    -- Insert invitation
    INSERT INTO invitations (email, client_id, role, invited_by, invited_by_email, invitation_token, expires_at)
    VALUES (p_email, p_client_id, p_role, auth.uid(), p_invited_by_email, invitation_token, expires_at);
    
    RETURN invitation_token;
END;
$$;

-- Accept invitation function (called during signup)
CREATE OR REPLACE FUNCTION accept_invitation(
    p_invitation_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM invitations
    WHERE invitation_token = p_invitation_token
    AND is_used = FALSE
    AND expires_at > NOW();
    
    -- Check if invitation exists and is valid
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark invitation as used
    UPDATE invitations 
    SET is_used = TRUE, used_at = NOW()
    WHERE invitation_token = p_invitation_token;
    
    -- Assign user role based on invitation
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
    VALUES (p_user_id, invitation_record.client_id, invitation_record.role, invitation_record.invited_by, invitation_record.invited_by_email, NOW(), NOW())
    ON CONFLICT (user_id, client_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;

-- Assign default unassigned client to users without proper invitations
CREATE OR REPLACE FUNCTION assign_default_client(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only assign if user has no existing client assignments
    IF NOT EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id IS NOT NULL
    ) THEN
        INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
        VALUES (p_user_id, '00000000-0000-0000-0000-000000000000', 'client', p_user_id, NOW(), NOW())
        ON CONFLICT (user_id, client_id) DO NOTHING;
    END IF;
END;
$$;

-- ==============================================
-- RLS POLICIES FOR INVITATIONS
-- ==============================================

-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Invitations policies
CREATE POLICY "Users can view their own invitations" ON invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        )
    );

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        )
    );

CREATE POLICY "Users can update their own invitations" ON invitations
    FOR UPDATE USING (
        invited_by = auth.uid() OR
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
    RAISE NOTICE 'Invitation system created successfully';
    RAISE NOTICE 'Default unassigned client created';
    RAISE NOTICE 'User role function updated for invitation system';
    RAISE NOTICE 'Invitation functions created';
    RAISE NOTICE 'RLS policies applied to invitations table';
END $$;
