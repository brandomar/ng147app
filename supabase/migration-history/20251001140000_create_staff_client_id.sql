-- Create the missing STAFF_CLIENT_ID for staff sync operations
-- This is needed for the Undeniable Dashboard to work properly

INSERT INTO clients (
    id,
    name,
    company_name,
    slug,
    is_active,
    client_type,
    data_source,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Undeniable Dashboard',
    'Internal Undeniable Dashboard',
    'undeniable-dashboard',
    true,
    'undeniable',
    'google-sheets',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Ensure the undeniable client is properly configured
UPDATE clients 
SET 
    client_type = 'undeniable',
    data_source = 'google-sheets',
    is_active = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';
