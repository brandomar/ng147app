-- Seed Default Roles
-- This migration creates the default system roles with feature-based permissions

-- ==============================================
-- INSERT SYSTEM ROLES WITH PERMISSIONS
-- ==============================================

-- Admin role with full system access
INSERT INTO public.roles (name, description, permissions, is_system_role) VALUES
('admin', 'Global administrator with full system access', '{
  "canManageUsers": true,
  "canManageClients": true,
  "canManageBranding": true,
  "canViewAllData": true,
  "canInviteUsers": true,
  "canManageRoles": true,
  "canSyncData": true,
  "canExportData": true
}', true),

-- Staff role with client management access
('staff', 'Staff member with client management access', '{
  "canManageUsers": false,
  "canManageClients": true,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": true,
  "canManageRoles": false,
  "canSyncData": true,
  "canExportData": true
}', true),

-- Client role with read-only access
('client', 'Client user with read-only access', '{
  "canManageUsers": false,
  "canManageClients": false,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": false,
  "canManageRoles": false,
  "canSyncData": false,
  "canExportData": false
}', true)

ON CONFLICT (name) DO NOTHING; -- Prevent duplicate inserts

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Log the seeded roles
DO $$
DECLARE
    role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.roles WHERE is_system_role = TRUE;
    
    RAISE NOTICE 'Default roles seeded successfully:';
    RAISE NOTICE '- admin: Full system access with all permissions';
    RAISE NOTICE '- staff: Client management access with limited permissions';
    RAISE NOTICE '- client: Read-only access with minimal permissions';
    RAISE NOTICE 'Total system roles created: %', role_count;
    
    -- Verify all required roles exist
    IF role_count = 3 THEN
        RAISE NOTICE 'All required system roles created successfully';
    ELSE
        RAISE WARNING 'Expected 3 system roles, but found %', role_count;
    END IF;
END $$;
