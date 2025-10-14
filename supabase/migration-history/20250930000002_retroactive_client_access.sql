-- Retroactive Client Access Assignment
-- Generated: 2025-09-29
-- Assigns client access to existing users based on their global roles

-- ==============================================
-- RPC FUNCTION: assign_retroactive_client_access
-- ==============================================

CREATE OR REPLACE FUNCTION assign_retroactive_client_access()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    clients_assigned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    client_record RECORD;
    access_count INTEGER;
BEGIN
    -- Get all users with undeniable or staff roles
    FOR user_record IN 
        SELECT u.user_id, u.email, u.global_role
        FROM users u
        WHERE u.global_role IN ('undeniable', 'staff')
    LOOP
        access_count := 0;
        
        -- Get all clients
        FOR client_record IN 
            SELECT c.id, c.name
            FROM clients c
        LOOP
            -- Check if access already exists
            IF NOT EXISTS (
                SELECT 1 FROM user_client_access uca 
                WHERE uca.user_id = user_record.user_id 
                AND uca.client_id = client_record.id
            ) THEN
                -- Create access record
                INSERT INTO user_client_access (
                    user_id, 
                    client_id, 
                    role, 
                    granted_by_email,
                    created_at,
                    updated_at
                ) VALUES (
                    user_record.user_id,
                    client_record.id,
                    CASE 
                        WHEN user_record.global_role = 'undeniable' THEN 'staff'
                        ELSE user_record.global_role
                    END,
                    'system@retroactive-assignment',
                    NOW(),
                    NOW()
                );
                
                access_count := access_count + 1;
            END IF;
        END LOOP;
        
        -- Return the result for this user
        user_id := user_record.user_id;
        user_email := user_record.email;
        user_role := user_record.global_role;
        clients_assigned := access_count;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ==============================================
-- EXECUTE RETROACTIVE ASSIGNMENT
-- ==============================================

-- Run the retroactive assignment
SELECT * FROM assign_retroactive_client_access();

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
DECLARE
    total_access_records INTEGER;
    total_users INTEGER;
    total_clients INTEGER;
BEGIN
    -- Count total access records
    SELECT COUNT(*) INTO total_access_records FROM user_client_access;
    
    -- Count total users with undeniable/staff roles
    SELECT COUNT(*) INTO total_users FROM users WHERE global_role IN ('undeniable', 'staff');
    
    -- Count total clients
    SELECT COUNT(*) INTO total_clients FROM clients;
    
    RAISE NOTICE 'Retroactive client access assignment completed';
    RAISE NOTICE 'Total access records: %', total_access_records;
    RAISE NOTICE 'Total users with access: %', total_users;
    RAISE NOTICE 'Total clients: %', total_clients;
END $$;
